const ebellService = require('../services/ebellService');
const logger = require('../../../logger');


exports.getEbells = async (req, res) => {

  try {
    let message = 'fail';

    const result = await ebellService.getEbells(req.body);

    if(result.success) {
      message = 'ok';
    }
    if(!result.result || !result.success){
      return res.status(400).send({
        message,
        result: result.result
      });
    }
    return res.status(200).send({
      message,
      result: result.result
    });
  } catch(error) {
    logger.info('observer/ebellController.js, get device ebells, error: ', error);
    console.log('observer/ebellController.js, get device ebells, error: ', error);
    return res.status(500).send({
      message: error.message || 'getEbells server error',
      result: error 
    });
  }
}


exports.updateEbell = async (req, res) => {

  try {
    const result = await ebellService.updateEbell(req.body);
    if(result.success) {
      return res.sendStatus(200);
    }

  } catch(error) {
    logger.info('observer/ebellController.js, update ebell device, error: ', error);
    console.log('observer/ebellController.js, update ebell device, error: ', error);
    return res.status(500).send({
      message: error.message || 'update ebell server error',
      result: error 
    });
  }
}