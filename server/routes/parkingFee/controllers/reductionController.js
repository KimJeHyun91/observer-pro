const logger = require('../../../logger');
const reductionService = require('../services/reductionService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * kind : 'get_reduction_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getReductionList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;

    let obj = {};
    obj.kind = 'get_reduction_list';

    const resData = await reductionService.getReductionList(obj, ip, port);
    
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
    logger.error('parkingFee/reductionController.js, getReductionList, error: ', error);
    console.log('parkingFee/reductionController.js, getReductionList, error: ', error);
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
 * reduction_name : 전기차'
 * reduction_ratio : '50'
 * reduction_min : '60'
 * reduction_fee : '0'
 * contents : 비고
 * @param {*} res :
 * kind : 'create_reduction_list'
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setReductionList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, reduction_name, reduction_ratio, reduction_min, reduction_fee, contents } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }
    
    let obj = {};
    obj.kind = 'create_reduction_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.reduction_name = reduction_name;
    obj.reduction_ratio = reduction_ratio;
    obj.reduction_min = reduction_min;
    obj.reduction_fee = reduction_fee;
    obj.contents = contents;

    const resData = await reductionService.setReductionList(obj, ip, port);

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
    logger.error('parkingFee/reductionController.js, setReductionList, error: ', error);
    console.log('parkingFee/reductionController.js, setReductionList, error: ', error);
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
 * reduction_name : 전기차'
 * reduction_ratio : '50'
 * reduction_min : '60'
 * reduction_fee : '0'
 * contents : 비고 // ex) '60분 감면후 50%감면'
 * @param {*} res :
 * kind : 'update_reduction_list'
 * status : 'ok' or 'ng'
 * message : 'db update 성공.'
 */
exports.updateReductionList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, reduction_name, reduction_ratio, reduction_min, reduction_fee, contents } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }

    let obj = {};
    obj.kind = 'update_reduction_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.reduction_name = reduction_name;
    obj.reduction_ratio = reduction_ratio;
    obj.reduction_min = reduction_min;
    obj.reduction_fee = reduction_fee;
    obj.contents = contents;

    const resData = await reductionService.updateReductionList(obj, ip, port);

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
    logger.error('parkingFee/reductionController.js, updateReductionList, error: ', error);
    console.log('parkingFee/reductionController.js, updateReductionList, error: ', error);
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
 * reduction_name : 전기차'
 * reduction_ratio : '50'
 * reduction_min : '60'
 * reduction_fee : '0'
 * contents : 비고 // ex) '60분 감면후 50%감면'
 * @param {*} res :
 * kind : 'delete_reduction_list'
 * status : 'ok' or 'ng'
 */
exports.deleteReductionList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, reduction_name, reduction_ratio, reduction_min, reduction_fee, contents } = req.body;

    let user_id = '';
    if(req.session.user_id) {
      user_id = req.session.user_id;
    }

    let obj = {};
    obj.kind = 'delete_reduction_list';
    obj.id = user_id;
    obj.pw = '1234'; // 비밀번호 임시 고정, GTL 에서 크게 의미 없음
    obj.reduction_name = reduction_name;
    obj.reduction_ratio = reduction_ratio;
    obj.reduction_min = reduction_min;
    obj.reduction_fee = reduction_fee;
    obj.contents = contents;

    const resData = await reductionService.deleteReductionList(obj, ip, port);

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
    logger.error('parkingFee/reductionController.js, deleteReductionList, error: ', error);
    console.log('parkingFee/reductionController.js, deleteReductionList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}

exports.getReductionPolicyList = async (req, res) => {

  try {

    const result = await reductionService.getReductionPolicyList();

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/reductionController.js, getReductionPolicyList, error: ', error);
    console.log('parkingFee/reductionController.js, getReductionPolicyList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error)
    });
  }
}