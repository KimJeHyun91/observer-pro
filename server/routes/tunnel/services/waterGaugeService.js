const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const waterGaugeMapper = require('../mappers/waterGaugeMapper');
// 수정
const { writeThresholdByIdx } = require('../../../worker/tunnel/waterLevelConnect');

// 수위계 추가
exports.addWaterLevel = async ({ ip, port, name, location, id, password, communication }) => {
  const client = await pool.connect();

  try {
    const binds = [
      ip,
      port,
      name,
      location,
      id,
      password,
      communication
    ];

    const query = waterGaugeMapper.addWaterLevel();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    // 제어반 수위계 추가 개발

    await client.query('COMMIT');

    // 소켓 연결 추후 개발
    // if((res) && (res.rowCount > 0) && (global.websocket)) {
    //   global.websocket.emit("tm_areaList-update", { areaList: { 'add': res.rowCount } });
    // }

    return res.rows;

  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, addWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, addWaterLevel, error: ', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
};

// 수위계 리스트 정보 받기
exports.getWaterLevelList = async () => {
  const client = await pool.connect();

  try {
    const query = waterGaugeMapper.getWaterLevelList();
    const res = await client.query(query);
    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, getWaterLevelList, error: ', error);
    console.log('tunnel/waterGaugeService.js, getWaterLevelList, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계 수정
exports.modifyWaterLevel = async ({ idx, name, ip, port, location, id, password }) => {
  const client = await pool.connect();

  try {
    const binds = [idx, ip, port, name, location, id, password];
    const query = waterGaugeMapper.modifyWaterLevel();
    const res = await client.query(query, binds);

    // 추후 분석
    // if ((res) && (res.rowCount > 0) && (global.websocket)) {
    //     global.websocket.emit("tm_waterGauges-update", { areaList: { 'add': res.rowCount } });
    // }

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계 삭제
exports.removeWaterLevel = async (idxList) => {
  const client = await pool.connect();

  try {
    binds = idxList
    const queryBinds = '(' + idxList.map((_, i) => `$${i + 1}`).join(', ') + ')';
    const query = waterGaugeMapper.removeWaterLevel() + queryBinds;
    const res = await client.query(query, binds);

    if (global.websocket) {
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'add': res.rowCount } });
    }

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, removeWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, removeWaterLevel, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계 검색
exports.getWaterLevelListSearch = async ({
  name,
  ip,
  communication
}) => {
  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        idx,
        water_level_name,
        communication_type,
        water_level_ip,
        water_level_port,
        water_level_location,
        created_at
      FROM tm_water_level
    `;

    let paramIndex = 1;
    const conditions = [];
    const binds = [];


    if (name) {
      conditions.push(`water_level_name ILIKE '%' || $${paramIndex} || '%'`);
      binds.push(name);
      paramIndex++;
    }

    if (ip) {
      conditions.push(`water_level_ip ILIKE '%' || $${paramIndex} || '%'`);
      binds.push(ip);
      paramIndex++;
    }

    if (communication) {
      conditions.push(`communication_type = $${paramIndex}`);
      binds.push(communication);
      paramIndex++;
    }


    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const res = await client.query(query, binds);

    const result = res.rows.map(row => ({
      idx: row.idx,
      name: row.water_level_name,
      location: row.water_level_location,
      ip: row.water_level_ip,
      port: row.water_level_port,
      communication: row.communication_type,
      created_at: row.created_at
    }));

    return result;

  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, getWaterLevelListSearch, error: ', error);
    console.log('tunnel/waterGaugeService.js, getWaterLevelListSearch, error: ', error);
    return {
      message: `수위계 조회 중 오류 발생: ${error.message}`,
      result: []
    };
  } finally {
    await client.release();
  }
};

// 차단막과 외부수위계 매핑 등록
exports.addWaterLevelMappingCountrolOut = async ({ outsideIdx, waterLevelIdx, topLocation, leftLocation }) => {
  const client = await pool.connect();

  try {
    const binds = [
      outsideIdx,
      waterLevelIdx,
      topLocation,
      leftLocation
    ];

    const query = waterGaugeMapper.addwaterLevelMapping();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    // 소켓 연결 추후 개발
    // if((res) && (res.rowCount > 0) && (global.websocket)) {
    //   global.websocket.emit("tm_areaList-update", { areaList: { 'add': res.rowCount } });
    // }

    return res.rows;

  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, addWaterLevelMappingCountrolOut, error: ', error);
    console.log('tunnel/waterGaugeService.js, addWaterLevelMappingCountrolOut, error: ', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
};

// 차단막에 매핑된 수위계 목록 가져오기
exports.getWaterLevelMappingList = async ({ outsideIdx }) => {
  const client = await pool.connect();

  try {
    const query = waterGaugeMapper.getwaterLevelMappingList();
    const res = await client.query(query, [outsideIdx]);

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, getWaterLevelMappingList, error: ', error);
    console.log('tunnel/waterGaugeService.js, getWaterLevelMappingList, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계에 매핑된 차단기 목록 가져오기
exports.getWaterLevelMappingOutsideList = async ({ waterLevelIdx }) => {
  const client = await pool.connect();

  try {
    const query = waterGaugeMapper.getwaterLevelMappingOutsideList();
    const res = await client.query(query, [waterLevelIdx]);

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, getWaterLevelMappingOutsideList, error: ', error);
    console.log('tunnel/waterGaugeService.js, getWaterLevelMappingOutsideList, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계 포지션 수정
exports.modifyWaterLevelPosition = async ({ outsideIdx, waterLevelIdx, topLocation, leftLocation }) => {
  const client = await pool.connect();

  try {
    const binds = [outsideIdx, waterLevelIdx, topLocation, leftLocation];
    const query = waterGaugeMapper.modifyWaterLevelPosition();
    const res = await client.query(query, binds);

    // 추후 분석
    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'add': res.rowCount } });
    }

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 수위계 수위 수정
exports.modifyWaterLevelThreshold = async ({ waterLevelIdx, threshold }) => {
  const client = await pool.connect();

  try {
    const binds = [waterLevelIdx, threshold];
    const query = waterGaugeMapper.modifyWaterLevelThreshold();
    const res = await client.query(query, binds);

    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'add': res.rowCount } });
    }

    // 임계치 변화값 제어반에 전송
    await writeThresholdByIdx(waterLevelIdx);

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, modifyWaterLevel, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 차단막에 매팽된 외부 수위계 삭제
exports.removeWaterLevelMapping = async ({ outsideIdx, waterLevelIdx }) => {
  const client = await pool.connect();

  try {
    binds = [outsideIdx, waterLevelIdx]
    const query = waterGaugeMapper.removeWaterLevelMapping();
    const res = await client.query(query, binds);

    if ((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'add': res.rowCount } });
    }

    return {
      status: true,
      data: res.rows
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, removeWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeService.js, removeWaterLevel, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};

// 제어반 수위계 등록 및 차단막과 매핑
exports.addWaterLevelCountrolIn = async ({ outsideIdx, name, ip, location, topLocation, leftLocation, communication }) => {
  const client = await pool.connect();

  try {
    const binds = [
      ip,
      name,
      location,
      communication
    ];
    const query = waterGaugeMapper.addWaterLevelControlIn();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    let mappingRes
    if (res.rows[0].idx) {
      const mappingBinds = [outsideIdx, res.rows[0].idx, topLocation, leftLocation]
      const mappingQuery = waterGaugeMapper.addwaterLevelMapping();
      mappingRes = await client.query(mappingQuery, mappingBinds);
    }
    
    await client.query('COMMIT');
    
    // 임계치 설정 추가
    await writeThresholdByIdx(res.rows[0].idx);

    if ((res) && (mappingRes.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("tm_waterLevel-update", { areaList: { 'add': res.rowCount } });
    }

    return res.rows;
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, addWaterLevelCountrolIn, error: ', error);
    console.log('tunnel/waterGaugeService.js, addWaterLevelCountrolIn, error: ', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
};

// 수위계 수위 로그 가져오기
exports.getWaterLevelLog = async ({ outsideIdx }) => {
  const client = await pool.connect();

  try {
    const query = waterGaugeMapper.getWaterLevelLog();
    const res = await client.query(query, [outsideIdx]);

    const getWaterLevelControlInQuery = waterGaugeMapper.getWaterLevelControlIn();
    const controlInRes = await client.query(getWaterLevelControlInQuery, [outsideIdx]);

    let isControlIn = false;
    let threshold = 0;
    let link = false;

    if (controlInRes.rowCount > 0) {
      isControlIn = true;
      threshold = parseInt(controlInRes.rows[0].threshold);
      link = controlInRes.rows[0].linked_status;
    }

    return {
      status: true,
      data: res.rows,
      existControlIn: isControlIn,
      threshold: threshold,
      link: link
    };
  } catch (error) {
    logger.info('tunnel/waterGaugeService.js, getWaterLevelLog, error: ', error);
    console.log('tunnel/waterGaugeService.js, getWaterLevelLog, error: ', error);
    return {
      status: false,
      error
    };
  } finally {
    client.release();
  }
};