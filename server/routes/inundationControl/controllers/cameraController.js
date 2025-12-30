const cameraService = require('../services/cameraService');
const logger = require('../../../logger');

exports.getUnUseCameraList = async (req, res) => {

  try {

    const result = await cameraService.getUnUseCameraList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/cameraController.js, getUnUseCameraList, error: ', error);
    console.log('inundationControl/cameraController.js, getUnUseCameraList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getCameraLiveStream = async (req, res) => {

  try {

    const result = await cameraService.getCameraLiveStream(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/cameraController.js, getCameraLiveStream, error: ', error);
    console.log('inundationControl/cameraController.js, getCameraLiveStream, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyCamera = async (req, res) => {

  try {

    let message = 'fail';

    const result = await cameraService.modifyCamera(req.body);
    
    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/cameraController.js, modifyCamera, error: ', error);
    console.log('inundationControl/cameraController.js, modifyCamera, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteCameraLocation = async (req, res) => {

  try {

    let message = 'fail';

    const result = await cameraService.deleteCameraLocation(req.body);
    
    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/cameraController.js, deleteCameraLocation, error: ', error);
    console.log('inundationControl/cameraController.js, deleteCameraLocation, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAllCameraList = async (req, res) => {

  try {

    const result = await cameraService.getAllCameraList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/cameraController.js, getAllCameraList, error: ', error);
    console.log('inundationControl/cameraController.js, getAllCameraList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}