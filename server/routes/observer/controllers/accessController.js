const accessService = require('../services/accessService');
const logger = require('../../../logger');

exports.getAccessControlLog = async (req, res) => {

  try {
    const result = await accessService.getAccessControlLog(req.body);
    
    res.status(200).send({
      message: "ok",
      result: result,
    });

  } catch (error) {
    logger.info('observer/controllers/accessController.js, getAccessControlLog, error: ', error);
    console.log('observer/controllers/accessController.js, getAccessControlLog, error: ', error);
    res.status(400).send({
      message: "error",
      result: error
    });
  }
}

exports.reloadAccessControlPerson = async (req, res) => {  

  try {

    let message = 'fail';

    const result = await accessService.reloadAccessControlPerson();
    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result
    });

  } catch (error) {
    logger.info('observer/controllers/accessController.js, reloadAccessControlPerson, error: ', error);
    console.log('observer/controllers/accessController.js, reloadAccessControlPerson, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}

exports.accessEventRec = async (req, res) => {
  
  try {

    const deviceInfo = req.body.deviceInfo;
    const deviceType = req.body.deviceType;

    const queryRes = await accessService.accessEventRec(deviceInfo, deviceType);
    if (queryRes && queryRes.length > 0) {
      return res.status(200).send({
        result: {
          idx: queryRes[0].idx,
          serviceType: queryRes[0].service_type,
          eventTypeName: queryRes[0].event_type_name,
        }
      });
    } else {
      return res.status(404).send({
        message: 'find not Event',
        result: null
      });
    }
  }
  catch (error) {
    logger.info('observer/controllers/accessController.js, accessEventRec, error: ', error);
    console.log('observer/controllers/accessController.js, accessEventRec, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  };
};

exports.modifyAccessCtlPerson = async (req, res) => {
  try {
    const result = await accessService.modifyAccessCtlPerson(req.body);
    if(result.rowCount === 1) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('observer/controllers/accessController.js, modifyAccessCtlPerson, error: ', error);
    console.error('observer/controllers/accessController.js, modifyAccessCtlPerson, error: ', error);
    return res.status(500).send({
      message: (error.message || 'observer/controllers/accessController.js, modifyAccessCtlPerson, error')
    });
  };
};

exports.removeAccessCtlPerson = async (req, res) => {
  try {
    const result = await accessService.removeAccessCtlPerson(req.body);
    if(result?.rowCount === 1) {
      return res.sendStatus(204);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('observer/controllers/accessController.js, removeAccessCtlPerson, error: ', error);
    console.error('observer/controllers/accessController.js, removeAccessCtlPerson, error: ', error);
    return res.status(500).send({
      message: (error.message || 'observer/controllers/accessController.js, removeAccessCtlPerson, error')
    });
  };
};

exports.getAccessCtlPerson = async (req, res) => {
  try {
    const result = await accessService.getAccessCtlPerson(req.body);
    if(result.rows) {
      return res.status(200).json(result.rows);
    } else {
      return res.sendStatus(400);
    }
  } catch(error) {
    logger.error('observer/controllers/accessController.js, getAccessCtlPerson, error: ', error);
    console.error('observer/controllers/accessController.js, getAccessCtlPerson, error: ', error);
    return res.status(500).send({
      message: (error.message || 'observer/controllers/accessController.js, getAccessCtlPerson, error')
    });
  };
};
