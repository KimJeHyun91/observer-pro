const logger = require('../../../logger');
const couponSalesService = require('../services/couponSalesService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * start_time: 시작시각
 * end_time: 종료시각
 * @param {*} res :
 * status : 'ok'
 * docs : 검색결과
 */
exports.getCouponSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, start_time, end_time } = req.body;

    let obj = {};
    obj.start_time = new Date(start_time).getTime();
    obj.end_time = new Date(end_time).getTime();

    const resData = await couponSalesService.getCouponSalesList(obj, ip, port);
    
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
    logger.error('parkingFee/couponSalesController.js, getCouponSalesList, error: ', error);
    console.log('parkingFee/couponSalesController.js, getCouponSalesList, error: ', error);
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
 * sale_date : '2025-10-04T15:20:00.000Z'
 * tenant_id : 'admin001'
 * group_name : '상가2000'
 * buyer : ''
 * memo : ''
 * person : {
 *  id: 'admin001'
 *  name: '관리자'
 *  company: '관리자'
 *  phone1: '010-1111-1111'
 *  group_name: '상가2000'
 * }
 * webDiscount_list : {
 *  group_name: '상가2000'
 *  coupons: [
 *    {
 *      minutes: 60
 *      paid: true
 *      amount: 1000
 *      current_quantity: 0
 *      sales_quantity: 100
 *      used_quantity: 0
 *    }
 *  ]
 * }
 * @param {*} res :
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setCouponSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, sale_date, tenant_id, group_name, buyer, memo, person, webDiscount_list } = req.body;

    let obj = {};
    obj.sale_date = sale_date;
    obj.tenant_id = tenant_id;
    obj.group_name = group_name;
    obj.buyer = buyer;
    obj.memo = memo;
    obj.person = person;
    obj.webDiscount_list = webDiscount_list;

    const resData = await couponSalesService.setCouponSalesList(obj, ip, port);

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
    logger.error('parkingFee/couponSalesController.js, setCouponSalesList, error: ', error);
    console.log('parkingFee/couponSalesController.js, setCouponSalesList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}