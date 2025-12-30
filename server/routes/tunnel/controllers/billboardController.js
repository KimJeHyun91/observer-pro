const billboardService = require('../services/billboardService');
const logger = require('../../../logger');

// 전광판 추가
exports.addBillboard = async (req, res) => {

  try {
    const { ip, port } = req.body;

    let result;

    if (ip && port) {
      result = await billboardService.addBillboard(req.body)
      console.log(result)

      if (result.length > 0) {
        message = 'ok';
      }
    }

    res.status(200).send({
      message: message,
      // result: result
    });

  } catch (error) {
    logger.info('tunnel/BillboardController.js, addBillboard, error: ', error);
    console.log('tunnel/BillboardController.js, addBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
}

// 전광판 리스트 정보 받기
exports.getBillboardList = async (req, res) => {
  try {
    const result = await billboardService.getBillboardList()

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
    logger.info('tunnel/billboardController.js, getBillboardList, error: ', error);
    console.log('tunnel/billboardController.js, getBillboardList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 전광판 설정창에서 수정
exports.modifyBillboard = async (req, res) => {
  try {

    const result = await billboardService.modifyBillboard(req.body);

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
    logger.info('tunnel/billboardController.js, modifyBillboard, error: ', error);
    console.log('tunnel/billboardController.js, modifyBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 전광판 삭제
exports.removeBillboard = async (req, res) => {
  try {
    const idxList = req.body
    const result = await billboardService.removeBillboard(idxList);

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
    logger.info('tunnel/billboardController.js, removeBillboard, error: ', error);
    console.log('tunnel/billboardController.js, removeBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// 전광판 상세 정보 받기
exports.getBillboardInfo = async (req, res) => {
  try {

    const result = await billboardService.getBillboardInfo(req.body)

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
    logger.info('tunnel/billboardController.js, getBillboardInfo, error: ', error);
    console.log('tunnel/billboardController.js, getBillboardInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// VMS 전광판 정보 수정
exports.modifyVMSBillboard = async (req, res) => {
  try {

    // ajy 임시 삭제
    // const { ip, msg, color, id, billboard_controller_model, type  } = req.body['1'];

    //     if (!ip || !msg || !color) {
    //         return res.status(400).send({
    //         message: 'fail',
    //         result: false,
    //         error: '전광판 변경 필수값 누락'
    //         });
    //     }

    const result = await billboardService.modifyVMSBillboard(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data,
        lanes: result.lanes
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/billboardController.js, modifyVMSBillboard, error: ', error);
    console.log('tunnel/billboardController.js, modifyVMSBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

// LCS 전광판 정보 수정
exports.modifyLCSBillboard = async (req, res) => {
  try {

    const result = await billboardService.modifyLCSBillboard(req.body);

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data,
        lanes: result.lanes
      });
    } else {
      res.status(500).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/billboardController.js, modifyLCSBillboard, error: ', error);
    console.log('tunnel/billboardController.js, modifyLCSBillboard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};


