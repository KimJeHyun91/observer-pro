const testService = require('../services/testService');
const logger = require('../../../logger');

exports.test = async (req, res) => {

  try {

    // const { user_id, user_pw } = req.body;

    // const { user_id, user_pw } = req.query;

    const result = await testService.selectTest();
    
    
    
    res.send(result);

  } catch (error) {
    logger.info('aTest/testController.js, test, error: ', error);
    console.log('aTest/testController.js, test, error: ', error);
  }
}