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
    logger.info('observer/cameraController.js, getUnUseCameraList, error: ', error);
    console.log('observer/cameraController.js, getUnUseCameraList, error: ', error);
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
    logger.info('observer/cameraController.js, getCameraLiveStream, error: ', error);
    console.log('observer/cameraController.js, getCameraLiveStream, error: ', error);
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
    logger.info('observer/cameraController.js, modifyCamera, error: ', error);
    console.log('observer/cameraController.js, modifyCamera, error: ', error);
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
    logger.info('observer/cameraController.js, deleteCameraLocation, error: ', error);
    console.log('observer/cameraController.js, deleteCameraLocation, error: ', error);
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
    logger.info('observer/cameraController.js, getAllCameraList, error: ', error);
    console.log('observer/cameraController.js, getAllCameraList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};

exports.getIndependentCameraList = async (req, res) => {

  try {

    const result = await cameraService.getIndependentCameraList(req.body);
    return res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/cameraController.js, getIndependentCameraList, error: ', error);
    console.log('observer/cameraController.js, getIndependentCameraList, error: ', error);
    return res.status(500).send({
      message: error.message || 'observer/cameraController.js, getIndependentCameraList, error',
      result: error 
    });
  };
};

exports.ptzCameraControl = async (req, res) => {
  try {
    let message = 'fail';
    const result = await cameraService.ptzCameraControl(req.body);
    
    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });
  } catch (error) {
    logger.info('inundationControl/outsideController.js, ptzCameraControl, error: ');
    console.log('inundationControl/outsideController.js, ptzCameraControl, error: ');
    res.status(400).send({
      message: 'error',
      result: error
    });
  };
};

exports.getPresetList = async (req, res) => {
  try {
    const result = await cameraService.getPresetList(req.body);
    if(result?.data) {
      res.status(200).send(result.data);
    } else {
      res.status(404).send({ message: '프리셋 정보를 찾을 수 없습니다.' });
    }
  } catch(err) {
    console.error('getPresetList error:', err);
    res.status(500).send({ 
      message: err.message || '프리셋 목록을 가져오는 중 오류가 발생했습니다.',
      error: err.toString()
    });
  }
}

exports.setPresetPosition = async (req, res) => {
  try {
    const result = await cameraService.setPresetPosition(req.body);
    if(result) {
      res.send({
        message: 'success',
      });
    }
  } catch(err) {
    console.error(err);
    res.status(500).send({ message: err });
  }
}

exports.addCamera = async (req, res) => {
  try {
    const result = await cameraService.addCamera(req.body);
    if(result.success){
      return res.sendStatus(201);
    };
    return res.sendStatus(400);
  } catch(error) {
    logger.info('observer/cameraController.js, addCamera, error: ', error);
    console.log('observer/cameraController.js, addCamera, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error
    });
  };
};

exports.removeCamera = async (req, res) => {
  try {
    const result = await cameraService.removeCamera(req.body);
    if(result.success){
      return res.sendStatus(204);
    };
    return res.sendStatus(400);
  } catch(error) {
    logger.info('observer/cameraController.js, removeCamera, error: ', error);
    console.log('observer/cameraController.js, removeCamera, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error
    });
  };
};

exports.updateCamera = async (req, res) => {
  try {
    const result = await cameraService.updateCamera(req.body);
    if(result.success){
      return res.sendStatus(200);
    };
    return res.sendStatus(400);
  } catch(error) {
    logger.info('observer/cameraController.js, updateCamera, error: ', error);
    console.log('observer/cameraController.js, updateCamera, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error
    });
  };
};