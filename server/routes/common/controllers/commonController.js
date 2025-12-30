const commonService = require('../services/commonService');
const logger = require('../../../logger');
const { connectEbellServer } = require('../../../worker/pollings/ebellSocketClient');
const { startDbPolling } = require('../../../worker/dbPolling');

exports.getMainService = async (req, res) => {

  try {

    const result = await commonService.getMainService();
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/commonController.js, getMainService, error: ', error);
    console.log('common/commonController.js, getMainService, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSeverityList = async (req, res) => {

  try {

    const result = await commonService.getSeverityList();
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/commonController.js, getSeverityList, error: ', error);
    console.log('common/commonController.js, getSeverityList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

// exports.createArea = async (req, res) => {
//   try {
//     const { 
//       areaName,
//       areaLocation,
//       areaCamera,
//       areaCrossingGate,
//       areaSpeaker,
//       areaBillboard,
//       areaGuardianlite,
//       areaWaterlevelGauge,
//       leftLocation,
//       topLocation,
//       serviceType
//     } = req.body

//     if (!areaName | !areaCrossingGate) {
//       return res.status(400).send({ message: '' })
//     }

//     const result = await commonService.createArea({
//       areaName,
//       areaLocation,
//       areaCamera,
//       areaCrossingGate,
//       areaSpeaker,
//       areaBillboard,
//       areaGuardianlite,
//       areaWaterlevelGauge,
//       leftLocation,
//       topLocation,
//       serviceType
//   });
    
//     res.status(200).send({
//       message: 'ok',
//       result: result
//     });

//   } catch (error) {
//     logger.info('common/commonController.js, create area, error: ', error);
//     console.log('common/commonController.js, create area, error: ', error);
//     res.status(400).send({
//       message: 'error',
//       result: error
//     });
//   }
// }

// exports.getArea = async (req, res) => {
//   try {
//     const result = await commonService.getArea();

//     res.status(200).send({
//       message: 'ok',
//       result: result
//     });

//   } catch (error) {
//     logger.info('common/commonController.js, get area, error: ', error);
//     console.log('common/commonController.js, get area, error: ', error);
//     res.status(400).send({
//       message: 'error',
//       result: error
//     });
//   }
// }

exports.getOutdoorImage = async (req, res) => {
  try {
    const result = await commonService.getOutdoorImage();
    return res.status(200).send({
      message: 'ok',
      result: result 
    });
  } catch(error) {
    logger.error('common/userController.js, login, error: ', error);
    console.error('common/userController.js, login, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
}

exports.createSOP = async (req, res) => {
  try {
    const result = await commonService.createSOP(req.body);
    if(result === 1) {
      return res.sendStatus(201);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, createSOP, error: ', error);
    console.error('commonController.js, createSOP, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.getSOPList = async (req, res) => {
  try {
    const result = await commonService.getSOPList(req.body);
    return res.status(200).send({
      message: 'ok',
      result 
    });
  } catch(error) {
    logger.error('commonController.js, getSOPList, error: ', error);
    console.error('commonController.js, getSOPList, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.createSOPStage = async (req, res) => {
  try {
    const result = await commonService.createSOPStage(req.body);
    if(result === 1) {
      return res.sendStatus(201);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, createSOPStage, error: ', error);
    console.error('commonController.js, createSOPStage, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.getSOPStageList = async (req, res) => {
  try {
    const result = await commonService.getSOPStageList(req.body);
    return res.status(200).send({
      message: 'ok',
      result 
    });
  } catch(error) {
    logger.error('commonController.js, getSOPStageList, error: ', error);
    console.error('commonController.js, getSOPStageList, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.removeSOP = async (req, res) => {
  try {
    const result = await commonService.removeSOP(req.body);
    if(result === 1){
      return res.sendStatus(204);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, removeSOP, error: ', error);
    console.error('commonController.js, removeSOP, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.removeSOPStage = async (req, res) => {
  try {
    const result = await commonService.removeSOPStage(req.body);
    if(result > 0){
      return res.sendStatus(204);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, removeSOPStage, error: ', error);
    console.error('commonController.js, removeSOPStage, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.modifySOP = async (req, res) => {
  try {
    const result = await commonService.modifySOP(req.body);
    if(result === 1){
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, modifySOP, error: ', error);
    console.error('commonController.js, modifySOP, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};

exports.modifySOPStage = async (req, res) => {
  try {
    const result = await commonService.modifySOPStage(req.body);
    if(result === 1) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, modifySOPStage, error: ', error);
    console.error('commonController.js, modifySOPStage, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};

exports.createFalseAlarm = async (req, res) => {
  try {
    const result = await commonService.createFalseAlarm(req.body);
    if(result.rowCount === 1) {
      return res.status(201).json(result.rows);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, createFalseAlarm, error: ', error);
    console.error('commonController.js, createFalseAlarm, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.getFalseAlarmList = async (req, res) => {
  try {
    const idx = req.body.idx;
    const result = await commonService.getFalseAlarmList(idx);
    return res.status(200).send({
      message: 'ok',
      result 
    });
  } catch(error) {
    logger.error('commonController.js, getFalseAlarmList, error: ', error);
    console.error('commonController.js, getFalseAlarmList, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.modifyFalseAlarm = async (req, res) => {
  try {
    const result = await commonService.modifyFalseAlarm(req.body);
    if(result === 1){
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, modifyFalseAlarm, error: ', error);
    console.error('commonController.js, modifyFalseAlarm, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  };
};

exports.removeFalseAlarm = async (req, res) => {
  try {
    const result = await commonService.removeFalseAlarm(req.body);
    if(result === 1){
      return res.sendStatus(204);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('commonController.js, removeFalseAlarm, error: ', error);
    console.error('commonController.js, removeFalseAlarm, error: ', error);
    return res.status(500).send({
      message: 'error',
      result: error 
    });
  }
};

exports.getEventLogList = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.getEventLogList(req.body || {});

    if(result && result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
   
  } catch (error) {
    logger.info('commonController.js, getEventLogList, error: ', error);
    console.log('commonController.js, getEventLogList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addEventLog = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.addEventLog(req.body);
    
    if (result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('commonController.js, addEventLog, error: ', error);
    console.log('commonController.js, addEventLog, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
};

exports.eventLogCheck = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.eventLogCheck(req.body);
    
    if (result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('commonController.js, eventLogCheck, error: ', error);
    console.log('commonController.js, eventLogCheck, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};

exports.updateSetting = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.updateSetting(req.body);
    
    if(res.success === false){
      return res.status(400).send({
        message,
        result 
      });
    }

    if(req.body.settingName === '비상벨 설정'){
      connectEbellServer();
    } else if(req.body.settingName === '출입통제 설정'){
      startDbPolling();
    };
    message = 'ok';
    return res.status(200).send({
      message: message,
      result: result 
    });

  } catch(error) {
    logger.info('commonController.js, updateSetting, error: ', error);
    console.log('commonController.js, updateSetting, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};

exports.getSetting = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.getSetting(req.body);
    if (result.length > 0) {
      message = 'ok';
    };
    return res.status(200).send({
      message: message,
      result: result 
    });

  } catch(error) {
    logger.info('commonController.js, getSetting, error: ', error);
    console.log('commonController.js, getSetting, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};


exports.setInitialPosition = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.setInitialPosition(req.body);

    if (result.success) {
      message = 'ok';
    }

    return res.status(200).send({
      message,
      result,
    });

  } catch (error) {
    logger.info('commonController.js, setInitialPosition, error: ', error);
    console.log('commonController.js, setInitialPosition, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
};


exports.getInitialPosition = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.getInitialPosition(req.body);

    if (result && result.lat && result.lng) {
      message = 'ok';
    }

    return res.status(200).send({
      message,
      result,
    });

  } catch (error) {
    logger.info('commonController.js, getInitialPosition, error: ', error);
    console.log('commonController.js, getInitialPosition, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
};


exports.getSigunguBoundaryControl = async (req, res) => {
  try {
    let message = 'fail';
    const result = await commonService.getSigunguBoundaryControl();

    if (result) {
      message = 'ok';
    }

    return res.status(200).send({
      message,
      result,
    });

  } catch (error) {
    logger.info('commonController.js, getSigunguBoundaryControl, error: ', error);
    console.log('commonController.js, getSigunguBoundaryControl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
};


exports.setSigunguBoundaryControl = async (req, res) => {
  try {
    let message = 'fail';
    console.log(req.body)
    const result = await commonService.setSigunguBoundaryControl(req.body);

    if (result.success) {
      message = 'ok';
    }

    return res.status(200).send({
      message,
      result,
    });

  } catch (error) {
    logger.info('commonController.js, setSigunguBoundaryControl, error: ', error);
    console.log('commonController.js, setSigunguBoundaryControl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
};
