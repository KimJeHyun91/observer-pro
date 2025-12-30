const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const eventTypeMapper = require('../mappers/eventTypeMapper');


exports.getEventTypeList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await eventTypeMapper.getEventTypeList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
  } finally {
    await client.release();
  }
}


exports.getEventLogList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await eventTypeMapper.getEventLogList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.parkingEventLogSearchList = async ({eventType, deviceName, deviceType, eventDate, eventTime}) => {

  const client = await pool.connect();

  try {

    const binds = [];
    const query_where = [`e.main_service_name LIKE 'parking'`];

    const startDate = eventDate.startDate;
    const endDate = eventDate.endDate;

    const startTime = eventTime.startTime || '00:00';
    const endTime = eventTime.endTime || '23:59';

    const startDateTime = `${startDate} ${startTime}`;
    const endDateTime = `${endDate} ${endTime}`;

    query_where.push(`TO_TIMESTAMP(LEFT(e.event_occurrence_time, 15), 'YYYYMMDD"T"HH24MISS') BETWEEN TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($2, 'YYYY-MM-DD HH24:MI')`);
    binds.push(startDateTime, endDateTime);

    if (eventType.value === 'network') {
      query_where.push(`e.event_type_id = 41`);
    } else if (eventType.value === 'carFull') {
      query_where.push(`e.event_type_id = 35`);
    }

    if (deviceType.value !== 'deviceAll') {
      query_where.push(`e.device_type = '${deviceType.value}'`);
    }

    if (deviceName.trim() !== '') {
      query_where.push(`d.device_no16 LIKE '%' || $${binds.length + 1} || '%'`);
      binds.push(deviceName.trim());
    }

    const query = `
      SELECT 
        e.*,                
        d.idx AS pmDevice_idx, 
        d.device_ip,
        d.device_no16
      FROM
        event_log e
      LEFT JOIN 
        pm_device d ON d.idx = e.device_idx
      WHERE 
        ${query_where.join(' AND ')}
      ORDER BY 
        TO_TIMESTAMP(LEFT(e.event_occurrence_time, 15), 'YYYYMMDD"T"HH24MISS') DESC
    `;

    const res = await client.query(query, binds);
    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('parkingManagement/eventTypeService.js, getEventTypeList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyEventType = async ({ eventTypeId, severityId, useWarningBoard, usePopup, useEventType }) => {

  const client = await pool.connect();

  try {
    
    await client.query('BEGIN');
    let binds = [eventTypeId, severityId, useWarningBoard, usePopup, useEventType];
    let query = await eventTypeMapper.modifyEventType();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("pm_event-update", { eventList: {'update':res.rowCount} });
      global.websocket.emit("pm_event_type-update", { eventTypeList: {'update':res.rowCount} });
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('parkingManagement/eventTypeService.js, modifyEventType, error: ', error);
    console.log('parkingManagement/eventTypeService.js, modifyEventType, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}