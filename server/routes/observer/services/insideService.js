const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const insideMapper = require('../mappers/insideMapper');
const fs = require('fs');
const path = require('path');
const { serverConfig } = require('../../../config');
const { removeCameraLocation } = require('./cameraService');
const { removeEbellLocation } = require('./ebellService');
const { removeDoorLocation } = require('./doorService');


exports.getInSide = async ({ idx, outside_idx, three_d_model_id }) => {
  
  const client = await pool.connect();

  try {

    const inside_idx = idx;

    let binds = [];

    let query;

    if (inside_idx) {
      binds.push(inside_idx);
      query = await insideMapper.getInSideInfo();
    } else if(outside_idx) {
      // 건물 안, 층 정보 가져오기
      binds.push(outside_idx);
      query = await insideMapper.getInSideList({ outside_idx });
    } else if(three_d_model_id) {
            // 건물 안, 층 정보 가져오기
      binds.push(three_d_model_id);
      query = await insideMapper.getInSideList({ three_d_model_id });
    } else {
      // 전체 층 목록 가져오기
      query = await insideMapper.getInSideList();
    }
    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('observer/insideService.js, getInSide, error: ', error);
    console.log('observer/insideService.js, getInSide, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addInSide = async ({ inside_name, outside_idx, map_image_url = null }) => {
  
  const client = await pool.connect();

  try {

    let binds = [inside_name, outside_idx, map_image_url];
    
    let query = await insideMapper.addInSide();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if ((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("ob_floors-update", { floorList: { 'add': res.rows.length } });
    }
    
    return res.rows;

  } catch (error) {
    logger.info('observer/insideService.js, addInSide, error: ', error);
    console.log('observer/insideService.js, addInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. inside(층) 삭제
 * 2. 장비 위치 초기화(null), 장비 연결된 outside, inside 초기화(null), 카메라 초기화, 알람 상태 false
 * 3. 카메라 위치 초기화(null), 카메라 연결된 outside, inside 초기화(null), 알람 상태 false
 * 4. 이벤트 테이블 알람 상태 false
 * 5. 이벤트 테이블 알람 상태 검색, outside(빌딩) 알람 상태 확인 후 알람 상태 false
 * 6. 워닝보드 삭제
 */
exports.deleteInSide = async ({ idx, modelId }) => {
  
  const client = await pool.connect();

  try {
    let res;
    if(idx){
      const inside_idx = idx;
  
      let binds = [inside_idx];
  
      let query = await insideMapper.deleteInSideByIdx();
  
      await client.query('BEGIN');
      res = await client.query(query, binds);
  
      if(res.rowCount > 0) {
  
        // 장비 초기화
        let resetDeviceQuery = '';
        await client.query(resetDeviceQuery, binds);
  
        // 카메라 초기화
        await removeCameraLocation({ insideIdx: inside_idx, mainServiceName: 'origin' });
  
        // 출입문 초기화
        await removeDoorLocation({ insideIdx: inside_idx });
  
        // 비상벨 초기화
        await removeEbellLocation({ insideIdx: inside_idx });
      };
    } else if(modelId){
      // 3D 모델 아이디로 inside 삭제
      let binds = [modelId];
      let query = await insideMapper.deleteInSideBy3DModelId();
      await client.query('BEGIN');
      res = await client.query(query, binds);
      if(res.rowCount > 0 && res.rows.length > 0 && res.rows[0].idx) {
  
        // 장비 초기화
        let resetDeviceQuery = '';
        await client.query(resetDeviceQuery, binds);
  
        // 카메라 초기화
        await removeCameraLocation({ insideIdx: res.rows[0].idx, mainServiceName: 'origin' });
  
        // 출입문 초기화
        await removeDoorLocation({ insideIdx: res.rows[0].idx });
  
        // 비상벨 초기화
        await removeEbellLocation({ insideIdx: res.rows[0].idx });
      };
    }
    await client.query('COMMIT');

    // 웹소켓: outside(빌딩), inside(층), 장비, 카메라, 이벤트, 워닝보드
    if(global.websocket) {
      global.websocket.emit("ob_floors-update", { floorList: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('observer/insideService.js, deleteInSide, error: ', error);
    console.log('observer/insideService.js, deleteInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyInSide = async ({ idx, inside_name, map_image_url }) => {
  
  const client = await pool.connect();

  try {

    const inside_idx = idx;

    let binds;
    if(!map_image_url) {
      binds = [inside_idx, inside_name];
    } else {
      binds = [inside_idx, map_image_url]
    }

    let query = await insideMapper.modifyInSide(map_image_url);

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit("ob_floors-update", { floorList: { 'update': map_image_url } });
    }

    if (res.rowCount === 1){
      return {
        success: true
      }
    }

  } catch (error) {
    logger.info('observer/insideService.js, modifyInSide, error: ', error);
    console.log('observer/insideService.js, modifyInSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

/**
 * 1. inside(층) 알람 상태 변경
 * 2. 장비 알람 상태 변경
 * 3. 카메라 알람 상태 변경
 * 4. 이벤트 테이블 알람 상태 변경
 * 5. 이벤트 테이블 알람 상태 검색, outside(빌딩) 알람 상태 확인 후 알람 상태 변경
 * 6. 워닝보드 삭제
 */
exports.modifyInSideAlarmStatus = async ({ idx, alarm_status }) => {
  
  const client = await pool.connect();

  try {

    const inside_idx = idx;

    let binds = [inside_idx, alarm_status];

    let query = await insideMapper.modifyInSideAlarmStatus();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    if(res.rowCount > 0) {

      // 장비 알람 상태 변경
      let resetDeviceQuery = '';
      await client.query(resetDeviceQuery, binds);

      // 카메라 알람 상태 변경
      let resetCameraQuery = '';
      await client.query(resetCameraQuery, binds);

      // 이벤트 테이블 알람 상태 변경
      let resetEventQuery = '';
      await client.query(resetEventQuery, binds);

      // 이벤트 outside(빌딩) 알람 상태(true) 검색
      let searchEventQuery = '';
      let searchEventResult = await client.query(searchEventQuery, binds);
      if(searchEventResult.rows.length === 0) {
        // outside(빌딩) 알람이 없을 경우, outside(빌딩) 알람 false
        let resetOutsideQuery = '';
        await client.query(resetOutsideQuery, binds);
      }

      // 워닝보드 삭제
      let deleteWarningBoardQuery = '';
      binds.push();
      await client.query(deleteWarningBoardQuery, binds);
    }   

    await client.query('COMMIT');

    // 웹소켓: outside(빌딩), inside(층), 장비, 카메라, 이벤트, 워닝보드

    return res.rowCount;

  } catch (error) {
    logger.info('observer/insideService.js, modifyInSideAlarmStatus, error: ', error);
    console.log('observer/insideService.js, modifyInSideAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getFloorPlan = async () => {
  
  try {

    let imageArray = [];
    // const floorplanPath = path.join(__dirname, '../../../', 'public', 'images', 'floorplan');
    
    // fs.readdirSync(floorplanPath).forEach(file => {
    //   const url = `${serverConfig.WEB_PROTOCOL}://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/floorplan/${file}`;
    //   imageArray.push({
    //     name: file,
    //     url: url
    //   });
    // });
    const floorplanPath = path.join(process.cwd(), 'public', 'images', 'floorplan');

    fs.readdirSync(floorplanPath).forEach(file => {
      const url = `${serverConfig.WEB_PROTOCOL}://${serverConfig.WEBSOCKET_URL}:${serverConfig.PORT}/images/floorplan/${file}`;
      imageArray.push({
        name: file,
        url: url
      });
    });


    return imageArray;
    
  } catch (error) {
    logger.info('observer/insideService.js, getFloorPlan, error: ', error);
    console.log('observer/insideService.js, getFloorPlan, error: ', error);
  }
}