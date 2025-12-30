const speakerService = require('../services/speakerService');
const logger = require('../../../logger');


exports.getSpeakerList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.getSpeakerList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, getSpeakerList, error: ', error);
    console.log('villageBroadcast/speakerController.js, getSpeakerList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteSpeaker = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.deleteSpeaker(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, deleteSpeaker, error: ', error);
    console.log('villageBroadcast/speakerController.js, deleteSpeaker, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.addSpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';

    const { speakerMessage: speakerMsg } = req.body;
    const result = await speakerService.addSpeakerMacro({ speakerMsg });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, addSpeakerMacro, error: ', error);
    console.log('villageBroadcast/speakerController.js, addSpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifySpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';

    const { speakerMessage: speakerMsg ,speakerMessageIdx: idx } = req.body;
    const result = await speakerService.modifySpeakerMacro({ idx, speakerMsg });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, modifySpeakerMacro, error: ', error);
    console.log('villageBroadcast/speakerController.js, modifySpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSpeakerMacroList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.getSpeakerMacroList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, getSpeakerMacroList, error: ', error);
    console.log('villageBroadcast/speakerController.js, getSpeakerMacroList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteSpeakerMacro = async (req, res) => {

  try {
    
    let message = 'fail';
    const { speakerMessageIdx: idx } = req.body;
    const result = await speakerService.deleteSpeakerMacro({ idx });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, deleteSpeakerMacro, error: ', error);
    console.log('villageBroadcast/speakerController.js, deleteSpeakerMacro, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSpeakerStatusCount = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await speakerService.getSpeakerStatusCount(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/speakerController.js, getSpeakerStatusCount, error: ', error);
    console.log('villageBroadcast/speakerController.js, getSpeakerStatusCount, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}