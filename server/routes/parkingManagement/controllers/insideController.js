const insideService = require('../services/insideService');
const logger = require('../../../logger');


exports.getFloorInfo = async (req, res) => {

  try {
    
    const result = await insideService.getInSideInfo(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/insideController.js, getInSideInfo, error: ', error);
    console.log('parkingManagement/insideController.js, getInSideInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getFloorList = async (req, res) => {

  try {
    
    const result = await insideService.getInSideList(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/insideController.js, getInSideList, error: ', error);
    console.log('parkingManagement/insideController.js, getInSideList, error: ', error);
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
    const serviceRes = await insideService.modifyMapImageInSide(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    
    return res.status(serviceRes == 1 ? 200 : 400).send(result);
   
  } catch (error) {
    logger.info('parkingManagement/insideController.js, floorplanUpload, error: ', error);
    console.log('parkingManagement/insideController.js, floorplanUpload, error: ', error);
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
    logger.info('parkingManagement/insideController.js, getFloorPlan, error: ', error);
    console.log('parkingManagement/insideController.js, getFloorPlan, error: ', error);
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
    logger.info('parkingManagement/insideController.js, addFloor, error: ', error);
    console.log('parkingManagement/insideController.js, addFloor, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteInSide = async (req, res) => {

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
    logger.info('parkingManagement/insideController.js, deleteInSide, error: ', error);
    console.log('parkingManagement/insideController.js, deleteInSide, error: ', error);
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
    logger.info('parkingManagement/insideController.js, modifyFloor, error: ', error);
    console.log('parkingManagement/insideController.js, modifyFloor, error: ', error);
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
    logger.info('parkingManagement/insideController.js, modifyFloorAlarmStatus, error: ', error);
    console.log('parkingManagement/insideController.js, modifyFloorAlarmStatus, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}