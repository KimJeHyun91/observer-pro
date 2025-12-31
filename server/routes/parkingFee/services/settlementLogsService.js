const logger = require('../../../logger');
const axios = require('axios');
const _ = require('lodash');


exports.getVehicleObjFeeList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/vehicle_obj_list/update_fee_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
    returnValue.docs = [];

    if(resData.data.status == 'ok') {

			 if(resData.data.docs) {

				// GTL 코드로 데이터 정리
				const resDocData = _.chain(resData.data.docs)
					.sortBy('loop_event_time') 	// to most important property
					.reverse()
					.value();
				const formatVehicleObjList = format_for_vehicle_obj_list_for_display(resDocData, ip, port);
				returnValue.docs = display_docs(formatVehicleObjList);

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
    logger.error(`parkingFee/settlementLogsService.js, getVehicleObjFeeList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/settlementLogsService.js, getVehicleObjFeeList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateVehicleObjFeeList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = baseUrl + '/vehicle_obj_list/update_fee_list';
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
    logger.error(`parkingFee/settlementLogsService.js, updateVehicleObjFeeList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/settlementLogsService.js, updateVehicleObjFeeList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/update_fee_list.js 파일 내용
 * 
 * docs : 받은 데이터
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 */
const format_for_vehicle_obj_list_for_display = (docs, ip, port) => {
  var vehicle_obj_list_for_display = []; // 정리된 값, 리턴
	// loop_event_time별로 모은다.
	var lp_obj_list = {};
	for(var i = 0; i < docs.length; i++) {
		if(lp_obj_list[docs[i].loop_event_time]) {
			lp_obj_list[docs[i].loop_event_time].push(docs[i]);
		}
		else {
			lp_obj_list[docs[i].loop_event_time] = [];
			lp_obj_list[docs[i].loop_event_time].push(docs[i]);
		}
	}

	// loop_event_time이 같은 vehicle_obj들 중에서 loop_event_time 대표할 vehicle_obj를 찾아서 표시한다.
	for(var loop_event_time in lp_obj_list) {
		var vehicle_obj_for_display = {};
		vehicle_obj_for_display.loop_event_time = parseInt(loop_event_time, 10);
		
		var lp_obj_sub_list = lp_obj_list[loop_event_time];

		if(lp_obj_sub_list[0].control_kind) {
			// console.log(loop_event_time, lp_obj_sub_list[0].control_kind)
			// continue;
		}
		var obj = find_vehicle_obj_based_on_obj_type(lp_obj_sub_list);
		// var obj = find_the_most_frequent_vehicle_obj(lp_obj_sub_list);
		vehicle_obj_for_display.obj = obj;
		
		var image_list = "";
		for(var i = 0; i < lp_obj_sub_list.length; i++) {
			image_list += "http://" + ip + ":" + port + "/images/"+lp_obj_sub_list[i].folder_name+"/"+lp_obj_sub_list[i].fname + " ";
		}
		if(obj.lp !== "Not_Recognized"){
			vehicle_obj_for_display.in_time = (obj.obj_in && obj.obj_in.loop_event_time);	//(obj.obj_in && obj.obj_in.loop_event_time ? obj.obj_in.loop_event_time : '');
		}
		vehicle_obj_for_display.out_time = obj.loop_event_time;
		obj.type = obj.lp_type;
		vehicle_obj_for_display.type = obj.type;					// (obj.type ? obj.type : '');
		vehicle_obj_for_display.lp = obj.lp;		// (obj.lp ? obj.lp : '');
		if(obj.fee == 99999 || obj.fee == 99998 ){
			obj.fee = 0;
		}
		
		vehicle_obj_for_display.fee = obj.fee;		// 잔여 주차요금 (typeof obj.fee == 'number' ? obj.fee : '?');
		vehicle_obj_for_display.total_fee = obj.total_fee;		// 잔여 주차요금 (typeof obj.fee == 'number' ? obj.fee : '?');
		let paid_fee = 0;
		if(obj.obj_in  && obj.obj_in.payment_list && obj.obj_in.payment_list){
			for(let i = 0; i < obj.obj_in.payment_list.length; i++){
				paid_fee += obj.obj_in.payment_list[i].paid_fee;
			}
		}
		vehicle_obj_for_display.paid_fee = paid_fee;		// 사전정산 주차요금 (typeof obj.paid_fee == 'number' ? obj.paid_fee : '?');		
		if(obj.obj_in && obj.obj_in.discounted_list){
			//console.log('obj.obj_in.discounted_list : ', obj.obj_in.discounted_list);
			//vehicle_obj_for_display.resident_fee = obj.obj_in.discounted_list[0].resident_fee;
			//vehicle_obj_for_display.id = obj.obj_in.discounted_list[0].id;
			//console.log('vehicle_obj_for_display.id : ', vehicle_obj_for_display.id);
		}		
		vehicle_obj_for_display.how_to_pay = (obj.how_to_pay);	// 지불방법 (obj.obj_in && (typeof obj.obj_in.discounted_duration == 'number')? Math.ceil(obj.obj_in.discounted_duration / 60 / 1000) : '');
		vehicle_obj_for_display.contents = obj.contents;				// 메모 (obj.contents ? obj.contents : '');
		vehicle_obj_list_for_display.push(vehicle_obj_for_display);
	}

  return vehicle_obj_list_for_display;
} // format_for_vehicle_obj_list_for_display

// 이 함수를 복사하여 다른 곳에서 사용하면 제대로 된다는 보장이 없다.
// 다른 .js 화일에 있는 함수 find_vehicle_obj_based_on_obj_type와 기능이 같지도 않다. *******
const find_vehicle_obj_based_on_obj_type = (vehicle_obj_list) => {

	// 출차차량 차번 == 등록차량 차번
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].type == '등록차량') {
			return vehicle_obj_list[i];
		}
	}

	// 방문차량
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].type == '방문차량') {
			return vehicle_obj_list[i];
		}
	}
	
	// 뭔지 모르겠는데 여기에 이르러 굳이 따지려면
	// 이영호는 주차요금이 있다면 주차요금이 작은 주차요금을 vehicle_obj를 택하겠다는 생각이다.
	var obj;
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(typeof vehicle_obj_list[i].fee == 'number') {
			if(!obj) {
				obj = vehicle_obj_list[i];
			}
			else if(obj && (obj.fee > vehicle_obj_list[i].fee)) {
				obj = vehicle_obj_list[i];
			}
		}
	}	
	if(obj) {
		return obj;
	}
	
	// 출차차량 차번 == 입차차량 차번
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].obj_in) {
			return vehicle_obj_list[i];
		}
	}
	
	obj = find_the_most_frequent_vehicle_obj(vehicle_obj_list);
	if(obj.type) {
	}
	else {
		if(obj.lp == 'Not_Recognized') {
			obj.type = '미인식차량';
		}
		else {
			obj.type = '일반차량';
		}
	}
	return obj;
} // find_vehicle_obj_based_on_obj_type

