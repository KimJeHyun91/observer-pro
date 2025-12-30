const logger = require('../../../logger');
const idManagementService = require('../services/idManagementService');


/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * @param {*} res :
 * kind : 'get_person_list'
 * status : 'ok'
 * docs : 검색결과
 */
exports.getManagePersonList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port } = req.body;

    let obj = {};
    obj.kind = 'get_person_list';

    const resData = await idManagementService.getManagePersonList(obj, ip, port);

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
    logger.error('parkingFee/idManagementController.js, getManagePersonList, error: ', error);
    console.log('parkingFee/idManagementController.js, getManagePersonList, error: ', error);
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
 * id : 입주사 id
 * pw : 입주사 pw, (등록시에는 일괄적으로 '1234'를 부여 입주사에서 pw 변경, DB에 저장시에는 암호화된 문자열로 저장)
 * company : 입주사명
 * name : 이름
 * phone1 : 전화번호
 * group_name : 웹할인권 그룹 이름
 * webDiscount_list : {
 *  group_name : '',
 *  coupons : [{}, {}]
 * }
 * @param {*} res :
 * kind : 'create_person_at_person_list'
 * status : 'ok'
 * message : 'db 삽입 성공.'
 */
exports.setManagePersonList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw, company, name, phone1, group_name, webDiscount_list } = req.body;

    let obj = {};
    obj.kind = 'create_person_at_person_list';
    obj.id = id;
    obj.pw = pw;
    obj.company = company;
    obj.name = name;
    obj.phone1 = phone1;
    obj.group_name = group_name;
    obj.webDiscount_list = webDiscount_list;

    const resData = await idManagementService.setManagePersonList(obj, ip, port);

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
    logger.error('parkingFee/idManagementController.js, setManagePersonList, error: ', error);
    console.log('parkingFee/idManagementController.js, setManagePersonList, error: ', error);
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
 * id : 입주사 id
 * pw : 입주사 pw
 * company : 입주사명
 * name : 이름
 * phone1 : 전화번호
 * group_name : 웹할인권 그룹 이름
 * webDiscount_list : {
 *  group_name : '',
 *  coupons : [{}, {}]
 * }
 * @param {*} res :
 * kind : 'update_person_at_person_list'
 * status : 'ok'
 * message : 'db 업데이트 성공.'
 */
exports.updateManagePersonList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw, company, name, phone1, group_name, webDiscount_list } = req.body;

    let obj = {};
    obj.kind = 'update_person_at_person_list';
    obj.id = id;
    obj.pw = pw;
    obj.company = company;
    obj.name = name;
    obj.phone1 = phone1;
    obj.group_name = group_name;
    obj.webDiscount_list = webDiscount_list;

    const resData = await idManagementService.updateManagePersonList(obj, ip, port);

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
    logger.error('parkingFee/idManagementController.js, updateManagePersonList, error: ', error);
    console.log('parkingFee/idManagementController.js, updateManagePersonList, error: ', error);
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
 * id : 입주사 id
 * @param {*} res :
 * kind : 'delete_person_at_person_list'
 * status : 'ok'
 * message : 'db 삭제 성공.'
 */
exports.deleteManagePersonList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id } = req.body;

    let obj = {};
    obj.kind = 'delete_person_at_person_list';
    obj.id = id;

    const resData = await idManagementService.deleteManagePersonList(obj, ip, port);

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
    logger.error('parkingFee/idManagementController.js, deleteManagePersonList, error: ', error);
    console.log('parkingFee/idManagementController.js, deleteManagePersonList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}