const logger = require('../../../logger');
const regVehicleService = require('../services/regVehicleService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * target_lp : 차량번호, '' 전체검색
 * start_time : YYYY-MM-dd HH:dd:ss // 검색 시작시간
 * end_time : YYYY-MM-dd HH:dd:ss // 검색 종료시간
 * @param {*} res :
 * kind : 'get_sales_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getManageSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, target_lp, start_time, end_time } = req.body;
    
    let obj = {};
    obj.kind = 'get_sales_list';
    obj.target_lp = target_lp;
    obj.start_time = start_time;
    obj.end_time = end_time;

    const resData = await regVehicleService.getManageSalesList(obj, ip, port);
    
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
    logger.error('parkingFee/regVehicleController.js, getManageSalesList, error: ', error);
    console.log('parkingFee/regVehicleController.js, getManageSalesList, error: ', error);
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
 * lp : 차량번호
 * name : 이름
 * phone: 전화번호
 * active : 'Y' // 'Y', 'N'
 * fee_policy : fee_ploicy
 * group : seasonticket_group,
 * period_start : YYYY-MM-dd HH:dd:ss
 * period_end : YYYY-MM-dd HH:dd:ss
 * @param {*} res :
 * kind : 'create_sales_list'
 * status : 'ok'
 * message : ''
 */
exports.setManageSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];
    
    const { ip, port, lp, name, phone, active, fee_policy, group, period_start, period_end } = req.body;

    let obj = {};
    obj.kind = 'create_sales_list';
    obj.lp = lp;
    obj.name = name;
    obj.phone = phone;
    obj.active = active;
    obj.fee_policy = fee_policy;
    obj.group = group;
    obj.period_start = new Date(period_start).getTime();
    obj.period_end = new Date(period_end).getTime();

    const resData = await regVehicleService.setManageSalesList(obj, ip, port);
    
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
    logger.error('parkingFee/regVehicleController.js, setManageSalesList, error: ', error);
    console.log('parkingFee/regVehicleController.js, setManageSalesList, error: ', error);
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
 * id : 68da03a5d8f4a5c000f0f19e
 * lp : 차량번호
 * name : 이름
 * phone: 전화번호
 * active : 'Y'’' // 'Y', 'N'
 * fee_policy : fee_ploicy
 * group : seasonticket_group,
 * period_start : YYYY-MM-dd HH:dd:ss
 * period_end : YYYY-MM-dd HH:dd:ss
 * @param {*} res :
 * kind : 'update_sales_list'
 * status : 'ok'
 * message : ''
 */
exports.updateManageSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, lp, name, phone, active, fee_policy, group, period_start, period_end } = req.body;

    let obj = {};
    obj.kind = 'update_sales_list';
    obj.lp = lp;
    obj.name = name;
    obj.phone = phone;
    obj.active = active;
    obj.fee_policy = fee_policy;
    obj.group = group;
    obj.period_start = new Date(period_start).getTime();
    obj.period_end = new Date(period_end).getTime();

    const resData = await regVehicleService.updateManageSalesList(obj, ip, port, id);

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
    logger.error('parkingFee/regVehicleController.js, updateManageSalesList, error: ', error);
    console.log('parkingFee/regVehicleController.js, updateManageSalesList, error: ', error);
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
 * id : 68da03a5d8f4a5c000f0f19e
 * @param {*} res :
 * status: 'ok',
 * _id: '68da03a5d8f4a5c000f0f19e',
 * deleted: 1,
 * soft: false
 */
exports.deleteManageSalesList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id } = req.body;

    const resData = await regVehicleService.deleteManageSalesList(ip, port, id);

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
    logger.error('parkingFee/regVehicleController.js, deleteManageSalesList, error: ', error);
    console.log('parkingFee/regVehicleController.js, deleteManageSalesList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)  
    });
  }
}

/**
 * 
 * @param {*} req :
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * status : 'ok' or 'ng'
 * fee_policy_list : 검색결과 []
 * season_ticket_list : 검색결과 []
 */
exports.getManageSalesListLoadConfig = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;
    
    const resData = await regVehicleService.manageSalesListLoadConfig(ip, port);
    
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
    logger.error('parkingFee/regVehicleController.js, getManageSalesListLoadConfig, error: ', error);
    console.log('parkingFee/regVehicleController.js, getManageSalesListLoadConfig, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}