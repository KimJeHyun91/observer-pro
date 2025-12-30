const vmsEventService = require('../services/vmsEventService');
const logger = require('../../../logger');


exports.detectFire = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectFire({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectFire, error: ', error);
    console.log('observer/vmsEventController.js, detectFire, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectSmoke = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectSmoke({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectSmoke, error: ', error);
    console.log('observer/vmsEventController.js, detectSmoke, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectMotion = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectMotion({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectMotion, error: ', error);
    console.log('observer/vmsEventController.js, detectMotion, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectLoiter = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLoiter({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLoiter, error: ', error);
    console.log('observer/vmsEventController.js, detectLoiter, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectAbandonment = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectAbandonment({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectAbandonment, error: ', error);
    console.log('observer/vmsEventController.js, detectAbandonment, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectTrespass = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectTrespass({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectTrespass, error: ', error);
    console.log('observer/vmsEventController.js, detectTrespass, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectLeave = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLeave({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLeave, error: ', error);
    console.log('observer/vmsEventController.js, detectLeave, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectLinecross = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLinecross({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLinecross, error: ', error);
    console.log('observer/vmsEventController.js, detectLinecross, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectQueue = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectQueue({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectQueue, error: ', error);
    console.log('observer/vmsEventController.js, detectQueue, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectFalldown = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectFalldown({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectFalldown, error: ', error);
    console.log('observer/vmsEventController.js, detectFalldown, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectSittingPosture = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectSittingPosture({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectSittingPosture, error: ', error);
    console.log('observer/vmsEventController.js, detectSittingPosture, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectStop = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectStop({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectSittingPosture, error: ', error);
    console.log('observer/vmsEventController.js, detectSittingPosture, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.detectMove = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectMove({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectMove, error: ', error);
    console.log('observer/vmsEventController.js, detectMove, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectPeopleCount = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectPeopleCount({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectPeopleCount, error: ', error);
    console.log('observer/vmsEventController.js, detectPeopleCount, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectShortDistance = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectShortDistance({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectShortDistance, error: ', error);
    console.log('observer/vmsEventController.js, detectShortDistance, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectHandrail = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectHandrail({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectHandrail, error: ', error);
    console.log('observer/vmsEventController.js, detectHandrail, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectHandsUp = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectHandsUp({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectHandsUp, error: ', error);
    console.log('observer/vmsEventController.js, detectHandsUp, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectFace = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectFace({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectFace, error: ', error);
    console.log('observer/vmsEventController.js, detectFace, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectPerson = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectPerson({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectPerson, error: ', error);
    console.log('observer/vmsEventController.js, detectPerson, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectCar = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectCar({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectCar, error: ', error);
    console.log('observer/vmsEventController.js, detectCar, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectSafetyHelmet = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !vmsName || !mainServiceName || !occurTime){
      return res.sendStatus(400);
    }
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectSafetyHelmet({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectSafetyHelmet, error: ', error);
    console.log('observer/vmsEventController.js, detectSafetyHelmet, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectLostRecord = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !occurTime){
      return res.sendStatus(200);
    };
    
    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLostRecord({
      cameraId,
      vmsName,
      mainServiceName,
      updateOccurTime
    });
    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLostRecord, error: ', error);
    console.log('observer/vmsEventController.js, detectLostRecord, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectLostCamera = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const cameraId = reqArray[0];
    const vmsName = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!cameraId || !occurTime || !vmsName){
      return res.sendStatus(200);
    };

    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLostCamera({ cameraId, vmsName, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    }

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLostCamera, error: ', error);
    console.log('observer/vmsEventController.js, detectLostCamera, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.detectLostServer = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const vmsName = reqArray[0];
    const vmsIp = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if( !occurTime || !vmsIp || !vmsName){
      return res.sendStatus(200);
    };

    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLostServer({ vmsName, vmsIp, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    };

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLostServer, error: ', error);
    console.log('observer/vmsEventController.js, detectLostServer, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};

exports.detectLostArchive = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const vmsName = reqArray[0];
    const vmsIp = reqArray[1];
    const mainServiceName = reqArray[2];
    const occurTime = reqArray[3];
    
    if(!occurTime || !vmsIp || !vmsName){
      return res.sendStatus(200);
    };

    const updateOccurTime = occurTime && occurTime.split('.')[0];

    const result = await vmsEventService.detectLostArchive({ vmsName, vmsIp, mainServiceName, updateOccurTime });

    let message = 'fail';
    if(result === 1) {
      message = 'ok';
    };

    return res.status(201).send({
      message,
      result 
    });

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectLostArchive, error: ', error);
    console.log('observer/vmsEventController.js, detectLostArchive, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};

exports.detectVehicleNumber = async (req, res) => {
  
  try {
    const reqArray = req.body.split(/\r?\n/);
    const vehicleNum = reqArray[0];
    const cameraId = reqArray[1];
    const vmsName = reqArray[2];
    const mainServiceName = reqArray[3];
    let occurDateTime = reqArray[4];
    
    if(vehicleNum == null || cameraId == null || vmsName == null || occurDateTime == null || mainServiceName == null){
      console.log('observer/vmsEventController.js, detectVehicleNumber, request body values is null or undefined');
      return res.sendStatus(200);
    };

    occurDateTime = occurDateTime.split('.')[0];

    res.sendStatus(201);
    const result = await vmsEventService.detectVehicleNumber({ vehicleNum, eventCameraId: `${mainServiceName}:${vmsName}:${cameraId}`, occurDateTime, mainServiceName });
    if(result && result.success){
      return;
    };

  } catch (error) {
    logger.info('observer/vmsEventController.js, detectVehicleNumber, error: ', error);
    console.log('observer/vmsEventController.js, detectVehicleNumber, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};
