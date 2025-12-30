const outsideService = require('../services/outsideService');
const logger = require('../../../logger');

// API 호출 제한을 위한 캐시
const requestCache = new Map();
const CACHE_DURATION = 1000;

exports.createArea = async (req, res) => {

  try {

    const { areaName, areaCrossingGate } = req.body;
    let result;

    let message = 'fail';

    // 필수값 있으면
    if (areaName && areaCrossingGate) {

      result = await outsideService.addOutside(req.body);

      if (result.status) {
        message = 'ok';
      }
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, createArea, error: ', error);
    console.log('inundationControl/outsideController.js, createArea, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getArea = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getOutSideList(req.body);

    if (result) {
      message = 'ok';
    }

    res.set('Cache-Control', 'public, max-age=5');
    res.set('ETag', `"${Date.now()}"`);

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getOutSideList, error: ', error);
    console.log('inundationControl/outsideController.js, getOutSideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}


exports.modifyArea = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.modifyArea(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, modifyArea, error: ', error);
    console.log('inundationControl/outsideController.js, modifyArea, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getAllAreaGroup = async (req, res) => {
  try {
    const result = await outsideService.getAllAreaGroup();
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('inundationControl/outsideController.js, getAllAreaGroup, error:', error);
    res.status(400).send({
      message: 'error',
      result: error.message || error,
    });
  }
};

exports.createAreaGroup = async (req, res) => {
  try {
    const groupData = req.body;
    const result = await outsideService.createAreaGroup(groupData);
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('inundationControl/outsideController.js, createAreaGroup, error:', error);
    res.status(400).send({
      message: 'error',
      result: error.message || error,
    });
  }
};

exports.updateAreaGroup = async (req, res) => {
  try {
    const groupData = req.body;
    const result = await outsideService.updateAreaGroup(groupData);
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('inundationControl/outsideController.js, updateAreaGroup, error:', error);
    res.status(400).send({
      message: 'error',
      result: error.message || error,
    });
  }
};

exports.deleteAreaGroup = async (req, res) => {
  try {
    const groupData = req.body;
    const result = await outsideService.deleteAreaGroup(groupData);
    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    console.error('inundationControl/outsideController.js, deleteAreaGroup, error:', error);
    res.status(400).send({
      message: 'error',
      result: error.message || error,
    });
  }
};

exports.deleteArea = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.deleteOutsideInfo(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, deleteArea, error: ', error);
    console.log('inundationControl/outsideController.js, deleteArea, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getLinkedStatusCount = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getLinkedStatusCount(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getLinkedStatusCount, error: ', error);
    console.log('inundationControl/outsideController.js, getLinkedStatusCount, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getWaterLevelOutsideList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getWaterLevelOutsideList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getWaterLevelOutsideList, error: ', error);
    console.log('inundationControl/outsideController.js, getWaterLevelOutsideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getUnLinkDeviceList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getUnLinkDeviceList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getUnLinkDeviceList, error: ', error);
    console.log('inundationControl/outsideController.js, getUnLinkDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getCompactOutSideList = async (req, res) => {

  try {
    const now = Date.now();
    const cacheKey = 'getCompactOutSideList';
    const cached = requestCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('getCompactOutSideList: 캐시된 응답 반환 (1초 제한)');
      return res.status(200).send(cached.response);
    }

    let message = 'fail';

    const result = await outsideService.getCompactOutSideList(req.body);

    if (result) {
      message = 'ok';
    }

    const response = {
      message: message,
      result: result
    };

    requestCache.set(cacheKey, {
      timestamp: now,
      response: response
    });

    res.set('Cache-Control', 'public, max-age=5');
    res.set('ETag', `"${now}"`);

    res.status(200).send(response);

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getCompactOutSideList, error: ', error);
    console.log('inundationControl/outsideController.js, getCompactOutSideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getWaterLevelOutsideInfo = async (req, res) => {

  try {

    let message = 'fail';
    const { waterlevelIdx: idx } = req.body;
    const result = await outsideService.getWaterLevelOutsideInfo({ idx });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getWaterLevelOutsideInfo, error: ', error);
    console.log('inundationControl/outsideController.js, getWaterLevelOutsideInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getAllWaterLevelOutsideInfo = async (req, res) => {

  try {

    let message = 'fail';
    const result = await outsideService.getAllWaterLevelOutsideInfo();

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getAllWaterLevelOutsideInfo, error: ', error);
    console.log('inundationControl/outsideController.js, getAllWaterLevelOutsideInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getWaterLevelCameraInfo = async (req, res) => {
  try {
    let message = 'fail';
    const { waterlevelIdx } = req.body;

    const result = await outsideService.getWaterLevelCameraInfo({ waterlevelIdx });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getWaterLevelCameraInfo, error: ', error);
    console.log('inundationControl/outsideController.js, getWaterLevelCameraInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getOutsideDeviceList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getOutsideDeviceList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getOutsideDeviceList, error: ', error);
    console.log('inundationControl/outsideController.js, getOutsideDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getAllDeviceList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getAllDeviceList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getAllDeviceList, error: ', error);
    console.log('inundationControl/outsideController.js, getAllDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.updateAreaPosition = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.updateAreaPosition(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, updateAreaPosition, error: ', error);
    console.log('inundationControl/outsideController.js, updateAreaPosition, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getEventList = async (req, res) => {
  try {

    let message = 'fail';

    const result = await outsideService.getEventList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getEventList, error: ', error);
    console.log('inundationControl/outsideController.js, getEventList, error: ', error);
  }
}

exports.getOperationLogList = async (req, res) => {
  try {

    let message = 'fail';

    const result = await outsideService.getOperationLogList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getOperationLogList, error: ', error);
    console.log('inundationControl/outsideController.js, getOperationLogList, error: ', error);
  }
}

exports.getOutsideLocations= async (req, res) => {
  try {

    let message = 'fail';

    const result = await outsideService.getOutsideLocations();

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getOutsideLocations, error: ', error);
    console.log('inundationControl/outsideController.js, getOutsideLocations, error: ', error);
  }
}

exports.getWaterLevelLocations = async (req, res) => {
  try {

    let message = 'fail';

    const result = await outsideService.getWaterLevelLocations();

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getWaterLevelLocations, error: ', error);
    console.log('inundationControl/outsideController.js, getWaterLevelLocations, error: ', error);
  }
}

exports.getDashboardDevices = async (req, res) => {
  try {

    let message = 'fail';

    const result = await outsideService.getDashboardDevices();

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/outsideController.js, getDashboardDevices, error: ', error);
    console.log('inundationControl/outsideController.js, getDashboardDevices, error: ', error);
  }
}