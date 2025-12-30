const logger = require('../../../logger');
const insideService = require('../services/insideService');


/**
 * 
 * @param {*} req 
 * outside_idx: 주차장(outside) idx
 */
exports.getFloorList = async (req, res) => {

  try {
    
    const { outside_idx } = req.body;
    const result = await insideService.getFloorList(outside_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/insideController.js, getFloorList, error: ', error);
    console.log('parkingFee/insideController.js, getFloorList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * outside_idx: 주차장(outside) idx
 */
exports.getFloorLineList = async (req, res) => {

  try {
    
    const { outside_idx } = req.body;
    const result = await insideService.getFloorLineList(outside_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/insideController.js, getFloorLineList, error: ', error);
    console.log('parkingFee/insideController.js, getFloorLineList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

/**
 * 
 * @param {*} req 
 * outside_idx: 주차장(outside) idx
 * inside_name : 층이름
 */
exports.setFloorInfo = async (req, res) => {

  try {
    
    const { outside_idx, inside_name } = req.body;
    const result = await insideService.setFloorInfo(outside_idx, inside_name);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/insideController.js, setFloorInfo, error: ', error);
    console.log('parkingFee/insideController.js, setFloorInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * inside_idx: 층(inside) 인덱스
 * inside_name : 층이름
 */
exports.updateFloorInfo = async (req, res) => {

  try {
    
    const { inside_idx, inside_name } = req.body;
    const result = await insideService.updateFloorInfo(inside_idx, inside_name);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/insideController.js, updateFloorInfo, error: ', error);
    console.log('parkingFee/insideController.js, updateFloorInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * inside_idx: 층(inside) 인덱스
 */
exports.deleteFloorInfo = async (req, res) => {

  try {
    
    const { inside_idx } = req.body;
    const result = await insideService.deleteFloorInfo(inside_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/insideController.js, deleteFloorInfo, error: ', error);
    console.log('parkingFee/insideController.js, deleteFloorInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}