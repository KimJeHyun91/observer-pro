const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const areaMapper = require('../mappers/areaMapper');
const deviceMapper = require('../mappers/deviceMapper');
const { addAloneSocket } = require('../../../worker/parking/sensorEvent');
const { unsubscribeAndRemoveSocket, sensorGetRequest } = require('../../../worker/parking/sensorTCPSocket');

exports.getAreaList = async ({ outsideIdx, insideIdx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideIdx, insideIdx];
    let query = await areaMapper.getAreaList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getAreaList, error: ', error);
    console.log('parkingManagement/areaService.js, getAreaList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addArea = async ({ areaName, outsideIdx, insideIdx, parkingTypeId, deviceIdx, leftLocation, topLocation, iconWidth, iconHeight }) => {
  
  const client = await pool.connect();

  try {

    let binds = [areaName, outsideIdx, insideIdx, parkingTypeId, deviceIdx, leftLocation, topLocation, iconWidth, iconHeight];
    
    let query = await areaMapper.addArea();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    if (res && res.rows.length > 0) {
      query = await deviceMapper.updateUseDevice();

      const updateBinds = [deviceIdx];
      const updateRes = await client.query(query, updateBinds);
    
      if (updateRes.rowCount === 0) {
        throw new Error('no updat in pm_device');
      }

      query = await deviceMapper.getDevice();

      const resGetDevice = await client.query(query, [deviceIdx]);
      await addAloneSocket(resGetDevice.rows[0]);

      const getData = {
        deviceIdx: resGetDevice.rows[0].idx, 
        deviceIp: resGetDevice.rows[0].device_ip, 
        devicePort: resGetDevice.rows[0].device_port,
        auth: {
          devNo: resGetDevice.rows[0].device_no10,
          userID: resGetDevice.rows[0].user_id,
          userPW: resGetDevice.rows[0].user_pw,
        },
      };

      const getSensor = await sensorGetRequest(getData);

      if(getSensor.message === 'get-ok'){
        query = await deviceMapper.updateAreaStatus();
        await client.query(query, [getSensor.sensorData.det, deviceIdx]);
      }
    }

    await client.query('COMMIT');

    if ((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("pm_area-update", { areaList: { 'add': res.rows.length } });
    }

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, addArea, error: ', error);
    console.log('parkingManagement/areaService.js, addArea, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getParkingTypeCountUsedArea = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await areaMapper.getParkingTypeCountUsedArea();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getParkingTypeCountUsedArea, error: ', error);
    console.log('parkingManagement/areaService.js, getParkingTypeCountUsedArea, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getParkingTypeCountAreaInfo = async ({ outsideIdx, insideIdx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideIdx, insideIdx];
    let query = await areaMapper.getParkingTypeCountAreaInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getParkingTypeCountAreaInfo, error: ', error);
    console.log('parkingManagement/areaService.js, getParkingTypeCountAreaInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getParkingTypeCountAreaList = async ({ outsideIdx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideIdx, outsideIdx];
    let query = await areaMapper.getParkingTypeCountAreaList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getParkingTypeCountAreaList, error: ', error);
    console.log('parkingManagement/areaService.js, getParkingTypeCountAreaList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyAreaInfo = async ({ idx, areaName, parkingTypeId, deviceIdx, leftLocation, topLocation, iconWidth, iconHeight }) => {
  
  const client = await pool.connect();

  try {

    const areaIdx = idx;
    let binds = [areaIdx, areaName, parkingTypeId, deviceIdx, leftLocation, topLocation, iconWidth, iconHeight];
    let query = await areaMapper.modifyAreaInfo();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, modifyAreaInfo, error: ', error);
    console.log('parkingManagement/areaService.js, modifyAreaInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteAreaInfo = async (obj) => {
  
  const client = await pool.connect();

  try {

    const areaIdx = obj.idx;

    let binds = [areaIdx];
    let selectDevice = await deviceMapper.getDeviceIn();
    let deviceResult = await client.query(selectDevice, [obj.idx]);
    let deviceIds = deviceResult.rows.map((row) => row.device_idx);
    let query = await areaMapper.deleteAreaInfo();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    if(res.rowCount > 0 && deviceIds.length > 0){
      const queryResetDevice = await deviceMapper.deleteOutsideInsideDeviceLocation();
      await client.query(queryResetDevice, [deviceIds]);

      const queryGetDevice = await deviceMapper.getDevice();
      const resGetDevice = await client.query(queryGetDevice, [obj.device_idx]);

      const sensorData = {
        deviceIdx: resGetDevice.rows[0].idx, 
        deviceIp: resGetDevice.rows[0].device_ip, 
        devicePort: resGetDevice.rows[0].device_port,
        auth: {
          devNo: resGetDevice.rows[0].device_no10,
          userID: resGetDevice.rows[0].user_id,
          userPW: resGetDevice.rows[0].user_pw,
        },
      };

      // 소켓 구독 요청 취소
      await unsubscribeAndRemoveSocket(sensorData);
    }

    await client.query('COMMIT');
    
    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, deleteAreaInfo, error: ', error);
    console.log('parkingManagement/areaService.js, deleteAreaInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getAreaInfo = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const areaIdx = idx;
    let binds = [areaIdx];
    let query = await areaMapper.getAreaInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getAreaInfo, error: ', error);
    console.log('parkingManagement/areaService.js, getAreaInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getParkingTypeSumAreaList = async ({ outsideIdx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideIdx];
    let query = await areaMapper.getParkingTypeSumAreaList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/areaService.js, getParkingTypeSumAreaList, error: ', error);
    console.log('parkingManagement/areaService.js, getParkingTypeSumAreaList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getTreeList = async () => {
  
  const client = await pool.connect();
  try {
    const buildingList = await areaMapper.getBuildingList();
    const cameraList = await areaMapper.getCameraList();
    const sensorList = await areaMapper.getSensorList();

    // 세 쿼리 병렬 실행 (기다리는 시간 최소화)
    const [buildingRes, cameraRes, sensorRes] = await Promise.all([
      client.query(buildingList, []),
      client.query(cameraList, []),
      client.query(sensorList, [])
    ]);

    const buildings = buildingRes.rows;
    const cameras = cameraRes.rows;
    const sensors = sensorRes.rows;

    // 트리 구조로 가공
    const tree = treeList(buildings, cameras, sensors);
    
    return tree;
  } catch (error) {
    logger.info('parkingManagement/areaService.js, getParkingTypeCountUsedArea, error: ', error);
    console.log('parkingManagement/areaService.js, getParkingTypeCountUsedArea, error: ', error);
  } finally {
    await client.release();
  }
}

// 건물, 층, 장치 목록을 트리 형태로 변환
function treeList(buildings, cameras, sensors) {
  const map = new Map();

  // 실외 카메라 등록
  const outdoorDevices = [
    ...cameras
      .filter(d => d.outside_idx === 0 || d.inside_idx === 0)
      .map(d => ({ ...d, type: 'camera', status: true }))
      .sort((a, b) => a.idx - b.idx),
  ];

  if (outdoorDevices.length > 0) {
    map.set('external', {
      buildingName: '실외',
      items: [
        {
          floor: '',
          devices: outdoorDevices,
        },
      ],
    });
  }

  for (const row of buildings) {
    // 새로운 건물이면 초기화
    if (!map.has(row.outside_idx)) {
      map.set(row.outside_idx, {
        buildingName: row.outside_name,
        items: [],
      });
    }

    // 층 정보가 없으면 무시 (null 층 제거)
    if (row.inside_name == null) continue;

    const building = map.get(row.outside_idx);

    // 해당 층이 이미 추가됐는지 확인
    let floor = building.items.find(f => f.floor === row.inside_name);

    // 없으면 새로 생성
    if (!floor) {
      floor = { floor: row.inside_name, devices: [] };
      building.items.push(floor);

      // 건물 내부의 층 리스트 정렬
      building.items.sort((a, b) => {
        // 층 이름 숫자로 변환 (정렬 기준용)
        const getFloorOrder = (floorName) => {
          if (!floorName) return 999; // 층 이름이 없으면 가장 마지막에 정렬

          const name = floorName.toUpperCase(); // 대소문자 구분 제거

          // 'B1', '지하1층' 등 지하층 처리
          if (name.includes("B") || name.includes("지하")) {
            // 숫자만 추출해서 음수로 변환 -> 지하 1층 = -1
            const num = parseInt(name.replace(/[^\d]/g, ""), 10);
            return isNaN(num) ? -99 : -num; // 숫자가 없으면 더 낮은 값
          }

          // 'RF', '옥상' 등은 가장 위층으로 간주
          if (name.includes("RF") || name.includes("옥상")) {
            return 100; // 가장 높은 층
          }

          // 일반적인 숫자층 (ex: 1F, 2F, 3층 등)
          const num = parseInt(name.replace(/[^\d]/g, ""), 10);
          return isNaN(num) ? 999 : num; // 숫자가 없으면 맨 뒤
        };

        // 정렬 (작은 수 -> 큰 수)
        return getFloorOrder(a.floor) - getFloorOrder(b.floor);
      });
    }

    // 해당 층의 장치들: camera + sensor 필터링 후 구분
    const devices = [
      ...cameras
        .filter(d => d.outside_idx === row.outside_idx && d.inside_idx === row.inside_idx)
        .map(d => ({ ...d, type: 'camera', status: true }))
        .sort((a, b) => a.idx - b.idx),
      ...sensors
        .filter(d => d.outside_idx === row.outside_idx && d.inside_idx === row.inside_idx)
        .map(d => ({ ...d, type: 'sensor' })),
    ];

    // 해당 층에 장치 push
    floor.devices.push(...devices);
  }

  // 최종 트리 구조 반환
  return Array.from(map.values());
}
