const vmsEventService = require('../services/vmsEventService');
const logger = require('../../../logger');


exports.detectFire = async (req, res) => {
  
  try {
    
    const reqArray = req.body.split('\n');
    const cameraIp = reqArray[0];
    const cameraId = reqArray[1];
    const occurTime = reqArray[2];
    const vmsIp = reqArray[3];
    const vmsName = reqArray[4];
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectFire(cameraIp, cameraId, vmsIp, vmsName, updateOccurTime);

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('inundationControl/vmsEventController.js, detectFire, error: ', error);
    console.log('inundationControl/vmsEventController.js, detectFire, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}