const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const lineMapper = require('../mappers/lineMapper');
const crossingGateMapper = require('../mappers/crossingGateMapper');


exports.getLineList = async (inside_idx) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      inside_idx
    ];
    let query = await lineMapper.getLineList();
    const res = await client.query(query, binds);

    // 라인 정보가 있으면
    for(let i in res.rows) {

      binds = [res.rows[i].idx];
      query = await crossingGateMapper.getLineCrossingGateList();
      let resLineCrossingGateList = await client.query(query, binds);

      res.rows[i].types = [];

      if((resLineCrossingGateList) && (resLineCrossingGateList.rows)) {
        res.rows[i].types = resLineCrossingGateList.rows;
      }

    } // for i

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/lineService.js, getLineList, error: ', error);
    console.log('parkingFee/lineService.js, getLineList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.setLineInfo = async (inside_idx, line_name, in_crossing_gate_idx, out_crossing_gate_idx) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let returnValue = 0;

    let binds = [
      inside_idx
      , line_name
    ];
    let query = await lineMapper.setLineInfo();
    const res = await client.query(query, binds);

    if((res) && (res.rows) && (res.rows.length > 0)) {

      if(in_crossing_gate_idx) {

        binds = [
          res.rows[0].idx
          , in_crossing_gate_idx
        ];
        query = await crossingGateMapper.setCrossingGateMappingInfo();
        await client.query(query, binds);

        // 사용상태 변경
        binds = [in_crossing_gate_idx, true];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);

        returnValue += 1;
      }
  
      if(out_crossing_gate_idx) {
  
        binds = [
          res.rows[0].idx
          , out_crossing_gate_idx
        ];
        query = await crossingGateMapper.setCrossingGateMappingInfo();
        await client.query(query, binds);

        // 사용상태 변경
        binds = [out_crossing_gate_idx, true];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);

        returnValue += 1;
      }
    }

    await client.query('COMMIT');

    if((res) && (res.rows.length > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { lineList: { 'add': res.rows.length } });
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'add': returnValue } });
    }

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/lineService.js, setLineInfo, error: ', error);
    console.log('parkingFee/lineService.js, setLineInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.updateLineInfo = async (line_idx, line_name, in_crossing_gate_idx, out_crossing_gate_idx) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let returnValue = 0;

    let binds = [
      line_idx
      , line_name
    ];
    let query = await lineMapper.updateLineInfo();
    const res = await client.query(query, binds);

    // 차단기 idx 만 배열에 저장
    let inputCrossingGateIdxList = [];

    if(in_crossing_gate_idx) {

      inputCrossingGateIdxList.push(in_crossing_gate_idx);
    }

    if(out_crossing_gate_idx) {

      inputCrossingGateIdxList.push(out_crossing_gate_idx);
    }

    // 라인 차단기 매핑 정보 가져오기
    binds = [line_idx];
    query = await crossingGateMapper.getLineCrossingGateList();
    const resLineCrossingGateList = await client.query(query, binds);

    // 라인 차단기 매핑 정보가 있으면, 저장 삭제
    if((resLineCrossingGateList) && (resLineCrossingGateList.rows)) {

      let mappingCrossingGateIdxList = [];

      for(let i in resLineCrossingGateList.rows) {
        mappingCrossingGateIdxList.push(resLineCrossingGateList.rows[i].idx);
      }

      // 배열 비교, 입력된 crossing_gate_idx 와 저장된(매핑된) crossing_gate_idx 를 비교
      // 차집합은 저장, 왼쪽 입력값 기준
      const addArray = inputCrossingGateIdxList.filter(x => !mappingCrossingGateIdxList.includes(x));

      for(let i in addArray) {

        binds = [
          line_idx
          , addArray[i]
        ];
        query = await crossingGateMapper.setCrossingGateMappingInfo();
        await client.query(query, binds);

        // 사용상태 변경
        binds = [addArray[i], true];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);
      }

      // 배열 비교, 저장된(매핑된) crossing_gate_idx 와 입력된 crossing_gate_idx 를 비교
      // 차집합은 삭제, 왼쪽 저장된(매핑된) 값 기준
      const removeArray = mappingCrossingGateIdxList.filter(x => !inputCrossingGateIdxList.includes(x));

      for(let i in removeArray) {

        binds = [
          line_idx
          , removeArray[i]
        ];
        query = await crossingGateMapper.deleteCrossingGateMappingInfo();
        await client.query(query, binds);

        // 사용상태 변경
        binds = [removeArray[i], false];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);
      }
    
      returnValue = addArray.length + removeArray.length;

    } else {
      // 라인 차단기 매핑 정보가 없으면, 저장

      for(let i in inputCrossingGateIdxList) {

        binds = [
          line_idx
          , inputCrossingGateIdxList[i]
        ];
        query = await crossingGateMapper.setCrossingGateMappingInfo();
        await client.query(query, binds);

        // 사용상태 변경
        binds = [inputCrossingGateIdxList[i], true];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);
      }

      returnValue = inputCrossingGateIdxList.length;
    }

    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { lineList: { 'update': res.rowCount } });
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'update': returnValue } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/lineService.js, updateLineInfo, error: ', error);
    console.log('parkingFee/lineService.js, updateLineInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteLineInfo = async (line_idx) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let binds = [line_idx];
    let query = await crossingGateMapper.getLineCrossingGateList();
    const resLineCrossingGateList = await client.query(query, binds);
    
    query = await lineMapper.deleteLineInfo();
    const res = await client.query(query, binds);
    
    if((resLineCrossingGateList) && (resLineCrossingGateList.rows) && (resLineCrossingGateList.rows.length > 0)) {
      
      for(let i in resLineCrossingGateList.rows) {

        binds = [
          resLineCrossingGateList.rows[i].idx
          , false
        ];
        query = await crossingGateMapper.updateCrossingGateUsedInfo();
        await client.query(query, binds);
      }
    }

    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { lineList: { 'remove': res.rowCount } });
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/lineService.js, deleteLineInfo, error: ', error);
    console.log('parkingFee/lineService.js, deleteLineInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getLineLPRInfo = async (line_idx) => {
  
  const client = await pool.connect();

  try {

    let returnValue = [];
    let binds = [
      line_idx
    ];
    let query = await lineMapper.getLineLPRInfo();
    const res = await client.query(query, binds);

    if((res) && (res.rows) && (res.rows.length > 0)) {

      const row = res.rows[0];

      const returnObj = {};
      // 차량번호 인식 정보와 같은 출력방식
      returnObj.lp = row.lp;
      returnObj.loop_event_time = row.loop_event_time;
      returnObj.loop_event_time_person = row.loop_event_time_person;
      returnObj.ip = row.ip;
      returnObj.port = row.port;
      returnObj.direction = row.direction;
      returnObj.location = row.location;
      returnObj.fname = row.fname;
      returnObj.folder_name = row.folder_name;
      returnObj.image_url_header = row.image_url_header;
      returnObj.outside_ip = row.outside_ip;
      returnObj.kind = row.kind;

      returnObj.image_url = 'http://' + row.outside_ip + ':' + row.outside_port + row.image_url_header + row.folder_name + '/' + row.fname;
      returnObj.parking_location = row.outside_name + ' ' + row.inside_name + ' ' + row.line_name;
      returnObj.outside_idx = row.outside_idx;
			returnObj.inside_idx = row.inside_idx;
      returnObj.line_idx = row.line_idx;

      returnObj.ledd_ip = row.ledd_ip;
			returnObj.ledd_port = row.ledd_port;
      returnObj.pt_ip = row.pt_ip;
      returnObj.pt_port = row.pt_port;

      returnValue.push(returnObj);
    }

    return returnValue;

  } catch (error) {
    logger.error('parkingFee/lineService.js, getLineLPRInfo, error: ', error);
    console.log('parkingFee/lineService.js, getLineLPRInfo, error: ', error);
  } finally {
    await client.release();
  }
}