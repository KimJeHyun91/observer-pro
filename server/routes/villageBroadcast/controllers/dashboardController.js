const logger = require('../../../logger');
const dashboardService = require('../services/dashboardService');

exports.getNetworkStatus = async (req, res) => {

  try {

    const result = await dashboardService.getNetworkStatus();

    return res.status(200).send({
      message: 'ok',
      result: result
    });
    
  } catch (error) {
    console.log('villageBroadcast/dashboardController.js, getNetworkStatus, error: ', error);
    logger.error('villageBroadcast/dashboardController.js, getNetworkStatus, error: ', error);
  }

} 

exports.getDeviceStatus = async (token, req, res) => {

  if (!token) {
    return res.status(401).send({
      message: '토큰이 없습니다.',
      result: null
    });
  }

  try {

    const result = await dashboardService.getDeviceStatus(token, req.body);

    return res.status(200).send({
      message: 'ok',
      result: result
    });
    
  } catch (error) {
    console.log('villageBroadcast/dashboardController.js, getDeviceStatus, error: ', error);
    logger.error('villageBroadcast/dashboardController.js, getDeviceStatus, error: ', error);
  }

} 

exports.getBroadcastTransmissionStatus = async (token, req, res) => {

  if (!token) {
      return res.status(401).send({
        message: '토큰이 없습니다.',
        result: null
      });
    }

  try {

    const result = await dashboardService.getBroadcastTransmissionStatus(token, req.body);

    return res.status(200).send({
      message: 'ok',
      result: result
    });

  } catch (error) {
    logger.error('villageBroadcast/dashboardController.js, getBroadcastTransmissionStatus, error: ', error);
    console.log('villageBroadcast/dashboardController.js, getBroadcastTransmissionStatus, error: ', error);
  }
};



