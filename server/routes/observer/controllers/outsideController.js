const outsideService = require('../services/outsideService');
const logger = require('../../../logger');


exports.getBuilding = async (req, res) => {

  try {
    const result = await outsideService.getOutSide(req.body);
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/outsideController.js, getBuilding, error: ', error);
    console.log('observer/outsideController.js, getBuilding, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getBuilding3D = async (req, res) => {
  try {
    
    const result = await outsideService.getBuilding3D(req.body);

    return res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/outsideController.js, getBuilding3D, error: ', error);
    console.log('observer/outsideController.js, getBuilding3D, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addBuilding = async (req, res) => {

  try {
    
    let message = 'fail';
    const result = await outsideService.addOutSide(req.body);

    if(result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
    
  } catch (error) {
    logger.info('observer/outsideController.js, addBuilding, error: ', error);
    console.log('observer/outsideController.js, addBuilding, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteBuilding = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.deleteOutSide(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/outsideController.js, deleteBuilding, error: ', error);
    console.log('observer/outsideController.js, deleteBuilding, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyBuilding = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.modifyOutSide(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/outsideController.js, modifyBuilding, error: ', error);
    console.log('observer/outsideController.js, modifyBuilding, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

// outside(빌딩) 알람 삭제
exports.modifyBuildingAlarmStatus = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.modifyOutSideAlarmStatus(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/outsideController.js, modifyBuildingAlarmStatus, error: ', error);
    console.log('observer/outsideController.js, modifyBuildingAlarmStatus, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.buildingplanUpload = async (req, res) => {

  try {
    let result = {
      message: 'fail',
      file: null
    };
    const serviceRes = await outsideService.modifyOutSide(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    if(serviceRes.success){
      return res.status(200).send(result);
    }
  } catch (error) {
    logger.info('observer/outsideController.js, buildingplanUpload, error: ', error);
    console.log('observer/outsideController.js, buildingplanUpload, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getBuildingPlan = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getBuildingPlan(req.body);

    if(result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
   
  } catch (error) {
    logger.info('observer/outsideController.js, getBuildingPlan, error: ', error);
    console.log('observer/outsideController.js, getBuildingPlan, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}