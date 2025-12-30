const pidsService = require('../services/pidsService');
const logger = require('../../../logger');

exports.createPIDS = async (req, res) => {
  try {
    const result = await pidsService.createPIDS(req.body);
    if(result.success) {
      return res.sendStatus(201);
    }
  } catch(error) {
    logger.info('observer/pidsController.js, update pids device, error: ', error);
    console.log('observer/pidsController.js, update pids device, error: ', error);
    return res.status(500).send({
      message: error.message || 'update pids server error',
      result: error 
    });
  }
};

exports.getPIDS = async (req, res) => {
  try {
    const result = await pidsService.getPIDS();
    if(!result || !result.rows) {
      return {
        success: false
      }
    }
    return res.status(200).json(result.rows);
  } catch(error) {
    logger.info('observer/pidsController.js, get pids device, error: ', error);
    console.log('observer/pidsController.js, get pids device, error: ', error);
    return res.status(500).send({
      message: error.message || 'get pids server error',
      result: error 
    });
  };
};

exports.getPIDSRoot = async (req, res) => {
  try {
    const result = await pidsService.getPIDSRoot();
    if(!result || !result.rows) {
      return {
        success: false
      }
    }
    return res.status(200).json(result.rows);
  } catch(error) {
    logger.info('observer/pidsController.js, get pids root device, error: ', error);
    console.log('observer/pidsController.js, get pids root device, error: ', error);
    return res.status(500).send({
      message: error.message || 'get pids server error',
      result: error 
    });
  };
};

exports.removePIDS = async (req, res) => {
  try {
    const result = await pidsService.removePIDS(req.body);
    if(result.success) {
      return res.sendStatus(204);
    }
    return res.sendStatus(404);
  } catch(error) {
    logger.info('observer/pidsController.js, remove pids device, error: ', error);
    console.log('observer/pidsController.js, remove pids device, error: ', error);
    return res.status(500).send({
      message: error.message || 'remove pids server error',
      result: error 
    });
  };
};

exports.updatePIDS = async (req, res) => {
  try {
    const result = await pidsService.updatePIDS(req.body);
    if(result.success) {
      return res.sendStatus(200);
    }
    return res.sendStatus(400);
  } catch(error) {
    logger.info('observer/pidsController.js, update pids device, error: ', error);
    console.log('observer/pidsController.js, update pids device, error: ', error);
    return res.status(500).send({
      message: error.message || 'update pids server error',
      result: error 
    });
  };
};

exports.addPIDSEvent = async (req, res) => {
  if(req.body == null){
    return res.sendStatus(400);
  };

  try {
    const result = await pidsService.addPIDSEvent({ id: req.body });
    if(result.success) {
      return res.sendStatus(201);
    }
  } catch(error) {
    logger.info('observer/pidsController.js, addPIDSEvent, error: ', error);
    console.log('observer/pidsController.js, addPIDSEvent, error: ', error);
    return res.status(500).send({
      message: error.message || 'addPIDSEvent server error',
      result: error 
    });
  }
};
