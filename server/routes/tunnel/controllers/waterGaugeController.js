const waterGaugeService = require('../services/waterGaugeService');
const logger = require('../../../logger');


// 수위계 추가
exports.addWaterLevel = async (req, res) => {

  try {
    const { ip, port } = req.body;

    let result;

    if (ip && port) {
      result = await waterGaugeService.addWaterLevel(req.body)


      if (result.length > 0) {
        message = 'ok';
      }
    }

    res.status(200).send({
      message: message,
      // result: result
    });

  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, addWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeController.js, addWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

// 수위계 리스트 정보 받기
exports.getWaterLevelList = async (req, res) => {
  try {
    const result = await waterGaugeService.getWaterLevelList()

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, getWaterLevelList, error: ', error);
    console.log('tunnel/waterGaugeController.js, getWaterLevelList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계 수정
exports.modifyWaterLevel = async (req, res) => {
  try {

    const result = await waterGaugeService.modifyWaterLevel(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, modifyWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeController.js, modifyWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계 삭제
exports.removeWaterLevel = async (req, res) => {
  try {
    const idxList = req.body
    const result = await waterGaugeService.removeWaterLevel(idxList);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, removeWaterLevel, error: ', error);
    console.log('tunnel/waterGaugeController.js, removeWaterLevel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계 검색
exports.getWaterLevelListSearch = async (req, res) => {

  try {

    let message = 'fail';

    const result = await waterGaugeService.getWaterLevelListSearch(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, getWaterLevelListSearch, error: ', error);
    console.log('tunnel/waterGaugeController.js, getWaterLevelListSearch, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

// 차단막과 외부수위계 매핑 등록
exports.addWaterLevelMappingCountrolOut = async (req, res) => {
  try {

    const result = await waterGaugeService.addWaterLevelMappingCountrolOut(req.body);

    let message = 'fail';
    if (result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
    });

  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, addWaterLevelMappingCountrolOut, error: ', error);
    console.log('tunnel/waterGaugeController.js, addWaterLevelMappingCountrolOut, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 차단막에 매핑된 수위계 목록 가져오기
exports.getWaterLevelMappingList = async (req, res) => {
  try {

    const result = await waterGaugeService.getWaterLevelMappingList(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, getWaterLevelMappingList, error: ', error);
    console.log('tunnel/waterGaugeController.js, getWaterLevelMappingList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계에 매핑된 차단기 목록 가져오기
exports.getWaterLevelMappingOutsideList = async (req, res) => {
  try {

    const result = await waterGaugeService.getWaterLevelMappingOutsideList(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, getWaterLevelMappingOutsideList, error: ', error);
    console.log('tunnel/waterGaugeController.js, getWaterLevelMappingOutsideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계 포지션 수정
exports.modifyWaterLevelPosition = async (req, res) => {
  try {

    const result = await waterGaugeService.modifyWaterLevelPosition(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, modifyWaterLevelPosition, error: ', error);
    console.log('tunnel/waterGaugeController.js, modifyWaterLevelPosition, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 수위계 수위 수정
exports.modifyWaterLevelThreshold = async (req, res) => {
  try {

    const result = await waterGaugeService.modifyWaterLevelThreshold(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, modifyWaterLevelThreshold, error: ', error);
    console.log('tunnel/waterGaugeController.js, modifyWaterLevelThreshold, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 차단막에 매팽된 외부 수위계 삭제
exports.removeWaterLevelMapping = async (req, res) => {
  try {
    const result = await waterGaugeService.removeWaterLevelMapping(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, removeWaterLevelMapping, error: ', error);
    console.log('tunnel/waterGaugeController.js, removeWaterLevelMapping, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 제어반 수위계 등록 및 차단막과 매핑
exports.addWaterLevelCountrolIn = async (req, res) => {

  try {
  
    let result;
    let message ='fail';

    result = await waterGaugeService.addWaterLevelCountrolIn(req.body)

    if (result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      // result: result
    });

  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, addWaterLevelCountrolIn, error: ', error);
    console.log('tunnel/waterGaugeController.js, addWaterLevelCountrolIn, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}


// 수위계 수위 로그 가져오기
exports.getWaterLevelLog = async (req, res) => {
  try {

    const result = await waterGaugeService.getWaterLevelLog(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data,
        existControlIn : result.existControlIn,
        threshold : result.threshold,
        link : result.link
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error,
        existControlIn: false
      });
    }
  } catch (error) {
    logger.info('tunnel/waterGaugeController.js, getWaterLevelLog, error: ', error);
    console.log('tunnel/waterGaugeController.js, getWaterLevelLog, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};