const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const parkingTypeMapper = require('../mappers/parkingTypeMapper');


exports.getParkingTypeList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await parkingTypeMapper.getParkingTypeList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/parkingTypeService.js, getParkingTypeList, error: ', error);
    console.log('parkingManagement/parkingTypeService.js, getParkingTypeList, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}