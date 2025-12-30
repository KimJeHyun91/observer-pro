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
    logger.info('inundationControl/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('inundationControl/eventTypeService.js, getEventTypeList, error: ', error);
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
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
      global.websocket.emit("fl_event_type-update", { eventTypeList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/eventTypeService.js, modifyEventType, error: ', error);
    console.log('inundationControl/eventTypeService.js, modifyEventType, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}