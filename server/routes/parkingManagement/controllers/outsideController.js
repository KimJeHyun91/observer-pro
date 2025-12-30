const outsideService = require('../services/outsideService');
const logger = require('../../../logger');


exports.getBuildingInfo = async (req, res) => {

  try {
    
    const result = await outsideService.getOutSideInfo(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/outsideController.js, getBuildingInfo, error: ', error);
    console.log('parkingManagement/outsideController.js, getBuildingInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getBuildingList = async (req, res) => {

  try {
    
    const result = await outsideService.getOutSideList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/outsideController.js, getBuildingInfo, error: ', error);
    console.log('parkingManagement/outsideController.js, getBuildingInfo, error: ', error);
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
    logger.info('parkingManagement/outsideController.js, addBuilding, error: ', error);
    console.log('parkingManagement/outsideController.js, addBuilding, error: ', error);
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
    logger.info('parkingManagement/outsideController.js, deleteBuilding, error: ', error);
    console.log('parkingManagement/outsideController.js, deleteBuilding, error: ', error);
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
    logger.info('parkingManagement/outsideController.js, modifyBuilding, error: ', error);
    console.log('parkingManagement/outsideController.js, modifyBuilding, error: ', error);
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
    logger.info('parkingManagement/outsideController.js, modifyBuildingAlarmStatus, error: ', error);
    console.log('parkingManagement/outsideController.js, modifyBuildingAlarmStatus, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutsideInsideList = async (req, res) => {

  try {
    
    const result = await outsideService.getOutsideInsideList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/outsideController.js, getOutsideInsideList, error: ', error);
    console.log('parkingManagement/outsideController.js, getOutsideInsideList, error: ', error);
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
    const serviceRes = await outsideService.modifyMapImageOutSide(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    
    return res.status(serviceRes == 1 ? 200 : 400).send(result);

  } catch (error) {
    logger.info('parkingManagement/outsideController.js, buildingplanUpload, error: ', error);
    console.log('parkingManagement/outsideController.js, buildingplanUpload, error: ', error);
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
    logger.info('parkingManagement/outsideController.js, getBuildingPlan, error: ', error);
    console.log('parkingManagement/outsideController.js, getBuildingPlan, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}