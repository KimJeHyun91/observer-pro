const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const eventMapper = require('../mappers/eventMapper');
const commmonMapper = require('../../common/mappers/commonMapper');
const { syncCameraAlarmStatus } = require('./cameraService');
const { syncDeviceAlarmStatus } = require('./deviceService');
const { syncPIDSZoneAlarmStatus } = require('./pidsService');
const { formatSOPText } = require('../../../utils/formatText');

exports.getEventsGroupByImportance = async ({ startDate, endDate, outsideIdx }) => {

  const client = await pool.connect();

  try {

    let binds;

    if(outsideIdx){
      binds = [startDate, endDate, 'origin', outsideIdx];
    } else {
      binds = [startDate, endDate, 'origin'];
    }
    let query = await eventMapper.getEventsGroupByImportance(outsideIdx);    
    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('main/eventService.js, getEventsGroupByImportance, error: ', error);
    console.log('main/eventService.js, getEventsGroupByImportance, error: ', error);
    throw new Error(error.message || 'getEventsGroupByImportance eventService error');
  } finally {
    await client.release();
  };
};

exports.getEventsGroupByAck = async ({ startDate, endDate, outsideIdx }) => {

  const client = await pool.connect();

  try {

    let binds;

    if(outsideIdx){
      binds = [startDate, endDate, 'origin', outsideIdx];
    } else {
      binds = [startDate, endDate, 'origin'];
    }

    let query = await eventMapper.getEventsGroupByAck(outsideIdx);    
    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('main/eventService.js, getEventsGroupByAck, error: ', error);
    console.log('main/eventService.js, getEventsGroupByAck, error: ', error);
    throw new Error(error.message || 'getEventsGroupByAck eventService error');
  } finally {
    await client.release();
  };
};

exports.getEventsGroupBySOP = async ({ startDate, endDate }) => {

  const client = await pool.connect();

  try {
    
    const binds = [startDate, endDate, 'origin'];

    let query = await eventMapper.getEventsGroupBySOP();    
    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('main/eventService.js, getEventsGroupBySOP, error: ', error);
    console.log('main/eventService.js, getEventsGroupBySOP, error: ', error);
    throw new Error(error.message || 'getEventsGroupBySOP eventService error');
  } finally {
    await client.release();
  };
};

exports.getEventsGroupByDevice = async ({ startDate, endDate, outsideIdx }) => {

  const client = await pool.connect();
  try {
    let binds;
    if(outsideIdx != null){
      binds = [startDate, endDate, 'origin', outsideIdx];
    } else {
      binds = [startDate, endDate, 'origin'];
    };
    let query;

    if(outsideIdx != null){
      query = await eventMapper.getEventsGroupByDevice();    
    } else {
      query = await eventMapper.getEventsGroupByDeviceDashboard();    
    }
    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('main/eventService.js, getEventsGroupByDevice, error: ', error);
    console.log('main/eventService.js, getEventsGroupByDevice, error: ', error);
    throw new Error(error.message || 'getEventsGroupByDevice eventService error');
  } finally {
    await client.release();
  };
};

exports.getEventsGroupByEventName = async ({ startDate, endDate }) => {

  const client = await pool.connect();

  try {
    const binds = [startDate, endDate, 'origin'];
    const query = await eventMapper.getEventsGroupByEventName();    

    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('main/eventService.js, getEventsGroupByEventName, error: ', error);
    console.log('main/eventService.js, getEventsGroupByEventName, error: ', error);
    throw new Error(error.message || 'getEventsGroupByEventName eventService error');
  } finally {
    await client.release();
  };
};


exports.getEventList = async ({ sort, filter, outsideIdx }) => {

  const client = await pool.connect();

  try {
    let query;
    if(sort === 'latest'){
      query = await eventMapper.getEventListByLatest(filter, outsideIdx);  
    } else if(sort === 'severity'){
      query = await eventMapper.getEventListBySeverityId(filter, outsideIdx);  
    }
    const res = await client.query(query);
    return res.rows;
  } catch(error) {
    logger.info('main/eventService.js, getEventList, error: ', error);
    console.log('main/eventService.js, getEventList, error: ', error);
    throw new Error(error.message || 'getEventList eventService error');
  } finally {
    await client.release();
  };
};

