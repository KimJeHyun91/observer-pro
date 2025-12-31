const logger = require('../../../logger');
const axios = require('axios');
const _ = require('lodash');


exports.getPaymentResultForVisitorCouponSearch= async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/payment_result_for_visitor/coupon_search';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = {};

		if(resData.data.status == 'ok') {

			if(resData.data.doc) {

        returnValue.docs = resData.data.doc;
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
    logger.error(`parkingFee/paymentResultService.js, getPaymentResultForVisitorCouponSearch, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/paymentResultService.js, getPaymentResultForVisitorCouponSearch, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}


exports.getPaymentResultForVisitorVehicleSearch = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/payment_result_for_visitor/how_much';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

		if(resData.data.status == 'ok') {

			if(resData.data.vehicle_obj_list) {

				// GTL 코드로 데이터 정리
				const resDocData = _.chain(resData.data.vehicle_obj_list)
          .sortBy('lp') 				// least important property
          .sortBy('loop_event_time') 	// to most important property
          .reverse()
          .value();
				returnValue.docs = display_docs(resDocData, ip, port);
        
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
    logger.error(`parkingFee/paymentResultService.js, getPaymentResultForVisitorVehicleSearch, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/paymentResultService.js, getPaymentResultForVisitorVehicleSearch, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.getPaymentResultForVisitorHowMuch = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/payment_result_for_visitor';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = {};

		if(resData.data.status == 'ok') {

			if(resData.data) {

        returnValue.docs = resData.data;
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
    logger.error(`parkingFee/paymentResultService.js, getPaymentResultForVisitorHowMuch, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/paymentResultService.js, getPaymentResultForVisitorHowMuch, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}



/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/pay_for_visitor_before_exit.js 파일 내용
 * 
 * docs : 받은 데이터
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 */
const display_docs = (vehicle_obj_list_tmp, ip, port) => {

  let returnValue = [];

  let vehicle_obj_list = [];

  for(var i = 0; i < vehicle_obj_list_tmp.length; i++) {
    // console.log(vehicle_obj_list_tmp[i].direction, vehicle_obj_list_tmp[i].lp, vehicle_obj_list_tmp[i].loop_event_time);
    if(vehicle_obj_list_tmp[i].lp.indexOf("Not") >= 0) {
      continue;
    }
    var flag = false;
    for(var j = i+1; j < vehicle_obj_list_tmp.length; j++) {
      if(	vehicle_obj_list_tmp[i].direction == "in" &&
        vehicle_obj_list_tmp[j].direction == "out" &&
        vehicle_obj_list_tmp[i].loop_event_time < vehicle_obj_list_tmp[j].loop_event_time &&
        vehicle_obj_list_tmp[i].lp == vehicle_obj_list_tmp[j].lp ) {
        flag = true;
      }
      else {
      }
    }
    if(	flag == false &&
      vehicle_obj_list_tmp[i].direction == "in") {
      vehicle_obj_list.push(vehicle_obj_list_tmp[i]);
    }
  }
// console.log("OWOOEOEOFO", vehicle_obj_list.length);

  var f_count = 0;
  var b_count = 0;
  var html = "";
  var count = 0;
  for(var i = 0; i < vehicle_obj_list.length; i++) {

    var obj = vehicle_obj_list[i];

    let parking_duration = Math.floor((Date.now()-obj.loop_event_time)/1000/60);
    if(parking_duration < 60){
      count = 0
    }
    else{
      count = Math.floor((parking_duration -60)/30) + 1;
      
    }

    let returnObj = {};
    returnObj.image = "http://" + ip + ":" + port + "/images/" + obj.folder_name + "/" + obj.fname;; // 차량이미지
    returnObj.lp = obj.lp ? obj.lp : ''; // 차량번호
    returnObj.loop_event_time = obj.loop_event_time; // 입차시각
    returnObj.location = obj.location; // 입차구역
    returnObj.parking_time = num_to_str(Math.floor((Date.now()-obj.loop_event_time)/60/1000/60))+" : "+num_to_str(Math.ceil((Date.now()-obj.loop_event_time)/60/1000%60)); // 주차시간 
    // returnObj.fee = how_much_using_obj_in(obj); // 주차요금(원)
    returnObj.discounted_list = obj.discounted_list; // 할인 리스트
    returnObj.contents = obj.contents ? obj.contents : ''; // 메모

    returnValue.push(returnObj);
  }

  return returnValue;

}

const num_to_str = ($num) => {
	$num < 10 ? $num = '0' + $num : $num;
	return $num.toString();
}

const how_much_using_obj_in = (obj_in) => {
	var fee_policy = {
		"kind" : "update_fee_policy_at_fee_policy",
		"name" : "2020_07_03",
		"free_duration" : 10,
		"free_duration_after_payment" : 10,
		"fee_per_10minutes" : 500,
		"maximum_fee_per_day" : 20000,
		"checked" : true
	};
	var now = Date.now();
	var obj_out = {
		loop_event_time : now
	};
	if(obj_in) {	// 입차정보가 있는 경우
		obj_out.original_parking_duration = obj_out.loop_event_time - obj_in.loop_event_time;
		obj_out.ajusted_parking_duration = obj_out.original_parking_duration - fee_policy.free_duration*60*1000;	// 모든 차량에 대하여 할인시간(분)*1분(60초) 적용
		
		
		if(obj_out.ajusted_parking_duration <= 0) {		// 회차차량 ---------------------------------------------------------------------------------------------------------------------------------------
			obj_in.type = '회차차량';
			obj_out.type = '회차차량';
			obj_out.fee = 0;
			obj_out.kind = 'fee_calculation_result';
			
console.log("주차요금 : "+obj_out.fee+"원");
			if(obj_out.fee > fee_policy.maximum_fee_per_day) {
				obj_out.fee = fee_policy.maximum_fee_per_day;
			}
			obj_out.obj_in = obj_in;
			return obj_out.fee;
		}
		else{												// 일반차량 ---------------------------------------------------------------------------------------------------------------------------------------
			obj_in.type = '일반차량';
			obj_out.type = '일반차량';
			obj_out.fee = 0;
			obj_out.kind = 'fee_calculation_result';

			obj_out.ajusted_parking_duration = obj_out.original_parking_duration;

			//
			// 500원
			//

			// obj_out.fee = Math.ceil(obj_out.ajusted_parking_duration/10/60/1000) * fee_policy.fee_per_10minutes;	// 남은 주차시간에 대하여 fee_policy.fee_per_10minutes 를 적용하여 주차요금 계산
			for(var loop_event_time = obj_in.loop_event_time; loop_event_time < obj_out.loop_event_time; loop_event_time += 10*60*1000) {
				obj_out.fee += 500;
			}
			
console.log("주차요금 : "+obj_out.fee+"원");
			if(obj_out.fee > fee_policy.maximum_fee_per_day) {
				obj_out.fee = fee_policy.maximum_fee_per_day;
			}
			obj_out.obj_in = obj_in;
			return obj_out.fee;													
		}
	}	
}