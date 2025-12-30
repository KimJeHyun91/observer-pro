const { isArray, slice } = require('lodash');
const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const billboardMapper = require('../mappers/billboardMapper');


exports.addBillboardMacro = async ({ billboardMsg, billboardColor }) => {

  const client = await pool.connect();

  try {

    let binds = [billboardMsg, billboardColor];

    await client.query('BEGIN');
    let query = await billboardMapper.addBillboardMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_billboards-update", { billboardList: {'add':res.rowCount} });
    }

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, addBillboardMacro, error: ', error);
    console.log('inundationControl/billboardService.js, addBillboardMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.modifyBillboardMacro = async ({ idx, billboardMsg, billboardColor }) => {

  const client = await pool.connect();

  try {

    const billboardIdx = idx;

    await client.query('BEGIN');
    let binds = [billboardIdx, billboardMsg, billboardColor];
    let query = await billboardMapper.modifyBillboardMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_billboards-update", { billboardList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, modifyBillboardMacro, error: ', error);
    console.log('inundationControl/billboardService.js, modifyBillboardMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.getBillboardMacroList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await billboardMapper.getBillboardMacroList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, getBillboardMacroList, error: ', error);
    console.log('inundationControl/billboardService.js, getBillboardMacroList, error: ', error);
  } finally {
    await client.release();
  }
};

exports.deleteBillboardMacro = async ({ billboardMessageIdx }) => {
  const idxList = isArray(billboardMessageIdx) ? billboardMessageIdx : [billboardMessageIdx];
  

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    let binds = [idxList]; 
    let query = await billboardMapper.deleteBillboardMacro();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_billboards-update", { billboardList: {'delete':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, deleteBillboardMacro, error: ', error);
    console.log('inundationControl/billboardService.js, deleteBillboardMacro, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.addBillboard = async ({ outsideIdx, billboardIp, billboardName }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let binds = [billboardIp];
    let query = await billboardMapper.getBillboardIpInfo();
    const resBillboardIpInfo = await client.query(query, binds);

    // billboard ip 이미 등록되어 있으면
    if(resBillboardIpInfo && resBillboardIpInfo.rows.length > 0) {

      returnValue.message = '전광판 ip 가 이미 등록되어 있습니다.';

    } else {
      // billboard ip 가 없으면 등록
      const billboardStatus = 'ON';
      binds = [outsideIdx, billboardIp, billboardName, billboardStatus];
      query = await billboardMapper.addBillboard();
      const resAddBillboard = await client.query(query, binds);

      if(resAddBillboard && resAddBillboard.rows.length > 0) {
        returnValue.status = true;
        returnValue.message = 'success';

        if(global.websocket) {
          global.websocket.emit("fl_billboards-update", { billboardList: {'add':resAddBillboard.rows.length} });
        }
      }
    }
    
    return returnValue;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, addBillboard, error: ', error);
    console.log('inundationControl/billboardService.js, addBillboard, error: ', error);
    return returnValue;
  } finally {
    await client.release();
  }
}

exports.getBillboardList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];
    let query = await billboardMapper.getBillboardList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, getBillboardList, error: ', error);
    console.log('inundationControl/billboardService.js, getBillboardList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteBillboard = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const billboardIdx = idx;

    await client.query('BEGIN');
    let binds = [billboardIdx];
    let query = await billboardMapper.deleteBillboard();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((global.websocket) && (res) && (res.rowCount > 0)) {
      global.websocket.emit("fl_billboards-update", { billboardList: {'delete':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/billboardService.js, deleteBillboard, error: ', error);
    console.log('inundationControl/billboardService.js, deleteBillboard, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}
