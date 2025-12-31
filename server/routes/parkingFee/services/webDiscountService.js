const logger = require('../../../logger');
const axios = require('axios');


exports.getWebDiscountList = async (ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_webDiscount_list/list';
    const resData = await axios.post(url, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

		if(resData.data.status == 'ok') {

			if(resData.data.list) {

				// GTL 코드로 데이터 정리
				// returnValue.docs = display_docs(resData.data.list);

				// 받은값 그대로
				returnValue.docs = resData.data.list;
      }
			
		} else {
			
      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        returnValue.docs = '주차 관제 서버 오류';
      }
		}
		
    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/webDiscountService.js, getWebDiscountList, error: `, error);
    console.log(`parkingFee/webDiscountService.js, getWebDiscountList, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setWebDiscountList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_webDiscount_list/create';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.status;
    returnValue.docs = {};

    if(resData.data.status == 'ok') {

      returnValue.docs = resData.data;

    } else {
      
      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        returnValue.docs = '주차 관제 서버 오류';
      }
    }

    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/webDiscountService.js, setWebDiscountList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/webDiscountService.js, setWebDiscountList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteWebDiscountList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_webDiscount_list/delete';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.status;
    returnValue.docs = {};

    if(resData.data.status == 'ok') {

      returnValue.docs = resData.data;

    } else {
      
      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        returnValue.docs = '주차 관제 서버 오류';
      }
    }

    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/webDiscountService.js, deleteWebDiscountList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/webDiscountService.js, deleteWebDiscountList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}