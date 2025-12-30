const logger = require('../../../logger');
const settlementLogsService = require('../services/settlementLogsService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * start_time : YYYY-MM-dd HH:dd:ss
 * end_time : YYYY-MM-dd HH:dd:ss
 * target_lp : 차량번호, '' 전체검색
 * @param {*} res :
 * kind : 'get_fee_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getVehicleObjFeeList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, start_time, end_time, target_lp } = req.body;

    let obj = {};
    obj.kind = 'get_fee_list';
    obj.start_time = new Date(start_time).getTime();
    obj.end_time = new Date(end_time).getTime();
    obj.target_lp = target_lp;

    const resData = await settlementLogsService.getVehicleObjFeeList(obj, ip, port);
    
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
    logger.error('parkingFee/settlementLogsController.js, getVehicleObjFeeList, error: ', error);
    console.log('parkingFee/settlementLogsController.js, getVehicleObjFeeList, error: ', error);
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
 * lp : 차량번호
 * contents : 비고
 * @param {*} res :
 * kind : 'update_fee_list'
 * status : 'ok', 'ng'
 * docs : []
 */
exports.updateVehicleObjFeeList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, loop_event_time, lp, contents } = req.body;

    let obj = {};
    obj.kind = 'update_fee_list';
    obj.loop_event_time = new Date(loop_event_time).getTime();
    obj.lp = lp;
    obj.contents = contents;

    const resData = await settlementLogsService.updateVehicleObjFeeList(obj, ip, port);

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
    logger.error('parkingFee/settlementLogsController.js, updateVehicleObjFeeList, error: ', error);
    console.log('parkingFee/settlementLogsController.js, updateVehicleObjFeeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}
