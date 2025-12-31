const logger = require('../../../logger');
const axios = require('axios');


exports.getHolidayList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_holiday_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

		if(resData.data.status == 'ok') {

			if(resData.data.docs) {

				// GTL 코드로 데이터 정리
				returnValue.docs = display_docs(resData.data.docs);

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
    logger.error(`parkingFee/holidayService.js, getHolidayList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/holidayService.js, getHolidayList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setHolidayList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_holiday_list';
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
    logger.error(`parkingFee/holidayService.js, setHolidayList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/holidayService.js, setHolidayList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateHolidayList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_holiday_list';
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
    logger.error(`parkingFee/holidayService.js, updateHolidayList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/holidayService.js, updateHolidayList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteHolidayList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_holiday_list';
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
    logger.error(`parkingFee/holidayService.js, deleteHolidayList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/holidayService.js, deleteHolidayList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}


/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/manage_holiday_list.js 파일 내용
 * 
 * docs : 받은 데이터
 */
const display_docs = (docs) => {
  
  let returnValue = [];
  
  for(var i = 0; i < docs.length; i++) {
		var obj = docs[i];
    
		let returnObj = {};
		returnObj.hoilday_name = obj.hoilday_name ? obj.hoilday_name : ''; // 공휴일 이름
		returnObj.day = obj.day ? obj.day : ''; // 공휴일 날짜(일자)
		returnObj.day_of_week = obj.day_of_week ? obj.day_of_week : ''; // 공휴일 요일

		returnValue.push(returnObj);
	}

  return returnValue;
}