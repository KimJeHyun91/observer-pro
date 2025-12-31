const logger = require('../../../logger');
const webDiscountService = require('../services/webDiscountService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * status : 'ok'
 * docs : 검색결과
 */
exports.getWebDiscountList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;

    const resData = await webDiscountService.getWebDiscountList(ip, port);
    
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
    logger.error('parkingFee/webDiscountController.js, getWebDiscountList, error: ', error);
    console.log('parkingFee/webDiscountController.js, getWebDiscountList, error: ', error);
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
 * group_name : '상가2000'
 * coupons : [
 *  {
 *    minutes : 30,
 *    paid : false,  //false, true
 *    amount : 1000
 *  }
 * ]
 * @param {*} res :
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setWebDiscountList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, group_name, coupons } = req.body;

    let obj = {};
    obj.group_name = group_name;
    obj.coupons = coupons;

    const resData = await webDiscountService.setWebDiscountList(obj, ip, port);

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
    logger.error('parkingFee/webDiscountController.js, setWebDiscountList, error: ', error);
    console.log('parkingFee/webDiscountController.js, setWebDiscountList, error: ', error);
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
 * group_name : '상가2000'
 * @param {*} res :
 * status : 'ok' or 'ng'
 */
exports.deleteWebDiscountList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, group_name } = req.body;

    let obj = {};
    obj.group_name = group_name;

    const resData = await webDiscountService.deleteWebDiscountList(obj, ip, port);

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
    logger.error('parkingFee/webDiscountController.js, deleteWebDiscountList, error: ', error);
    console.log('parkingFee/webDiscountController.js, deleteWebDiscountList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}