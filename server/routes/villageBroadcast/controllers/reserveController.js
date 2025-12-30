const logger = require('../../../logger');
const reserveService = require('../services/reserveService');

exports.addReserve = async (req, res) => {
   
    try {
  
      let message = 'fail';

      const result = await reserveService.addReserve(req.body);

      if(result) {
        message = 'ok';
      }
  
      res.status(200).send({
        message: message,
        result: result
      });
    
    } catch (error) {
      logger.info('villageBroadcast/reserveController.js, addReserve, error: ', error);
      console.log('villageBroadcast/reserveController.js, addReserve, error: ', error);
      res.status(400).send({
        message: 'error',
        result: error 
      });
    }
  }

  exports.getReserveList = async (req, res) => {

    try {
      
      let message = 'fail';
  
      const result = await reserveService.getReserveList(req.body);
  
      if(result) {
        message = 'ok';
      }
  
      res.status(200).send({
        message: message,
        result: result
      });
  
    } catch (error) {
      logger.info('villageBroadcast/reserveController.js, getReserveList, error: ', error);
      console.log('villageBroadcast/reserveController.js, getReserveList, error: ', error);
      res.status(400).send({
        message: 'error',
        result: error 
      });
    }
  }

  exports.deleteReserve = async (req, res) => {

    try {
      
      let message = 'fail';
      const { reserveIdx: idx, broadcastType } = req.body;
      const result = await reserveService.deleteReserve({ idx, broadcastType });
  
      if(result) {
        message = 'ok';
      }
  
      res.status(200).send({
        message: message,
        result: result
      });
  
    } catch (error) {
      logger.info('villageBroadcast/reserveController.js, deleteReserve, error: ', error);
      console.log('villageBroadcast/reserveController.js, deleteReserve, error: ', error);
      res.status(400).send({
        message: 'error',
        result: error 
      });
    }
  }

  exports.modifyReserve = async (req, res) => {

    try {
      
      let message = 'fail';
  
      const result = await reserveService.modifyReserve(req.body);
  
      if(result) {
        message = 'ok';
      }
  
      res.status(200).send({
        message: message,
        result: result
      });
  
    } catch (error) {
      logger.info('villageBroadcast/reserveController.js, reserveService, error: ', error);
      console.log('villageBroadcast/reserveController.js, reserveService, error: ', error);
      res.status(400).send({
        message: 'error',
        result: error 
      });
    }
  }


  