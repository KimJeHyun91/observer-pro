const modelsService = require('../services/modelsService');
const logger = require('../../../logger');

exports.modelsModelUpload = async (req, res) => {
  try {
    let result = {
      message: 'fail',
      file: null
    };
    const serviceRes = await modelsService.insertModelsFile(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    
    return res.status(serviceRes == 1 ? 200 : 400).send(result);
   
  } catch (error) {
    logger.info('threeD/modelsController.js, modelsModelUpload, error: ', error);
    console.log('threeD/modelsController.js, modelsModelUpload, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modelsDevicesUpload = async (req, res) => {
  try {
    let result = {
      message: 'fail',
      file: null
    };
    const serviceRes = await modelsService.insertDevicesFile(req.body);
    if(req.file) {
      result.message = 'ok';
      result.file = req.file;
    }
    
    return res.status(serviceRes == 1 ? 200 : 400).send(result);
   
  } catch (error) {
    logger.info('threeD/modelsController.js, modelsDevicesUpload, error: ', error);
    console.log('threeD/modelsController.js, modelsDevicesUpload, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getGlbModels = async (req, res) => {
  try {
    let message = 'fail';
    const result = await modelsService.getGlbModels(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, getGlbModels, error: ', error);
    console.log('threeD/modelsController.js, getGlbModels, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.saveDefaultModel = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.saveDefaultModel(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '업데이트된 모델이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, saveDefaultModel, error: ', error);
    console.log('threeD/modelsController.js, saveDefaultModel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteModel = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.deleteModel(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '삭제 된 모델이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, deleteModel, error: ', error);
    console.log('threeD/modelsController.js, deleteModel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteDevice = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.threedDeleteDevice(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '삭제 된 모델이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, threedDeleteDevice, error: ', error);
    console.log('threeD/modelsController.js, threedDeleteDevice, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.savePositionModel = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.savePositionModel(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '위치 수정 된 모델이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, savePositionModel, error: ', error);
    console.log('threeD/modelsController.js, savePositionModel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.threedDeviceList = async (req, res) => {
  try {
    let message = 'fail';
    const result = await modelsService.threedDeviceList();

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, threedDeviceList, error: ', error);
    console.log('threeD/modelsController.js, threedDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addDeviceMapping = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.addDeviceMapping(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '연결 된 장비 매핑 파일이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });
  } catch (error) {
    logger.info('threeD/modelsController.js, addDeviceMapping, error: ', error);
    console.log('threeD/modelsController.js, addDeviceMapping, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addModelFloors = async (req, res) => {
  try {
    const list = req.body;

    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).send({
        message: 'fail',
        result: '플로어 리스트가 비어 있거나 잘못되었습니다',
      });
    }

    const modelId = list[0].model_id;
    const buildingGroup = list[0].building_group;
    const floorList = list.map(v => v.floor_name);

    const result = await modelsService.addModelFloors({
      modelId,
      buildingGroup,
      floorList,
    });

    res.status(200).send({
      message: 'ok',
      result,
    });
  } catch (error) {
    logger.info('threeD/modelsController.js, addModelFloors, error: ', error);
    console.log('threeD/modelsController.js, addModelFloors, error: ', error);

    res.status(400).send({
      message: 'error',
      result: error.message,
    });
  }
};

exports.getDeviceMappings = async (req, res) => {
  try {
    let message = 'fail';
    const result = await modelsService.getDeviceMappings(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, getDeviceMappings, error: ', error);
    console.log('threeD/modelsController.js, getDeviceMappings, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAllDeviceMappings = async (req, res) => {
  try {
    let message = 'fail';
    const result = await modelsService.getAllDeviceMappings(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, getAllDeviceMappings, error: ', error);
    console.log('threeD/modelsController.js, getAllDeviceMappings, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteDeviceMapping = async (req, res) => {
  try {
    let message = 'fail';
    let result = await modelsService.deleteDeviceMapping(req.body);

    if (result) {
      message = 'ok';
    } else {
      result = '삭제 된 모델이 없습니다.';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('threeD/modelsController.js, deleteDeviceMapping, error: ', error);
    console.log('threeD/modelsController.js, deleteDeviceMapping, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}