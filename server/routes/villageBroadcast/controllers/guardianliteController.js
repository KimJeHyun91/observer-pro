const guardianliteService = require('../services/guardianliteService');
const logger = require('../../../logger');


exports.modifyGuardianliteChannel = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.modifyGuardianliteChannel(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('broadcast/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    console.log('broadcast/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyGuardianliteChannelLabel = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.modifyGuardianliteChannelLabel(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('broadcast/guardianliteController.js, modifyGuardianliteChannelLabel, error: ', error);
    console.log('broadcast/guardianliteController.js, modifyGuardianliteChannelLabel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}