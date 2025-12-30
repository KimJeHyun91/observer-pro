const logger = require('../../../logger');
const axios = require('axios');
const _ = require('lodash');


exports.paymentResultList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/vehicle_obj_list/payment_result_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });

    returnValue.status = resData.data.status;
    returnValue.docs = [];

    if((resData.data.status == 'ok')) {

      if(resData.data.docs) {

        const tempResData = make_payment_result_list_for_visitor_before_exit_and_send_it_to_web_client(resData.data.docs);

        // GTL 코드로 데이터 정리
        const resDocData = _.chain(tempResData)
        .sortBy('time') 		// least important property
        .sortBy('loop_event_time') 	// to most important property
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
    logger.error(`parkingFee/kioskLogsService.js, paymentResultList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/kioskLogsService.js, paymentResultList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: route/vehicleObjList.js 파일 내용
 * 
 * vehicle_obj_list : 받은 데이터
 */
const make_payment_result_list_for_visitor_before_exit_and_send_it_to_web_client = (vehicle_obj_list) => {
	
	var obj_including_vehicle_obj_list = {};		// loop_event_time가 동일한 vehicle_obj를 골라서 []를 만든다.
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(obj_including_vehicle_obj_list[''+vehicle_obj_list[i].loop_event_time]) {
			obj_including_vehicle_obj_list[''+vehicle_obj_list[i].loop_event_time].push(vehicle_obj_list[i]);
		}
		else {
			obj_including_vehicle_obj_list[''+vehicle_obj_list[i].loop_event_time] = [];
			obj_including_vehicle_obj_list[''+vehicle_obj_list[i].loop_event_time].push(vehicle_obj_list[i]);
		}
	}

	var vehicle_obj_list = [];				// 같은 loop_event_time을 가진 차량번호들 중 제일 많이 인식된 차량번호를 선택한다.
	for(var loop_event_time in obj_including_vehicle_obj_list) {
		var list = obj_including_vehicle_obj_list[''+loop_event_time];
		vehicle_obj_list.push(find_the_most_frequent_vehicle_obj(list));
	}

	return vehicle_obj_list;
}

const find_the_most_frequent_vehicle_obj = (vehicle_obj_list) => {
	var loop_event_time = vehicle_obj_list[0].loop_event_time;			
	var count_obj = {};
	for(var i = 0; i < vehicle_obj_list.length; i++) {			// 같은 loop_event_time을 가진 서로 다른 차량번호(lp)가 몇번씩 인식되었는지 계산한다.
		if(loop_event_time != vehicle_obj_list[i].loop_event_time) {
			break;
		}
		else {
			if(count_obj[vehicle_obj_list[i].lp]) {
				count_obj[vehicle_obj_list[i].lp]++;
			}
			else {
				count_obj[vehicle_obj_list[i].lp] = 1;
			};
		}
	}
	
	var max = 0;	
	var lp = 'Not_Recognized';						// 같은 loop_event_time을 가진 차량번호들 중 제일 많이 인식된 차량번호를 선택한다.
	for(var key in count_obj) {
		if(max < count_obj[key]) {
			if(key != 'Not_Recognized') {
				max = count_obj[key];
				lp = key;
			}
		}
	}
	for(var i = 0; i < vehicle_obj_list.length; i++) {			// 같은 loop_event_time을 가진 차량번호들 중 제일 많이 인식된 차량번호에 대해 계산된 주차요금을 선택한다.
		if(lp == vehicle_obj_list[i].lp) {
			return vehicle_obj_list[i];
		}
	}
	return vehicle_obj_list[0];
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/payment_result_list.js 파일 내용
 * 
 * docs : 받은 데이터
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 */
const display_docs = (docs, ip, port) => {

  let returnArray = []; 

  var lp_obj_list = {};
	let docs2 = []
	for(var i = 0; i < docs.length; i++) {
		if(lp_obj_list[docs[i].obj_in.loop_event_time]) {
			lp_obj_list[docs[i].obj_in.loop_event_time].push(docs[i]);
		}
		else {
			lp_obj_list[docs[i].obj_in.loop_event_time] = [];
			lp_obj_list[docs[i].obj_in.loop_event_time].push(docs[i]);
		}
	}
	let temp_obj;
	for(var loop_event_time in lp_obj_list) {
		//console.log("lp_obj_list : ", lp_obj_list)
		var lp_obj_sub_list = lp_obj_list[loop_event_time];
		//console.log("lp_obj_sub_list : ", lp_obj_sub_list)
		docs2.push(lp_obj_sub_list[lp_obj_sub_list.length-1])
		// if(lp_obj_sub_list.length === 1){
			// docs2.push(lp_obj_sub_list[lp_obj_sub_list.length-1])
		// }
		// else{
			// temp_obj = lp_obj_sub_list[lp_obj_sub_list.length-1]
			
			// for(let i = 0; i < lp_obj_sub_list.length-1; i++){
				// console.log("docs2 : ", lp_obj_sub_list[i].loop_event_time,lp_obj_sub_list[i+1].loop_event_time )
				// if(lp_obj_sub_list[i].loop_event_time < lp_obj_sub_list[i+1].loop_event_time){
					// temp_obj = lp_obj_sub_list[i+1];
				// }
			// }
			// docs2.push(temp_obj)
		// }
	}
	//console.log("docs2 : ", docs2)
	docs = docs2
  
	for(var i = 0; i < docs.length; i++) {
		let obj = docs[i];
		let obj1 = docs[i].obj_in;
		// if(obj.location !== "출차2"){
			// continue
		// }
		if(obj1.payment_list){
			
			for(let j = 0; j < obj1.payment_list.length; j++){
				
        let returnObj = {};
        returnObj.lp = obj.lp ? obj.lp : ''; // 차량번호
        returnObj.in_time = obj1.loop_event_time; // 입차시각
        returnObj.payment_time = obj1.payment_list[j].payment_time; // 결제 시각
        returnObj.paid_fee = obj1.payment_list[j].paid_fee ? obj1.payment_list[j].paid_fee : ' '; // 결제 금액
        returnObj.approvno = obj1.payment_list[j].payment_list.approvno ? obj1.payment_list[j].payment_list.approvno : ' '; // 승인번호
        returnObj.issuer = obj1.payment_list[j].payment_list.issuer; // 카드사
        returnObj.location = obj1.payment_list[j].location; // 장소
        returnObj.image = ''; // 차량사진
        if((obj.folder_name) && (obj.fname)) {
          returnObj.image = "http://" + ip + ":" + port + "/images/" + obj.folder_name + "/" + obj.fname;
        }
        
        returnArray.push(returnObj);
			} // for j
		} // if(obj1.payment_list)
	} // for i

  return returnArray;

} // display_docs