const logger = require('../../../logger');
const kioskLogsService = require('../services/kioskLogsService');

/**
 * 
 * @param {*} req 
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * id : 입주사 id
 * pw : 입주사 pw
 * start_time : YYYY-MM-dd HH:dd:ss
 * end_time : YYYY-MM-dd HH:dd:ss
 * @param {*} res :
 * kind : 'payment_result_list'
 * id : 입주사 id
 * pw : 입주사 pw
 * status : 'ok'
 * docs : 검색결과
 */
exports.paymentResultList = async (req, res) => {

  try {
    
    let message = 'fail';
    let result = [];

    const { ip, port, id, pw, start_time, end_time } = req.body;

    let obj = {};
    obj.kind = 'payment_result_list';
    obj.id = id;
    obj.pw = pw;
    obj.start_time = new Date(start_time).getTime();
    obj.end_time = new Date(end_time).getTime();

    const resData = await kioskLogsService.paymentResultList(obj, ip, port);

    if(resData) {

      if(resData.docs) {
        result = resData.docs;
      }
      
      if(resData.status == 'ok') {
        message = resData.status;
      }
    }

    res.status(200).send({
      message: message,
      result: result 
    });

  } catch (error) {
    logger.error('parkingFee/kioskLogsController.js, paymentResultList, error: ', error);
    console.log('parkingFee/kioskLogsController.js, paymentResultList, error: ', error);
    res.status(400).send({
      message: 'error',
      result: String(error) 
    });
  }
}