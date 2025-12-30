const logger = require('../../../logger');
const eventService = require('../services/eventService');

exports.getEventsGroupByImportance = async (req, res) => {

  try {

    const result = await eventService.getEventsGroupByImportance(req.body);
    if(!result){
      return res.sendStatus(400);
    }
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEventsGroupByImportance, error: ', error);
    console.log('main/eventController.js, getEventsGroupByImportance, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.getEventsGroupByDevice = async (req, res) => {

  try {

    const result = await eventService.getEventsGroupByDevice(req.body);
    if(!result){
      return res.sendStatus(400);
    }
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEventsGroupByDevice, error: ', error);
    console.log('main/eventController.js, getEventsGroupByDevice, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.getEventsGroupByEventName = async (req, res) => {

  try {

    const result = await eventService.getEventsGroupByEventName(req.body);
    if(!result){
      return res.sendStatus(400);
    };
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEventsGroupByEventName, error: ', error);
    console.log('main/eventController.js, getEventsGroupByEventName, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.getEventsGroupByAck = async (req, res) => {

  try {

    const result = await eventService.getEventsGroupByAck(req.body);
    if(!result){
      return res.sendStatus(400);
    }
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEventsGroupByAck, error: ', error);
    console.log('main/eventController.js, getEventsGroupByAck, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.getEventsGroupBySOP = async (req, res) => {

  try {

    const result = await eventService.getEventsGroupBySOP(req.body);
    if(!result){
      return res.sendStatus(400);
    }
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEventsGroupBySOP, error: ', error);
    console.log('main/eventController.js, getEventsGroupBySOP, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.getEventList = async (req, res) => {

  try {

    const result = await eventService.getEventList(req.body);
    if(!result){
      return res.sendStatus(400);
    }
    return res.status(200).send({
      message: 'ok',
      result 
    });

  } catch (error) {
    logger.info('main/eventController.js, getEvents, error: ', error);
    console.log('main/eventController.js, getEvents, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.ackEvents = async (req, res) => {
  try {
    const result = await eventService.ackEvents(req.body);
    if(result.success){
      return res.sendStatus(200);
    }
    return res.sendStatus(400);
  } catch (error) {
    logger.info('main/eventController.js, ackEvent, error: ', error);
    console.log('main/eventController.js, ackEvent, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  };
};

exports.searchEvents = async (req, res) => {
  try {
    const result = await eventService.searchEvents(req.body);
    if(result){
      return res.status(200).json(result);
    }
    return res.sendStatus(400);
  } catch(error){
    logger.info('main/eventController.js, searchEvents, error: ', error);
    console.log('main/eventController.js, searchEvents, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  }
};

exports.searchEventsBySOP = async (req, res) => {
  try {
    const result = await eventService.searchEventsBySOP(req.body);
    if(result){
      return res.status(200).json(result);
    }
    return res.sendStatus(400);
  } catch(error){
    logger.info('main/eventController.js, searchEventsBySOP, error: ', error);
    console.log('main/eventController.js, searchEventsBySOP, error: ', error);
    return res.status(500).send({
      message: error.message,
      result: error 
    });
  }
};

