const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const insideMapper = require('../mappers/insideMapper');
const lineMapper = require('../mappers/lineMapper');
const crossingGateMapper = require('../mappers/crossingGateMapper');


exports.getFloorList = async (outside_idx) => {
  
  const client = await pool.connect();

  try {
    
    let binds = [outside_idx];
    let query = await insideMapper.getInsideList();

    const resInsideList = await client.query(query, binds);

    return resInsideList.rows;

  } catch (error) {
    logger.error('parkingFee/insideService.js, getFloorList, error: ', error);
    console.log('parkingFee/insideService.js, getFloorList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getFloorLineList = async (outside_idx) => {
  
  const client = await pool.connect();

  try {
    
    let res = [];

    let binds = [outside_idx];
    let query = await insideMapper.getInsideList();

    const resInsideList = await client.query(query, binds);
    res = resInsideList.rows;
    
    // 층 정보가 있으면
    for(let i in resInsideList.rows) {
      
      binds = [resInsideList.rows[i].idx]; // inside_idx
      query = await lineMapper.getLineList();
      const resLineList = await client.query(query, binds);
      
      res[i].lines = [];

      // 라인 정보가 있으면
      for(let j in resLineList.rows) {
        
        res[i].lines.push(resLineList.rows[j]);

        binds = [resLineList.rows[j].idx]; // line_idx
        query = await crossingGateMapper.getLineCrossingGateList();
        const resCrossingGateList = await client.query(query, binds);
      
        res[i].lines[j].types = [];

        // 차단기 정보가 있으면
        for(let k in resCrossingGateList.rows) {
          
          res[i].lines[j].types.push(resCrossingGateList.rows[k]);

        } // for k

      } // for j

    } // for i
    
    return res;

  } catch (error) {
    logger.error('parkingFee/insideService.js, getFloorLineList, error: ', error);
    console.log('parkingFee/insideService.js, getFloorLineList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.setFloorInfo = async (outside_idx, inside_name) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      outside_idx
      , inside_name
    ];
    let query = await insideMapper.setInsideInfo();

    const res = await client.query(query, binds);

    if((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { floorList: { 'add': res.rows.length } });
    }

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/insideService.js, setFloorInfo, error: ', error);
    console.log('parkingFee/insideService.js, setFloorInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.updateFloorInfo = async (inside_idx, inside_name) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      inside_idx
      , inside_name
    ];
    let query = await insideMapper.updateInsideInfo();

    const res = await client.query(query, binds);

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { floorList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/insideService.js, updateFloorInfo, error: ', error);
    console.log('parkingFee/insideService.js, updateFloorInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteFloorInfo = async (inside_idx) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let binds = [];
    let query = '';

    binds = [inside_idx];
    query = await lineMapper.getLineList(); // inside_idx 로 라인 검색
    const resLineList = await client.query(query, binds);

    // 라인 정보가 있으면
    if((resLineList) && (resLineList.rows)) {

      let lineList = [];

      for(let i in resLineList.rows) {
        lineList.push(resLineList.rows[i].idx); // line_idx
      }

      binds = [lineList];
      query = await crossingGateMapper.getLineCrossingGateAnyList(); // line_idx 배열로 차단기 idx 검색
      const resLineCrossingGateList = await client.query(query, binds);

      // 라인-차단기 매핑 정보가 있으면
      if((resLineCrossingGateList) && (resLineCrossingGateList.rows)) {

        for(let i in resLineCrossingGateList.rows) {

          binds = [resLineCrossingGateList.rows[i].crossing_gate_idx, false];
          query = await crossingGateMapper.updateCrossingGateUsedInfo(); // 차단기 사용상태 false
          await client.query(query, binds);
        }
      } // if((resLineCrossingGateList) && (resLineCrossingGateList.rows))

    } // if((resLineAnyList) && (resLineAnyList.rows))


    binds = [inside_idx];
    query = await insideMapper.deleteInsideInfo();
    const res = await client.query(query, binds);

    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { floorList: { 'remove': res.rowCount } });
      global.websocket.emit("pf_parkings-update", { lineList: { 'remove': res.rowCount } });
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/insideService.js, deleteFloorInfo, error: ', error);
    console.log('parkingFee/insideService.js, deleteFloorInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}