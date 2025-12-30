const cameraService = require('../services/cameraService');
const logger = require('../../../logger');

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
    logger.info('tunnel/cameraController.js, ptzCameraControl, error: ');
    console.log('tunnel/cameraController.js, ptzCameraControl, error: ');
    res.status(400).send({
      message: 'error',
      result: error
    });
  };
};
