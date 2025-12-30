const groupService = require('../services/groupService');
const logger = require('../../../logger');


exports.addgroup = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await groupService.addgroup(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/groupController.js, addgroup, error: ', error);
    console.log('villageBroadcast/groupController.js, addgroup, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteGroup = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await groupService.deleteGroup(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/groupController.js, deleteGroup, error: ', error);
    console.log('villageBroadcast/groupController.js, deleteGroup, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getGroupOutsideInfo = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await groupService.getGroupOutsideInfo(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/groupController.js, getGroupOutsideInfo, error: ', error);
    console.log('villageBroadcast/groupController.js, getGroupOutsideInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getGroupOutsideList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await groupService.getGroupOutsideList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/groupController.js, getGroupOutsideList, error: ', error);
    console.log('villageBroadcast/groupController.js, getGroupOutsideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}