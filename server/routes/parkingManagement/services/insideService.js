const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const insideMapper = require('../mappers/insideMapper');
const fs = require('fs');
const path = require('path');
const { serverConfig } = require('../../../config');
const areaMapper = require('../mappers/areaMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const eventMapper = require('../mappers/eventMapper');
const warningBoardService = require('../../common/services/warningBoardService');
const mainServiceName = 'parking';
const deviceMapper = require('../mappers/deviceMapper');

exports.getInSideInfo = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const inside_idx = idx;

    let binds = [inside_idx];
    let query = await insideMapper.getInSideInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, getInSideInfo, error: ', error);
    console.log('parkingManagement/insideService.js, getInSideInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getInSideList = async ({ outsideIdx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideIdx];
    let query = await insideMapper.getInSideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, getInSideList, error: ', error);
    console.log('parkingManagement/insideService.js, getInSideList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getFloorPlan = async () => {
  
  try {

    let imageArray = [];
    // const floorplanPath = path.join(__dirname, '../../../', 'public', 'images', 'pm_floorplan');
    const floorplanPath = path.join(process.cwd(), 'public', 'images', 'pm_floorplan');

    
    fs.readdirSync(floorplanPath).forEach(file => {
      const url = `${serverConfig.WEB_PROTOCOL}://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/pm_floorplan/${file}`;
      imageArray.push({
        name: file,
        url: url
      });
    });

    return imageArray;
    
  } catch (error) {
    logger.info('parkingManagement/insideService.js, getFloorPlan, error: ', error);
    console.log('parkingManagement/insideService.js, getFloorPlan, error: ', error);
  }
}

exports.addInSide = async ({ insideName, outsideIdx, mapImageUrl }) => {
  
  const client = await pool.connect();

  try {

    let binds = [insideName, outsideIdx, mapImageUrl];
    
    let query = await insideMapper.addInSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("pm_floors-update", { floorList: { 'add': res.rows.length } });
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rows.length } });
    }

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, addInSide, error: ', error);
    console.log('parkingManagement/insideService.js, addInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. inside(층) 삭제
 * 2. 주차 구역(면) 삭제
 * 3. 카메라 위치 초기화(null), 카메라 연결된 inside(null), 사용상태 false, 알람상태 false
 * 4. 워닝보드 삭제
 */
exports.deleteInSide = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    let res = {
      rowCount : 0
    };

    const insideIdx = idx;
    let binds = [insideIdx];
    let query = await insideMapper.getInSideInfo();
    const resInSideInfo = await client.query(query, binds);
    
    let outsideIdx = 0;

    // 층 정보가 있으면
    if(resInSideInfo && resInSideInfo.rows.length > 0) {
      let deviceInList = await deviceMapper.getDeviceInList(); // 삭제 되기 전 device 데이터 저장
      let deviceResult = await client.query(deviceInList, [resInSideInfo.rows[0].outside_idx, insideIdx]);
      let deviceIds = deviceResult.rows.map(row => row.idx); // 포함 된 device idx 반환 ex) [1,2, ...]
      
      outsideIdx = resInSideInfo.rows[0].outside_idx;

      await client.query('BEGIN');
      query = await insideMapper.deleteInSide();
      res = await client.query(query, binds);

      // 삭제 성공하면
      if(res && res.rowCount > 0) {

        binds = [outsideIdx, insideIdx];

        // 주차 구역(면) 삭제
        let queryResetAreaQuery = await areaMapper.deleteAreaInside();
        await client.query(queryResetAreaQuery, binds);

        // 카메라 초기화 
        binds = [outsideIdx, insideIdx, mainServiceName, null, null, null, null, null, null];
        let queryResetCamera = await cameraMapper.deleteOutsideInsideCameraLocation();
        await client.query(queryResetCamera, binds);

        // 디바이스 초기화
        if (deviceIds.length > 0) { 
          let queryResetDevice = await deviceMapper.deleteOutsideInsideDeviceLocation();
          await client.query(queryResetDevice, [deviceIds]);
        }
      }

      await client.query('COMMIT');

      binds = [outsideIdx, insideIdx];
      let queryLatestEventInsideInfo = await eventMapper.getLatestEventInsideInfo();
      let resLatestEventInsideInfo = await client.query(queryLatestEventInsideInfo, binds);

      if(resLatestEventInsideInfo && resLatestEventInsideInfo.rows.length > 0) {
        // 워닝보드 삭제
        await warningBoardService.deleteWarningBoard({ 
          mainService : 'parking'
          , eventIdx: resLatestEventInsideInfo.rows[0].event_idx 
        });
      }

      if((res) && (res.rowCount > 0) && (global.websocket)) {
        global.websocket.emit("pm_floors-update", { floorList: { 'remove': res.rowCount } });
        global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
        global.websocket.emit("pm_cameras-update", { cameraList: { 'update': res.rowCount } });
      }

    } else {
      console.log('parking 해당 건물의 층 정보가 없습니다.');
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, deleteInSide, error: ', error);
    console.log('parkingManagement/insideService.js, deleteInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyInSide = async ({ idx, insideName }) => {
  
  const client = await pool.connect();

  try {

    const insideIdx = idx;

    let binds = [insideIdx, insideName];
    let query = await insideMapper.modifyInSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_floors-update", { floorList: { 'update': res.rowCount } });
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, modifyInSide, error: ', error);
    console.log('parkingManagement/insideService.js, modifyInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. inside(층) 알람 상태 변경
 * 2. 카메라 알람 상태 변경
 * 3. 워닝보드 삭제
 */
exports.modifyInSideAlarmStatus = async ({ idx }) => {

  const client = await pool.connect();

  try {

    let res = {
      rowCount : 0
    };

    const insideIdx = idx;
    const alarmStatus = false;

    let binds = [insideIdx];
    let query = await insideMapper.getInSideInfo();
    const resInSideInfo = await client.query(query, binds);
    
    let outsideIdx = 0;

    // 층 정보가 있으면
    if(resInSideInfo && resInSideInfo.rows.length > 0) {

      outsideIdx = resInSideInfo.rows[0].outside_idx;

      await client.query('BEGIN');
      binds = [insideIdx, outsideIdx, alarmStatus];
      query = await insideMapper.modifyInsideAlarmStatus();
      res = await client.query(query, binds);
  
      if(res && res.rowCount > 0) {
        
        // 카메라 알람 상태 변경
        binds = [outsideIdx, insideIdx, mainServiceName, alarmStatus];
        let queryResetCamera = await cameraMapper.modifyOutsideInsideCameraAlarmStatus();
        await client.query(queryResetCamera, binds);
      }

      await client.query('COMMIT');

      binds = [outsideIdx, insideIdx];
      let queryLatestEventInsideInfo = await eventMapper.getLatestEventInsideInfo();
      let resLatestEventInsideInfo = await client.query(queryLatestEventInsideInfo, binds);
  
      if(resLatestEventInsideInfo && resLatestEventInsideInfo.rows.length > 0) {
        // 워닝보드 삭제
        await warningBoardService.deleteWarningBoard({ 
          mainService : 'parking'
          , eventIdx: resLatestEventInsideInfo.rows[0].event_idx 
        });
      }
      
      if((res) && (res.rowCount > 0) && (global.websocket)) {
        global.websocket.emit("pm_floors-update", { floorList: { 'update': res.rowCount } });
        global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
        global.websocket.emit("pm_cameras-update", { cameraList: { 'update': res.rowCount } });
      }

    } else {
      console.log('parking 해당 건물의 층 정보가 없습니다.');
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, modifyInSideAlarmStatus, error: ', error);
    console.log('parkingManagement/insideService.js, modifyInSideAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyMapImageInSide = async ({ idx, mapImageUrl }) => {
  
  const client = await pool.connect();

  try {

    const insideIdx = idx;

    let binds = [insideIdx, mapImageUrl];
    let query = await insideMapper.modifyMapImageInSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');
    
    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_floors-update", { floorList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/insideService.js, modifyMapImageInSide, error: ', error);
    console.log('parkingManagement/insideService.js, modifyMapImageInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}