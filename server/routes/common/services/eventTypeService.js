const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const { fn_mainServicePrefix } = require('../../../utils/mainServicePrefix');
const eventTypeMapper = require('../mappers/eventTypeMapper');


exports.getEventTypeList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await eventTypeMapper.getEventTypeList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('common/eventTypeService.js, getEventTypeList, error: ', error);
    console.log('common/eventTypeService.js, getEventTypeList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyEventTypes = async ({ id, severity_id, use_warning_board, use_popup, use_event_type, use_sop, main_service_name, sop_idx }) => {
  
  const client = await pool.connect();
  let mainServicePrefix = await fn_mainServicePrefix(main_service_name);
  try {

    let binds = [id, severity_id, use_warning_board, use_popup, use_event_type, use_sop, sop_idx];

    let query = await eventTypeMapper.modifyEventTypes();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');
    
    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit(`${mainServicePrefix}_event_types-update`, { 'modify': res.rowCount });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('common/eventTypeService.js, modifyEventTypes, error: ', error);
    console.log('common/eventTypeService.js, modifyEventTypes, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getEventTypeInfo = async ({ id }) => {
  
  const client = await pool.connect();

  try {

    let binds = [id];

    let query = await eventTypeMapper.getEventTypeInfo();
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('common/eventTypeService.js, getEventTypeInfo, error: ', error);
    console.log('common/eventTypeService.js, getEventTypeInfo, error: ', error);
  } finally {
    await client.release();
  }
}
