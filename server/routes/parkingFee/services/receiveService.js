const logger = require('../../../logger');
const { pool } = require('../../../db/postgresqlPool');
const crossingGateMapper = require('../mappers/crossingGateMapper');
const { format_time } = require('../../../utils/greenParkingDateformat');
const crossingGateService = require('./crossingGateService');
const lprMapper = require('../mappers/lprMapper');
const outsideMapper = require('../mappers/outsideMapper');
const feeCalculation = require('./feeCalculation');


exports.getVehicleDetInfo = async (reqBodyData, outside_ip) => {

  const client = await pool.connect();

  try {
    
    await client.query('BEGIN');

    

    
		
    await client.query('COMMIT');

  } catch (error) {
    logger.error(`parkingFee/receiveService.js, getVehicleDetInfo, error: `, error);
    console.log(`parkingFee/receiveService.js, getVehicleDetInfo, error: `, error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.getLprInfo = async (reqBodyData, outside_ip) => {
  
  const client = await pool.connect();

  try {
    
    let returnObj = {};
    returnObj.lp = reqBodyData.lp;
    returnObj.loop_event_time = Number(reqBodyData.loop_event_time);
    returnObj.ip = reqBodyData.ip;
    returnObj.port = reqBodyData.port;
    returnObj.direction = reqBodyData.direction;
    returnObj.location = reqBodyData.location;
    returnObj.fname = reqBodyData.fname;
    returnObj.folder_name = reqBodyData.folder_name;
    returnObj.image_url_header = reqBodyData.image_url_header;
    returnObj.kind = reqBodyData.kind;
    returnObj.image_url = '';
    returnObj.parking_location = '';
    returnObj.outside_idx = 0;
    returnObj.inside_idx = 0;
    returnObj.line_idx = 0;
    returnObj.ledd_ip = '';
    returnObj.ledd_port = '';
    returnObj.ledd_index = 0;
    returnObj.pt_ip = '';
    returnObj.pt_port = '';
    returnObj.loop_event_time_person = format_time(new Date(Number(reqBodyData.loop_event_time)));
    returnObj.outside_ip = outside_ip;
    returnObj.outside_port = '';
    returnObj.lp_type = '일반차량';

    let fee_calculation_result = {};
    fee_calculation_result.outside_idx = 0;
    fee_calculation_result.inside_idx = 0;
    fee_calculation_result.line_idx = 0;
    fee_calculation_result.ledd_ip = '';
    fee_calculation_result.ledd_port = '';
    fee_calculation_result.ledd_index = '';
    fee_calculation_result.outside_ip = outside_ip;
    fee_calculation_result.outside_port = '';
    fee_calculation_result.pt_ip = ''; // 정산기 ip
    fee_calculation_result.pt_port = 0; // 정산기 port
    fee_calculation_result.location = reqBodyData.location;
    fee_calculation_result.lp = reqBodyData.lp; // 차량번호
    fee_calculation_result.image_url = '';
    fee_calculation_result.in_time = 0;
    fee_calculation_result.in_time_person = '';
    fee_calculation_result.out_time = 0;
    fee_calculation_result.out_time_person = '';
    fee_calculation_result.parkingfee = 0;
    fee_calculation_result.discountfee = 0; // 할인금액 
    fee_calculation_result.reduction_name = '일반차량'; // 감면종류
    fee_calculation_result.feetype = 999999; // 1(정산할 주차요금 있음), 0(정산할 주차요금없음), 999999(주차요금 계산 불가)
    fee_calculation_result.prepayment = 0; // 사전정산 금액


    await client.query('BEGIN');

    let binds = [];
    let query = '';
    
    binds = [returnObj.lp];
    query = await lprMapper.getRegVehicleInfo();
    const resRegVehicleInfo = await client.query(query, binds);
    
    if((resRegVehicleInfo) && (resRegVehicleInfo.rows) && (resRegVehicleInfo.rows.length > 0)) {
      returnObj.lp_type = resRegVehicleInfo.rows[0].reduction_name;
    }

    binds = [
      outside_ip
      , reqBodyData.ip // 차단기 ip
      , reqBodyData.port // 차단기 port
    ];
    query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);

    // 차단기가 매핑 되어 있으면
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

      for(let i in resParkingLocationInfo.rows) {

        const parkingLocationInfo = resParkingLocationInfo.rows[i];

        // 방향이 같으면
        if(parkingLocationInfo.direction == returnObj.direction) {
          returnObj.image_url = 'http://' + outside_ip + ':' + parkingLocationInfo.outside_port + reqBodyData.image_url_header + reqBodyData.folder_name + '/' + reqBodyData.fname;
          returnObj.parking_location = parkingLocationInfo.outside_name + ' ' + parkingLocationInfo.inside_name + ' ' + parkingLocationInfo.line_name;
          returnObj.outside_idx = parkingLocationInfo.outside_idx;
          returnObj.inside_idx = parkingLocationInfo.inside_idx;
          returnObj.line_idx = parkingLocationInfo.line_idx;
          returnObj.ledd_ip = parkingLocationInfo.ledd_ip;
          returnObj.ledd_port = parkingLocationInfo.ledd_port;
          returnObj.ledd_index = parkingLocationInfo.ledd_index;
          returnObj.pt_ip = parkingLocationInfo.pt_ip;
          returnObj.pt_port = parkingLocationInfo.pt_port;
          returnObj.outside_port = parkingLocationInfo.outside_port;

          // 출차 요금계산
          fee_calculation_result.image_url = 'http://' + outside_ip + ':' + parkingLocationInfo.outside_port + reqBodyData.image_url_header + reqBodyData.folder_name + '/' + reqBodyData.fname;
          fee_calculation_result.outside_idx = parkingLocationInfo.outside_idx;
          fee_calculation_result.inside_idx = parkingLocationInfo.inside_idx;
          fee_calculation_result.line_idx = parkingLocationInfo.line_idx;
          fee_calculation_result.ledd_ip = parkingLocationInfo.ledd_ip;
          fee_calculation_result.ledd_port = parkingLocationInfo.ledd_port;
          fee_calculation_result.ledd_index = parkingLocationInfo.ledd_index;
          fee_calculation_result.pt_ip = parkingLocationInfo.pt_ip; // 정산기 ip
          fee_calculation_result.pt_port = parkingLocationInfo.pt_port; // 정산기 port
          fee_calculation_result.outside_port =parkingLocationInfo.outside_port;

          break;
        } // if(parkingLocationInfo.direction == returnObj.direction)
      } // for i
    } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0))

    // 입차
    if(returnObj.direction == 'in') {

      /**
       * 임시테이블에 저장
       */
      binds = [
        returnObj.lp // 차량번호
        , returnObj.loop_event_time // 입출차 시간(unix)
        , returnObj.loop_event_time_person // 입출차 시간(YYYY-MM-dd HH:mm:ss)
        , returnObj.ip // 차단기 ip
        , returnObj.port // 차단기 port
        , returnObj.direction // in, out
        , returnObj.location // ex) '입차1', '출차1'
        , returnObj.fname // 차량이미지 파일이름
        , returnObj.folder_name // 폴더 이름
        , returnObj.image_url_header // 이미지 헤더
        , returnObj.outside_ip // 주차장 ip
        , returnObj.kind // lpr
      ];
      query = await lprMapper.setReceiveLprTemp();
      await client.query(query, binds);

      /**
       * 입차 차량정보 저장
       * 미인식(Not_Recognized, Not_Recognition) 되었을 때도 우선은 저장
       */
      binds = [
        returnObj.lp // 차량번호
        , returnObj.lp_type // 차량타입(일반차량, 장애인 등등)
        , returnObj.loop_event_time // 입출차 시간(unix)
        , returnObj.loop_event_time_person // 입출차 시간(YYYY-MM-dd HH:mm:ss)
        , returnObj.ip // 차단기 ip
        , returnObj.port // 차단기 port
        , returnObj.direction // in, out
        , returnObj.location // ex) '입차1', '출차1'
        , returnObj.fname // 차량이미지 파일이름
        , returnObj.folder_name // 폴더 이름
        , returnObj.image_url_header // 이미지 헤더
        , returnObj.outside_ip // 주차장 ip
        , null // 비고
      ];
      query = await lprMapper.setReceiveLprInLog();
      await client.query(query, binds);

    } else {
      // 출차, 요금정산해서 소켓으로 보내기

      /**
       * 임시테이블에 저장
       */
      binds = [
        returnObj.lp // 차량번호
        , returnObj.loop_event_time // 입출차 시간(unix)
        , returnObj.loop_event_time_person // 입출차 시간(YYYY-MM-dd HH:mm:ss)
        , returnObj.ip // 차단기 ip
        , returnObj.port // 차단기 port
        , returnObj.direction // in, out
        , returnObj.location // ex) '입차1', '출차1'
        , returnObj.fname // 차량이미지 파일이름
        , returnObj.folder_name // 폴더 이름
        , returnObj.image_url_header // 이미지 헤더
        , returnObj.outside_ip // 주차장 ip
        , returnObj.kind // lpr
      ];
      query = await lprMapper.setReceiveLprTemp();
      await client.query(query, binds);
      
      /**
       * 차량번호로 입차정보 검색 후
       * 출차 차량정보 저장(업데이트): pf_receive_lpr_log
       * 입차정보 없으면 저장안함
       */
      binds = [returnObj.lp];
      query = await lprMapper.getLpVehicleInfo();
      const resOutVehicleInfo = await client.query(query, binds);

      if((resOutVehicleInfo) && (resOutVehicleInfo.rows) && (resOutVehicleInfo.rows.length > 0)) {
        
        // 미인식 = Not_Recognized, Not_Recognition 아니고, 출차 이력이 없을 때
        if(!resOutVehicleInfo.rows[0].lp.includes('Not') && (resOutVehicleInfo.rows[0].out_time == null)) {
          // 정상적으로 차량번호가 인식되었을 때
          binds = [
            returnObj.lp // 차량번호
            , resOutVehicleInfo.rows[0].in_time
  
            , returnObj.loop_event_time // 입출차 시간(unix)
            , returnObj.loop_event_time_person // 입출차 시간(YYYY-MM-dd HH:mm:ss)
            , returnObj.ip // 차단기 ip
            , returnObj.port // 차단기 port
            , returnObj.direction // in, out
            , returnObj.location // ex) '입차1', '출차1'
            , returnObj.fname // 차량이미지 파일이름
            , returnObj.folder_name // 폴더 이름
            , returnObj.image_url_header // 이미지 헤더
            
            , null // parking_fee
            , null // discount_fee
            , resOutVehicleInfo.rows[0].contents // 비고
          ];
          query = await lprMapper.setReceiveLprOutLog();
          const resultLprData = await client.query(query, binds); // 저장하고 리턴받음.
          
          // 출차 요금계산
          fee_calculation_result.in_time = Number(resultLprData.rows[0].in_time);
          fee_calculation_result.in_time_person = format_time(new Date(Number(resultLprData.rows[0].in_time)));
          fee_calculation_result.out_time = Number(returnObj.loop_event_time);
          fee_calculation_result.out_time_person = format_time(new Date(Number(returnObj.loop_event_time)));

          const feeResult = await feeCalculation.feeCalculationCheck(resultLprData.rows[0]); // 요금 계산(carInfo 만 전달)
          fee_calculation_result.parkingfee = feeResult.parkingfee;
          fee_calculation_result.discountfee = feeResult.discount_fee; // 할인금액 
          fee_calculation_result.reduction_name = feeResult.reduction_name; // 감면종류
          fee_calculation_result.feetype = feeResult.feetype; // 1(정산할 주차요금 있음), 0(정산할 주차요금없음), 999999(주차요금 계산 불가)

          fee_calculation_result.prepayment = 0; // 사전정산 금액
          if(resultLprData.rows[0].pre_parking_fee) {
            fee_calculation_result.prepayment = resultLprData.rows[0].pre_parking_fee; // 사전정산 금액
          }
          // console.log('fee_calculation_result : ', fee_calculation_result.lp);
          if(global.websocket) {
            global.websocket.emit("pf_fee_calculation_result-update", { lpr: { 'update': fee_calculation_result } });
          }

        } else {
          // 미인식은 전광판 
          let obj = {
            ip : returnObj.ledd_ip
            , port : returnObj.ledd_port
            , location : returnObj.location
            , direction : returnObj.direction
            , text1 : '5m 후진후' // 첫번째줄
            , text2 : '천천히재진입' // 두번째줄
            , ledd_index : returnObj.ledd_index // 전광판 인덱스
            , kind1 : 'ram'
          };
          
          await crossingGateService.setLeddDisplay(obj, outside_ip, returnObj.outside_port);
        }

      } // if((resInVehicleInfo) && (resInVehicleInfo.rows) && (resInVehicleInfo.rows.length > 0))
    }
    // console.log('returnObj : ', returnObj.lp);
    if(global.websocket) {
      global.websocket.emit("pf_lpr-update", { lpr: { 'update': returnObj } });
    }

    await client.query('COMMIT');

  } catch (error) {
    logger.error(`parkingFee/receiveService.js, getLprInfo, error: `, error);
    console.log(`parkingFee/receiveService.js, getLprInfo, error: `, error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.getGateState = async (reqBodyData, outside_ip) => {
  
  const client = await pool.connect();

  try {
    
    await client.query('BEGIN');

    let returnValue = {};

    let binds = [];
    let query = '';

    binds = [
      outside_ip
      , reqBodyData.ip
      , reqBodyData.port
    ];
    query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);

    if(reqBodyData.kind == 'gate_state') {

      // 차단기가 매핑 되어 있으면
      if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

        for(let i in resParkingLocationInfo.rows) {

          const parkingLocationInfo = resParkingLocationInfo.rows[i];

          if(parkingLocationInfo.location == reqBodyData.location) {

            returnValue = {
              outside_idx : parkingLocationInfo.outside_idx
              , outside_ip : parkingLocationInfo.outside_ip
              , inside_idx : parkingLocationInfo.inside_idx
              , line_idx : parkingLocationInfo.line_idx
              , crossing_gate_idx : parkingLocationInfo.crossing_gate_idx
              , crossing_gate_ip : parkingLocationInfo.crossing_gate_ip
              , crossing_gate_port : parkingLocationInfo.crossing_gate_port
              , direction : parkingLocationInfo.direction
              , location : reqBodyData.location
              , state : reqBodyData.state
            };
            
            // 차단기 상태값 다르면 업데이트
            if(parkingLocationInfo.status != reqBodyData.state) {

              binds = [
                parkingLocationInfo.crossing_gate_ip
                , parkingLocationInfo.crossing_gate_port
                , reqBodyData.location
                , reqBodyData.state
              ];
              query = await crossingGateMapper.updateCrossingGateStatusInfo();
              await client.query(query, binds);
            }

            /**
             * 임시테이블 삭제
             */
            if(reqBodyData.state == 'down') {
              
              binds = [
                reqBodyData.ip
                , reqBodyData.port
                , reqBodyData.location
              ];
              query = await lprMapper.getReceiveLprTempLocation();
              const resLpr = await client.query(query, binds);
              
              if((resLpr) && (resLpr.rows) && (resLpr.rows.length> 0)) {
                // 있으면 삭제
                query = await lprMapper.deleteReceiveLprTempLocation();
                await client.query(query, binds);
              }
              
              /**
               * 전광판 표시
               */
              let obj = {
                ip : parkingLocationInfo.ledd_ip
                , port : parkingLocationInfo.ledd_port
                , location : parkingLocationInfo.location
                , direction : parkingLocationInfo.direction
                , text1 : '어서오세요' // 첫번째줄
                , text2 : '천천히 진입' // 두번째줄
                , ledd_index : parkingLocationInfo.ledd_index // 전광판 인덱스
                , kind1 : 'flash'
              };
        
              await crossingGateService.setLeddDisplay(obj, outside_ip, parkingLocationInfo.outside_port);

            } // if(reqBodyData.state == 'down')

            break;
          } // if(parkingLocationInfo.location == reqBodyData.location)
        } // for i
      } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0))

    } // if(reqBodyData.kind == 'gate_state')
    ////////////////////////////////////////////////////////////////////////////////////////
    
    if(global.websocket) {
      global.websocket.emit("pf_gate_state-update", { gate_state: { 'update': returnValue } });
    }

    await client.query('COMMIT');

  } catch (error) {
    logger.error('parkingFee/receiveService.js, getGateState, error: ', error);
    console.log('parkingFee/receiveService.js, getGateState, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.getParkCarSearch = async (reqBodyData, outside_ip) => {

  const client = await pool.connect();

  try {
    
    let returnValue = {};
    returnValue.kind = reqBodyData.kind;
    returnValue.ip = reqBodyData.ip; // 정산기(pt) ip
    returnValue.port = reqBodyData.port; // 정산기(pt) port
    returnValue.location = reqBodyData.location; // 입차1, 출차1
    returnValue.cmd = 'PARK_SEARCH_RESULT';
    returnValue.resultno = 0;
    returnValue.car_list = [];

    if((reqBodyData.kind == 'payment') && (reqBodyData.cmd == 'PARK_CAR_SEARCH')) {

      let binds = [outside_ip];
      let query = await outsideMapper.getOutsideIpInfo();
      const resOutsideIpInfo = await client.query(query, binds);

      const nowDate = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(nowDate.getDate() - 30); // (임의설정)한달전까지 검색
      
      binds = [
        format_time(oneMonthAgo)
        , format_time(nowDate)
        , `%${reqBodyData.searchkey}%` // 4자리 숫자(차량번호), like 검색
      ];
      query = await lprMapper.getParkCarSearchList();
      const resParkCarSearchList = await client.query(query, binds);
      
      if((resParkCarSearchList) && (resParkCarSearchList.rows) && (resParkCarSearchList.rows.length > 0)) {

        returnValue.resultno = resParkCarSearchList.rows.length;

        for(let i in resParkCarSearchList.rows) {

          const carInfo = resParkCarSearchList.rows[i];
          
          let carObj = {};
          carObj.lp = carInfo.lp;
          carObj.in_time = Number(carInfo.in_time); // 입차시간(unix)
          const feeResult = await feeCalculation.feeCalculationCheck(carInfo); // 주차요금 확인
          carObj.parkingfee = feeResult.parkingfee;

          carObj.feetype = 999999; // 1(정산할 주차요금 있음), 0(정산할 주차요금없음), 999999(주차요금 계산 불가)
          if(carObj.parkingfee == 0) {
            carObj.feetype = 0; // 정산할 주차요금 없음
          } else if(carObj.parkingfee > 0) {
            carObj.feetype = 1; // 정산할 주차요금 있음
          } else {
            // carObj.parkingfee 가 -1 이면
            carObj.parkingfee = 0;
          }
          carObj.imgurl = 'none';
          
          if(carInfo.in_fname) { // 차량 이미지가 있으면
            if((resOutsideIpInfo) && (resOutsideIpInfo.rows) && (resOutsideIpInfo.rows.length > 0)) {
              // 주차장이 연결되어 있으면
              const outsideInfo = resOutsideIpInfo.rows[0];
              carObj.imgurl = 'http://' + outside_ip + ':' + outsideInfo.outside_port + carInfo.in_image_url_header + carInfo.in_folder_name + '/' + carInfo.in_fname;
            }
          }
          
          returnValue.car_list.push(carObj);

        } // for i
      }
    } // if(reqBodyData.kind == 'payment')
    
    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/receiveService.js, getParkCarSearch, error: `, error);
    console.log(`parkingFee/receiveService.js, getParkCarSearch, error: `, error);
  } finally {
    client.release();
  }
}
