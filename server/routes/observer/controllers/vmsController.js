const vmsService = require('../services/vmsService');
const logger = require('../../../logger');

exports.getVmsList = async (req, res) => {

  try {

    const result = await vmsService.getVmsList(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsController.js, getVmsList, error: ', error);
    console.log('observer/vmsController.js, getVmsList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addVms = async (req, res) => {

  try {

    const result = await vmsService.addVms(req.body);
    
    return res.status(result.status ? 200 : 400).send({
      message: result.message || (result.status ? 'ok' : 'error'),
      result: result
    });

  } catch (error) {
    logger.info('observer/vmsController.js, addVms, error: ', error);
    console.log('observer/vmsController.js, addVms, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyVms = async (req, res) => {

  try {

    const result = await vmsService.modifyVms(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsController.js, modifyVms, error: ', error);
    console.log('observer/vmsController.js, modifyVms, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteVms = async (req, res) => {

  try {

    const result = await vmsService.deleteVms(req.body);
    
    let message = 'fail';
    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsController.js, deleteVms, error: ', error);
    console.log('observer/vmsController.js, deleteVms, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.synchronizeVms = async (req, res) => {

  try {

    const result = await vmsService.synchronizeVms(req.body);
    
    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsController.js, synchronizeVms, error: ', error);
    console.log('observer/vmsController.js, synchronizeVms, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.exportArchive = async (req, res) => {

  try {
    
    const result = await vmsService.exportArchive(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('observer/vmsController.js, exportArchive, error: ', error);
    console.log('observer/vmsController.js, exportArchive, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}