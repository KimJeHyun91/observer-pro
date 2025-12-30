const audioFileService = require('../services/audioFileService');
const logger = require('../../../logger');



exports.addAudioFile = async (token, req, res) => {
   
  try {

    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    let message = 'fail';

    const result = await audioFileService.addAudioFile(token, req);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });
  
  } catch (error) {
    logger.info('villageBroadcast/audioFileController.js, addAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileController.js, addAudioFile, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAudioFileList = async (req, res) => {

  try {

    let message = 'fail';

    const result = await audioFileService.getAudioFileList();

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/audioFileController.js, addAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileController.js, addAudioFile, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
 }

exports.deleteAudioFile = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await audioFileService.deleteAudioFile(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/audioFileController.js, deleteAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileController.js, deleteAudioFile, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.modifyAudioFile = async (req, res) => {

  try {
    
    let message = 'fail';

    const { audioFileName ,audioFileIdx: idx } = req.body;
    const result = await audioFileService.modifyAudioFile({ idx, audioFileName });

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/audioFileController.js, modifyAudioFile, error: ', error);
    console.log('villageBroadcast/audioFileController.js, modifyAudioFile, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}