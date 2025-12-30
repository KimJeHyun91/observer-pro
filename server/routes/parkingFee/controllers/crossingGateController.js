const logger = require('../../../logger');
const crossingGateService = require('../services/crossingGateService');
const { isValidIPv4, isValidPort } = require('../../../utils/isValidIPv4');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * location : '입차1'
 * gate_control : up(개방), down(닫음), unlock(up_and_lock 해제), up_and_lock(개방하고 lock)
 * @param {*} res :
 * kind : 'control'
 * status : 'ok'
 */
exports.control = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, location, gate_control } = req.body;

    let obj = {};
    obj.kind = 'control';
    obj.location = location;
    obj.gate_control = gate_control;
    obj.loop_event_time = new Date().getTime(); // 현재시각(unix)

    const resData = await crossingGateService.control(obj, ip, port);

    result = resData.docs;
    
    if(resData.status == 'ok') {
      message = resData.status;
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, control, error: ', error);
    console.log('parkingFee/crossingGateController.js, control, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * direction : in, out : 배열이나 콤마로 구분
 * is_used : [true, false] : 배열이나 콤마로 구분 // 사용상태 
 */
exports.getCrossingGateDirectionList = async (req, res) => {

  try {
    
    const { direction, is_used } = req.body;
    const result = await crossingGateService.getCrossingGateDirectionList(direction, is_used);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, getCrossingGateDirectionList, error: ', error);
    console.log('parkingFee/crossingGateController.js, getCrossingGateDirectionList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * gate_index : GTL 서버, config.js iotb_list 인덱스
 * ledd_index : GTL 서버, config.js ledd_list 인덱스
 * pt_index : GTL 서버, config.js pt_list 인덱스
 * direction : in / out
 * location : 입차1 / 입차2 / 출차1 등
 * ledd_ip : 전광판 ip
 * ledd_port : 전광판 port
 * pt_ip : 정산기 ip
 * pt_port : 정산기 port
 */
exports.setCrossingGateInfo = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = '';

    const { 
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
    } = req.body;

    if((isValidIPv4(crossing_gate_ip)) && (isValidPort(crossing_gate_port))) {

      let getCrossingGateIpInfo = await crossingGateService.getCrossingGateIpInfo(crossing_gate_ip, crossing_gate_port, direction);

      // 저장된 차단기 ip 가 없으면
      if((getCrossingGateIpInfo) && (getCrossingGateIpInfo.length == 0)) {

        result = await crossingGateService.setCrossingGateInfo(
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
        );

        if(result.length > 0) {
          message = 'ok';
        }

      } else {
        result = '이미 저장된 ip 입니다.';
      }

    } else {
      result = '유효한 ip, port 가 아닙니다.';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, setCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateController.js, setCrossingGateInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * crossing_gate_idx : pf_crossing_gate 테이블 index
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * gate_index : gtl 서버, config.js, gate_index
 * ledd_index : gtl 서버, config.js, ledd_index
 * pt_index : gtl 서버, config.js, pt_index
 * direction : in, out
 * location : 입차1, 입차2, 출차1 등
 * ledd_ip : 전광판 ip
 * ledd_port : 전광판 port
 * pt_ip : 정산기 ip
 * pt_port : 정산기 port
 */
exports.updateCrossingGateInfo = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = '';

    const { 
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
    } = req.body;
    
    if((isValidIPv4(crossing_gate_ip)) && (isValidPort(crossing_gate_port))) {

      result = await crossingGateService.updateCrossingGateInfo(
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
      );

      if(result > 0) {
        message = 'ok';
      }

    } else {
      result = '유효한 ip, port 가 아닙니다.';
    }
    
    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, updateCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateController.js, updateCrossingGateInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * crossing_gate_idx : pf_crossing_gate 테이블 index 배열
 */
exports.deleteCrossingGateInfo = async (req, res) => {

  try {
    
    const { crossing_gate_idx_list } = req.body;
    const result = await crossingGateService.deleteCrossingGateInfo(crossing_gate_idx_list);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, deleteCrossingGateInfo, error: ', error);
    console.log('parkingFee/crossingGateController.js, deleteCrossingGateInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 주차장 라인 차단기 매핑
 */
/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 
 * @param {*} req 
 * line_idx : pf_line 테이블 index
 * crossing_gate_idx_list : pf_crossing_gate 테이블 index list, 배열
 */
exports.updateCrossingGateMappingInfo = async (req, res) => {

  try {
    
    const { line_idx, crossing_gate_idx_list } = req.body;
    const result = await crossingGateService.updateCrossingGateMappingInfo(line_idx, crossing_gate_idx_list);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, updateCrossingGateMappingInfo, error: ', error);
    console.log('parkingFee/crossingGateController.js, updateCrossingGateMappingInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 주차장 라인 차단기 매핑 끝
 */
/////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * crossing_gate_ip : 차단기ip
 * crossing_gate_port : 차단기port
 * location : '입차1'
 * @param {*} res :
 * 'kind: 'gate_state_res',
 * location: '입차1'
 * state : 'up' // 'down'
 * ip : 차단기ip
 * port : 차단기port
 * loop_event_time : 1764118969266 (unix)
 */
exports.getGateStateCheck = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, crossing_gate_ip, crossing_gate_port, location } = req.body;

    let obj = {};
    obj.kind = 'gate_state';
    obj.ip = crossing_gate_ip;
    obj.port = crossing_gate_port;
    obj.location = location;
    obj.loop_event_time = new Date().getTime();

    const resData = await crossingGateService.getGateStateCheck(obj, ip, port);

    if(resData) {

      if(resData.docs) {
        result = resData.docs;
      }
      
      if(resData.status == 'ok') {
        message = resData.status;
      }
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, getGateStateCheck, error: ', error);
    console.log('parkingFee/crossingGateController.js, getGateStateCheck, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * ledd_ip : 전광판 ip
 * ledd_port : 전광판 port
 * location : "입차1", "출차1"
 * text1 : "등록차량" , "일반차량"(첫 번째 줄 표시 문자열)
 * text2 : "12가2345", (두 번째 줄 표시 문자열)
 * kind1 : "ram", "flash"
 * @param {*} res :
 * kind : 'create_holiday_list'
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setLeddDisplay = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];
    // kind1 우선 고정값 사용.
    const { ip, port, ledd_ip, ledd_port, location, text1, text2 } = req.body;

    let obj = {};
    obj.kind = 'ledd';
    obj.ip = ledd_ip;
    obj.port = ledd_port;
    obj.location = location;
    obj.effect1 = 'fixed'; // 고정값
    obj.effect2 = 'fixed'; // 고정값
    obj.text1 = text1;
    obj.text2 = text2;
    obj.color1 = 'WHITE'; // 고정값
    obj.color2 = 'SBLUE'; // 고정값
    obj.kind1 = 'ram'; // ram, flash(RAM은 차량번호 인식 및 주차요금을 잠시 보여 주며,  flash는 평소에 보여주는 글자입니다)
    obj.loop_event_time = new Date().getTime();

    const resData = await crossingGateService.setLeddDisplay(obj, ip, port);

    if(resData) {

      if(resData.docs) {
        result = resData.docs;
      }
      
      if(resData.status == 'ok') {
        message = resData.status;
      }
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/crossingGateController.js, setLeddDisplay, error: ', error);
    console.log('parkingFee/crossingGateController.js, setLeddDisplay, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}