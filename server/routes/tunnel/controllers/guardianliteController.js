const guardianliteService = require('../services/guardianliteService');
const logger = require('../../../logger');

exports.getGuardianliteInfo = async (req, res) => {
  try {

    const result = await guardianliteService.getGuardianliteInfo(req.body)

    if (result.status) {
      res.status(200).send({
        message: 'ok',
        result: result.data
      });
    } else {
      res.status(200).send({
        message: 'fail',
        result: result.error
      });
    }
  } catch (error) {
    logger.info('tunnel/guardianliteController.js, getGuardianliteInfo, error: ', error);
    console.log('tunnel/guardianliteController.js, getGuardianliteInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};


exports.modifyGuardianliteLabel = async (req, res) => {
  try {

    const result = await guardianliteService.modifyGuardianliteLabel(req.body);

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
    logger.info('tunnel/guardianliteController.js, modifyGuardianliteLabel, error: ', error);
    console.log('tunnel/guardianliteController.js, modifyGuardianliteLabel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error
    });
  }
};

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
    logger.info('inundationControl/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    console.log('inundationControl/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}