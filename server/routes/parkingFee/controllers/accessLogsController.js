const logger = require('../../../logger');
const accessLogsService = require('../services/accessLogsService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * start_time : YYYY-MM-dd HH:dd:ss
 * end_time : YYYY-MM-dd HH:dd:ss
 * target_lp : 차량번호, '' 전체검색
 * @param {*} res :
 * kind : 'get_vehicle_obj_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getVehicleObjList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, start_time, end_time, target_lp } = req.body;

    let obj = {};
    obj.kind = 'get_vehicle_obj_list';
    obj.start_time = new Date(start_time).getTime();
    obj.end_time = new Date(end_time).getTime();
    obj.target_lp = target_lp;

    const resData = await accessLogsService.getVehicleObjList(obj, ip, port);
    
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
    logger.error('parkingFee/accessLogsController.js, getVehicleObjList, error: ', error);
    console.log('parkingFee/accessLogsController.js, getVehicleObjList, error: ', error);
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
 * loop_event_time : YYYY-MM-dd HH:dd:ss
 * lp : 차량번호
 * contents : 비고
 * @param {*} res :
 * kind : 'update_vehicle_obj_at_vehicle_obj_list'
 * status : 'ok' or 'ng'
 * message : 'db update 성공.'
 */
exports.updateVehicleObjList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, loop_event_time, lp, contents } = req.body;

    let obj = {};
    obj.kind = 'update_vehicle_obj_at_vehicle_obj_list';
    obj.loop_event_time = new Date(loop_event_time).getTime();
    obj.lp = lp;
    obj.contents = contents;

    const resData = await accessLogsService.updateVehicleObjList(obj, ip, port);

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
    logger.error('parkingFee/accessLogsController.js, updateVehicleObjList, error: ', error);
    console.log('parkingFee/accessLogsController.js, updateVehicleObjList, error: ', error);
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
 * loop_event_time : YYYY-MM-dd HH:dd:ss, 기본키처럼 사용함
 * direction : 방향('in')
 * location : 장소
 * lp_type : 차량타입(등록차량, 일반차량 등)
 * lp : 차량번호
 * contents : 비고
 * @param {*} res :
 * kind : 'create'
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setVehicleObjList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, loop_event_time, direction, location, lp_type, lp, contents } = req.body;

    let obj = {};
    obj.kind = 'create';
    obj.loop_event_time = new Date(loop_event_time).getTime();
    obj.direction = direction;
    obj.location = location;
    obj.lp_type = lp_type;
    obj.lp = lp;
    obj.contents = contents;

    const resData = await accessLogsService.setVehicleObjList(obj, ip, port);

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
    logger.error('parkingFee/accessLogsController.js, setVehicleObjList, error: ', error);
    console.log('parkingFee/accessLogsController.js, setVehicleObjList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
    GTL, 입출차 정보
 * @param {*} res :
    status : 'ok' or 'ng'
    message : ''
 */
exports.vehicleLpr = async (req, res) => {

  try {

    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const reqBodyData = req.body;

    await accessLogsService.vehicleLpr(reqBodyData, outside_ip);

    res.status(200).send({
      message: '',
      status: 'ok' 
    });

  } catch (error) {
    logger.error('parkingFee/accessLogsController.js, vehicleLpr, error: ', error);
    console.log('parkingFee/accessLogsController.js, vehicleLpr, error: ', error);
    res.status(400).send({
      message: String(error),
      status: 'ng' 
    });
  }
}

/**
 * 
 * @param {*} req 
    GTL, 차량 출차: 요금 계산, 요금 정산
 * @param {*} res :
    status : 'ok' or 'ng'
    message : ''
 */
exports.vehicleFeeCalculationResult = async (req, res) => {

  try {

    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const reqBodyData = req.body;

    await accessLogsService.vehicleFeeCalculationResult(reqBodyData, outside_ip);

    res.status(200).send({
      message: '',
      status: 'ok' 
    });

  } catch (error) {
    logger.error('parkingFee/accessLogsController.js, vehicleFeeCalculationResult, error: ', error);
    console.log('parkingFee/accessLogsController.js, vehicleFeeCalculationResult, error: ', error);
    res.status(400).send({
      message: String(error),
      status: 'ng' 
    });
  }
}
