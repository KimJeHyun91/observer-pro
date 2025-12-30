const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const insideMapper = require('../mappers/insideMapper');
const areaMapper = require('../mappers/areaMapper');
const deviceMapper = require('../mappers/deviceMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const eventMapper = require('../mappers/eventMapper');
const warningBoardService = require('../../common/services/warningBoardService');
const fs = require('fs');
const path = require('path');
const { serverConfig } = require('../../../config');
const mainServiceName = 'parking';


exports.getOutSideInfo = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;
    let binds = [outsideIdx];
    let query = await outsideMapper.getOutSideInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, getOutSideInfo, error: ', error);
    console.log('parkingManagement/outsideService.js, getOutSideInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getOutSideList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await outsideMapper.getOutSideList();
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, getOutSideList, error: ', error);
    console.log('parkingManagement/outsideService.js, getOutSideList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addOutSide = async ({ outsideName, leftLocation, topLocation, mapImageUrl, serviceType }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outsideName, leftLocation, topLocation, mapImageUrl, serviceType];
    let query = await outsideMapper.addOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("pm_buildings-update", { buildings: { 'add': res.rowCount } });
    }

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, addOutSide, error: ', error);
    console.log('parkingManagement/outsideService.js, addOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. outside(빌딩) 삭제
 * 2. inside(층) 자동삭제(cascade)
 * 3. 주차 구역(면) 삭제
 * 4. 카메라 위치 초기화(null), 카메라 연결된 outside/inside(null), 사용상태 false, 알람상태 false
 * 5. 워닝보드 삭제
 */
exports.deleteOutSide = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;
    let binds = [outsideIdx];
    let query = await outsideMapper.deleteOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    
    let deviceInList = await deviceMapper.getDeviceOutList();
    let deviceResult = await client.query(deviceInList, [outsideIdx]);
    let deviceIds = deviceResult.rows.map(row => row.idx);
    // 삭제 성공하면
    if(res && res.rowCount > 0) {
      // 주차 구역(면) 삭제
      let queryResetAreaQuery = await areaMapper.deleteAreaOutside();
      await client.query(queryResetAreaQuery, binds);

      // 카메라 초기화 
      binds = [outsideIdx, mainServiceName, null, null, null, null, null, null];
      let queryResetCamera = await cameraMapper.deleteOutsideCameraLocation();
      await client.query(queryResetCamera, binds);

      // 디바이스 초기화
      if (deviceIds.length > 0) { 
        let queryResetDevice = await deviceMapper.deleteOutsideInsideDeviceLocation();
        await client.query(queryResetDevice, [deviceIds]);
      }
    }

    await client.query('COMMIT');
    
    binds = [outsideIdx];
    let queryLatestEventOutsideInfo = await eventMapper.getLatestEventOutsideInfo();
    let resLatestEventOutsideInfo = await client.query(queryLatestEventOutsideInfo, binds);

    if(resLatestEventOutsideInfo && resLatestEventOutsideInfo.rows.length > 0) {
      // 워닝보드 삭제
      await warningBoardService.deleteWarningBoard({ 
        mainService : 'parking'
        , eventIdx: resLatestEventOutsideInfo.rows[0].event_idx 
      });
    }

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pm_buildings-update", { buildings: { 'remove': res.rowCount } });
      global.websocket.emit("pm_floors-update", { floorList: { 'remove': res.rowCount } });
      global.websocket.emit("pm_area-update", { areaList: { 'update': res.rowCount } });
      global.websocket.emit("pm_cameras-update", { cameraList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, deleteOutSide, error: ', error);
    console.log('parkingManagement/outsideService.js, deleteOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyOutSide = async ({ idx, outsideName, leftLocation, topLocation, mapImageUrl, serviceType }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;

    let binds = [outsideIdx, outsideName, leftLocation, topLocation, mapImageUrl, serviceType];
    let query = await outsideMapper.modifyOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_buildings-update", { buildings: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, modifyOutSide, error: ', error);
    console.log('parkingManagement/outsideService.js, modifyOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. outside(빌딩) 알람 상태 변경
 * 2. inside(층) 알람 상태 변경
 * 3. 카메라 알람 상태 변경
 * 4. 워닝보드 삭제
 */
exports.modifyOutSideAlarmStatus = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;
    const alarmStatus = false;

    let binds = [outsideIdx, alarmStatus];
    let query = await outsideMapper.modifyOutSideAlarmStatus();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    
    if(res.rowCount > 0) {

      // inside(층) 알람 상태 변경
      let queryResetInside = await insideMapper.modifyInsideOutsideAlarmStatus();
      await client.query(queryResetInside, binds);

      // 카메라 알람 상태 변경
      binds = [outsideIdx, mainServiceName, alarmStatus];
      let queryResetCamera = await cameraMapper.modifyOutsideCameraAlarmStatus();
      await client.query(queryResetCamera, binds);
    }
    
    await client.query('COMMIT');
    
    binds = [outsideIdx];
    let queryLatestEventOutsideInfo = await eventMapper.getLatestEventOutsideInfo();
    let resLatestEventOutsideInfo = await client.query(queryLatestEventOutsideInfo, binds);

    if(resLatestEventOutsideInfo && resLatestEventOutsideInfo.rows.length > 0) {
      // 워닝보드 삭제
      await warningBoardService.deleteWarningBoard({ 
        mainService : 'parking'
        , eventIdx: resLatestEventOutsideInfo.rows[0].event_idx 
      });
    }
    
    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pm_buildings-update", { buildings: { 'update': res.rowCount } });
      global.websocket.emit("pm_floors-update", { floorList: { 'update': res.rowCount } });
      global.websocket.emit("pm_cameras-update", { cameraList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, modifyOutSideAlarmStatus, error: ', error);
    console.log('parkingManagement/outsideService.js, modifyOutSideAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getOutsideInsideList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await outsideMapper.getOutsideInsideList();
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, getOutsideInsideList, error: ', error);
    console.log('parkingManagement/outsideService.js, getOutsideInsideList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getBuildingPlan = async () => {
  
  try {

    let imageArray = [];
    // const buildingplanPath = path.join(__dirname, '../../../', 'public', 'images', 'pm_buildingplan');
    const buildingplanPath = path.join(process.cwd(), 'public', 'images', 'pm_buildingplan');
    
    fs.readdirSync(buildingplanPath).forEach(file => {
      const url = `${serverConfig.WEB_PROTOCOL}://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/pm_buildingplan/${file}`;
      imageArray.push({
        name: file,
        url: url
      });
    });

    return imageArray;
    
  } catch (error) {
    logger.info('parkingManagement/outsideService.js, getBuildingPlan, error: ', error);
    console.log('parkingManagement/outsideService.js, getBuildingPlan, error: ', error);
  }
}

exports.modifyMapImageOutSide = async ({ idx, mapImageUrl }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;

    let binds = [outsideIdx, mapImageUrl];
    let query = await outsideMapper.modifyMapImageOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');
    
    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("pm_buildings-update", { buildings: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/outsideService.js, modifyMapImageOutSide, error: ', error);
    console.log('parkingManagement/outsideService.js, modifyMapImageOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}