// vehicle_obj_list에서 가장 많이 인식된 차량번호를 포함하는 vehicle_obj를 return한다.
// 가장 많이 인식된 차량번호를 포함하는 vehicle_obj를 return한다.
// 이 함수 설명과 기능이 정말인지는 한번 더 확인해야 한다. ****************************
const find_the_most_frequent_vehicle_obj = (vehicle_obj_list) => {
	var loop_event_time = vehicle_obj_list[0].loop_event_time;			
	var count_obj = {};
	for(var i = 0; i < vehicle_obj_list.length; i++) {			// 같은 loop_event_time을 가진 서로 다른 차량번호(lp)가 몇번씩 인식되었는지 계산한다.
		if(loop_event_time != vehicle_obj_list[i].loop_event_time) {
			break;
		}
		else {
var obj = vehicle_obj_list[i];
// console.log('YHLEE @find ....', obj.loop_event_time, obj.lp, obj.fee);
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
} // find_the_most_frequent_vehicle_obj

const display_docs = (docs) => {

  let returnArray = []; // 정리된 값, 리턴

  var lp_obj_list = {};
	// console.log(" docs : ",  docs)
	let docs2 = []
	for(var i = 0; i < docs.length; i++) {
		if(docs[i].obj.obj_in){
			if(lp_obj_list[docs[i].obj.obj_in.loop_event_time]) {
				lp_obj_list[docs[i].obj.obj_in.loop_event_time].push(docs[i]);
			}
			else {
				lp_obj_list[docs[i].obj.obj_in.loop_event_time] = [];
				lp_obj_list[docs[i].obj.obj_in.loop_event_time].push(docs[i]);
			}
		}
		else{
			docs2.push(docs[i])
		}
	}
	let temp_obj;
	// console.log("lp_obj_list : ", lp_obj_list)
	for(var loop_event_time in lp_obj_list) {
	//	console.log("lp_obj_list : ", lp_obj_list)
		var lp_obj_sub_list = lp_obj_list[loop_event_time];
	//	console.log("lp_obj_sub_list : ", lp_obj_sub_list)
		//docs2.push(lp_obj_sub_list[lp_obj_sub_list.length-1])
		docs2.push(lp_obj_sub_list[0])
	}
	//docs = docs2;
	//console.log(" docs2 : ",  docs2, docs)
	docs2 = _.chain(docs2)
	.sortBy('loop_event_time') 	// to most important property
	.reverse()
	.value();
	// console.log(" docs2 : ",  docs2)
	docs = docs2

	// loop_event_time이 같은 vehicle_obj들 중에서 loop_event_time 대표할 vehicle_obj를 찾아서 표시한다. // 
	var history_loop_event_time=Date.now();
	var cnt = 0;
	var total_fee = 0;
	var total_paid_fee = 0;
	var total_free_time = 0;
	var total_fee_time = 0;
	let total_pre_paid_fee = 0;
	let coupon = ""
	let total_coupon = ""
	let pre_paid_fee = 0
	let total_coupon_value = 0
	let total_coupon_code = 0
	let parking_fee = 0
	let paid_fee = 0

	for(var i = 0; i < docs.length; i++) {
		parking_fee = 0
		paid_fee = 0
		cnt++;
		history_loop_event_time = docs[i].loop_event_time;		
		var obj = docs[i];
		obj.registered = obj.type;
		//console.log("obj : ", obj);
		if(!obj.contents){
			obj.contents = ""
		}
		if(obj.fee){
			if(typeof obj.fee === 'number'){
				total_fee += obj.fee;
			}	
			else{
				obj.fee = 0;
			}
		}
		if(obj && obj.obj.obj_in && obj.obj.obj_in.payment_list){
			for(let j = 0; j < obj.obj.obj_in.payment_list.length; j++){
				paid_fee += obj.obj.obj_in.payment_list[j].paid_fee
				if(obj.obj.obj_in.payment_list[j].location){
					obj.contents += " " + obj.obj.obj_in.payment_list[j].location
				}
			}
			total_paid_fee += paid_fee;
			parking_fee += paid_fee;
		}
		else{
			if(typeof obj.fee === 'number'){
				parking_fee += obj.fee
			}
		}
		
		let id = "";
		let fee_discounted_duration  = 0;
		let free_discounted_duration  = 0;
		let discouned_duration = 0
		if(obj && obj.obj.obj_in && obj.obj.obj_in.discounted_list){
			id = obj.obj.obj_in.discounted_list[0].room_id;
			free_discounted_duration = obj.obj.obj_in.discounted_list[0].free_discounted_duration;
			total_free_time += free_discounted_duration;
			fee_discounted_duration = 0;
			for(let k = 0; k < obj.obj.obj_in.discounted_list.length; k++){
				if( obj.obj.obj_in.discounted_list[k].fee_discounted_duration > 0){
					fee_discounted_duration += obj.obj.obj_in.discounted_list[k].fee_discounted_duration;							
				}
			}
			discouned_duration = free_discounted_duration + "," + fee_discounted_duration
			
			total_fee_time += fee_discounted_duration;
			// console.log("total_fee_time : ", total_fee_time, "fee_discounted_duration : ", fee_discounted_duration);
			// console.log("total_free_time : ", total_free_time, "free_discounted_duration : ", free_discounted_duration);
			
		}
		
		let coupon_value = 0;
		let coupon_code = 0;
		if(obj && obj.obj.obj_in && obj.obj.obj_in.coupon_list){
			// console.log("obj.obj.obj_in.coupon_list : ", obj.obj.obj_in.coupon_list)
			for(let j = 0; j < obj.obj.obj_in.coupon_list.length; j++){
				coupon_code +=  parseInt(obj.obj.obj_in.coupon_list[j].code, 10)
				coupon_value += obj.obj.obj_in.coupon_list[j].value
				if(obj.obj.obj_in.coupon_list[j].location){
					obj.contents += " " + obj.obj.obj_in.coupon_list[j].location
				}
				//console.log("obj.obj.obj_in.coupon_list coupon_value: ", coupon_value, obj.obj.obj_in.coupon_list[j].value )
			}
			//console.log("obj.obj.obj_in.coupon_list coupon_value: ", coupon_value)
			total_coupon_value += coupon_value
			if(paid_fee > 0){
				parking_fee += coupon_value
			}
			total_coupon_code += coupon_code
		}
		if(obj && obj.obj.obj_in && obj.obj.obj_in.pre_coupon_list){
			for(let j = 0; j < obj.obj.obj_in.pre_coupon_list.length; j++){
				coupon_code +=  parseInt(obj.obj.obj_in.pre_coupon_list[j].code, 10)
				coupon_value += obj.obj.obj_in.pre_coupon_list[j].value
				if(obj.obj.obj_in.pre_coupon_list[j].location){
					obj.contents += " " + obj.obj.obj_in.pre_coupon_list[j].location
				}
			}
			total_coupon_value += coupon_value
			total_coupon_code += coupon_code
		}
		coupon = "" + coupon_code + "(" + coupon_value + ")"
		total_coupon = "" + total_coupon_code + "(" + total_coupon_value + ")"
		pre_paid_fee = 0
		if(obj && obj.obj.obj_in && obj.obj.obj_in.pre_payment_list){
			for(let j = 0; j < obj.obj.obj_in.pre_payment_list.length; j++){
				pre_paid_fee +=  obj.obj.obj_in.pre_payment_list[j].paid_fee
				if(obj.obj.obj_in.pre_payment_list[j].location){
					obj.contents += " " + obj.obj.obj_in.pre_payment_list[j].location
				}
				
			}
			total_pre_paid_fee += pre_paid_fee
			parking_fee += pre_paid_fee
		}
		if(obj.total_fee){
			parking_fee = obj.total_fee
		}
		
		let returnObj = {};
		returnObj.in_time = obj.in_time ? obj.in_time : ' '; // 입차시각
		returnObj.out_time = obj.out_time; // 출차시각
		returnObj.registered = obj.registered; // 구분
		returnObj.lp = obj.lp; // 차량번호
		returnObj.parking_fee = obj.parking_fee; // 주차요금
		returnObj.paid_fee = obj.paid_fee; // 카드결제
		returnObj.discounted_duration = obj.discouned_duration; // 웹할인권(무료,유료)
		returnObj.coupon = obj.coupon; // 종이할인권
		returnObj.pre_paid_fee = obj.pre_paid_fee; // 사전정산
		returnObj.member_id = obj.id; // 입주사 ID
		returnObj.location = obj.location; // 장소
		returnObj.contents = obj.contents; // 메모

		returnArray.push(returnObj);

	} // for

  return returnArray;

} // display_docs