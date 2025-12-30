const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const testMapper = require('../mappers/testMapper');

exports.selectTest = async () => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    // binds.push(user_id);

    let query = await testMapper.selectTest01();

    returnValue = await client.query(query, binds);

    return returnValue.rows;

  } catch(error) {
    logger.info('aTest/testService.js, selectTest, error: ', error);
    console.log('aTest/testService.js, selectTest, error: ', error);
  } finally {
    await client.release();
  }

}

exports.insertTest = async () => {

  const client = await pool.connect();

  try {

    let returnValue;

    let binds = [];
    // binds.push(user_id);

    let query = await testMapper.insertTest();

    await client.query('BEGIN');
    await client.query(query, binds);
    await client.query('COMMIT');

    returnValue = {
      status: true,
      message: 'test successfully'
    };

    // returnValue = {
    //   status: false,
    //   message: 'test fail'
    // };

    return returnValue;

  } catch(error) {
    logger.info('aTest/testService.js, insertTest, error: ', error);
    console.log('aTest/testService.js, insertTest, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}