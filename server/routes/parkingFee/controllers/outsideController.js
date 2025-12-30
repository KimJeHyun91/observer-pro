const logger = require('../../../logger');
const outsideService = require('../services/outsideService');
const { isValidIPv4, isValidPort } = require('../../../utils/isValidIPv4');
outsideService.getParkingFeeListInit(); // 주차장 상태체크 init

exports.getParkingList = async (req, res) => {

  try {
    
    const result = await outsideService.getParkingList();

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/outsideController.js, getParkingList, error: ', error);
    console.log('parkingFee/outsideController.js, getParkingList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_name : 주차장명
 * outside_ip : 주차장 ip(gtl 서버)
 * outside_port : 주차장 port(gtl 서버)
 */
exports.setParkingInfo = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = '';

    const { outside_name, outside_ip, outside_port } = req.body;

    if((isValidIPv4(outside_ip)) && (isValidPort(outside_port))) {

      let getParkingInfo = await outsideService.getParkingInfo(outside_ip);

      if((getParkingInfo) && (getParkingInfo.length == 0)) {
        // 이미 저장된 ip 가 없으면 저장
          
        result = [];
        result = await outsideService.setParkingInfo(outside_name, outside_ip, outside_port);

        if(result.length > 0) {
          message = 'ok';
        } else {
          result = '주차장 IP로 연결에 실패했습니다.';
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
    logger.error('parkingFee/outsideController.js, setParkingInfo, error: ', error);
    console.log('parkingFee/outsideController.js, setParkingInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_idx : 주차장 인덱스
 * outside_name : 주차장명
 * outside_ip : 주차장 ip(gtl 서버)
 * outside_port : 주차장 port(gtl 서버)
 * status : 상태 (normal, error, lock)
 * prev_outside_ip : 이전 주차장 ip(gtl 서버) / 선택값
 */
exports.updateParkingInfo = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = '';

    const { outside_idx, outside_name, outside_ip, outside_port, status } = req.body;

    if((isValidIPv4(outside_ip)) && (isValidPort(outside_port))) {
      
        result = await outsideService.updateParkingInfo(
          outside_idx
          , outside_name
          , outside_ip
          , outside_port
          , status
        );

        // 업데이트 성공
        if(result > 0) {
          message = 'ok';
        } else {
          result = '주차장 IP로 연결에 실패했습니다.';
        }

    } else {

      result = '유효한 ip, port 가 아닙니다.';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/outsideController.js, updateParkingInfo, error: ', error);
    console.log('parkingFee/outsideController.js, updateParkingInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_idx : 주차장 인덱스
 */
exports.deleteParkingInfo = async (req, res) => {

  try {
    
    const { outside_idx } = req.body;
    const result = await outsideService.deleteParkingInfo(outside_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/outsideController.js, deleteParkingInfo, error: ', error);
    console.log('parkingFee/outsideController.js, deleteParkingInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}
