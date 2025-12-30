const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const axios = require('axios');
const crossingGateMapper = require('../mappers/crossingGateMapper');

exports.control = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/control';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.status;
		returnValue.docs = [];

    if(resData.data.status == 'ok') {
      
      returnValue.docs = resData.data;

    } else {
			
      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        returnValue.docs = '주차 관제 서버 오류';
      }
		} 

    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/crossingGateService.js, control, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/crossingGateService.js, control, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'ng'
      , docs : String(error)
    };
  }
}

exports.getCrossingGateDirectionList = async (direction, is_used) => {
  
  const client = await pool.connect();

  try {

    let directionList = [];
    let usedList = [];

    // 입력값 배열 확인 후 저장
    if(Array.isArray(direction)) {

      directionList = direction;

    } else {
      directionList = direction.split(',');
    }

    // 입력값 배열 확인 후 저장
    if(Array.isArray(is_used)) {

      usedList = is_used;

    } else {
      usedList = is_used.split(',');
    }
    
    let binds = [directionList, usedList];
    let query = await crossingGateMapper.getCrossingGateDirectionList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, getCrossingGateDirectionList, error: ', error);
    console.log('parkingFee/crossingGateService.js, getCrossingGateDirectionList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.updateCrossingGateInfo = async (
  crossing_gate_idx
  , crossing_gate_ip
  , crossing_gate_port
  , gate_index
  , ledd_index
  , pt_index
  , direction
  , location
  , ledd_ip
  , ledd_port
  , pt_ip
  , pt_port
) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      crossing_gate_idx
      , crossing_gate_ip
      , crossing_gate_port
      , gate_index
      , ledd_index
      , pt_index
      , direction
      , location
      , ledd_ip
      , ledd_port
      , pt_ip
      , pt_port
    ];
    let query = await crossingGateMapper.updateCrossingGateInfo();

    const res = await client.query(query, binds);

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, updateCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, updateCrossingGateInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.deleteCrossingGateInfo = async (crossing_gate_idx_list) => {
  
  const client = await pool.connect();

  try {

    let inputCrossingGateIdxList = [];

    // 입력값 배열 확인 후 저장
    if(Array.isArray(crossing_gate_idx_list)) {

      inputCrossingGateIdxList = crossing_gate_idx_list;

    } else {
      inputCrossingGateIdxList = crossing_gate_idx_list.split(',');
    }

    await client.query('BEGIN');

    let binds = [inputCrossingGateIdxList];
    let query = await crossingGateMapper.deleteCrossingGateInfo();

    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, deleteCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, deleteCrossingGateInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.setCrossingGateInfo = async (
  crossing_gate_ip
  , crossing_gate_port
  , gate_index
  , ledd_index
  , pt_index
  , direction
  , location
  , ledd_ip
  , ledd_port
  , pt_ip
  , pt_port
) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      crossing_gate_ip
      , crossing_gate_port
      , gate_index
      , ledd_index
      , pt_index
      , direction
      , location
      , ledd_ip
      , ledd_port
      , pt_ip
      , pt_port
    ];
    let query = await crossingGateMapper.setCrossingGateInfo();

    const res = await client.query(query, binds);
    
    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'add': res.rowCount } });
    }

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, setCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, setCrossingGateInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCrossingGateIpInfo = async (ipaddress, port, direction) => {
  
  const client = await pool.connect();

  try {

    let binds = [ipaddress, port, direction];
    let query = await crossingGateMapper.getCrossingGateIpInfo();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, getCrossingGateIpInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, getCrossingGateIpInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCrossingGateIpFeeInfo = async (ipaddress, port) => {
  
  const client = await pool.connect();

  try {

    let binds = [ipaddress, port];
    let query = await crossingGateMapper.getCrossingGateIpFeeInfo();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, getCrossingGateIpFeeInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, getCrossingGateIpFeeInfo, error: ', error);
  } finally {
    await client.release();
  }
}

/**
 * 
 * GTL 에 연결된 소켓에서 받은 데이터로 
 * 주차장 위치 검색
 * 
 * @param {*} :
 * outside_ip : 주차장 ip
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 */
exports.getParkingLocationInfo = async (outside_ip, crossing_gate_ip, crossing_gate_port) => {
  
  const client = await pool.connect();

  try {

    let binds = [outside_ip, crossing_gate_ip, crossing_gate_port];
    let query = await crossingGateMapper.getParkingLocationInfo();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, getParkingLocationInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, getParkingLocationInfo, error: ', error);
  } finally {
    await client.release();
  }
}

/**
 * 사용안함
 * GTL 에 연결된 소켓에서 받은 데이터로 
 * 차단기 상태값 변경
 * 
 * @param {*} :
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * location : 방향 // 입차1, 입차2, 출차1 등등
 * status : up, down
 */
exports.updateCrossingGateStatusInfo = async (crossing_gate_ip, crossing_gate_port, location, status) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      crossing_gate_ip
      , crossing_gate_port
      , location
      , status
    ];
    let query = await crossingGateMapper.updateCrossingGateStatusInfo();
    
    const res = await client.query(query, binds);
    
    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, updateCrossingGateStatusInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, updateCrossingGateStatusInfo, error: ', error);
  } finally {
    await client.release();
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 라인 차단기 매핑
 */
/////////////////////////////////////////////////////////////////////////////////////////////////////

exports.updateCrossingGateMappingInfo = async (line_idx, crossing_gate_idx_list) => {
  
  const client = await pool.connect();

  try {

    let inputCrossingGateIdxList = [];
    let returnValue = 0;

    // 입력값 배열 확인 후 저장
    if(Array.isArray(crossing_gate_idx_list)) {

      inputCrossingGateIdxList = crossing_gate_idx_list;

    } else {
      inputCrossingGateIdxList = crossing_gate_idx_list.split(',');
    }

    await client.query('BEGIN');

    // 라인 차단기 매핑 정보 가져오기
    let binds = [line_idx];
    let query = await crossingGateMapper.getLineCrossingGateList();
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
    }
    
    returnValue = inputCrossingGateIdxList.length;

    await client.query('COMMIT');

    if((returnValue) && (returnValue > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { crossingGateList: { 'update': returnValue } });
    }

    return returnValue;

  } catch (error) {
    logger.error('parkingFee/crossingGateService.js, updateCrossingGateMappingInfo, error: ', error);
    console.log('parkingFee/crossingGateService.js, updateCrossingGateMappingInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 라인 차단기 매핑 끝
 */
/////////////////////////////////////////////////////////////////////////////////////////////////////

exports.getGateStateCheck = async (obj, ip, port) => {

  const client = await pool.connect();

  try {
    
    let returnValue = {};

    let binds = [];
    let query = '';

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/gate_state';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = 'ng';
    returnValue.docs = {};
    let returnObj = {};

    await client.query('BEGIN');

    if((resData.data) && (resData.data.kind == 'gate_state_res')) {

      binds = [
        ip // 주차장 ip
        , obj.ip // 차단기 ip
        , obj.port // 차단기 port
      ];
      query = await crossingGateMapper.getParkingLocationInfo();
      const resParkingLocationInfo = await client.query(query, binds);

      // 차단기가 매핑 되어 있으면
      if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

        returnObj = {
          outside_idx : resParkingLocationInfo.rows[0].outside_idx
          , outside_ip : resParkingLocationInfo.rows[0].outside_ip
          , inside_idx : resParkingLocationInfo.rows[0].inside_idx
          , line_idx : resParkingLocationInfo.rows[0].line_idx
          , crossing_gate_idx : resParkingLocationInfo.rows[0].crossing_gate_idx
          , crossing_gate_ip : resParkingLocationInfo.rows[0].crossing_gate_ip
          , crossing_gate_port : resParkingLocationInfo.rows[0].crossing_gate_port
          , direction : resParkingLocationInfo.rows[0].direction
          , location : resData.data.location
          , state : resData.data.state
        };

        // 차단기 상태값 다르면 업데이트
        if(resParkingLocationInfo.rows[0].status != resData.data.state) {

          binds = [
            resParkingLocationInfo.rows[0].crossing_gate_ip
            , resParkingLocationInfo.rows[0].crossing_gate_port
            , resData.data.location
            , resData.data.state
          ];
          query = await crossingGateMapper.updateCrossingGateStatusInfo();
          await client.query(query, binds);
        }
                  
      } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

      returnValue.status = 'ok';
      returnValue.docs = returnObj;
      
    } else {
      
      returnValue.docs = 'Not gate_state_res';
    }

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/crossingGateService.js, getGateStateCheck, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/crossingGateService.js, getGateStateCheck, ${JSON.stringify(obj)}, error: `, error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.setLeddDisplay = async (leddData, ip, port) => {

  try {

    let obj = {
      kind : 'ledd'
      , ip : leddData.ledd_ip
      , port : leddData.ledd_port
      , location : leddData.location
      , direction : leddData.direction
      , effect1 : 'fixed' // 고정값
      , effect2 : 'fixed' // 고정값
      , text1 : leddData.text1 // 첫번째줄(일반차량, 등록차량 등등)
      , text2 : leddData.text2 // 두번째줄(차량번호)
      , color1 : 'WHITE' // 고정값
      , color2 : 'SBLUE' // 고정값
      , kind1 : leddData.kind1 // ram은 차량번호 인식 및 주차요금을 잠시 보여 주며,  flash는 평소에 보여주는 글자입니다
      , loop_event_time : new Date().getTime()
      , ledd_index : leddData.ledd_index // 전광판 인덱스
    };
    
    const baseUrl = 'http://' + ip + ':' + port;

    // /ledd/ledd_index/첫번째줄/두번째줄
    const url = new URL(`${baseUrl}/ledd/${encodeURIComponent(obj.ledd_index)}/${encodeURIComponent(obj.text1)}/${encodeURIComponent(obj.text2)}`);
    await axios.get(url, obj, {
      timeout: 10 * 1000
    });

  } catch (error) {
    logger.error(`parkingFee/crossingGateService.js, setLeddDisplay, error: `, error);
    console.log(`parkingFee/crossingGateService.js, setLeddDisplay, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}
