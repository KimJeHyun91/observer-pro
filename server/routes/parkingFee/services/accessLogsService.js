const logger = require('../../../logger');
const axios = require('axios');
const { pool } = require('../../../db/postgresqlPool');
const crossingGateMapper = require('../mappers/crossingGateMapper');
const _ = require('lodash');


exports.getVehicleObjList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/vehicle_obj_list/update_vehicle_obj_list';
    const resData = await axios.post(url, obj, {
      timeout: 10 * 1000
    });
    
		returnValue.status = resData.data.status;
		returnValue.docs = [];

		if(resData.data.status == 'ok') {

			if(resData.data.docs) {

				// GTL 코드로 데이터 정리
				const resDocData = _.chain(resData.data.docs)
					.sortBy('time') 		// least important property
					.sortBy('loop_event_time') 	// to most important property
					.reverse()
					.value();
      	const docs = format_for_vehicle_obj_list_for_display(resDocData, ip, port);
				returnValue.docs = display_docs(docs);

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
    logger.error(`parkingFee/accessLogsService.js, getVehicleObjList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/accessLogsService.js, getVehicleObjList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.updateVehicleObjList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/vehicle_obj_list/update_vehicle_obj_list';
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
    logger.error(`parkingFee/accessLogsService.js, updateVehicleObjList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/accessLogsService.js, updateVehicleObjList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.setVehicleObjList = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/vehicle_obj_list/update_vehicle_obj_list';
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
    logger.error(`parkingFee/accessLogsService.js, setVehicleObjList, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/accessLogsService.js, setVehicleObjList, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.vehicleLpr = async (reqBodyData, outside_ip) => {
  
  const client = await pool.connect();
	
  try {
    
    await client.query('BEGIN');

    let binds = [
      outside_ip
      , reqBodyData.ip // 차단기 ip
      , reqBodyData.port // 차단기 port
    ];
    let query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);
		
    // 차단기가 매핑 되어 있으면
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

			let receivedObjData = {};
			receivedObjData.lp = reqBodyData.lp; // 차량번호

			for(let i in resParkingLocationInfo.rows) {

				const parkingLocationInfo = resParkingLocationInfo.rows[i];

				// 입차
				if(parkingLocationInfo.direction == 'in') {

					receivedObjData.kind = reqBodyData.kind;
					receivedObjData.direction = reqBodyData.direction; // in, out
					receivedObjData.location = reqBodyData.location; // ex) '입차1', '출차1'
					receivedObjData.image = 'http://' + outside_ip + ':' + parkingLocationInfo.outside_port + '/images/' + reqBodyData.folder_name + '/' + reqBodyData.fname;
					receivedObjData.loop_event_time = reqBodyData.loop_event_time; // 입출차 시간(unix)
					receivedObjData.lp = reqBodyData.lp; // 차량번호
					receivedObjData.registered = reqBodyData.registered; // 등록 상태
					receivedObjData.lp_type = reqBodyData.lp_type; // 차량구분= 일반차량 등등 
					receivedObjData.ip = reqBodyData.ip; // 차단기 ip
					receivedObjData.port = reqBodyData.port; // 차단기 port
					receivedObjData.gate_index = reqBodyData.gate_index; // gtl config.js 의 gate_index
					receivedObjData.ledd_index = reqBodyData.ledd_index; // gtl config.js 의 ledd_index
					receivedObjData.pt_index = reqBodyData.pt_index; // gtl config.js 의 pt_index
					receivedObjData.outside_ip = outside_ip;
					receivedObjData.outside_idx = parkingLocationInfo.outside_idx;
					receivedObjData.inside_idx = parkingLocationInfo.inside_idx;
					receivedObjData.line_idx = parkingLocationInfo.line_idx;
					
					const parkingLocation = parkingLocationInfo.outside_name + ' ' + parkingLocationInfo.inside_name + ' ' + parkingLocationInfo.line_name;
					receivedObjData.parking_location = parkingLocation; // 주차장 위치
				}

			} // for i
						
      // 입차, 데이터 저장
      if(receivedObjData.direction == 'in') {

        binds = [
					receivedObjData.lp // 차량번호
					, receivedObjData.loop_event_time // 입출차 시간(unix)

          , receivedObjData.kind
          , receivedObjData.direction // in, out
          , receivedObjData.location // ex) '입차1', '출차1'
          , receivedObjData.image // 
					
          , receivedObjData.registered // 등록 상태
          , receivedObjData.lp_type // 차량구분: 일반차량 등등 
          , receivedObjData.ip // 차단기 ip
          , receivedObjData.port // 차단기 port
          , receivedObjData.parking_location // 주차장 위치
    
          , receivedObjData.gate_index // gtl config.js 의 gate_index
          , receivedObjData.ledd_index // gtl config.js 의 ledd_index
          , receivedObjData.pt_index // gtl config.js 의 pt_index
    
          , receivedObjData.outside_ip
        ];
        query = `
				INSERT INTO 
				pf_receive_lpr_temp (
					lp
					, loop_event_time
					, kind
					, direction
					, location
					, image
					, registered
					, lp_type
					, ip
					, port
					, parking_location
					, gate_index
					, ledd_index
					, pt_index
					, outside_ip
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15 
				);
				`;
        await client.query(query, binds);

      } else {
        // 출차, 데이터 삭제
				binds = [receivedObjData.lp];
				query = `
				SELECT count(*) FROM 
					pf_receive_lpr_temp
				WHERE
					lp = $1;
				`;
				const resLpr = await client.query(query, binds);
				if((resLpr) && (resLpr.rows.length> 0) && (resLpr.rows[0].count > 0)) {
					// 차량번호가 있으면 삭제
					query = `
					DELETE FROM
						pf_receive_lpr_temp
					WHERE
						lp = $1;
					`;
					await client.query(query, binds);
				}
      }

      if(global.websocket) {
        global.websocket.emit("pf_lpr-update", { lpr: { 'update': receivedObjData } });
      }
      
    } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

    await client.query('COMMIT');

  } catch (error) {
    logger.error('parkingFee/accessLogsService.js, vehicleLpr, error: ', error);
    console.log('parkingFee/accessLogsService.js, vehicleLpr, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.vehicleFeeCalculationResult = async (reqBodyData, outside_ip) => {
  
  const client = await pool.connect();

  try {
    
    let binds = [
      outside_ip
      , reqBodyData.ip
      , reqBodyData.port
    ];
    let query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);

    // 차단기가 매핑 되어 있으면
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

			let receivedObjData = {};

			for(let i in resParkingLocationInfo.rows) {

				const parkingLocationInfo = resParkingLocationInfo.rows[i];

				// 출차
				if(parkingLocationInfo.direction == 'out') {
					
					receivedObjData.kind = reqBodyData.kind;
					receivedObjData.direction = reqBodyData.direction; // out
					receivedObjData.location = reqBodyData.location; // ex) '출차1'
					receivedObjData.contents = reqBodyData.contents; // 비고
					receivedObjData.image = 'http://' + outside_ip + ':' + parkingLocationInfo.outside_port + '/images/' + reqBodyData.folder_name + '/' + reqBodyData.fname;
					receivedObjData.loop_event_time = reqBodyData.loop_event_time; // 출차 시간(unix)
					receivedObjData.lp = reqBodyData.lp; // 차량번호
					receivedObjData.registered = reqBodyData.registered; // 등록 상태
					receivedObjData.lp_type = reqBodyData.lp_type; // 차량구분= 일반차량 등등 
					receivedObjData.ip = reqBodyData.ip; // 차단기 ip
					receivedObjData.port = reqBodyData.port; // 차단기 port
					receivedObjData.gate_index = reqBodyData.gate_index ? reqBodyData.gate_index : reqBodyData.index; // gtl config.js 의 gate_index
					receivedObjData.ledd_index = reqBodyData.ledd_index; // gtl config.js 의 ledd_index
					receivedObjData.pt_index = reqBodyData.pt_index; // gtl config.js 의 pt_index
					receivedObjData.fee = reqBodyData.fee; // 요금
					receivedObjData.total_fee = reqBodyData.total_fee; // 총 요금
					if(reqBodyData.obj_in) {
						receivedObjData.obj_in = {
							kind : reqBodyData.obj_in.kind
							, direction : reqBodyData.obj_in.direction // in, out
							, location : reqBodyData.obj_in.location // ex) '입차1', '출차1'
							, image : 'http://' + outside_ip + ':' + parkingLocationInfo.outside_port + '/images/' + reqBodyData.obj_in.folder_name + '/' + reqBodyData.obj_in.fname
							, loop_event_time : reqBodyData.obj_in.loop_event_time // 입출차 시간(unix)
							, lp : reqBodyData.obj_in.lp // 차량번호
							, registered : reqBodyData.obj_in.registered // 등록 상태
							, lp_type : reqBodyData.obj_in.lp_type // 차량구분: 일반차량 등등 
							, ip : reqBodyData.obj_in.ip // 차단기 ip
							, port : reqBodyData.obj_in.port // 차단기 port
							, gate_index : reqBodyData.obj_in.gate_index // gtl config.js 의 gate_index
							, ledd_index : reqBodyData.obj_in.ledd_index // gtl config.js 의 ledd_index
							, pt_index : reqBodyData.obj_in.pt_index // gtl config.js 의 pt_index
							, payment_list: reqBodyData.obj_in.payment_list
						}
					} // if(reqBodyData.obj_in)
					receivedObjData.outside_ip = outside_ip
					
					const parkingLocation = parkingLocationInfo.outside_name + ' ' + parkingLocationInfo.inside_name + ' ' + parkingLocationInfo.line_name;
					receivedObjData.parking_location = parkingLocation; // 주차장 위치
					
				}
			}
			
      if(global.websocket) {
				global.websocket.emit("pf_fee_cal_result-update", { fee_cal_result: { 'update': receivedObjData } });
			}
      
    } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

  } catch (error) {
    logger.error('parkingFee/accessLogsService.js, vehicleFeeCalculationResult, error: ', error);
    console.log('parkingFee/accessLogsService.js, vehicleFeeCalculationResult, error: ', error);
  } finally {
    client.release();
  }
}

/**
 * GTL 출력값 정리? 로직
 * GTL서버: /public/javascripts/update_vehicle_obj_list.js 파일 내용
 * 
 * docs : 받은 데이터
 * ip : 주차장(outside) ip
 * port : 주차장(outside) port
 * 
 * image_list: ip:port 추가, 문자열에서 배열로 변경, 확인필요
 */
const format_for_vehicle_obj_list_for_display = (docs, ip, port) => {

  //console.log("docs1 : ", docs1, docs)
	let vehicle_obj_list_for_display = [];
	
	// loop_event_time별로 모은다.
	var lp_obj_list = {};
	for(var i = 0; i < docs.length; i++) {		
		if(lp_obj_list[docs[i].loop_event_time]) {
			lp_obj_list[docs[i].loop_event_time].push(docs[i]);
//console.log("1 이상 : " , lp_obj_list[docs[i].loop_event_time][1].loop_event_time, lp_obj_list[docs[i].loop_event_time][1].fname);		
		}
		else {
			lp_obj_list[docs[i].loop_event_time] = [];
			lp_obj_list[docs[i].loop_event_time].push(docs[i]);
//console.log("0 : " , lp_obj_list[docs[i].loop_event_time][0].loop_event_time, lp_obj_list[docs[i].loop_event_time][0].fname);			
		}
	}
	
	
	// loop_event_time이 같은 vehicle_obj들 중에서 loop_event_time 대표할 vehicle_obj를 찾는다.
	for(var loop_event_time in lp_obj_list) {
		var vehicle_obj_for_display = {};
		vehicle_obj_for_display.loop_event_time = parseInt(loop_event_time, 10);
		
		var lp_obj_sub_list = lp_obj_list[loop_event_time];

		if(lp_obj_sub_list[0].control_kind) {
			// console.log(loop_event_time, lp_obj_sub_list[0].control_kind)
			// continue;
		}
		
		var obj = find_vehicle_obj_based_on_obj_type(lp_obj_sub_list);
		vehicle_obj_for_display.obj = obj;
		
		var image_list = [];
		for(var i = 0; i < lp_obj_sub_list.length; i++) {
			const imageUrl = "http://" + ip + ":" + port + "/images/" + lp_obj_sub_list[i].folder_name + "/" + lp_obj_sub_list[i].fname;
			image_list.push(imageUrl);
//console.log("image_list	: ", image_list);
		}
		obj.type = obj.registered;
		if(obj.direction == 'in') {
		//	vehicle_obj_for_display.type = (obj.discounted_duration ? '방문차량' : '');
			vehicle_obj_for_display.id = (obj.id ? obj.id : '');
		}
		else {
		//	vehicle_obj_for_display.type = (obj.type ? obj.type : '');
			vehicle_obj_for_display.id = (obj.obj_in && obj.obj_in.id ? obj.obj_in.id : '');
		}
		vehicle_obj_for_display.type = obj.type;
		vehicle_obj_for_display.location = (obj.direction ? obj.location : '');
		vehicle_obj_for_display.direction = (obj.direction ? obj.direction : '');
		vehicle_obj_for_display.lp = (obj.lp ? obj.lp : '');
		vehicle_obj_for_display.contents = (obj.contents ? obj.contents : '');
		vehicle_obj_for_display.image_list = image_list;
		vehicle_obj_list_for_display.push(vehicle_obj_for_display);
			
	}

  return vehicle_obj_list_for_display;
}

// 이 함수를 복사하여 다른 곳에서 사용하면 제대로 된다는 보장이 없다.
// 다른 .js 화일에 있는 함수 find_vehicle_obj_based_on_obj_type와 기능이 같지도 않다. ********
const find_vehicle_obj_based_on_obj_type = (vehicle_obj_list) => {
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].loop_event_time == 1546923033904){
			console.log("daehwoan112 : ", i, vehicle_obj_list[i].lp, vehicle_obj_list[i].type );
		}		
	}	
	// 출차차량 차번 == 등록차량 차번
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].type == '등록차량') {
			return vehicle_obj_list[i];
		}
	}

	// 방문차량
	// for(var i = 0; i < vehicle_obj_list.length; i++) {
		// if(vehicle_obj_list[i].type == '방문차량') {
			// return vehicle_obj_list[i];
		// }
	// }
	for(var i = 0; i < vehicle_obj_list.length; i++) {
		if(vehicle_obj_list[i].loop_event_time == 1546923033904){
			console.log("daehwoan112 : ", i, vehicle_obj_list[i].lp);
		}
		if(vehicle_obj_list[i].lp != 'Not_Recognized'){
			return vehicle_obj_list[i];
		}
	}	
	return vehicle_obj_list[0];	
	// 뭔지 모르겠는데 여기에 이르러 굳이 따지려면
	// 이영호는 주차요금이 있다면 주차요금이 작은 주차요금을 vehicle_obj를 택하겠다는 생각이다.
	// var obj;
	// for(var i = 0; i < vehicle_obj_list.length; i++) {
	// 	if(typeof vehicle_obj_list[i].fee == 'number') {
	// 		if(!obj) {
	// 			obj = vehicle_obj_list[i];
	// 		}
	// 		else if(obj && (obj.fee > vehicle_obj_list[i].fee)) {
	// 			obj = vehicle_obj_list[i];
	// 		}
	// 	}
	// }	
	// if(obj) {
	// 	return obj;
	// }
	
	// // 출차차량 차번 == 입차차량 차번
	// for(var i = 0; i < vehicle_obj_list.length; i++) {
	// 	if(vehicle_obj_list[i].obj_in) {
	// 		return vehicle_obj_list[i];
	// 	}
	// }
	
	// obj = find_the_most_frequent_vehicle_obj(vehicle_obj_list);
	// if(obj.type) {
	// }
	// else {
	// 	if(obj.lp == 'Not_Recognized') {
	// 		obj.type = '미인식차량';
	// 	}
	// 	else {
	// 		obj.type = '일반차량';
	// 	}
	// }
	// return obj;
}

const display_docs = (docs) => {
	
	let returnValue = [];

	// loop_event_time이 같은 vehicle_obj들 중에서 loop_event_time 대표할 vehicle_obj를 찾아서 표시한다.
	var history_loop_event_time=Date.now();
	for(var i = 0; i < docs.length; i++) {
		if(!docs[i].lp){
			continue;
		}
		if(docs[i].lp == 'Not_Recognized' && (history_loop_event_time - docs[i].loop_event_time  < 5 * 1000)){
			history_loop_event_time = docs[i].loop_event_time;
			//continue;
		}
		
		history_loop_event_time = docs[i].loop_event_time;
		var obj = docs[i];
		
/*
		if(obj.direction == 'out'){
//console.log(obj.direction);
//console.log(obj.obj.fname);	
//console.log(obj.obj.fname.indexOf('_1_00'));		
			if(obj.obj.fname.indexOf('_00_1') == -1){
				
				continue;
			}
		}
		if(obj.direction == 'in'){
			if((obj.obj.fname.indexOf('_00_0') == -1) && (obj.obj.fname.indexOf('_00_2') == -1) ){
				continue;
			}
		}
*/

		let returnObj = {};
		returnObj.loop_event_time = obj.loop_event_time; // 차량출입시각(PC, unix time) 
		returnObj.type = obj.type; // 구분
		returnObj.location = obj.location; // 장소
		returnObj.direction = obj.direction; // 방향
		returnObj.lp = obj.lp; // 차량번호
		returnObj.contents = obj.contents; // 메모
		returnObj.image_list = obj.image_list; // 이미지 리스트

		returnValue.push(returnObj);

	} // for i

	return returnValue;
}