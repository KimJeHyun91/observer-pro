const guardianliteService = require('../services/guardianliteService');
const logger = require('../../../logger');

// API 호출 캐시를 위한 변수
let guardianliteInfoCache = new Map();
const CACHE_DURATION = 1000; 

exports.getGuardianliteInfo = async (req, res) => {

  try {
    
    let message = 'fail';
    const now = Date.now();
    const guardianliteIp = req.body.guardianliteIp;

    const cacheKey = guardianliteIp || 'default';
    const cachedResponse = guardianliteInfoCache.get(cacheKey);
    
    if (cachedResponse && (now - cachedResponse.timestamp < CACHE_DURATION)) {
      console.log('getGuardianliteInfo: 캐시된 응답 반환');
      return res.status(200).send(cachedResponse.response);
    }

    const result = await guardianliteService.getGuardianliteInfo(req.body);

    if(result) {
      message = 'ok';
    }

    const response = {
      message: message,
      result: result
    };

    guardianliteInfoCache.set(cacheKey, {
      response: response,
      timestamp: now
    });

    res.status(200).send(response);

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
    
    let message = 'fail';

    const result = await guardianliteService.addGuardianlite(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

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
    const { guardianlite_ip: guardianliteIp, id: userId,  password: userPw, channel, cmd, operatorId } = req.body;

    const result = await guardianliteService.modifyGuardianliteChannel({ guardianliteIp, userId, userPw, channel, cmd, operatorId });

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
      operatorId
    } = req.body;

    const result = await guardianliteService.modifyGuardianliteChannelLabel({ guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label: '', ch7_label: '', ch8_label: '', operatorId });

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

exports.modifyOutsideGuardianlite = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.modifyOutsideGuardianlite(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, modifyOutsideGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteController.js, modifyOutsideGuardianlite, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteGuardianlite = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await guardianliteService.deleteGuardianlite(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/guardianliteController.js, deleteGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteController.js, deleteGuardianlite, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}