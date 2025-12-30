const broadcastService = require('../services/broadcastService');
const logger = require('../../../logger');


exports.addBroadcast = async (token, req, res) => {

  try {
    
    let message = 'fail';

    const result = await broadcastService.addBroadcast(token, req.body);

    if(result) {
      message = 'ok';
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.info('villageBroadcast/broadcastController.js, addBroadcast, error: ', error);
    console.log('villageBroadcast/broadcastController.js, addBroadcast, error: ', error);
 
  }
}



exports.getBroadcastLogList = async (token, req, res) => {
  try {

    if (!token) {
      return res.status(401).send({
        message: '토큰이 없습니다.',
        result: null
      });
    }

    const result = await broadcastService.getBroadcastLogList(token, req.body);

    return res.status(200).send({
      message: 'ok',
      result: result
    });
    
  } catch (error) {
    logger.info('villageBroadcast/broadcastController.js, getBroadcastLogList, error: ', error);
    console.log('villageBroadcast/broadcastController.js, getBroadcastLogList, error: ', error);
    return res.status(500).send({
      message: '방송 로그 목록 조회 중 오류가 발생했습니다.',
      result: null
    });
  }
}

exports.getEventLogList = async (req, res) => {
  try {

    const result = await broadcastService.getEventLogList(req.body);

    return res.status(200).send({
      message: 'ok',
      result: result
    });
    
  } catch (error) {
    logger.info('villageBroadcast/broadcastController.js, getEventLogList, error: ', error);
    console.log('villageBroadcast/broadcastController.js, getEventLogList, error: ', error);
    return res.status(500).send({
      message: '이벤트 로그 목록 조회 중 오류가 발생했습니다.',
      result: null
    });
  }
}



