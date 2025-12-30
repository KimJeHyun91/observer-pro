const eventTypeService = require('../services/eventTypeService');
const logger = require('../../../logger');
// ajy_test
// const commonService = require('../../routes/common/services/commonService');
const commonService = require('../../../routes/common/services/commonService');

exports.getEventTypeList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await eventTypeService.getEventTypeList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/eventTypeController.js, getEventTypeList, error: ', error);
    console.log('tunnel/eventTypeController.js, getEventTypeList, error: ', error);
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

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/eventTypeController.js, modifyEventType, error: ', error);
    console.log('tunnel/eventTypeController.js, modifyEventType, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}


exports.getEventList = async (req, res) => {
  try {

    let message = 'fail';
    const aa = req.body
    const result = await eventTypeService.getEventList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/eventTypeController.js, getEventList, error: ', error);
    console.log('tunnel/eventTypeController.js, getEventList, error: ', error);
  }
}
