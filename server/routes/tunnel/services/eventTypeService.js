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
    logger.info('tunnelControl/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('tunnelControl/eventTypeService.js, getEventTypeList, error: ', error);
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

    // 추후 분석
    // if((global.websocket) && (res) && (res.rowCount > 0)) {
    //   global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    //   global.websocket.emit("fl_event_type-update", { eventTypeList: {'update':res.rowCount} });
    // }

    return res.rowCount;

  } catch (error) {
    logger.info('tunnel/eventTypeService.js, modifyEventType, error: ', error);
    console.log('tunnel/eventTypeService.js, modifyEventType, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getEventList = async ({
  eventType,
  deviceType,
  deviceName,
  location,
  startTime,
  endTime,
  start,
  end,
}) => {
  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        idx,
        event_name,
        event_type_id,
        device_type,
        device_name,
        description,
        location,
        event_occurrence_time,
        event_end_time,
        severity_id,
        device_idx,
        created_at
      FROM event_log
    `;

    let paramIndex = 1;
    const conditions = [`main_service_name = $${paramIndex}`];
    const binds = ['tunnel'];
    paramIndex++;

    if (eventType && eventType !== 'all') {
      binds.push(eventType);
      conditions.push(`event_name = $${paramIndex}`);
      paramIndex++;
    }

    if (start && end) {
      conditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      binds.push(start, `${end} 23:59:59`);
      paramIndex += 2;
    }

    if (startTime && endTime) {
      conditions.push(
        `to_timestamp(event_occurrence_time, 'YYYYMMDD"T"HH24MISS')::time BETWEEN $${paramIndex}::time AND $${paramIndex + 1}::time`
      );
      binds.push(startTime, endTime);
      paramIndex += 2;
    } else if (startTime) {
      conditions.push(
        `to_timestamp(event_occurrence_time, 'YYYYMMDD"T"HH24MISS')::time >= $${paramIndex}::time`
      );
      binds.push(startTime);
      paramIndex += 1;
    } else if (endTime) {
      conditions.push(
        `to_timestamp(event_occurrence_time, 'YYYYMMDD"T"HH24MISS')::time <= $${paramIndex}::time`
      );
      binds.push(endTime);
      paramIndex += 1;
    }

    if (deviceType && deviceType !== 'all') {
      conditions.push(`device_type = $${paramIndex}`);
      binds.push(deviceType);
      paramIndex++;
    }

    if (location) {
      conditions.push(`location ILIKE '%' || $${paramIndex} || '%'`);
      binds.push(location);
      paramIndex++;
    }

    if (deviceName) {
      conditions.push(`device_name ILIKE '%' || $${paramIndex} || '%'`);
      binds.push(deviceName);
      paramIndex++;
    }


    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 500';

    const res = await client.query(query, binds);

    const result = res.rows.map(row => ({
      idx: row.idx,
      event_name: row.event_name,
      device_name : row.device_name,
      device_type : row.device_type,
      event_type_id: row.event_type_id,
      description: row.description,
      location: row.location,
      event_occurrence_time: row.event_occurrence_time,
      event_end_time: row.event_end_time,
      severity_id: row.severity_id,
      device_idx: row.device_idx,
      created_at: row.created_at
    }));

    return {
      message: 'ok',
      result: result
    };

  } catch (error) {
    logger.info('tunnel/eventTypeService.js, getEventList, error: ', error);
    console.log('tunnel/eventTypeService.js, getEventList, error: ', error);
    return {
      message: `이벤트 조회 중 오류 발생: ${error.message}`,
      result: []
    };
  } finally {
    await client.release();
  }
};