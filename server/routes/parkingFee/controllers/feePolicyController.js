const logger = require('../../../logger');
const feePolicyService = require('../services/feePolicyService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * kind : 'list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getFeePolicyList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;

    let obj = {};
    obj.kind = 'list';

    const resData = await feePolicyService.getFeePolicyList(obj, ip, port);
    
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
    logger.error('parkingFee/feePolicyController.js, getFeePolicyList, error: ', error);
    console.log('parkingFee/feePolicyController.js, getFeePolicyList, error: ', error);
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
 * name: '일반차량2' // 정책명
 * std_duration : 10 // 기본시간(분)
 * std_fee: 500 // 기본요금(원)
 * repeat_duration: 10 // 반복시간(분)
 * repeat_fee: 500 // 반복요금(원)
 * free_duration: 10 // 무료시간(분)
 * settlement_duration: 10 // 정산단위
 * is_daily_max_fee: false // 1일 상한 사용여부
 * maximum_fee_per_day: 0 // 1일 상한
 * is_max_fee: false // 절대 상한 사용 여부
 * abs_max_fee: 0 // 절대 상한
 * contents: '' // 비고
 * 
 * @param {*} res :
 * kind : 'create'
 * status : 'ok'
 */
exports.setFeePolicyList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { 
      ip, port
      , name, std_duration, std_fee, repeat_duration, repeat_fee, free_duration, settlement_duration
      , is_daily_max_fee, maximum_fee_per_day, is_max_fee, abs_max_fee, contents 
    } = req.body;

    let obj = {};
    obj.kind = 'create';

    obj.name = name;
    obj.std_duration = std_duration;
    obj.std_fee = std_fee;
    obj.repeat_duration = repeat_duration;
    obj.repeat_fee = repeat_fee;
    obj.free_duration = free_duration;
    obj.settlement_duration = settlement_duration;

    obj.is_daily_max_fee = is_daily_max_fee;
    obj.maximum_fee_per_day = maximum_fee_per_day;
    obj.is_max_fee = is_max_fee;
    obj.abs_max_fee = abs_max_fee;
    obj.contents = contents;

    // 아래 3개는 임시 고정, 파라미터 추가 가능성 있음.
    obj.free_apply_order = 'before';
    obj.apply_holiday = true;
    obj.policy_24 = true;

    const resData = await feePolicyService.setFeePolicyList(obj, ip, port);

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
    logger.error('parkingFee/feePolicyController.js, setFeePolicyList, error: ', error);
    console.log('parkingFee/feePolicyController.js, setFeePolicyList, error: ', error);
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
 * name: '일반차량2' // 정책명
 * std_duration : 10 // 기본시간(분)
 * std_fee: 500 // 기본요금(원)
 * repeat_duration: 10 // 반복시간(분)
 * repeat_fee: 500 // 반복요금(원)
 * free_duration: 10 // 무료시간(분)
 * settlement_duration: 10 // 정산단위
 * is_daily_max_fee: false // 1일 상한 사용여부
 * maximum_fee_per_day: 0 // 1일 상한
 * is_max_fee: false // 절대 상한 사용 여부
 * abs_max_fee: 0 // 절대 상한
 * contents: '' // 비고
 * 
 * @param {*} res :
 * kind : 'update'
 * status : 'ok'
 */
exports.updateFeePolicyList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { 
      ip, port
      , name, std_duration, std_fee, repeat_duration, repeat_fee, free_duration, settlement_duration
      , is_daily_max_fee, maximum_fee_per_day, is_max_fee, abs_max_fee, contents 
    } = req.body;

    let obj = {};
    obj.kind = 'update';

    obj.name = name;
    obj.std_duration = std_duration;
    obj.std_fee = std_fee;
    obj.repeat_duration = repeat_duration;
    obj.repeat_fee = repeat_fee;
    obj.free_duration = free_duration;
    obj.settlement_duration = settlement_duration;

    obj.is_daily_max_fee = is_daily_max_fee;
    obj.maximum_fee_per_day = maximum_fee_per_day;
    obj.is_max_fee = is_max_fee;
    obj.abs_max_fee = abs_max_fee;
    obj.contents = contents;

    // 아래 3개는 임시 고정, 파라미터 추가 가능성 있음.
    obj.free_apply_order = 'before';
    obj.apply_holiday = true;
    obj.policy_24 = true;

    const resData = await feePolicyService.updateFeePolicyList(obj, ip, port);

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
    logger.error('parkingFee/feePolicyController.js, updateFeePolicyList, error: ', error);
    console.log('parkingFee/feePolicyController.js, updateFeePolicyList, error: ', error);
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
 * name: '일반차량2' // 정책명
 * @param {*} res :
 * kind : 'delete'
 * status : 'ok' or 'ng'
 */
exports.deleteFeePolicyList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, name } = req.body;

    let obj = {};
    obj.kind = 'delete';
    obj.name = name;

    const resData = await feePolicyService.deleteFeePolicyList(obj, ip, port);

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
    logger.error('parkingFee/reductionController.js, deleteFeePolicyList, error: ', error);
    console.log('parkingFee/reductionController.js, deleteFeePolicyList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}