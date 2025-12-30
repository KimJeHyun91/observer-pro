const serviceTypeService = require('../services/serviceTypeService');
const logger = require('../../../logger');

exports.getServiceTypeList = async (req, res) => {

  try {

    const result = await serviceTypeService.getServiceTypeList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/serviceTypeController.js, getServiceTypeList, error: ', error);
    console.log('common/serviceTypeController.js, getServiceTypeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyServiceTypes = async (req, res) => {

  try {

    let message = 'fail';
    const result = await serviceTypeService.modifyServiceTypes(req.body);
    
    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('common/serviceTypeController.js, modifyServiceTypes, error: ', error);
    console.log('common/serviceTypeController.js, modifyServiceTypes, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getServiceTypeInfo = async (req, res) => {

  try {

    const result = await serviceTypeService.getServiceTypeInfo(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/serviceTypeController.js, getServiceTypeInfo, error: ', error);
    console.log('common/serviceTypeController.js, getServiceTypeInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}