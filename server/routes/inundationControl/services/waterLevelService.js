const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const waterLevelMapper = require('../mappers/waterLevelMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const severityMapper = require('../mappers/severityMapper');
const mainServiceName = 'inundation';
const config = require('../../../config');
const axios = require('axios');

const extractIP = async (input) => {
  if (!input) return null;
  
  const parts = input.split(':');
  if (parts.length < 3) return null;
  
  const camera_id = parts[2];
  const vms_name = parts[1];
  const main_service_name = parts[0];
  
  let client;
  try {
    client = await pool.connect();

    const cameraIpQuery = `
      SELECT camera_ip 
      FROM ob_camera 
      WHERE camera_id = $1 
      AND vms_name = $2 
      AND main_service_name = $3
    `;
    const result = await client.query(cameraIpQuery, [camera_id, vms_name, main_service_name]);
    const camIp = result.rows[0]?.camera_ip; 

    return camIp;
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, extractIP, error: ', error);
    console.error('inundationControl/waterLevelService.js, extractIP, error: ', error);
    return null;
  } finally {
    if (client) {
      client.release(); 
    }
  }
};

exports.addWaterLevelDevice = async ({ waterLevelName, waterLevelLocation, waterLevelIp, waterLevelPort, waterLevelId, waterLevelPw, waterLevelModel, groundValue, waterLevelUid }) => {

  const client = await pool.connect();

  try {

    let resAddWaterLevelDevice;
    let useStatus;
    
    let returnValue = {
      status: false,
      message: 'success'
    }

    await client.query('BEGIN');

    let binds = [waterLevelIp];
    let queryWaterLevelDeviceIPInfo = await waterLevelMapper.getWaterLevelDeviceIPInfo();
    const resWaterLevelDeviceIPInfo = await client.query(queryWaterLevelDeviceIPInfo, binds);

    if(resWaterLevelDeviceIPInfo && resWaterLevelDeviceIPInfo.rows.length > 0) {

      returnValue.message = '수위계 ip 가 이미 등록되어 있습니다.';

    } else {
      returnValue.status = true;
      useStatus = true;
      const groundValueToUse = waterLevelModel === config.waterLevelModel.CP100 ? (groundValue || 10000) : 10000;
      binds = [waterLevelName, waterLevelLocation, waterLevelIp, waterLevelPort, waterLevelId, waterLevelPw, waterLevelModel, groundValueToUse, useStatus, waterLevelUid];
      let query = await waterLevelMapper.addWaterLevelDevice();
      resAddWaterLevelDevice = await client.query(query, binds);

      if (waterLevelModel === config.waterLevelModel.AIBOX) {

        const aiboxUrl = `http://${waterLevelIp}:${waterLevelPort}/seteventserver`;
        const receiveUrl = `http://14.52.96.25:60022/api/inundation/receiveDataPostB`; // pct 테스트 코드
        // const receiveUrl = `http://${config.serverConfig.IPv4}:${config.serverConfig.PORT}/api/inundation/receiveDataPostB`; // 실제 사용할 코드
        axios.post(aiboxUrl, {
          "number": 1,                     // 설정할 이벤트 넘버 1~3
          "enable": true,                  // false stop / true start
          "url":  receiveUrl,              //받을 URL 
          "protocol": "HTTP",             //대문자
          "method": "POST",                //대문자
          "snapshotEnable": false,          //스냅샷 전송 설정
          "periodicEnable": false,         //반복 전송 설정
          "latlngEnable": true,            //위경도값 전송 설정
          "period": 20                     //반복 주기 설정
        })
      }
    }
    
    if((global.websocket) && (resAddWaterLevelDevice) && (resAddWaterLevelDevice.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'add':resAddWaterLevelDevice.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':resAddWaterLevelDevice.rowCount} });
      
      if (global.waterLevelEventEmitter) {
        global.waterLevelEventEmitter.emit('waterLevelManagement', {
          cmd: 'add',
          ipaddress: waterLevelIp,
          use_status: useStatus,
          water_level_port: waterLevelPort
        });
      }
    }

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, addWaterLevelDevice, error: ', error);
    console.log('inundationControl/waterLevelService.js, addWaterLevelDevice, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.addWaterLevelToMap = async ({ leftLocation, areaCamera, selectedWaterlevel, topLocation }) => {

  const client = await pool.connect();

  try {
    if (!areaCamera) {
      throw new Error('카메라 정보가 없습니다.');
    }

    const parts = areaCamera.split(':');
    if (parts.length < 3) {
      throw new Error('카메라 정보 형식이 올바르지 않습니다.');
    }

    const main_service_name = parts[0];
    const vms_name = parts[1];
    const camera_id = parts[2];

    await client.query('BEGIN');
    let binds = [leftLocation, topLocation, selectedWaterlevel];
    let waterlevelQuery = await waterLevelMapper.addWaterLevelToMap();
    const resWaterlevel = await client.query(waterlevelQuery, binds);

    binds = [camera_id, vms_name, main_service_name, selectedWaterlevel];
    let cameraQuery = await cameraMapper.updateCameraLinkWithWaterlevel();
    const resCamera = await client.query(cameraQuery, binds);

    await client.query('COMMIT');

    if((global.websocket) && (resWaterlevel) && (resWaterlevel.rowCount > 0) && (resCamera) && (resCamera.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':resWaterlevel.rowCount} });
      global.websocket.emit("fl_camears-update", { cameraList: {'update':resCamera.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':resWaterlevel.rowCount} });
    }

    return resWaterlevel.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, addWaterLevelToMap, error: ', error);
    console.log('inundationControl/waterLevelService.js, addWaterLevelToMap, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.removeWaterlevelToMap = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const waterLevelIdx = idx;

    await client.query('BEGIN');
    let binds = [waterLevelIdx];
    let query = await waterLevelMapper.removeWaterLevelToMap();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, modifyWaterLevelDevice, error: ', error);
    console.log('inundationControl/waterLevelService.js, modifyWaterLevelDevice, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.modifyWaterLevelDevice = async ({ idx, waterLevelName, waterLevelLocation, waterLevelIp, waterLevelPort, waterLevelId, waterLevelPw, groundValue, waterLevelUid }) => {

  const client = await pool.connect();

  try {

    const waterLevelIdx = idx;

    await client.query('BEGIN');
    const groundValueToUse = groundValue || 10000;
    let binds = [waterLevelIdx, waterLevelName, waterLevelLocation, waterLevelIp, waterLevelPort, waterLevelId, waterLevelPw, groundValueToUse, waterLevelUid];
    let query = await waterLevelMapper.modifyWaterLevelDevice();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
      
      // 수위계 연결 관리 이벤트 발생
      if (global.waterLevelEventEmitter) {
        global.waterLevelEventEmitter.emit('waterLevelManagement', {
          cmd: 'modify',
          ipaddress: waterLevelIp,
          use_status: true,
          water_level_port: waterLevelPort
        });
      }
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, modifyWaterLevelDevice, error: ', error);
    console.log('inundationControl/waterLevelService.js, modifyWaterLevelDevice, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getWaterLevelDeviceList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await waterLevelMapper.getWaterLevelDeviceList();
    const resWaterLevelDeviceList = await client.query(query, binds);

    query = await severityMapper.getSeverityList();
    const resSeverityList = await client.query(query, binds);
    
    if(resWaterLevelDeviceList && resWaterLevelDeviceList.rows.length > 0) {

      for(let i in resWaterLevelDeviceList.rows) {

        const currWaterLevel = resWaterLevelDeviceList.rows[i].curr_water_level; // 수위계별 현재 수위
        const threshold = resWaterLevelDeviceList.rows[i].threshold; // 수위계별 임계치

        for(let j in resSeverityList.rows) {
          
          const classify = resSeverityList.rows[j].classify; // 수위별 분류 기준
          
          const lastLength = resSeverityList.rows.length - 1;
          
          const severity = resSeverityList.rows[lastLength].severity;
          const severity_en = resSeverityList.rows[lastLength].severity_en;
          const severity_color = resSeverityList.rows[lastLength].severity_color;

          if(currWaterLevel >= (threshold * classify)) {

            if(threshold == 0) {
              resWaterLevelDeviceList.rows[i].severity = severity;
              resWaterLevelDeviceList.rows[i].severity_en = severity_en;
              resWaterLevelDeviceList.rows[i].severity_color = severity_color;
            } else {
              resWaterLevelDeviceList.rows[i].severity = resSeverityList.rows[j].severity;
              resWaterLevelDeviceList.rows[i].severity_en = resSeverityList.rows[j].severity_en;
              resWaterLevelDeviceList.rows[i].severity_color = resSeverityList.rows[j].severity_color;
            }
            
            break;
          }
        } // for j
      } // for i
    }

    return resWaterLevelDeviceList.rows;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getWaterLevelDeviceList, error: ', error);
    console.log('inundationControl/waterLevelService.js, getWaterLevelDeviceList, error: ', error);
  } finally {
    await client.release();
  }
};

exports.getTargetWaterlevelLog = async ({ water_level_idx }) => {
  const client = await pool.connect();
  try {

    await client.query('BEGIN');
    let binds = [water_level_idx];
    let query = await waterLevelMapper.getTargetWaterlevelLog();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    return res.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('waterLevelService.js, getTargetWaterlevelLog, error:', error);
    throw error;
  } finally {
    await client.release();
  }
}

exports.getAllWaterlevelLog = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = await waterLevelMapper.getAllWaterlevelLog();
    const result = await client.query(query);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    console.error('waterLevelService.js, getAllWaterlevelLog, error:', error);
    throw error;
  } finally {
    await client.release();
  }
};

exports.deleteWaterLevel = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const waterLevelDeviceIdx = idx;

    let infoQuery = await waterLevelMapper.getWaterLevelInfoByIdx();
    const infoResult = await client.query(infoQuery, [waterLevelDeviceIdx]);
    const waterLevelInfo = infoResult.rows[0];

    const { water_level_ip, water_level_port, water_level_model, water_level_uid } = waterLevelInfo;

    await client.query('BEGIN');
    
    const deleteLogQuery = 'DELETE FROM fl_water_level_log WHERE water_level_idx = $1';
    const logDeleteResult = await client.query(deleteLogQuery, [waterLevelDeviceIdx]);
    
    const deleteEventLogQuery = `
      DELETE FROM event_log 
      WHERE main_service_name = 'inundation' 
      AND device_type = 'waterlevel' 
      AND water_level_idx = $1
    `;
    const eventLogDeleteResult = await client.query(deleteEventLogQuery, [waterLevelDeviceIdx]);
    
    // 수위계 삭제
    let binds = [waterLevelDeviceIdx];
    let query = await waterLevelMapper.deleteWaterLevel();
    const res = await client.query(query, binds);

    if (water_level_model === config.waterLevelModel.AIBOX) {

        const aiboxUrl = `http://${water_level_ip}:${water_level_port}/seteventserver`;
        // const receiveUrl = `http://14.52.96.25:60022/api/inundation/receiveDataPostB`; // pct 테스트 코드
        const receiveUrl = `http://${config.serverConfig.IPv4}:${config.serverConfig.PORT}/api/inundation/receiveDataPostB`; // 실제 사용할 코드
        axios.post(aiboxUrl, {
          "number": 1,                     // 설정할 이벤트 넘버 1~3
          "enable": false,                  // false stop / true start
          "url":  receiveUrl,              //받을 URL 
          "protocol": "HTTP",             //대문자
          "method": "POST",                //대문자
          "snapshotEnable": false,          //스냅샷 전송 설정
          "periodicEnable": false,         //반복 전송 설정
          "latlngEnable": true,            //위경도값 전송 설정
          "period": 20                     //반복 주기 설정
        })
      }

    query = await waterLevelMapper.deleteOutsideWaterLevelIdx();
    await client.query(query, binds);

    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'delete':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
      
      // 수위계 연결 관리 이벤트 발생
      if (global.waterLevelEventEmitter && waterLevelInfo) {
        global.waterLevelEventEmitter.emit('waterLevelManagement', {
          cmd: 'remove',
          ipaddress: waterLevelInfo.water_level_ip,
          use_status: false,
          water_level_port: waterLevelInfo.water_level_port,
          water_level_uid: water_level_uid
        });
      }
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, deleteWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelService.js, deleteWaterLevel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.modifyThresholdWaterLevel = async ({ idx, threshold }) => {

  const client = await pool.connect();

  try {

    const waterLevelDeviceIdx = idx;

    await client.query('BEGIN');
    let binds = [waterLevelDeviceIdx, threshold];
    let query = await waterLevelMapper.modifyThresholdWaterLevel();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, modifyThresholdWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelService.js, modifyThresholdWaterLevel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getOutsideWaterLevelList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await waterLevelMapper.getOutsideWaterLevelList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getOutsideWaterLevelList, error: ', error);
    console.log('inundationControl/waterLevelService.js, getOutsideWaterLevelList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addOutsideWaterLevel = async ({ waterlevelIdx, crossingGateIds, autoControlEnabled = false }) => {

  const client = await pool.connect();

  try {
    
    await client.query('BEGIN');
    const results = [];
    for (const outsideIdx of crossingGateIds) {
      const binds = [outsideIdx, waterlevelIdx, autoControlEnabled];
      const query = await waterLevelMapper.addOutsideWaterLevel();
      const res = await client.query(query, binds);
      results.push(res);
    }
    await client.query('COMMIT');

    if(global.websocket && results.some(res => res.rowCount > 0)) {
      global.websocket.emit("fl_areaList-update", { areaList: { 'update': true } });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update': true} });
      global.websocket.emit("fl_event-update", { eventList: {'update': true} });
    }

    return {
      status: true,
      message: 'success',
      rowCount: results.reduce((sum, res) => sum + res.rowCount, 0)
    };

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, addOutsideWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelService.js, addOutsideWaterLevel, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      message: error.message || '연동 실패',
      error: error
    };
  } finally {
    await client.release();
  }
}

exports.updateOutsideWaterLevel = async ({ waterlevelIdx, crossingGateIds, autoControlEnabled = true }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deleteQuery = 'DELETE FROM fl_outside_water_level WHERE water_level_idx = $1';
    const deleteResult = await client.query(deleteQuery, [waterlevelIdx]);

    const results = [];

    if (crossingGateIds && crossingGateIds.length > 0) {
      const insertQuery = `
        INSERT INTO fl_outside_water_level (outside_idx, water_level_idx, auto_control_enabled) 
        VALUES ($1, $2, $3)
      `;

      for (const outsideIdx of crossingGateIds) {
        const res = await client.query(insertQuery, [outsideIdx, waterlevelIdx, autoControlEnabled]);
        results.push(res);
      }
    }

    await client.query('COMMIT');

    if (global.websocket && (deleteResult.rowCount > 0 || results.some(res => res.rowCount > 0))) {
      global.websocket.emit("fl_areaList-update", { areaList: { 'update': true } });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: { 'update': true } });
      global.websocket.emit("fl_event-update", { eventList: { 'update': true } });
    }

    return {
      success: true,
      rowCount: deleteResult.rowCount + results.reduce((sum, res) => sum + res.rowCount, 0)
    };
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, updateOutsideWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelService.js, updateOutsideWaterLevel, error: ', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

exports.changeUseStatus = async ({ idx, useStatus }) => {

  const client = await pool.connect();

  try {

    const waterLevelDeviceIdx = idx;

    await client.query('BEGIN');
    let binds = [waterLevelDeviceIdx, useStatus];
    let query = await waterLevelMapper.changeUseStatus();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, changeUseStatus, error: ', error);
    console.log('inundationControl/waterLevelService.js, changeUseStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteOutsideIdxWaterLevelIdx = async ({ waterLevelIdx, outsideIdx }) => {

  const client = await pool.connect();

  try {

    await client.query('BEGIN');
    let binds = [outsideIdx, waterLevelIdx];
    let query = await waterLevelMapper.deleteOutsideIdxWaterLevelIdx();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_areaList-update", { areaList: { 'update': res.rowCount } });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, deleteOutsideIdxWaterLevelIdx, error: ', error);
    console.log('inundationControl/waterLevelService.js, deleteOutsideIdxWaterLevelIdx, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getWaterLevelSeverityList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await waterLevelMapper.getWaterLevelDeviceList();
    const resWaterLevelDeviceList = await client.query(query, binds);

    query = await severityMapper.getSeverityList();
    const resSeverityList = await client.query(query, binds);

    if(resWaterLevelDeviceList && resWaterLevelDeviceList.rows.length > 0) {

      for(let i in resWaterLevelDeviceList.rows) {

        const currWaterLevel = resWaterLevelDeviceList.rows[i].curr_water_level; // 수위계별 현재 수위
        const threshold = resWaterLevelDeviceList.rows[i].threshold; // 수위계별 임계치

        for(let j in resSeverityList.rows) {
          
          const classify = resSeverityList.rows[j].classify; // 수위별 분류 기준

          if((currWaterLevel != 0) && (currWaterLevel >= (threshold * classify))) {
            resSeverityList.rows[j].count += 1;
            break;
          }
        } // for j
      } // for i
    }
    
    return resSeverityList.rows;

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getWaterLevelSeverityList, error: ', error);
    console.log('inundationControl/waterLevelService.js, getWaterLevelSeverityList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.updateAreaPosition = async ({ idx, topLocation, leftLocation }) => {

  const client = await pool.connect();

  try {
    let checkOutsideIdx = idx;
    if (!Number.isInteger(checkOutsideIdx)) {
      checkOutsideIdx = parseInt(checkOutsideIdx);
    }

    let binds = [checkOutsideIdx, topLocation, leftLocation];

    let query = await outsideMapper.updateAreaPosition();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/outsideService.js, updateAreaPosition, error: ', error);
    console.log('inundationControl/outsideService.js, updateAreaPosition, error: ', error);
  } finally {
    await client.release();
  }
};

exports.updateWaterlevelPosition = async ({ idx, topLocation, leftLocation }) => {

  const client = await pool.connect();

  try {

    let checkOutsideIdx = idx;
    if (!Number.isInteger(checkOutsideIdx)) {
      checkOutsideIdx = parseInt(checkOutsideIdx);
    }

    let binds = [checkOutsideIdx, topLocation, leftLocation];

    let query = await waterLevelMapper.updateWaterlevelPosition();

    const res = await client.query(query, binds);

    return res.rows;
  } catch (error) {
    logger.info('inundationControl/outsideService.js, updateWaterlevelPosition, error: ', error);
    console.log('inundationControl/outsideService.js, updateWaterlevelPosition, error: ', error);
  } finally {
    await client.release();
  }
};

exports.addWaterLevelAutoControl = async ({ waterlevelIdx, crossingGateIds, autoControlEnabled = true, controlMode = 'individual' }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    const deleteQuery = await waterLevelMapper.deleteWaterLevelAutoControl();
    await client.query(deleteQuery, [waterlevelIdx]);

    const results = [];
    
    if (crossingGateIds && crossingGateIds.length > 0) {
      const insertQuery = await waterLevelMapper.addWaterLevelAutoControl();
      
      for (const outsideIdx of crossingGateIds) {
        const res = await client.query(insertQuery, [waterlevelIdx, outsideIdx, autoControlEnabled, controlMode]);
        results.push(res);
      }
    }

    await client.query('COMMIT');

    if (global.websocket && results.some(res => res.rowCount > 0)) {
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update': true} });
      global.websocket.emit("fl_event-update", { eventList: {'update': true} });
    }

    return {
      status: true,
      message: 'success',
      rowCount: results.reduce((sum, res) => sum + res.rowCount, 0)
    };

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, addWaterLevelAutoControl, error: ', error);
    console.log('inundationControl/waterLevelService.js, addWaterLevelAutoControl, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      message: error.message || '자동제어 설정 실패',
      error: error
    };
  } finally {
    client.release();
  }
};

exports.getWaterLevelAutoControl = async () => {
  const client = await pool.connect();

  try {
    const query = await waterLevelMapper.getWaterLevelAutoControl();
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getWaterLevelAutoControl, error: ', error);
    console.log('inundationControl/waterLevelService.js, getWaterLevelAutoControl, error: ', error);
    return [];
  } finally {
    client.release();
  }
};

// 수위계 그룹 관련 서비스 함수들
exports.createWaterLevelGroup = async ({ groupName, thresholdMode, waterLevelIds, disableIndividualControl }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 그룹 생성
    const createGroupQuery = await waterLevelMapper.createWaterLevelGroup();
    const groupResult = await client.query(createGroupQuery, [groupName, thresholdMode]);
    const groupId = groupResult.rows[0].idx;

    // 수위계 매핑 추가
    const addMappingQuery = await waterLevelMapper.addWaterLevelGroupMapping();
    for (let i = 0; i < waterLevelIds.length; i++) {
      const role = i === 0 ? 'primary' : 'secondary';
      await client.query(addMappingQuery, [groupId, waterLevelIds[i], role]);
    }

    // 개별 제어 비활성화 처리
    if (disableIndividualControl) {
      const controlMode = 'group_only';
      console.log(`[그룹 생성] 개별 제어 비활성화 모드로 설정: ${controlMode}`);
      
      // 기존 individual 레코드를 group_only로 업데이트
      const updateControlQuery = `
        UPDATE fl_water_level_auto_control 
        SET control_mode = $1, updated_at = NOW()
        WHERE water_level_idx = ANY($2)
      `;
      await client.query(updateControlQuery, [controlMode, waterLevelIds]);
      console.log(`[그룹 생성] 수위계 ${waterLevelIds.join(', ')} 제어 모드를 ${controlMode}로 업데이트 완료`);
    } else {
      console.log(`[그룹 생성] 하이브리드 모드로 설정 - 개별 제어 허용`);
    }

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("fl_waterLevelGroups-update", { waterLevelGroups: {'update': true} });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update': true} });
    }

    return {
      status: true,
      message: 'success',
      groupId: groupId
    };

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, createWaterLevelGroup, error: ', error);
    console.log('inundationControl/waterLevelService.js, createWaterLevelGroup, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      message: 'error',
      error: error.message
    };
  } finally {
    client.release();
  }
};

exports.updateWaterLevelGroup = async ({ groupId, groupName, thresholdMode, waterLevelIds, disableIndividualControl }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 그룹 정보 업데이트
    const updateGroupQuery = await waterLevelMapper.updateWaterLevelGroup();
    await client.query(updateGroupQuery, [groupName, thresholdMode, groupId]);

    // 기존 매핑 삭제
    const deleteMappingQuery = await waterLevelMapper.deleteWaterLevelGroupMapping();
    await client.query(deleteMappingQuery, [groupId]);

    // 새로운 매핑 추가
    const addMappingQuery = await waterLevelMapper.addWaterLevelGroupMapping();
    for (let i = 0; i < waterLevelIds.length; i++) {
      const role = i === 0 ? 'primary' : 'secondary';
      await client.query(addMappingQuery, [groupId, waterLevelIds[i], role]);
    }

    // 개별 제어 모드 업데이트
    const controlMode = disableIndividualControl ? 'group_only' : 'individual';
    console.log(`[그룹 수정] 제어 모드 설정: ${controlMode}`);
    
    // 기존 individual 레코드를 새로운 모드로 업데이트
    const updateControlQuery = `
      UPDATE fl_water_level_auto_control 
      SET control_mode = $1, updated_at = NOW()
      WHERE water_level_idx = ANY($2)
    `;
    await client.query(updateControlQuery, [controlMode, waterLevelIds]);
    console.log(`[그룹 수정] 수위계 ${waterLevelIds.join(', ')} 제어 모드를 ${controlMode}로 업데이트 완료`);

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("fl_waterLevelGroups-update", { waterLevelGroups: {'update': true} });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update': true} });
    }

    return {
      status: true,
      message: 'success'
    };

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, updateWaterLevelGroup, error: ', error);
    console.log('inundationControl/waterLevelService.js, updateWaterLevelGroup, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      message: 'error',
      error: error.message
    };
  } finally {
    client.release();
  }
};

exports.deleteWaterLevelGroup = async ({ groupId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 그룹 삭제 (CASCADE로 매핑도 자동 삭제됨)
    const deleteGroupQuery = await waterLevelMapper.deleteWaterLevelGroup();
    await client.query(deleteGroupQuery, [groupId]);

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("fl_waterLevelGroups-update", { waterLevelGroups: {'update': true} });
      global.websocket.emit("fl_waterlevels-update", { waterLevelList: {'update': true} });
    }

    return {
      status: true,
      message: 'success'
    };

  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, deleteWaterLevelGroup, error: ', error);
    console.log('inundationControl/waterLevelService.js, deleteWaterLevelGroup, error: ', error);
    await client.query('ROLLBACK');
    return {
      status: false,
      message: 'error',
      error: error.message
    };
  } finally {
    client.release();
  }
};

exports.getWaterLevelGroups = async () => {
  const client = await pool.connect();

  try {
    const query = await waterLevelMapper.getWaterLevelGroups();
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getWaterLevelGroups, error: ', error);
    console.log('inundationControl/waterLevelService.js, getWaterLevelGroups, error: ', error);
    return [];
  } finally {
    client.release();
  }
};

exports.getWaterLevelGroupDetail = async ({ groupId }) => {
  const client = await pool.connect();

  try {
    const query = await waterLevelMapper.getWaterLevelGroupDetail();
    const result = await client.query(query, [groupId]);
    
    if (result.rows.length > 0) {
      const groupData = result.rows[0];
      return {
        group: {
          idx: groupData.idx,
          group_name: groupData.group_name,
          threshold_mode: groupData.threshold_mode,
          created_at: groupData.created_at
        },
        waterLevels: groupData.waterlevels || []
      };
    }
    
    return null;
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getWaterLevelGroupDetail, error: ', error);
    console.log('inundationControl/waterLevelService.js, getWaterLevelGroupDetail, error: ', error);
    return null;
  } finally {
    client.release();
  }
};

exports.getAvailableWaterLevels = async () => {
  const client = await pool.connect();

  try {
    const query = await waterLevelMapper.getAvailableWaterLevels();
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    logger.info('inundationControl/waterLevelService.js, getAvailableWaterLevels, error: ', error);
    console.log('inundationControl/waterLevelService.js, getAvailableWaterLevels, error: ', error);
    return [];
  } finally {
    client.release();
  }
};

