const logger = require('../../../logger');
const axios = require('axios');

exports.getFeePolicyList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/fee_policy_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

		if(resData.data.status == 'ok') {

			if(resData.data.docs) {

				// GTL 코드로 데이터 정리
				returnValue.docs = renderList(resData.data.docs);

				// 받은값 그대로
				// returnValue.docs = resData.data.docs;
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
    logger.error(`parkingFee/feePolicyService.js, getFeePolicyList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/feePolicyService.js, getFeePolicyList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setFeePolicyList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/fee_policy_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

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
    logger.error(`parkingFee/feePolicyService.js, setFeePolicyList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/feePolicyService.js, setFeePolicyList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateFeePolicyList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/fee_policy_list';
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
    logger.error(`parkingFee/feePolicyService.js, updateFeePolicyList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/feePolicyService.js, updateFeePolicyList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteFeePolicyList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/fee_policy_list';
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
    logger.error(`parkingFee/feePolicyService.js, deleteFeePolicyList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/feePolicyService.js, deleteFeePolicyList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}


/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/manage_fee_policy.html 파일 내용
 * 
 * items : 받은 데이터
 */
const renderList = (items) => {

  let returnValue = [];

  for(var i = 0; i < items.length; i++) {
		var obj = items[i];
		
    let returnObj = {};
    returnObj.name = obj.name ? obj.name : ''; // 정책명
    returnObj.std_duration = obj.std_duration ? obj.std_duration : 0; // 기본시간(분)
    returnObj.std_fee = obj.std_fee ? obj.std_fee : 0; // 기본요금(원)
    returnObj.repeat_duration = obj.repeat_duration ? obj.repeat_duration : 0; // 반복시간(분)
    returnObj.repeat_fee = obj.repeat_fee ? obj.repeat_fee : 0; // 반복요금(원)

    returnObj.free_duration = obj.free_duration ? obj.free_duration : 0; // 무료시간(분)
    returnObj.settlement_duration = obj.settlement_duration ? obj.settlement_duration : 0; // 정산단위
    returnObj.max_daily_fee = obj.max_daily_fee ? obj.max_daily_fee : 0; // 1일 상한
    returnObj.abs_max_fee = obj.abs_max_fee ? obj.abs_max_fee : 0; // 절대 상한

    returnValue.push(returnObj);
	}

  return returnValue;
}
