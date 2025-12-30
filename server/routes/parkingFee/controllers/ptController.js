const logger = require('../../../logger');
const ptService = require('../services/ptService');
const crossingGateService = require('../services/crossingGateService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * fee : 주차요금
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_ip : 차단기 port
 * @param {*} res :
 * kind : 'pt'
 * status : 'ok'
 * index : gtl 주차관제서버 config.js 의 pt_list의 index
 * fee : 주차요금
 */
exports.indexParkingFee = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    let pt_index = -1;

    const { ip, port, fee, crossing_gate_ip, crossing_gate_port } = req.body;
    
    const resCrossingGateIpInfo = await crossingGateService.getCrossingGateIpFeeInfo(crossing_gate_ip, crossing_gate_port);
    
    if((resCrossingGateIpInfo) && (resCrossingGateIpInfo.length > 0)) {
      
      pt_index = resCrossingGateIpInfo[0].pt_index;

      let obj = {};
      obj.kind = 'pt';
      obj.index = parseInt(pt_index, 10);
      obj.fee = parseInt(fee, 10);
    
      const resData = await ptService.indexParkingFee(obj, ip, port);

      result = resData.docs;

      if(resData.status == 'ok') {
        message = resData.status;
      }

    } else {
      result = '출구 차단기 ip 정보가 존재하지 않습니다.';
    }
    
    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/ptController.js, indexParkingFee, error: ', error);
    console.log('parkingFee/ptController.js, indexParkingFee, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}

/**
 * 
 * @param {*} req 
 * outside_ip : 주차장(outside) ip
 * outside_port : 주차장(outside) port
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * lp : 차량번호
 * in_time : 1766360724654(unix)
 * parking_fee : 주차요금
 * discount_fee : 할인 금액
 * @param {*} res :
 */
exports.paymentRequest = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { outside_ip, outside_port, crossing_gate_ip, crossing_gate_port, lp, parking_fee, discount_fee } = req.body;
    
    let obj = {};
    obj.crossing_gate_ip = crossing_gate_ip;
    obj.crossing_gate_port = crossing_gate_port;
    obj.lp = lp;
    obj.parking_fee = parking_fee;
    obj.discount_fee = discount_fee;

    const resData = await ptService.paymentRequest(obj, outside_ip, outside_port);
    
    result = resData.docs;

    if(resData.status == 'ok') {
      message = resData.status;
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/ptController.js, paymentRequest, error: ', error);
    console.log('parkingFee/ptController.js, paymentRequest, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}

/**
 * 
 * @param {*} req 
 * outside_ip : 주차장(outside) ip
 * outside_port : 주차장(outside) port
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * lp : 차량번호
 * reduction_name : 장애인, 1시간 // 콤마로 구분
 * @param {*} res :
 */
exports.getReFeeCalculation = async (req, res) => {

  try {
    
    const { outside_ip, outside_port, crossing_gate_ip, crossing_gate_port, lp, reduction_name } = req.body;
    const result = await ptService.getReFeeCalculation(outside_ip, outside_port, crossing_gate_ip, crossing_gate_port, lp, reduction_name);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/ptController.js, getReFeeCalculation, error: ', error);
    console.log('parkingFee/ptController.js, getReFeeCalculation, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}