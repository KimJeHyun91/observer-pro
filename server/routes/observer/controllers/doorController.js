const doorService = require('../services/doorService');
const logger = require('../../../logger');


exports.doorLockControl = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await doorService.doorLockControl(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('observer/doorController.js, doorControl, error: ', error);
    console.log('observer/doorController.js, doorControl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAccessControlDoors = async (req, res) => {

  try {
    let message = 'fail';

    const result = await doorService.getDoors(req.body);

    if(result.success) {
      message = 'ok';
    }
    if(!result.result || !result.success){
      return res.status(400).send({
        message,
        result: result.result
      });
    }
    return res.status(200).send({
      message,
      result: result.result
    });
  } catch(error) {
    logger.info('observer/doorController.js, get accesscontrol doors, error: ', error);
    console.log('observer/doorController.js, get accesscontrol doors, error: ', error);
    return res.status(500).send({
      message: error.message || 'getAccessControlDoors server error',
      result: error 
    });
  }
}

exports.getAccessControlAcus = async (req, res) => {

  try {
    let message = 'fail';

    const result = await doorService.getAcus();

    if(result.success) {
      message = 'ok';
    }
    if(result.result.length === 0){
      return res.status(404).send({
        message,
        result: result.result
      });
    }
    return res.status(200).send({
      message,
      result: result.result
    });
  } catch(error) {
    logger.info('observer/doorController.js, get accesscontrol acus, error: ', error);
    console.log('observer/doorController.js, get accesscontrol acus, error: ', error);
    return res.status(500).send({
      message: error.message || 'getAccessControlAcus server error',
      result: error 
    });
  }
}

exports.updateAccessControlDoor = async (req, res) => {

  try {

    const result = await doorService.updateDoor(req.body);

    if(result.success) {
      return res.sendStatus(200);
    }

  } catch(error) {
    logger.info('observer/doorController.js, update accesscontrol doors, error: ', error);
    console.log('observer/doorController.js, update accesscontrol doors, error: ', error);
    return res.status(500).send({
      message: error.message || 'updateAccessControllDoor server error',
      result: error 
    });
  }
}