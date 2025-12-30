const outsideService = require('../services/outsideService');
const logger = require('../../../logger');

exports.addOutside = async (req, res) => {

  try {

    const { outsideName, barrierIp } = req.body;

    let result;

    let message = 'fail';

    // 필수값 있으면
    if (outsideName && barrierIp) {

      result = await outsideService.addOutside(req.body);

      if (result.length > 0) {
        message = 'ok';
      }
    }

    res.status(200).send({
      message: message,
      // result: result
    });

  } catch (error) {
    logger.info('tunnel/outsideController.js, addOutside, error: ', error);
    console.log('tunnel/outsideController.js, addOutside, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}


exports.getOutsideList = async (req, res) => {
  try {
    const result = await outsideService.getOutsideList();

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
    logger.info('tunnel/outsideController.js, getOutsideList, error: ', error);
    console.log('tunnel/outsideController.js, getOutsideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};


exports.updateOutside = async (req, res) => {
  try {
    let message = 'fail';

    const result = await outsideService.updateOutside(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/outsideController.js, updateOutside, error: ', error);
    console.error('tunnel/outsideController.js, updateOutside, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};


exports.deleteOutside = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.deleteOutside(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/outsideController.js, deleteOutside, error: ', error);
    console.log('tunnel/outsideController.js, deleteOutside, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

exports.getUnLinkBarrierList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await outsideService.getUnLinkBarrierList(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('tunnel/outsideController.js, getUnLinkBarrierList, error: ', error);
    console.log('tunnel/outsideController.js, getUnLinkBarrierList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

// 대시보드 장비 정보 가져오기
exports.getDashboardDeviceList = async (req, res) => {
  try {
    const result = await outsideService.getDashboardDeviceList();

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
    logger.info('tunnel/outsideController.js, getDashboardDeviceList, error: ', error);
    console.log('tunnel/outsideController.js, getDashboardDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};


// 차단막 자동화 유무값 전달
exports.getOutsideAutomatic = async (req, res) => {
  try {
    const result = await outsideService.getOutsideAutomatic();

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
    logger.info('tunnel/outsideController.js, getOutsideAutomatic, error: ', error);
    console.log('tunnel/outsideController.js, getOutsideAutomatic, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 차단막 자동화 유무값 수정
exports.updateOutsideAutomatic = async (req, res) => {
  try {
    let message = 'fail';

    const result = await outsideService.updateOutsideAutomatic(req.body);

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result.status
    });

  } catch (error) {
    logger.info('tunnel/outsideController.js, updateOutsideAutomatic, error: ', error);
    console.error('tunnel/outsideController.js, updateOutsideAutomatic, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};
