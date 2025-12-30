const deviceService = require('../services/deviceService');
const logger = require('../../../logger');


exports.getUnUseDeviceList = async (req, res) => {

  try {
    
    const result = await deviceService.getUnUseDeviceList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/deviceController.js, getUnUseDeviceList, error: ', error);
    console.log('parkingManagement/deviceController.js, getUnUseDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}


exports.getDeviceIpList = async (req, res) => {
  try {
    
    const result = await deviceService.getDeviceIpList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/deviceController.js, getDeviceIpList, error: ', error);
    console.log('parkingManagement/deviceController.js, getDeviceIpList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addDevice = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await deviceService.addDevice(req.body);
    
    if(result.status) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/deviceController.js, addDevice, error: ', error);
    console.log('parkingManagement/deviceController.js, addDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyDevice = async (req, res) => {

  try {
    const result = await deviceService.modifyDevice(req.body);
    
    let message = 'fail';

    if(result.status) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/deviceController.js, addDevice, error: ', error);
    console.log('parkingManagement/deviceController.js, addDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteDevice = async (req, res) => {
  try {
    const result = await deviceService.deleteDevice(req.body);
    
    let message = 'fail';

    if (result > 0) {
      message = 'ok';
    } else if (result === 0) {
      message = 'none';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/deviceController.js, deleteDevice, error: ', error);
    console.log('parkingManagement/deviceController.js, deleteDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}
