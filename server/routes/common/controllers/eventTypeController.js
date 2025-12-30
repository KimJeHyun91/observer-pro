const eventTypeService = require('../services/eventTypeService');
const logger = require('../../../logger');

exports.getEventTypeList = async (req, res) => {

  try {

    const result = await eventTypeService.getEventTypeList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/eventTypeController.js, getEventTypeList, error: ', error);
    console.log('common/eventTypeController.js, getEventTypeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyEventTypes = async (req, res) => {

  try {

    let message = 'fail';
    const result = await eventTypeService.modifyEventTypes(req.body);
    
    if(result) {
      message = 'ok';
    }
    
    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('common/eventTypeController.js, modifyEventTypes, error: ', error);
    console.log('common/eventTypeController.js, modifyEventTypes, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getEventTypeInfo = async (req, res) => {

  try {

    const result = await eventTypeService.getEventTypeInfo(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/eventTypeController.js, getEventTypeInfo, error: ', error);
    console.log('common/eventTypeController.js, getEventTypeInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}