const logger = require('../../../logger');
const vehicleService = require('../services/vehicleService');
const crossingGateService = require('../services/crossingGateService');


/**
 * 
 * @param {*} req : 
 * outside_ip : 주차장 ip
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * lp : 차량번호
 * lp_type : 차량 타입(장애인 등등)
 * contents : 비고
 */
exports.setManualLprInLogInfo = async (req, res) => {

  try {
    
    const { outside_ip, crossing_gate_ip, crossing_gate_port, lp, lp_type, contents } = req.body;

    let obj = {};
    obj.kind = 'control';
    obj.location = location;
    obj.gate_control = gate_control;
    obj.loop_event_time = new Date().getTime(); // 현재시각(unix)
    
    const result = await vehicleService.setManualLprInLogInfo(outside_ip, crossing_gate_ip, crossing_gate_port, lp, lp_type, contents);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, setManualLprInLogInfo, error: ', error);
    console.log('parkingFee/vehicleController.js, setManualLprInLogInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req : 
 * outside_ip : 주차장 ip
 * crossing_gate_ip : 차단기 ip
 * crossing_gate_port : 차단기 port
 * lp : 차량번호
 * parking_fee : 주차요금
 * discount_fee : 할인요금
 * contents : 비고
 */
exports.setManualLprOutLogInfo = async (req, res) => {

  try {
    
    const { outside_ip, crossing_gate_ip, crossing_gate_port, lp, parking_fee, discount_fee, contents } = req.body;

    const result = await vehicleService.setManualLprOutLogInfo(outside_ip, crossing_gate_ip, crossing_gate_port, lp, parking_fee, discount_fee, contents);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, setManualLprOutLogInfo, error: ', error);
    console.log('parkingFee/vehicleController.js, setManualLprOutLogInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 * start_date : 시작날짜(YYYY-MM-DD)
 * end_date : 종료날짜(YYYY-MM-DD)
 * lp : '' // 전체검색(차량번호)
 */
exports.getVehicleList = async (req, res) => {

  try {
    
    const { outside_ip, start_date, end_date, lp } = req.body;

    const result = await vehicleService.getVehicleList(outside_ip, start_date, end_date, lp);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getVehicleList, error: ', error);
    console.log('parkingFee/vehicleController.js, getVehicleList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 * start_date : 시작날짜(YYYY-MM-DD)
 * end_date : 종료날짜(YYYY-MM-DD)
 */
exports.getLpCurrentSituation = async (req, res) => {

  try {
    
    const { outside_ip, start_date, end_date } = req.body;

    const result = await vehicleService.getLpCurrentSituation(outside_ip, start_date, end_date);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getLpCurrentSituation, error: ', error);
    console.log('parkingFee/vehicleController.js, getLpCurrentSituation, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * in_time : 1766125917886 (unix)
 * lp : 차량번호
 * lp_type : 차량타입(장애인 등등)
 */
exports.updateReceiveLprLpTypeInfo = async (req, res) => {

  try {
    
    const { in_time, lp, lp_type } = req.body;

    const result = await vehicleService.updateReceiveLprLpTypeInfo(in_time, lp, lp_type);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, updateReceiveLprLpTypeInfo, error: ', error);
    console.log('parkingFee/vehicleController.js, updateReceiveLprLpTypeInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 * start_date : 시작날짜(YYYY-MM-DD)
 * end_date : 종료날짜(YYYY-MM-DD)
 * lp : 차량번호
 */
exports.getLpPaymentDetailList = async (req, res) => {

  try {
    
    const { outside_ip, start_date, end_date, lp } = req.body;
    
    const result = await vehicleService.getLpPaymentDetailList(outside_ip, start_date, end_date, lp);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getLpPaymentDetailList, error: ', error);
    console.log('parkingFee/vehicleController.js, getLpPaymentDetailList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * lp : 차량번호
 * in_time : 1766291984023(unix)
 */
exports.getLpPaymentDetailInfo = async (req, res) => {

  try {
    
    const { lp, in_time } = req.body;
    
    const result = await vehicleService.getLpPaymentDetailInfo(lp, in_time);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getLpPaymentDetailInfo, error: ', error);
    console.log('parkingFee/vehicleController.js, getLpPaymentDetailInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getDailyRevenue = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getDailyRevenue(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getDailyRevenue, error: ', error);
    console.log('parkingFee/vehicleController.js, getDailyRevenue, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getTotalRevenue = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getTotalRevenue(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getTotalRevenue, error: ', error);
    console.log('parkingFee/vehicleController.js, getTotalRevenue, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getDailyLpTypeRatio = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getDailyLpTypeRatio(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getDailyLpTypeRatio, error: ', error);
    console.log('parkingFee/vehicleController.js, getDailyLpTypeRatio, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getDailyTimeFlow = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getDailyTimeFlow(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getDailyTimeFlow, error: ', error);
    console.log('parkingFee/vehicleController.js, getDailyTimeFlow, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getFloatingVehicle = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getFloatingVehicle(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getFloatingVehicle, error: ', error);
    console.log('parkingFee/vehicleController.js, getFloatingVehicle, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req :
 * outside_ip : 주차장(outside) ip
 */
exports.getCurrentMonthUsageRate = async (req, res) => {

  try {
        
    const { outside_ip } = req.body;

    const result = await vehicleService.getCurrentMonthUsageRate(outside_ip);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/vehicleController.js, getCurrentMonthUsageRate, error: ', error);
    console.log('parkingFee/vehicleController.js, getCurrentMonthUsageRate, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}