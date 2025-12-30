const outsideService = require('../services/outsideService');
const logger = require('../../../logger');


exports.getSites = async (token, req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getSites(token, req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getSites, error: ', error);
    console.log('villageBroadcast/outsideController.js, getSites, error: ', error);
    // res.status(400).send({
    //   message: 'error',
    //   result: error 
    // });
  }
}

exports.addSite = async (token, req, res) => {

  try {
    const {siteId} = req.body

    let message = 'fail';

    const result = await outsideService.addSite(token, siteId);

    if(result && result.status) {
      message = 'ok';
    } else {
      message = 'fail';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, addSite, error: ', error);
    console.log('villageBroadcast/outsideController.js, addSite, error: ', error);
    // res.status(400).send({
    //   message: 'error',
    //   result: error 
    // });
  }
}



exports.addOutside = async (req, res) => {

  try {
    
    let message = 'fail';
    const result = await outsideService.addOutside(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, addOutside, error: ', error);
    console.log('villageBroadcast/outsideController.js, addOutside, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutsideInfo = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getOutsideInfo(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getOutsideInfo, error: ', error);
    console.log('villageBroadcast/outsideController.js, getOutsideInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutsideList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getOutsideList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getOutsideList, error: ', error);
    console.log('villageBroadcast/outsideController.js, getOutsideList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.deleteOutside = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.deleteOutside(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, deleteOutside, error: ', error);
    console.log('villageBroadcast/outsideController.js, deleteOutside, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getUnLinkDeviceList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getUnLinkDeviceList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getUnLinkDeviceList, error: ', error);
    console.log('villageBroadcast/outsideController.js, getUnLinkDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getOutsideDeviceList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getOutsideDeviceList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getOutsideDeviceList, error: ', error);
    console.log('villageBroadcast/outsideController.js, getOutsideDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.getAllDeviceList = async (req, res) => {

  try {
    
    let message = 'fail';

    const result = await outsideService.getAllDeviceList(req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('villageBroadcast/outsideController.js, getAllDeviceList, error: ', error);
    console.log('villageBroadcast/outsideController.js, getAllDeviceList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}