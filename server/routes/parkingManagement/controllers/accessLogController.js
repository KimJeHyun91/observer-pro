const accessLogService = require('../services/accessLogService');
const logger = require('../../../logger');


exports.getVehicleNumberSearchPreview = async (req, res) => {

  try {
    
    const result = await accessLogService.getVehicleNumberSearchPreview(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getVehicleNumberSearchPreview, error: ', error);
    console.log('parkingManagement/accessLogController.js, getVehicleNumberSearchPreview, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getVehicleNumberSearch = async (req, res) => {

  try {
    
    const result = await accessLogService.getVehicleNumberSearch(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getVehicleNumberSearch, error: ', error);
    console.log('parkingManagement/accessLogController.js, getVehicleNumberSearch, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAccessTimeZone = async (req, res) => {

  try {
    
    const result = await accessLogService.getAccessTimeZone(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getAccessTimeZone, error: ', error);
    console.log('parkingManagement/accessLogController.js, getAccessTimeZone, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutTimeZone = async (req, res) => {

  try {
    
    const result = await accessLogService.getOutTimeZone(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getOutTimeZone, error: ', error);
    console.log('parkingManagement/accessLogController.js, getOutTimeZone, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAccessLogList = async (req, res) => {

  try {
    
    const result = await accessLogService.getAccessLogList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getAccessLogList, error: ', error);
    console.log('parkingManagement/accessLogController.js, getAccessLogList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getBuildingAccessLogList = async (req, res) => {

  try {
    
    const result = await accessLogService.getOutSideAccessLogList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/accessLogController.js, getBuildingAccessLogList, error: ', error);
    console.log('parkingManagement/accessLogController.js, getBuildingAccessLogList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}