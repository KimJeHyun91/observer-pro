const insideService = require('../services/insideService');
const logger = require('../../../logger');


exports.getFloor = async (req, res) => {

  try {
    
    const result = await insideService.getInSide(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/insideController.js, getFloor, error: ', error);
    console.log('observer/insideController.js, getFloor, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addFloor = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await insideService.addInSide(req.body);
    
    if(result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/insideController.js, addFloor, error: ', error);
    console.log('observer/insideController.js, addFloor, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteFloor = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await insideService.deleteInSide(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/insideController.js, deleteFloor, error: ', error);
    console.log('observer/insideController.js, deleteFloor, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyFloor = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await insideService.modifyInSide(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/insideController.js, modifyFloor, error: ', error);
    console.log('observer/insideController.js, modifyFloor, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyFloorAlarmStatus = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await insideService.modifyInSideAlarmStatus(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/insideController.js, modifyFloorAlarmStatus, error: ', error);
    console.log('observer/insideController.js, modifyFloorAlarmStatus, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.floorplanUpload = async (req, res) => {

  try {

    let result = {
      message: 'fail',
      file: null
    };
    const serviceRes = await insideService.modifyInSide(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    if(serviceRes.success){
      return res.status(200).send(result);
    }
  } catch (error) {
    logger.info('observer/insideController.js, floorplanUpload, error: ', error);
    console.log('observer/insideController.js, floorplanUpload, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getFloorPlan = async (req, res) => {

  try {

    let message = 'fail';

    const result = await insideService.getFloorPlan(req.body);

    if(result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
   
  } catch (error) {
    logger.info('observer/insideController.js, getFloorPlan, error: ', error);
    console.log('observer/insideController.js, getFloorPlan, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}