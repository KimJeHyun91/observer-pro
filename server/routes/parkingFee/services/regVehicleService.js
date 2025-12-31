const logger = require('../../../logger');
const axios = require('axios');
const _ = require('lodash');


exports.getManageSalesList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/manage_sales_list/get_sales_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {
      
      if(resData.data.docs) {

        // GTL 프론트 코드로 데이터 정리
        // returnValue.docs = display_docs(resData.data.docs);
        
        // 받은값 그대로
        returnValue.docs = resData.data.docs;
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
    logger.error(`parkingFee/regVehicleService.js, getManageSalesList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/regVehicleService.js, getManageSalesList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setManageSalesList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/manage_sales_list/create';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.success ? 'ok' : 'ng';
    returnValue.docs = {};

    if((resData.data.status == 'ok') || (resData.data.success)) {

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
    logger.error(`parkingFee/regVehicleService.js, setManageSalesList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/regVehicleService.js, setManageSalesList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateManageSalesList = async (obj, ip, port, id) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = new URL(`${baseUrl}/manage_sales_list/update/${encodeURIComponent(id)}`);

    const resData = await axios.post(url.href, obj, {
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
    logger.error(`parkingFee/regVehicleService.js, updateManageSalesList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/regVehicleService.js, updateManageSalesList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteManageSalesList = async (ip, port, id) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = new URL(`${baseUrl}/manage_sales_list/delete/${encodeURIComponent(id)}`);

    const resData = await axios.post(url.href, {
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
    logger.error(`parkingFee/regVehicleService.js, deleteManageSalesList, error: `, error);
    console.log(`parkingFee/regVehicleService.js, deleteManageSalesList, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

// 요금정책, 정기권 그룹 검색
exports.manageSalesListLoadConfig = async (ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/manage_sales_list/loadConfig';
    const resData = await axios.post(url, {
      timeout: 10 * 1000
    });
    
    returnValue.status = resData.data.status;
    returnValue.docs = {};
    returnValue.docs.fee_policy_list = [];
    returnValue.docs.season_ticket_list = [];

    if(resData.data && resData.data.status == 'ok') {
      
      if((resData.data.fee_policy_list) && (resData.data.fee_policy_list.length > 0)) {
        returnValue.docs.fee_policy_list = resData.data.fee_policy_list;
      }

      if((resData.data.season_ticket_list) && (resData.data.season_ticket_list.length > 0)) {
        returnValue.docs.season_ticket_list = resData.data.season_ticket_list;
      }
    }

    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/regVehicleService.js, manageSalesListLoadConfig, error: `, error);
    console.log(`parkingFee/regVehicleService.js, manageSalesListLoadConfig, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/manage_sales_list.js 파일 내용
 * 
 * docs : 받은 데이터
 */
const display_docs = (docs) => {

  let returnArray = []; // 출력값 저장, 지우지마시오

  var obj_of_lp_list = {};
	for(var i = 0; i < docs.length; i++) {
		if(!obj_of_lp_list[docs[i].lp]) {
			obj_of_lp_list[docs[i].lp] = [];
			obj_of_lp_list[docs[i].lp].push(docs[i]);
		}
		else {
			obj_of_lp_list[docs[i].lp].push(docs[i]);
		}
	}	
	docs = [];
	for( var lp in obj_of_lp_list) {
		var lp_list = obj_of_lp_list[lp];
		var tmp_obj = lp_list[0];
		for(var i = 1; i < lp_list.length; i++) {
			if(tmp_obj.time < lp_list[i].time) {
				tmp_obj = lp_list[i];
			}
		}
		// if(tmp_obj.kind != 'delete_sales_at_sales_list') {
			// docs.push(tmp_obj);
		// }
		docs.push(tmp_obj);
	}

  for(var i = 0; i < docs.length; i++) {
		var obj = docs[i];
		obj_of_lp_list[obj.lp] = _.chain(obj_of_lp_list[obj.lp])
					.sortBy('time')
					.reverse()
					.value();
		for(var j = 0; j < obj_of_lp_list[obj.lp].length; j++) {

      let innerObj = obj_of_lp_list[obj.lp][j];

      let returnObj = {};
      returnObj.lp = innerObj.lp; // 차량번호
      returnObj.period_start = innerObj.period_start; // 개시시점
      returnObj.period_end = innerObj.period_end; // 종료시점
      returnObj.company = (innerObj.company ? innerObj.company : ''); // 업체명
      returnObj.name = (innerObj.name ? innerObj.name : ''); // 이름
      returnObj.contents = (innerObj.contents ? innerObj.contents : ''); // 비고

      returnArray.push(returnObj);
    }			
	}

	return returnArray;
}