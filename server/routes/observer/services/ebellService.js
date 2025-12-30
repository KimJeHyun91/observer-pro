const logger = require('../../../logger');
const deviceMapper = require('../mappers/deviceMapper');
const ebellMapper = require('../mappers/ebellMapper');
const { pool } = require('../../../db/postgresqlPool');


exports.getEbells = async ({ inside_idx, outside_idx, dimension_type }) => { 
  const client = await pool.connect();
  try {
    console.log(inside_idx, outside_idx, dimension_type)
    let binds;
    let query;
    if(outside_idx != null) {
      binds = [outside_idx];
      query = await ebellMapper.getEbells({ outside_idx, dimension_type });
    } else if(inside_idx != null) {
      binds = [inside_idx];
      query = await ebellMapper.getEbells({ inside_idx, dimension_type });
    } else {
      binds = [];
      query = await ebellMapper.getEbells({ dimension_type });
    }
    const res = await client.query(query, binds);
    
    if(!res || !res.rows){
      return {
        success: false
      }
    }
    return {
      success: true,
      result: res.rows
    }
  } catch(error) {
    logger.info('observer/ebellService.js, ebellControl, error: ', error);
    console.log('observer/ebellService.js, ebellControl, error: ', error);
    throw new Error(error.message || 'observer/ebellService.js getEbells server error');
  } finally {
    await client.release();
  }
}

exports.updateEbell = async ({ idx, inside_idx, outside_idx, dimension_type, top_location, left_location, camera_id }) => {
  const client = await pool.connect();
  try {
    let binds;
    let query;
    if(camera_id !== undefined) {
      // 카메라 설정
      binds = [idx, camera_id];
      query = await ebellMapper.updateEbellCamera(idx, camera_id);
    } else {
      // 위치 수정
      binds = [idx, inside_idx, outside_idx, top_location, left_location, dimension_type]
      query = await ebellMapper.updateEbellLocation(idx, inside_idx, outside_idx, top_location, left_location, dimension_type);
    }
    const res = await client.query(query, binds);
    
    if(!res || res.rowCount !== 1){
      return {
        success: false
      }
    }
    if(res.rowCount === 1){
      global.websocket.emit('ob_ebells-update', { ebellList: {'update':res.rowCount} });
      return {
        success: true
      }
    }
  } catch(error) {
    logger.info('observer/ebellService.js, updateEbell, error: ', error);
    console.log('observer/ebellService.js, updateEbell, error: ', error);
    throw new Error(error.message || 'observer/ebellService.js updateEbell server error');
  } finally {
    await client.release();
  };
};

exports.removeEbellLocation = async ({ outsideIdx, insideIdx }) => {
  const client = await pool.connect();

  try {

    let binds = [];
    let query;
    if(outsideIdx != null){
      binds = [outsideIdx, 'ebell'];
      query = await deviceMapper.removeDeviceLocationInBuilding();
    } else if(insideIdx != null) {
      binds = [insideIdx, 'ebell']
      query = await deviceMapper.removeDeviceLocationInFloor();
    }
    const res = await client.query(query, binds);

    return {
      success: res.rowCount === 1
    };

  } catch (error) {
    logger.info('observer/ebellService.js, removeEbellLocation, error: ', error);
    console.log('observer/ebellService.js, removeEbellLocation, error: ', error);
  } finally {
    await client.release();
  };
};

exports.getEbellsPing = async () => { 
  
  const client = await pool.connect();
  try {
  
    const query = await ebellMapper.getEbellsPing();
    const result = await client.query(query);
    if(!result || !result.rows){
      return [];
    };
    return result.rows;
  } catch(error) {
    logger.info('observer/ebellService.js, getEbellsPing, error: ', error);
    console.log('observer/ebellService.js, getEbellsPing, error: ', error);
    throw new Error(error.message || 'observer/ebellService.js getEbellsPing server error');
  } finally {
    await client.release();
  }
}