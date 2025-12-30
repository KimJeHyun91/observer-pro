const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const fs = require('fs');
const path = require('path');
const { serverConfig } = require('../../../config');
const { removeCameraLocation } = require('./cameraService');
const { removeEbellLocation } = require('./ebellService');
const { removeDoorLocation } = require('./doorService');
const { removeGuardianliteLocation } = require('./guardianliteService');


exports.getOutSide = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    let binds = [];

    let query;

    if (idx) {
      binds.push(idx);
      query = await outsideMapper.getOutSideInfo();
    } else {
      query = await outsideMapper.getOutSideList();
    }

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/outsideService.js, getOutSide, error: ', error);
    console.log('observer/outsideService.js, getOutSide, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addOutSide = async ({ outside_name, left_location, top_location, service_type }) => {
  
  const client = await pool.connect();

  try {

    let binds = [outside_name, left_location, top_location, service_type];

    let query = await outsideMapper.addOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("ob_buildings-update", { buildings: { 'add': res.rowCount } });
    }

    return res.rows;

  } catch (error) {
    logger.info('observer/outsideService.js, addOutSide, error: ', error);
    console.log('observer/outsideService.js, addOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. outside(빌딩) 삭제
 * 2. inside(층) 삭제(cascade)
 * 3. 장비 위치 초기화(null), 장비 연결된 outside, inside 초기화(null), 카메라 초기화(null), 알람 상태 false
 * 4. 카메라 위치 초기화(null), 카메라 연결된 outside, inside 초기화(null), 알람 상태 false
 * 5. 이벤트 테이블 알람 상태 false
 * 6. 워닝보드 삭제
 */
exports.deleteOutSide = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const outside_idx = idx;

    let binds = [outside_idx];

    let query = await outsideMapper.deleteOutSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    
    if(res.rowCount > 0) {

      // 장비 초기화
      let resetDeviceQuery = '';
      await client.query(resetDeviceQuery, binds);

      
      // 카메라 초기화
      await removeCameraLocation({ outsideIdx: outside_idx, mainServiceName: 'origin' });

      // 출입문 초기화
      await removeDoorLocation({ outsideIdx: outside_idx });

      // 비상벨 초기화
      await removeEbellLocation({ outsideIdx: outside_idx });

      // 이벤트 알람 초기화
      let resetEventQuery = '';
      await client.query(resetEventQuery, binds);

      // 워닝보드 삭제
      let deleteWarningBoardQuery = '';
      binds.push();
      await client.query(deleteWarningBoardQuery, binds);
    }

    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("ob_buildings-update", { buildings: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('observer/outsideService.js, deleteOutSide, error: ', error);
    console.log('observer/outsideService.js, deleteOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyOutSide = async ({ idx, outside_name, left_location, top_location, map_image_url, service_type }) => {
  
  const client = await pool.connect();

  try {
    let binds;
    if(!map_image_url) {
      binds = [idx, outside_name, left_location, top_location, service_type];
    } else {
      binds = [idx, map_image_url]
    }
    let query = await outsideMapper.modifyOutSide(map_image_url);

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("ob_buildings-update", { buildings: { 'update': map_image_url } });
    }
    if (res.rowCount === 1){
      return {
        success: true
      }
    }
  } catch (error) {
    logger.info('observer/outsideService.js, modifyOutSide, error: ', error);
    console.log('observer/outsideService.js, modifyOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. outside(빌딩) 알람 상태 변경
 * 2. inside(층) 알람 상태 변경
 * 3. 장비 알람 상태 변경
 * 4. 카메라 알람 상태 변경
 * 5. 이벤트 테이블 알람 상태 변경
 * 6. 워닝보드 삭제
 */
exports.modifyOutSideAlarmStatus = async ({ idx, alarm_status }) => {
  
  const client = await pool.connect();

  try {

    let binds = [idx, alarm_status];

    let query = await outsideMapper.modifyOutSideAlarmStatus();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    
    if(res.rowCount > 0) {

      // inside(층) 알람 상태 변경
      let resetInsideQuery = '';
      await client.query(resetInsideQuery, binds);

      // 장비 알람 상태 변경
      let resetDeviceQuery = '';
      await client.query(resetDeviceQuery, binds);

      // 카메라 알람 상태 변경
      let resetCameraQuery = '';
      await client.query(resetCameraQuery, binds);

      // 이벤트 알람 상태 변경
      let resetEventQuery = '';
      await client.query(resetEventQuery, binds);

      // 워닝보드 알람 상태 변경
      let deleteWarningBoardQuery = '';
      binds.push();
      await client.query(deleteWarningBoardQuery, binds);
    }
    
    await client.query('COMMIT');

    // 웹소켓: outside(빌딩), inside(층), 장비, 카메라, 이벤트, 워닝보드

    return res.rowCount;

  } catch (error) {
    logger.info('observer/outsideService.js, modifyOutSideAlarmStatus, error: ', error);
    console.log('observer/outsideService.js, modifyOutSideAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getBuildingPlan = async () => {
  
  try {

    let imageArray = [];
    // const buildingplanPath = path.join(__dirname, '../../../', 'public', 'images', 'buildingplan');
    const buildingplanPath = path.join(process.cwd(), 'public', 'images', 'buildingplan');
    
    fs.readdirSync(buildingplanPath).forEach(file => {
      const url = `${serverConfig.WEB_PROTOCOL}://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/buildingplan/${file}`;
      imageArray.push({
        name: file,
        url: url
      });
    });

    return imageArray;
    
  } catch (error) {
    logger.info('observer/outsideService.js, getBuildingPlan, error: ', error);
    console.log('observer/outsideService.js, getBuildingPlan, error: ', error);
  }
}

exports.getBuilding3D = async ({ serviceType }) => {
  const client = await pool.connect();

  try {
    const binds = [serviceType];
    const query = await outsideMapper.getGlbModelsBuilding();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/outsideService.js, getBuilding3D, error: ', error);
    console.log('observer/outsideService.js, getBuilding3D, error: ', error);
  } finally {
    await client.release();
  }
}
