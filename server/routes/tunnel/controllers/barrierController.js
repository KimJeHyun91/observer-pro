const logger = require('../../../logger');
const { executeBarrierControl } = require('../services/barrierService');

exports.executeBarrierControl = async (req, res) => {
  try {
    const result = await executeBarrierControl(req.body);
    res.status(200).json(result);
  } catch (error) {
    logger.info('tunnel/executeBarrierControl.js, executeBarrierControl, error: ', error);
    console.error('tunnel/executeBarrierControl.js, executeBarrierControl, error: ', error);
    res.status(400).send({
      status: false,
      message: '명령 전송 실패',
      result: error.message || error,
    });
  }
};


