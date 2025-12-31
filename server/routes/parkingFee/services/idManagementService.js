const logger = require('../../../logger');
const axios = require('axios');


exports.getManagePersonList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};
    
    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/member_list/list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });

    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {

      if(resData.data.list) {
        
        // GTL 코드로 데이터 정리
        returnValue.docs = renderTable(resData.data.list);

        // 받은값 그대로
        // returnValue.docs = resData.data.list;
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
    logger.error(`parkingFee/idManagementService.js, getManagePersonList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/idManagementService.js, getManagePersonList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setManagePersonList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};
    
    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/member_list/create';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });

    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {

      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        
        returnValue.docs = '성공';
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
    logger.error(`parkingFee/idManagementService.js, setManagePersonList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/idManagementService.js, setManagePersonList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateManagePersonList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};
    
    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/member_list/update';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });

    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {

      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        
        returnValue.docs = '성공';
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
    logger.error(`parkingFee/idManagementService.js, updateManagePersonList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/idManagementService.js, updateManagePersonList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.deleteManagePersonList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};
    
    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/member_list/delete';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });

    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {

      if(resData.data.message) {

        returnValue.docs = resData.data.message;

      } else {
        
        returnValue.docs = '성공';
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
    logger.error(`parkingFee/idManagementService.js, deleteManagePersonList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/idManagementService.js, deleteManagePersonList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/manage_person_list1.html 파일 내용
 * 
 * docs : 받은 데이터
 * 여기는 정리가 없음.
 */
const renderTable = (docs) => {
  const sorted = getSortedDocs(docs);
  let returnArray = [];

  sorted.forEach((obj, i)=>{
    let returnObj = {};

    returnObj._id = obj._id; // mongodb id
    returnObj.id = obj.id; // 입주사 id
    returnObj.pw = obj.pw; // 입주사 pw
    returnObj.name = (obj.name ? obj.name : ''); // 이름
    returnObj.company = (obj.company ? obj.company : ''); // 입주사명
    returnObj.phone1 = (obj.phone1 ? obj.phone1 : ''); // 전화번호
    returnObj.group_name = (obj.group_name ? obj.group_name : ''); // 그룹이름
    returnObj.webDiscount_list = {}; // 웹 할인권
    if(obj.webDiscount_list) {
      returnObj.webDiscount_list = obj.webDiscount_list;
    }

    returnArray.push(returnObj);
  });
  
  return returnArray;
}

let sortKey = '';
let sortDir = 'asc';
// ====== 정렬 ======
const getSortedDocs = (docs) => {
  if(!sortKey){ return docs.slice(); }
  const arr = docs.slice();
  const collator = new Intl.Collator('ko', { sensitivity:'base', numeric:true });
  arr.sort((a,b)=>{
    const av = (a?.[sortKey] ?? '').toString();
    const bv = (b?.[sortKey] ?? '').toString();
    const cmp = collator.compare(av, bv);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return arr;
}