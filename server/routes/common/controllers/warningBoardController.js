const warningBoardService = require('../services/warningBoardService');
const logger = require('../../../logger');


exports.deleteWarningBoard = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await warningBoardService.deleteWarningBoard(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('common/warningBoardController.js, deleteWarningBoard, error: ', error);
    console.log('common/warningBoardController.js, deleteWarningBoard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getWarningBoard = async (req, res) => {

  try {
    
    const result = await warningBoardService.getWarningBoard(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('common/warningBoardController.js, getWarningBoard, error: ', error);
    console.log('common/warningBoardController.js, getWarningBoard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.warningDelete = async (req, res) => {
  try {
    
    let message = 'fail';

    const result = await warningBoardService.warningDelete(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('common/warningBoardController.js, warningDelete, error: ', error);
    console.log('common/warningBoardController.js, warningDelete, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.checkUseWarningBoard = async (req, res) => {
  try {
    let message = 'fail';

    const result = await warningBoardService.checkUseWarningBoard(req.body);

    if(result && result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
   
  } catch (error) {
    logger.info('common/warningBoardController.js, checkUseWarningBoard, error: ', error);
    console.log('common/warningBoardController.js, checkUseWarningBoard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.insertWarningBoard = async (req, res) => {
  try {
    let message = 'fail';
    const result = await warningBoardService.insertWarningBoard(req.body);

    if(result && result.length > 0) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });
   
  } catch (error) {
    logger.info('common/warningBoardController.js, insertWarningBoard, error: ', error);
    console.log('common/warningBoardController.js, insertWarningBoard, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}
