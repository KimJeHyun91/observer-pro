const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const accessLogMapper = require('../mappers/accessLogMapper');


exports.getVehicleNumberSearchPreview = async ({ vehicleNumber }) => {
  
  const client = await pool.connect();

  try {

    let returnValue = [];

    if(vehicleNumber) {

      vehicleNumber = vehicleNumber.trim();
      vehicleNumber = vehicleNumber.replace(/ /g, '');

      let binds = ['%' + vehicleNumber + '%']; // like 문 사용으로 % 사용
      let query = await accessLogMapper.getVehicleNumberSearchPreview();
      const res = await client.query(query, binds);

      if((res) && (res.rows) && (res.rows.length > 0)) {
        returnValue = res.rows;
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getVehicleNumberSearchPreview, error: ', error);
    console.log('parkingManagement/accessLogService.js, getVehicleNumberSearchPreview, error: ', error);
  } finally {
    await client.release();
  }
}

// date param format : YYYYMMDD 
exports.getVehicleNumberSearch = async ({ vehicleNumber, startDate, endDate }) => {
  
  const client = await pool.connect();

  try {

    if(vehicleNumber) {
      vehicleNumber = vehicleNumber.trim();
      vehicleNumber = vehicleNumber.replace(/ /g, '');
    }
    
    let binds = [
      vehicleNumber
      , startDate + 'T000000'
      , endDate + 'T235959'
    ];
    let query = await accessLogMapper.getVehicleNumberSearch();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getVehicleNumberSearch, error: ', error);
    console.log('parkingManagement/accessLogService.js, getVehicleNumberSearch, error: ', error);
  } finally {
    await client.release();
  }
}

// param format : YYYYMMDD 
exports.getAccessTimeZone = async ({ startDate, endDate }) => {

  const client = await pool.connect();

  try {

    let binds = [
      startDate + 'T000000'
      , endDate + 'T235959'
      , startDate + 'T000000'
      , endDate + 'T235959'
    ];
    let query = await accessLogMapper.getAccessTimeZone();
    
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getAccessTimeZone, error: ', error);
    console.log('parkingManagement/accessLogService.js, getAccessTimeZone, error: ', error);
  } finally {
    await client.release();
  }
}

// param format : YYYYMMDD 
exports.getOutTimeZone = async ({ startDate, endDate }) => {
  
  const client = await pool.connect();

  try {

    let binds = [startDate + 'T000000', endDate + 'T235959'];
    let query = await accessLogMapper.getOutTimeZone();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getOutTimeZone, error: ', error);
    console.log('parkingManagement/accessLogService.js, getOutTimeZone, error: ', error);
  } finally {
    await client.release();
  }
}

// param format : YYYYMMDD 
exports.getAccessLogList = async ({ startDate, endDate }) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      startDate + 'T000000'
      , endDate + 'T235959'
      , startDate + 'T000000'
      , endDate + 'T235959'
    ];
    let query = await accessLogMapper.getAccessLogList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getAccessLogList, error: ', error);
    console.log('parkingManagement/accessLogService.js, getAccessLogList, error: ', error);
  } finally {
    await client.release();
  }
}

// param format : YYYYMMDD 
exports.getOutSideAccessLogList = async ({ idx, startDate, endDate }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;

    let binds = [
      startDate + 'T000000'
      , endDate + 'T235959'
      , startDate + 'T000000'
      , endDate + 'T235959'
      , outsideIdx
    ];
    let query = await accessLogMapper.getOutSideAccessLogList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('parkingManagement/accessLogService.js, getOutSideAccessLogList, error: ', error);
    console.log('parkingManagement/accessLogService.js, getOutSideAccessLogList, error: ', error);
  } finally {
    await client.release();
  }
}