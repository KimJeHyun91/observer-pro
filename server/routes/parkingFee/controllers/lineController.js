const logger = require('../../../logger');
const lineService = require('../services/lineService');


/**
 * 
 * @param {*} req 
 * inside_idx : 층 index
 */
exports.getLineList = async (req, res) => {

  try {
    
    const { inside_idx } = req.body;
    const result = await lineService.getLineList(inside_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/lineController.js, getLineList, error: ', error);
    console.log('parkingFee/lineController.js, getLineList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * inside_idx : 층 index
 * line_name : 라인명
 * in_gate : {차단기 DB data} or null
 * out_gate : {차단기 DB data}  or null
 */
exports.setLineInfo = async (req, res) => {

  try {
    
    const { inside_idx, line_name, in_gate, out_gate } = req.body;
    let in_crossing_gate_idx = null;
    let out_crossing_gate_idx = null
    
    if(in_gate) {
      in_crossing_gate_idx = in_gate.idx;
    }

    if(out_gate) {
      out_crossing_gate_idx = out_gate.idx;
    }
    const result = await lineService.setLineInfo(inside_idx, line_name, in_crossing_gate_idx, out_crossing_gate_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/lineController.js, setLineInfo, error: ', error);
    console.log('parkingFee/lineController.js, setLineInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * line_idx : 라인 index
 * line_name : 라인명
 * in_gate : {차단기 DB data} or null
 * out_gate : {차단기 DB data}  or null
 */
exports.updateLineInfo = async (req, res) => {

  try {
    
    const { line_idx, line_name, in_gate, out_gate } = req.body;
    let in_crossing_gate_idx = null;
    let out_crossing_gate_idx = null

    if(in_gate) {
      in_crossing_gate_idx = in_gate.idx;
    }

    if(out_gate) {
      out_crossing_gate_idx = out_gate.idx;
    }

    const result = await lineService.updateLineInfo(line_idx, line_name, in_crossing_gate_idx, out_crossing_gate_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/lineController.js, updateLineInfo, error: ', error);
    console.log('parkingFee/lineController.js, updateLineInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * line_idx : 라인 index
 */
exports.deleteLineInfo = async (req, res) => {

  try {
    
    const { line_idx } = req.body;
    const result = await lineService.deleteLineInfo(line_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/lineController.js, deleteLineInfo, error: ', error);
    console.log('parkingFee/lineController.js, deleteLineInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}

/**
 * 
 * @param {*} req 
 * line_idx : line index
 */
exports.getLineLPRInfo = async (req, res) => {

  try {
    
    const { line_idx } = req.body;
    const result = await lineService.getLineLPRInfo(line_idx);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/lineController.js, getLineLPRInfo, error: ', error);
    console.log('parkingFee/lineController.js, getLineLPRInfo, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}