exports.ackEvents = async ({ idxArray, userId, outsideIdx, falseAlarmIdx, ackCount = null, isSOP = false }) => {

  const client = await pool.connect();
  try {
    if (!idxArray || idxArray.length === 0) {
      return { 
        success: false,
        message: "메인 이벤트 로거 확인 데이터가 없습니다 : " + idxArray.length 
      };
    }
    const idxList = idxArray.map(event => event.idx);
    let binds;
    let query;
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    if(outsideIdx == null && falseAlarmIdx == null){
      binds = [userId, kst.toISOString().replace(/[-:.Z]/g, "").slice(0, 15) , idxList, 'origin', ackCount];
      query = await eventMapper.ackEvents();
    } else if(outsideIdx == null && falseAlarmIdx) {
      binds = [userId, kst.toISOString().replace(/[-:.Z]/g, "").slice(0, 15) , idxList, falseAlarmIdx, 'origin'];
      query = await eventMapper.ackEventSOPFalseAlarm(outsideIdx);
    } else {
      binds = [userId, kst.toISOString().replace(/[-:.Z]/g, "").slice(0, 15) , idxList, outsideIdx, 'origin'];
      query = await eventMapper.ackEventsInBuilding();
    }
    const res = await client.query(query, binds);
    if(res.rowCount === 0 || !global.websocket){
      return {
        success: false
      };
    };
    if(res.rows[0].device_type === 'door' | 'ebell') {
      syncDeviceAlarmStatus();
    } else if(res.rows[0].device_type === 'camera'){
      syncCameraAlarmStatus();
    } else if(res.rows[0].device_type === 'pids'){
      syncPIDSZoneAlarmStatus();
    };
    if(isSOP){
      global.websocket.emit('ob_events-SOP', {
        SOPEvent: {
          eventIdx: idxList[0],
          isAck: true
        }
      });
    }
    global.websocket.emit("ob_events-update", { eventList: { 'update': res.rowCount } });
    global.websocket.emit("cm_event_log-update", { eventLogCheck: { 'update': res.rowCount } });
    return {
      success: (res.rowCount > 0)
    }
  } catch(error) {
    logger.info('main/eventService.js, ackEvents, error: ', error);
    console.log('main/eventService.js, ackEvents, error: ', error);
    throw new Error(error.message || 'ackEvents eventService error');
  } finally {
    await client.release();
  };
};

exports.searchEvents = async ({ 
  eventName, 
  severityId, 
  startDate,
  startTime,
  endDate,
  endTime,
  location,
  deviceType,
  deviceName,
  deviceIp,
  isAck 
}) => {
  const client = await pool.connect();
  try {
    const { query, binds } = await eventMapper.searchEvents({ 
      eventName, 
      severityId, 
      startDate,
      startTime,
      endDate,
      endTime,
      location, 
      deviceType,
      deviceName, 
      deviceIp, 
      isAck
    });
    const res = await client.query(query, binds);
    return res.rows;
  } catch(error) {
    logger.info('main/eventService.js, getSearchEvents, error: ', error);
    console.log('main/eventService.js, getSearchEvents, error: ', error);
    throw new Error(error.message || 'getSearchEvents eventService error');
  } finally {
    await client.release();
  };
};

exports.searchEventsBySOP = async ({ 
  eventName, 
  isTruePositive, 
  location,
  startDate,
  startTime,
  endDate,
  endTime,
}) => {
  const client = await pool.connect();
  try {
    const { query, binds } = await eventMapper.searchEventsBySOP({ 
      eventName, 
      isTruePositive, 
      location,
      startDate,
      startTime,
      endDate,
      endTime,
    });
    const res = await client.query(query, binds);
    return res.rows;
  } catch(error) {
    logger.info('main/eventService.js, searchEventsBySOP, error: ', error);
    console.log('main/eventService.js, searchEventsBySOP, error: ', error);
    throw new Error(error.message || 'searchEventsBySOP eventService error');
  } finally {
    await client.release();
  };
};

exports.getEventSOPByIdx = async ({ idx }) => {

  const client = await pool.connect();
  try {
    const query = await eventMapper.findEventsByIdx();
    let binds = [idx];
    const res = await client.query(query, binds);
    let sopStatement = '';
    if(res.rows[0].false_alarm_idx){
      const falseAlarmQuery = await commmonMapper.getFalseAlarm();
      binds = [res.rows[0].false_alarm_idx];
      const falseAlarmRes = await client.query(falseAlarmQuery, binds);
      res.rows[0].false_alarm_type = falseAlarmRes.rows[0].type;
    } else {
      const sopQuery = await commmonMapper.getSOPStageList();
      binds = [res.rows[0].sop_idx];
      const sopStageRes = await client.query(sopQuery, binds);
      sopStatement = formatSOPText(sopStageRes.rows, res.rows[0].is_clear_sop_stage);
      res.rows[0].false_alarm_type = '';
    }

    return { ...res.rows[0], sopStatement };
  } catch(error) {
    logger.info('main/eventService.js, getEventByIdx, error: ', error);
    console.log('main/eventService.js, getEventByIdx, error: ', error);
    throw new Error(error.message || 'getEventByIdx eventService error');
  } finally {
    await client.release();
  };
};