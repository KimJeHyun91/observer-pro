const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const serviceTypeMapper = require('../mappers/serviceTypeMapper');


exports.getServiceTypeList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await serviceTypeMapper.getServiceTypeList();    
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('common/serviceTypeService.js, getServiceTypeList, error: ', error);
    console.log('common/serviceTypeService.js, getServiceTypeList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.modifyServiceTypes = async ({ id, use_service_type }) => {
  
  const client = await pool.connect();

  try {

    let binds = [id, use_service_type];

    let query = await serviceTypeMapper.modifyServiceTypes();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("ob_eventList", { eventList: res.rowCount });
      global.websocket.emit("serviceTypes", { serviceTypes: res.rowCount });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('common/serviceTypeService.js, modifyServiceTypes, error: ', error);
    console.log('common/serviceTypeService.js, modifyServiceTypes, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getServiceTypeInfo = async ({ service_type }) => {

  const client = await pool.connect();

  try {

    let binds = [service_type];

    let query = await serviceTypeMapper.getServiceTypeInfo();
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('common/serviceTypeService.js, getServiceTypeInfo, error: ', error);
    console.log('common/serviceTypeService.js, getServiceTypeInfo, error: ', error);
  } finally {
    await client.release();
  }
}