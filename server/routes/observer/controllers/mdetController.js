const logger = require('../../../logger');
const mdetService = require('../services/mdetService');

exports.createMDET = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await mdetService.createMDET(req.body);

    if(result) {
      message = 'ok';
    };

    return res.status(201).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('observer/mdetController.js, createMDET, error: ', error);
    console.log('observer/mdetController.js, createMDET, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};

exports.getMDETs = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await mdetService.getMDETs(req.body);

    if(result) {
      message = 'ok';
    };

    return res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('observer/mdetController.js, getMDETs, error: ', error);
    console.log('observer/mdetController.js, getMDETs, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};