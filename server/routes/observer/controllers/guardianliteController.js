const guardianliteService = require('../services/guardianliteService');
const logger = require('../../../logger');


exports.getGuardianliteInfo = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.getGuardianliteInfo(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, getGuardianliteInfo, error: ', error);
    console.log('inundationControl/guardianliteController.js, getGuardianliteInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getGuardianliteList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.getGuardianliteList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, getGuardianliteList, error: ', error);
    console.log('inundationControl/guardianliteController.js, getGuardianliteList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addGuardianlite = async (req, res) => {

  try {
    const result = await guardianliteService.addGuardianlite(req.body);
    if(result.status){
      return res.status(201).send(result);
    }
  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, addGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteController.js, addGuardianlite, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyGuardianliteChannel = async (req, res) => {

  try {
    
    let message = 'fail';
    const { guardianlite_ip: guardianliteIp, id: userId,  password: userPw, channel, cmd } = req.body;

    const result = await guardianliteService.modifyGuardianliteChannel({ guardianliteIp, userId, userPw, channel, cmd });

    if(result) {
      message = 'ok';
      return res.status(200).send({
        message: message,
        result: {
          success: result
        }
      });
    }


  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    console.log('inundationControl/guardianliteController.js, modifyGuardianliteChannel, error: ', error);
    return res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyGuardianliteChannelLabel = async (req, res) => {

  try {

    let message = 'fail';

    const {
      guardianlite_ip: guardianliteIp,
      ch1Label: ch1_label,
      ch2Label: ch2_label,
      ch3Label: ch3_label,
      ch4Label: ch4_label,
      ch5Label: ch5_label,
    } = req.body;

    const result = await guardianliteService.modifyGuardianliteChannelLabel({ guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label: '', ch7_label: '', ch8_label: '' });

    if (result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, modifyGuardianliteChannelLabel, error: ', error);
    console.log('inundationControl/guardianliteController.js, modifyGuardianliteChannelLabel, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyGuardianlite = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.modifyGuardianlite(req.body);

    if(result === 1) {
      message = 'ok';
      return res.status(200).send({
        message: message,
        result: result
      });
    }
  } catch (error) {
    logger.info('main/guardianliteController.js, modifyGuardianlite, error: ', error);
    console.log('main/guardianliteController.js, modifyGuardianlite, error: ', error);
    return res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyGuardianliteLocation = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.modifyGuardianliteLocation(req.body);

    if(result === 1) {
      message = 'ok';
      return res.status(200).send({
        message: message,
        result: result
      });
    }
  } catch (error) {
    logger.info('main/guardianliteController.js, modifyGuardianliteLocation, error: ', error);
    console.log('main/guardianliteController.js, modifyGuardianliteLocation, error: ', error);
    return res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteGuardianlite = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.deleteGuardianlite(req.body);
    if(result === 1) {
      message = 'ok';
      return res.status(200).send({
        message: message,
        result
      });
    }

  } catch (error) {
    logger.info('main/guardianliteController.js, deleteGuardianlite, error: ', error);
    console.log('main/guardianliteController.js, deleteGuardianlite, error: ', error);
    return res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}