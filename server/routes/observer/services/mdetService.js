const logger = require('../../../logger');
const mdetMapper = require('../mappers/mdetMapper');
const { pool } = require('../../../db/postgresqlPool');

exports.createMDET = async ({ 
  device_name, 
  device_ip, 
  device_type = 'mdet', 
  outside_idx, 
  inside_idx, 
  top_location, 
  left_location, 
  device_location = null, 
  device_id ='',
  service_type = 'mdet'
}) => {
  const client = await pool.connect();
  try {

    const binds = [device_id, device_name, device_ip, device_type, outside_idx, inside_idx, top_location, left_location, device_location, service_type];
    const query = await mdetMapper.createMDET();

    const res = await client.query(query, binds);
    if(!res || res.rowCount !== 1){
      return {
        success: false
      };
    };
    return {
      success: true
    }
  } catch(error) {
    logger.info('observer/mdetService.js, create MDET, error: ', error);
    console.log('observer/mdetService.js, create MDET, error: ', error);
    throw new Error(error.message || 'observer/mdetService.js create MDET server error')
  } finally {
    await client.release();
  };
};

exports.getMDETs = async () => {

  const client = await pool.connect();
  try {
    const binds = ['mdet'];
    const query = mdetMapper.getMDETS();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/mdetService.js, getMDETs, error: ', error);
    console.log('observer/mdetService.js, getMDETs, error: ', error);
  } finally {
    await client.release();
  };
};