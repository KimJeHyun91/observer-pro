const logger = require('../../../logger');
const paymentResultService = require('../services/paymentResultService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * id : 입주사 ID
 * pw : 입주사 PW
 * @param {*} res :
 * kind : 'how_much'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getPaymentResultForVisitorCouponSearch = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw } = req.body;

    let obj = {};
    obj.kind = 'coupon_search';
    obj.id = id;
    obj.pw = pw;

    const resData = await paymentResultService.getPaymentResultForVisitorCouponSearch(obj, ip, port);
    
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
    logger.error('parkingFee/paymentResultController.js, getPaymentResultForVisitorCouponSearch, error: ', error);
    console.log('parkingFee/paymentResultController.js, getPaymentResultForVisitorCouponSearch, error: ', error);
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
 * id : 입주사 ID
 * pw : 입주사 PW
 * start_time : YYYY-MM-dd HH:dd:ss
 * end_time : YYYY-MM-dd HH:dd:ss
 * lp : 차량번호
 * @param {*} res :
 * kind : 'how_much'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getPaymentResultForVisitorVehicleSearch = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw, start_time, end_time, lp } = req.body;

    let obj = {};
    obj.kind = 'how_much';
    obj.id = id;
    obj.pw = pw;
    obj.start_time = new Date(start_time).getTime();
    obj.end_time = new Date(end_time).getTime();
    obj.lp = lp;

    const resData = await paymentResultService.getPaymentResultForVisitorVehicleSearch(obj, ip, port);
    
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
    logger.error('parkingFee/paymentResultController.js, getPaymentResultForVisitorVehicleSearch, error: ', error);
    console.log('parkingFee/paymentResultController.js, getPaymentResultForVisitorVehicleSearch, error: ', error);
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
 * id : 입주사 ID
 * pw : 입주사 PW
 * free_discounted_duration : 30 무료 웹할인시간(분)
 * fee_discounted_duration : 1500 요금 웹할인시간(분)
 * loop_event_time : 
 * webDiscount_list : {
 *  group_name : ''
 *  coupons : []
 * }
 * @param {*} res :
 * kind : 'how_much'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getPaymentResultForVisitorHowMuch = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw, free_discounted_duration, fee_discounted_duration, loop_event_time, webDiscount_list } = req.body;

    let obj = {};
    obj.kind = 'how_much';
    obj.id = id;
    obj.pw = pw;
    obj.free_discounted_duration = free_discounted_duration; // 무료 할인시간
    obj.fee_discounted_duration = fee_discounted_duration; // 요금 할인
    obj.loop_event_time = loop_event_time;
    obj.webDiscount_list = webDiscount_list;

    const resData = await paymentResultService.getPaymentResultForVisitorHowMuch(obj, ip, port);
    
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
    logger.error('parkingFee/paymentResultController.js, getPaymentResultForVisitorHowMuch, error: ', error);
    console.log('parkingFee/paymentResultController.js, getPaymentResultForVisitorHowMuch, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}