const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const deviceMapper = require('../mappers/deviceMapper');
const sensorIsCheck = (...args) => require('../../../worker/parking/sensorEvent').sensorIsCheck(...args);
const unsubscribeAndRemoveSocket = (...args) => require('../../../worker/parking/sensorTCPSocket').unsubscribeAndRemoveSocket(...args);
const commonService = require('../../../routes/common/services/commonService');
const parkingEventMapper = require('../../../routes/parkingManagement/mappers/eventTypeMapper');
const areaService = require('./areaService');

exports.getUnUseDeviceList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await deviceMapper.getUnUseDeviceList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getUnUseDeviceList, error: ', error);
    console.log('parkingManagement/deviceService.js, getUnUseDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getDeviceIpList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await deviceMapper.getDeviceIpList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
    console.log('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.defaultInAreaSensor = async (deviceIdx,useArea) => {
  const client = await pool.connect();

  try {
    const query = await deviceMapper.updateAreaStatus();
    const res = await client.query(query, [useArea,deviceIdx]);

    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rows.length } });
    }

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
    console.log('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.inAreaDevice = async (deviceIdx) => {
  
  const client = await pool.connect();

  try {
    const query = await deviceMapper.getIsAreaDevice();
    const res = await client.query(query, [deviceIdx]);

    return res;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
    console.log('parkingManagement/deviceService.js, getDeviceIpList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyLinkedStatusDevice = async ({ deviceIdx, linkedStatus }) => {
  
  const client = await pool.connect();

  try {

    let binds = [deviceIdx, linkedStatus];
    let query = await deviceMapper.modifyLinkedStatusDevice();

    const res = await client.query(query, binds);

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, modifyLinkedStatusDevice, error: ', error);
    console.log('parkingManagement/deviceService.js, modifyLinkedStatusDevice, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyDevice = async ({ userId, userPw, new_deviceIp, new_devicePort, new_deviceNo16, org_deviceIp, org_devicePort, org_deviceNo16 }) => {
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    let deviceChange = false;
    let returnValue = {};
    if(new_deviceIp !== org_deviceIp || new_devicePort !== org_devicePort || new_deviceNo16 !== org_deviceNo16){
        deviceChange = true;
    }
    
    // Area에 연결 된 장비 삭제 - Deivce 변경 시
    if(deviceChange){ 
      const resGetDeviceNo16Info = await getDeviceInfo(client, org_deviceNo16);

      if(resGetDeviceNo16Info && resGetDeviceNo16Info.rowCount > 0){
        let queryDeleteIsAreaDevice = await deviceMapper.deleteIsAreaDevice();
        await client.query(queryDeleteIsAreaDevice, [resGetDeviceNo16Info.rows[0].idx]);
      }
    }

    const resDeviceNo16Info = await getDeviceInfo(client, new_deviceNo16);

    if((resDeviceNo16Info) && (resDeviceNo16Info.rows) && (resDeviceNo16Info.rows.length == 0)) {
      const sensorCheckResponse = await sensorIsCheck({ userId, userPw, deviceIp: new_deviceIp, devicePort : new_devicePort, deviceNo16: new_deviceNo16 });
      
      // 새로 등록 될 센서 정보 확인
      if (!sensorCheckResponse || sensorCheckResponse.message !== "hello-ok") {
        return {
          status: false,
          message: `Device 수정에 실패했습니다. \n\n message : 센서 등록 정보를 확인 해 주세요.`
        }
      }

      // Device 수정
      const queryModifyDevice = await deviceMapper.modifyDevice();
      const resModifyDevice = await client.query(queryModifyDevice, [userId,userPw,new_deviceIp,new_devicePort,new_deviceNo16,org_deviceNo16]);

      if (global.websocket) {
        global.websocket.emit(`pm_area-update`, { Device: { update: resModifyDevice.rowCount } });
      }

      if(resModifyDevice.rowCount === 0){
        return {
          status: false,
          message: '수정 할 Device가 없습니다.'
        }
      }

      returnValue = {
        status: true,
        message: `Device ${resModifyDevice.rowCount} 개가 성공적으로 수정되었습니다.`
      }
    }else{ 
      returnValue = {
        status: false,
        message: `동일한 주차 센서(시리얼번호)가 있습니다.`
      }
    }
    
    await client.query('COMMIT');
    return returnValue;
  } catch (error) {
    logger.info('parkingManagement/deviceService.js, modifyDevice, error: ', error);
    console.log('parkingManagement/deviceService.js, modifyDevice, error: ', error);
  } finally {
    await client.release();
  }
}

async function getDeviceInfo(client, deviceNo16) {
  const query = await deviceMapper.getDeviceNo16Info();
  const result = await client.query(query, [deviceNo16]);
  return result;
}

exports.deleteDevice = async (selectedDevice) => {
  const client = await pool.connect();

  try {
    let totalDeletedRows = 0;

    await client.query('BEGIN');

    for (const device of selectedDevice) {
      const { idx } = device;
      const queryIsAreaDevice = await deviceMapper.getIsAreaDevice();
      const resIsAreaDevice = await client.query(queryIsAreaDevice, [idx]);

      // Area에 연결 된 장비 삭제
      if(resIsAreaDevice.rows.length > 0){
        const queryDeleteIsAreaDevice = await deviceMapper.deleteIsAreaDevice();
        await client.query(queryDeleteIsAreaDevice, [idx]);

        const queryGetDevice = await deviceMapper.getDevice();
        const resGetDevice = await client.query(queryGetDevice, [idx]);

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

      // Device 삭제
      const queryDeleteDevice = await deviceMapper.deleteDevice();
      const resDeleteDevice = await client.query(queryDeleteDevice, [idx]);

      // 삭제된 Device 카운트 누적
      if (resDeleteDevice && resDeleteDevice.rowCount > 0) {
        totalDeletedRows += resDeleteDevice.rowCount;
      }      
    }

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit(`pm_area-update`, { DeviceList: { remove: totalDeletedRows } });
    }

    return totalDeletedRows;
  } catch (error) {
    logger.info('parkingManagement/deviceController.js, deleteDevice, error: ', error);
    console.log('parkingManagement/deviceController.js, deleteDevice, error: ', error);

    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
};

exports.addDevice = async ({ userId, userPw, deviceIp, devicePort, deviceNo16 }) => {
  
  const client = await pool.connect();

  try {

    let binds = [deviceNo16];
    let query = await deviceMapper.getDeviceNo16Info();
    const resDeviceNo16Info = await client.query(query, binds);

    let returnValue = {};

    // 이미 저장된 주차센서가 없으면
    if((resDeviceNo16Info) && (resDeviceNo16Info.rows) && (resDeviceNo16Info.rows.length == 0)) {
      const sensorCheckResponse = await sensorIsCheck({ userId, userPw, deviceIp, devicePort, deviceNo16 });
      
      if (!sensorCheckResponse || sensorCheckResponse.message !== "hello-ok") {
        return {
          status: false,
          message: sensorCheckResponse.message,
        };
      }
  
      // 16진수 => 10진수
      const deviceNo10 = parseInt(deviceNo16, 16);

      binds = [userId, userPw, deviceIp, devicePort, deviceNo16, deviceNo10];
      query = await deviceMapper.addDevice();

      await client.query('BEGIN');
      const res = await client.query(query, binds);
      await client.query('COMMIT');

      if ((res) && (res.rows.length > 0) && (global.websocket)) {
        global.websocket.emit("pm_devices-update", { deviceList: { 'add': res.rows.length } });
        global.websocket.emit("pm_area-update", { areaList: { 'update': res.rows.length } });
      }

      returnValue = {
        status: true,
        message: 'success'
      };
    } else {
      returnValue = {
        status: false,
        message: '이미 저장된 주차 센서(시리얼번호)가 있습니다.'
      };
    }
    
    return returnValue;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, addDevice, error: ', error);
    console.log('parkingManagement/deviceService.js, addDevice, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.updateEventSensor = async (jsonData) => {
  const client = await pool.connect();

  try {
    const queryDeviceCheck = await deviceMapper.getDeviceNo16Info();
    const resDeviceCheck = await client.query(queryDeviceCheck, [jsonData.auth.devNo.toString(16)]);

    if(resDeviceCheck && resDeviceCheck.rowCount > 0){
      const queryUpdateAreaStatus = await deviceMapper.updateAreaStatus();
      const resUpdateAreaStatus = await client.query(queryUpdateAreaStatus, [jsonData.sensorData.det,resDeviceCheck.rows[0].idx]);
  
      if ((resUpdateAreaStatus) && (resUpdateAreaStatus.rowCount > 0) && (global.websocket)) {
        // 들어온 센서의 건물 층 조회
        const parkingAreaFullCheck = await areaService.getParkingTypeSumAreaList({ outsideIdx: resDeviceCheck.rows[0].outside_idx });

        if (parkingAreaFullCheck.length > 0) {
          // 각 층마다 만차인지 체크
          parkingAreaFullCheck.forEach(async (item) => {
            const parseAll = Number(item.all);
            const parseUseAll = Number(item.use_all);
        
            if (parseAll === 0) return;
        
            if (parseAll === parseUseAll) {
              const eventTypeQuery = await parkingEventMapper.getEventType();
              const eventTypeResult = await client.query(eventTypeQuery, [35]);

              const severityId = eventTypeResult.rows.length > 0 
                ? eventTypeResult.rows[0].severity_id 
                : 0;

              // 만차일시 이벤트 로그 추가
              await commonService.addEventLog({
                event_name: '만차',
                description: '주차면 센서 만차 발생',
                location: `${item.outside_name} ${item.inside_name}`,
                main_service_name: 'parking',
                device_type: 'sensor',
                severity_id: severityId,
                device_idx: -1,   // 따로 쓸일 X
                event_type_id: 35
              });
            }
          });
        }
        
        global.websocket.emit("pm_devices-update", { deviceList: { 'add': resUpdateAreaStatus.rows.length } });
        global.websocket.emit("pm_area-update", { areaList: { 'update': resUpdateAreaStatus.rows.length } });
      }
    }
    
  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getUnUseDeviceList, error: ', error);
    console.log('parkingManagement/deviceService.js, getUnUseDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getDeviceLinkedStatus = async (deviceIdx) => {
  const client = await pool.connect();

  try {
    const query = await deviceMapper.getDeviceLinkedStatus();
    const result = await client.query(query, [deviceIdx]);
    
    return result.rows.length > 0 ? result.rows[0].linked_status : false;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getDeviceLinkedStatus, error: ', error);
    console.log('parkingManagement/deviceService.js, getDeviceLinkedStatus, error: ', error);
    return false;
  } finally {
    await client.release();
  }
}

exports.getDeviceCheck = async (deviceIdx) => {
  const client = await pool.connect();

  try {
    const deviceQuery = await deviceMapper.getDeviceCheck();
    const deviceResult = await client.query(deviceQuery, [deviceIdx]);
    
    if (!deviceResult.rows.length || !deviceResult.rows[0]) return;

    const deviceData = deviceResult.rows[0];
    // 이미 알람이 전송된 경우 종료
    if (deviceData.is_alarm_send === true) return;

    const eventTypeQuery = await parkingEventMapper.getEventType();
    const eventTypeResult = await client.query(eventTypeQuery, [41]);

    const severityId = eventTypeResult.rows.length > 0 
      ? eventTypeResult.rows[0].severity_id 
      : 0;

    // 이벤트 메시지 추가
    await addEventLogMessage(deviceData, deviceIdx, severityId);
    // 알람 상태 업데이트
    await this.updateDeviceAlarmStatus(client, deviceIdx, true);

    return;

  } catch (error) {
    logger.info('parkingManagement/deviceService.js, getDeviceLinkedStatus, error: ', error);
    console.log('parkingManagement/deviceService.js, getDeviceLinkedStatus, error: ', error);
    return false;
  } finally {
    await client.release();
  }
}

const addEventLogMessage = async (deviceData, deviceIdx, severityId) => {
  const eventName = deviceData.area_name 
    ? `네트워크 끊김 - ${deviceData.area_name} 센서` 
    : `네트워크 끊김 - 주차면 센서`;

  const description = `주차면 센서 네트워크 끊김`;
  const locationParts = [];
  if (deviceData.outside_name) locationParts.push(deviceData.outside_name || '');
  if (deviceData.inside_name) locationParts.push(deviceData.inside_name || '');
  const location = locationParts.join(" ");

  await commonService.addEventLog({
    event_name: eventName,
    description: description,
    location: location,
    main_service_name: 'parking',
    device_type: 'sensor',
    severity_id: severityId,
    device_idx: deviceIdx,
    event_type_id: 41
  });
};

exports.updateDeviceAlarmStatus = async (client, deviceIdx, isAlarmSend) => {
  let isExternalClient = !!client;
  const connection = client || await pool.connect(); 

  try {
    const modifyDeviceAlarm = await deviceMapper.modifyDeviceAlarm();
    await connection.query(modifyDeviceAlarm, [isAlarmSend, deviceIdx]);
  } catch (error) {
    logger.info('parkingManagement/deviceService.js, updateDeviceAlarmStatus, error: ', error);
    console.log('parkingManagement/deviceService.js, updateDeviceAlarmStatus, error: ', error);
  } finally {
    if (!isExternalClient) {
      await connection.release();
    }
  }
};
