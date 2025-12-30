const eventTypeService = require('../services/eventTypeService');
const logger = require('../../../logger');


exports.getEventTypeList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await eventTypeService.getEventTypeList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/eventTypeController.js, getEventTypeList, error: ', error);
    console.log('villageBroadcast/eventTypeController.js, getEventTypeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyEventType = async (req, res) => {

  try {
    
    let message = 'fail';
    const result = await eventTypeService.modifyEventType(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/eventTypeController.js, modifyEventType, error: ', error);
    console.log('villageBroadcast/eventTypeController.js, modifyEventType, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}