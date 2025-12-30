const waterLevelService = require('../services/waterLevelService');
const logger = require('../../../logger');


exports.addWaterLevelDevice = async (req, res) => {

  try {
    
    let message = 'fail';
    const {
      water_level_name: waterLevelName,
      water_level_location: waterLevelLocation,
      water_level_ip: waterLevelIp,
      water_level_port: waterLevelPort,
      water_level_id: waterLevelId,
      water_level_pw: waterLevelPw,
      water_level_model: waterLevelModel,
      ground_value: groundValue,
      water_level_uid: waterLevelUid
    } = req.body

    const result = await waterLevelService.addWaterLevelDevice({ waterLevelName, waterLevelLocation, waterLevelIp, waterLevelPort, waterLevelId, waterLevelPw, waterLevelModel, groundValue, waterLevelUid });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, addWaterLevelDevice, error: ', error);
    console.log('inundationControl/waterLevelController.js, addWaterLevelDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addWaterLevelToMap = async (req, res) => {

  try {
    
    let message = 'fail';

    const {
      leftLocation,
      areaCamera,
      selectedWaterlevel,
      topLocation,
    } = req.body;

    const result = await waterLevelService.addWaterLevelToMap({ leftLocation, areaCamera, selectedWaterlevel, topLocation });
    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, addWaterLevelToMap, error: ', error);
    console.log('inundationControl/waterLevelController.js, addWaterLevelToMap, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.removeWaterlevelToMap = async (req, res) => {

  try {
    
    let message = 'fail';

    const { idx } = req.body;

    const result = await waterLevelService.removeWaterlevelToMap({ idx });
    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, removeWaterlevelToMap, error: ', error);
    console.log('inundationControl/waterLevelController.js, removeWaterlevelToMap, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyWaterLevelDevice = async (req, res) => {

  try {

    let message = 'fail';

    const {
      water_level_idx,
      water_level_name,
      water_level_location,
      newWaterlevelIpaddress,
      newWaterlevelPort,
      water_level_id,
      water_level_pw,
      ground_value,
      water_level_uid
    } = req.body;

    const result = await waterLevelService.modifyWaterLevelDevice({
      idx: water_level_idx,
      waterLevelName: water_level_name,
      waterLevelLocation: water_level_location,
      waterLevelIp: newWaterlevelIpaddress,
      waterLevelPort: newWaterlevelPort,
      waterLevelId: water_level_id,
      waterLevelPw: water_level_pw,
      groundValue: ground_value,
      waterLevelUid: water_level_uid
    });
    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, modifyWaterLevelDevice, error: ', error);
    console.log('inundationControl/waterLevelController.js, modifyWaterLevelDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getWaterLevelDeviceList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await waterLevelService.getWaterLevelDeviceList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, getWaterLevelDeviceList, error: ', error);
    console.log('inundationControl/waterLevelController.js, getWaterLevelDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getTargetWaterlevelLog = async (req, res) => {
  try {
    const result = await waterLevelService.getTargetWaterlevelLog(req.body);
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('waterLevelController.js, getTargetWaterlevelLog, error:', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
}

exports.getAllWaterlevelLog = async (req, res) => {
  try {
    const result = await waterLevelService.getAllWaterlevelLog();
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('waterLevelController.js, getAllWaterlevelLog, error:', error);
    res.status(400).send({
      message: 'error',
      result: error,
    });
  }
}

exports.deleteWaterLevel = async (req, res) => {

  try {
    
    let message = 'fail';
    const { waterlevelIdx: idx } = req.body;
    const result = await waterLevelService.deleteWaterLevel({ idx });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, deleteWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelController.js, deleteWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyThresholdWaterLevel = async (req, res) => {

  try {
    
    let message = 'fail';
    const { threshold, water_level_idx: idx } = req.body;
    const result = await waterLevelService.modifyThresholdWaterLevel({ idx, threshold });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, modifyThresholdWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelController.js, modifyThresholdWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutsideWaterLevelList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await waterLevelService.getOutsideWaterLevelList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, getOutsideWaterLevelList, error: ', error);
    console.log('inundationControl/waterLevelController.js, getOutsideWaterLevelList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addOutsideWaterLevel = async (req, res) => {

  try {
    
    const result = await waterLevelService.addOutsideWaterLevel(req.body);

    if (result && result.status) {
      return res.status(200).send({
        message: 'ok',
        result: result
      });
    } else {
      return res.status(400).send({
        message: result?.message || 'error',
        result: result
      });
    }

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, addOutsideWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelController.js, addOutsideWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.updateOutsideWaterLevel = async (req, res) => {

  try {
    
    const result = await waterLevelService.updateOutsideWaterLevel(req.body);

    return res.status(result ? 200 : 400).send({
      message: result.message || (result.status ? 'ok' : 'error'),
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, updateOutsideWaterLevel, error: ', error);
    console.log('inundationControl/waterLevelController.js, updateOutsideWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.changeUseStatus = async (req, res) => {

  try {
    
    let message = 'fail';
    // const { waterlevelIdx: idx, status: useStatus } = req.body;
    // const aa = req.body
    const { waterlevelIdx: idx, waterlevelStatus: useStatus } = req.body;
    const result = await waterLevelService.changeUseStatus({ idx, useStatus });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, changeUseStatus, error: ', error);
    console.log('inundationControl/waterLevelController.js, changeUseStatus, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteOutsideIdxWaterLevelIdx = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await waterLevelService.deleteOutsideIdxWaterLevelIdx(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, deleteOutsideIdxWaterLevelIdx, error: ', error);
    console.log('inundationControl/waterLevelController.js, deleteOutsideIdxWaterLevelIdx, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getWaterLevelSeverityList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await waterLevelService.getWaterLevelSeverityList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, getWaterLevelSeverityList, error: ', error);
    console.log('inundationControl/waterLevelController.js, getWaterLevelSeverityList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.updateWaterlevelPosition = async (req, res) => {

  try {

    let message = 'fail';

    const result = await waterLevelService.updateWaterlevelPosition(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterlevelController.js, updateWaterlevelPosition, error: ', error);
    console.log('inundationControl/waterlevelController.js, updateWaterlevelPosition, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

// 자동제어 관련 컨트롤러 함수들
exports.addWaterLevelAutoControl = async (req, res) => {
  try {
    const result = await waterLevelService.addWaterLevelAutoControl(req.body);

    if (result && result.status) {
      return res.status(200).send({
        message: 'ok',
        result: result
      });
    } else {
      return res.status(400).send({
        message: result?.message || 'error',
        result: result
      });
    }

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, addWaterLevelAutoControl, error: ', error);
    console.log('inundationControl/waterLevelController.js, addWaterLevelAutoControl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
};

exports.getWaterLevelAutoControl = async (req, res) => {
  try {
    const result = await waterLevelService.getWaterLevelAutoControl();
    
    return res.status(200).send({
      message: 'ok',
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/waterLevelController.js, getWaterLevelAutoControl, error: ', error);
    console.log('inundationControl/waterLevelController.js, getWaterLevelAutoControl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
};
