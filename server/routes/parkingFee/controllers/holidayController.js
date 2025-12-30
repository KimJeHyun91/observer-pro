const logger = require('../../../logger');
const holidayService = require('../services/holidayService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * kind : 'get_holiday_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getHolidayList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;

    let obj = {};
    obj.kind = 'get_holiday_list';

    const resData = await holidayService.getHolidayList(obj, ip, port);
    
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
    logger.error('parkingFee/holidayController.js, getHolidayList, error: ', error);
    console.log('parkingFee/holidayController.js, getHolidayList, error: ', error);
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
 * hoilday_name : 현충일'
 * day : '06월06일'
 * day_of_week : '수'
 * @param {*} res :
 * kind : 'create_holiday_list'
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setHolidayList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, hoilday_name, day, day_of_week } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }

    let obj = {};
    obj.kind = 'create_holiday_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.hoilday_name = hoilday_name;
    obj.day = day;
    obj.day_of_week = day_of_week;

    const resData = await holidayService.setHolidayList(obj, ip, port);

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
    logger.error('parkingFee/holidayController.js, setHolidayList, error: ', error);
    console.log('parkingFee/holidayController.js, setHolidayList, error: ', error);
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
 * hoilday_name : 현충일'
 * day : '06월06일'
 * day_of_week : '수'
 * @param {*} res :
 * kind : 'update_holiday_list'
 * status : 'ok' or 'ng'
 * message : 'db update 성공.'
 */
exports.updateHolidayList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, hoilday_name, day, day_of_week } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }

    let obj = {};
    obj.kind = 'update_holiday_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.hoilday_name = hoilday_name;
    obj.day = day;
    obj.day_of_week = day_of_week;

    const resData = await holidayService.updateHolidayList(obj, ip, port);

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
    logger.error('parkingFee/holidayController.js, updateHolidayList, error: ', error);
    console.log('parkingFee/holidayController.js, updateHolidayList, error: ', error);
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
 * hoilday_name : 현충일'
 * day : '06월06일'
 * day_of_week : '수'
 * @param {*} res :
 * kind : 'delete_holiday_list'
 * status : 'ok' or 'ng'
 */
exports.deleteHolidayList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, hoilday_name, day, day_of_week } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }

    let obj = {};
    obj.kind = 'delete_holiday_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.hoilday_name = hoilday_name;
    obj.day = day;
    obj.day_of_week = day_of_week;

    const resData = await holidayService.deleteHolidayList(obj, ip, port);

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
    logger.error('parkingFee/holidayController.js, deleteHolidayList, error: ', error);
    console.log('parkingFee/holidayController.js, deleteHolidayList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}