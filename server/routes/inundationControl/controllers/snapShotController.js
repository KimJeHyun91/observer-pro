const snapShotService = require('../services/snapShotService');
const logger = require('../../../logger');


exports.getSnapshot = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await snapShotService.getSnapshot(req.body);

    if(result.status) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/snapShotController.js, getSnapshot, error: ', error);
    console.log('inundationControl/snapShotController.js, getSnapshot, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.snapshotLocalPathSave = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await snapShotService.snapshotLocalPathSave(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/snapShotController.js, snapshotLocalPathSave, error: ', error);
    console.log('inundationControl/snapShotController.js, snapshotLocalPathSave, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.delSnapshot = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await snapShotService.delSnapshot(req.body);

    if(result.status) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/snapShotController.js, delSnapshot, error: ', error);
    console.log('inundationControl/snapShotController.js, delSnapshot, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.makeDownloadUrl = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await snapShotService.makeDownloadUrl(req.body);

    if(result.status) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/snapShotController.js, makeDownloadUrl, error: ', error);
    console.log('inundationControl/snapShotController.js, makeDownloadUrl, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getSnapshotPath = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await snapShotService.getSnapshotPath(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('inundationControl/snapShotController.js, getSnapshotPath, error: ', error);
    console.log('inundationControl/snapShotController.js, getSnapshotPath, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}