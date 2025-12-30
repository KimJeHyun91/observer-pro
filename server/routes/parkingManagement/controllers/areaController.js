const areaService = require('../services/areaService');
const logger = require('../../../logger');


exports.getAreaList = async (req, res) => {

  try {
    
    const result = await areaService.getAreaList(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getAreaList, error: ', error);
    console.log('parkingManagement/areaController.js, getAreaList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addArea = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await areaService.addArea(req.body);
    
    if(result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, addArea, error: ', error);
    console.log('parkingManagement/areaController.js, addArea, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getParkingTypeCountUsedArea = async (req, res) => {

  try {
    
    const result = await areaService.getParkingTypeCountUsedArea(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getParkingTypeCountUsedArea, error: ', error);
    console.log('parkingManagement/areaController.js, getParkingTypeCountUsedArea, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getParkingTypeCountAreaInfo = async (req, res) => {

  try {
    
    const result = await areaService.getParkingTypeCountAreaInfo(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getParkingTypeCountAreaInfo, error: ', error);
    console.log('parkingManagement/areaController.js, getParkingTypeCountAreaInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getParkingTypeCountAreaList = async (req, res) => {

  try {
    
    const result = await areaService.getParkingTypeCountAreaList(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getParkingTypeCountAreaList, error: ', error);
    console.log('parkingManagement/areaController.js, getParkingTypeCountAreaList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyAreaInfo = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await areaService.modifyAreaInfo(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, modifyAreaInfo, error: ', error);
    console.log('parkingManagement/areaController.js, modifyAreaInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteAreaInfo = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await areaService.deleteAreaInfo(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, deleteAreaInfo, error: ', error);
    console.log('parkingManagement/areaController.js, deleteAreaInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAreaInfo = async (req, res) => {

  try {
    
    const result = await areaService.getAreaInfo(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getAreaInfo, error: ', error);
    console.log('parkingManagement/areaController.js, getAreaInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getParkingTypeSumAreaList = async (req, res) => {

  try {
    
    const result = await areaService.getParkingTypeSumAreaList(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getParkingTypeSumAreaList, error: ', error);
    console.log('parkingManagement/areaController.js, getParkingTypeSumAreaList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getTreeList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await areaService.getTreeList();

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('parkingManagement/areaController.js, getTreeList, error: ', error);
    console.log('parkingManagement/areaController.js, getTreeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}