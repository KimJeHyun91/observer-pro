const logger = require('../../../logger');
const axios = require('axios');
const { pool } = require('../../../db/postgresqlPool');
const lprMapper = require('../mappers/lprMapper');


exports.getReductionList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_reduction_list';
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
    logger.error(`parkingFee/reductionService.js, getReductionList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/reductionService.js, getReductionList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setReductionList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_reduction_list';
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
    logger.error(`parkingFee/reductionService.js, setReductionList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/reductionService.js, setReductionList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateReductionList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_reduction_list';
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
    logger.error(`parkingFee/reductionService.js, updateReductionList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/reductionService.js, updateReductionList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteReductionList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/manage_reduction_list';
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
    logger.error(`parkingFee/reductionService.js, deleteReductionList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/reductionService.js, deleteReductionList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}



/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/manage_reduction_list.js 파일 내용
 * 
 * docs : 받은 데이터
 */
const display_docs = (docs) => {

  let returnValue = [];

  for(var i = 0; i < docs.length; i++) {
		var obj = docs[i];
		
    let returnObj = {};
    returnObj.reduction_name = obj.reduction_name ? obj.reduction_name : ''; // 주차요금 감면이름
    returnObj.reduction_ratio = obj.reduction_ratio ? obj.reduction_ratio : ''; // 주차요금 감면비율{%}
    returnObj.reduction_min = obj.reduction_min ? obj.reduction_min : ''; // 주차요금 감면시간(분)
    returnObj.reduction_fee = obj.reduction_fee ? obj.reduction_fee : ''; // 주차요금 감면요금(원)
    returnObj.contents = obj.contents ? obj.contents : ''; // 비고

    // reduction_min 분 감면 후, reduction_ratio % 감면
    returnValue.push(returnObj);
	}

  return returnValue;
}

exports.getReductionPolicyList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await lprMapper.getReductionPolicyList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/reductionService.js, getReductionPolicyList, error: ', error);
    console.log('parkingFee/reductionService.js, getReductionPolicyList, error: ', error);
  } finally {
    await client.release();
  }
}