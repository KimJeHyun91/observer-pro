const logger = require('../../../logger');
const receiveService = require('../services/receiveService');


/**
 * 
 * @param {*} req 
 * kind : "vehicle_det", 
 * ip : "192.168.7.211" // 차단기 ip
 * port : 33001 // 차단기 port
 * loop : "loop1", loop3"
 * direction : "in", "out"
 * location : "입차1", "출차1"
 * status : "on", "off" // ??
 * loop_event_time : 1764118969266 (unix)
 * @param {*} res :
 * message : ''
 * status : 'ok' or 'ng'
 */
exports.getVehicleDetInfo = async (req, res) => {

  try {
    
    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const reqBodyData = req.body;

    await receiveService.getVehicleDetInfo(reqBodyData, outside_ip); // 현재사용 안함.

    res.status(200).send({
      status: 'ok',
      message: ''
    });

  } catch (error) {
    logger.error('parkingFee/receiveController.js, getVehicleDetInfo, error: ', error);
    console.log('parkingFee/receiveController.js, getVehicleDetInfo, error: ', error);
    res.status(400).send({
      status: 'ng' ,
      message: String(error),
    });
  }
}

/**
 * 
 * @param {*} req 
 * kind : "lpr", 
 * ip : "192.168.7.211" // 차단기 ip
 * port : 33001 // 차단기 port
 * lp : "12가2345" // 차량번호
 * direction : "in", "out"
 * location : "입차1", "출차1"
 * fname : "1753087877656_202511261108002_loop1_00_0_33001_998버8936.jpg"
 * folder_name: "2025_07_21"
 * image_url_header : "/images/"
 * loop_event_time : 1764118969266 (unix)
 * @param {*} res :
 * message : ''
 * status : 'ok' or 'ng'
 */
exports.getLprInfo = async (req, res) => {

  try {
    
    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    let reqBodyData = req.body;

    await receiveService.getLprInfo(reqBodyData, outside_ip);

    res.status(200).send({
      status: 'ok',
      message : ''
    });

  } catch (error) {
    logger.error('parkingFee/receiveController.js, getLprInfo, error: ', error);
    console.log('parkingFee/receiveController.js, getLprInfo, error: ', error);
    res.status(400).send({
      status: 'ng',
      message: String(error),
    });
  }
}

/**
 * 
 * @param {*} req 
 * kind : "gate_state"
 * ip : "192.168.7.211"
 * port : 33001
 * location : "입차1", "출차1"
 * status : "up", "down"
 * descript : "입차1_loop1"
 * loop_event_time : 1764118969266 (unix)
 * @param {*} res :
 * message : ''
 * status : 'ok' or 'ng'
 */
exports.getGateState = async (req, res) => {

  try {

    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const reqBodyData = req.body;

    await receiveService.getGateState(reqBodyData, outside_ip);

    res.status(200).send({
      status: 'ok',
      message : ''
    });

  } catch (error) {
    logger.error('parkingFee/receiveController.js, getGateState, error: ', error);
    console.log('parkingFee/receiveController.js, getGateState, error: ', error);
    res.status(400).send({
      status: 'ng' ,
      message: String(error),
    });
  }
}

/**
 * 
 * @param {*} req 
 * kind : "payment"
 * ip : 정산기(pt) ip
 * port : 정산기(pt) port
 * location : "입차1", "출차1"
 * cmd : "PARK_CAR_SEARCH"
 * searchkey : 차량번호 4자리
 * @param {*} res :
 * kind : "payment"
 * ip : 정산기(pt) ip
 * port : 정산기(pt) port
 * location : "입차1", "출차1"
 * cmd : "PARK_SEARCH_RESULT"
 * resultno : 검색된 차량 결과 
 * car_list : [{"lp":"서울32나5678", "in_time":3454576928, "parkingfee":1500, "feetype":1, "imgurl":"http://web server/file/img001.jpg"}]
 */
exports.getParkCarSearch = async (req, res) => {

  try {

    const outside_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
    const reqBodyData = req.body;

    let result = await receiveService.getParkCarSearch(reqBodyData, outside_ip);

    res.status(200).send(
      result
    );

  } catch (error) {
    logger.error('parkingFee/receiveController.js, getParkCarSearch, error: ', error);
    console.log('parkingFee/receiveController.js, getParkCarSearch, error: ', error);
    res.status(400).send({
      status: 'ng' ,
      message: String(error),
      docs: []
    });
  }
}