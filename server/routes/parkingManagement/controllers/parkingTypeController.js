const parkingTypeService = require('../services/parkingTypeService');
const logger = require('../../../logger');


exports.getParkingTypeList = async (req, res) => {

  try {
    
    const result = await parkingTypeService.getParkingTypeList(req.body);

    res.status(200).send({
      message: 'ok',
      result: result 
    });

  } catch (error) {
    logger.info('parkingManagement/parkingTypeController.js, getParkingTypeList, error: ', error);
    console.log('parkingManagement/parkingTypeController.js, getParkingTypeList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: error 
    });
  }
}