const logger = require('../../../logger');
const { pool } = require('../../../db/postgresqlPool');
const axios = require('axios');
const feeCalculation = require('../services/feeCalculation');
const crossingGateMapper = require('../mappers/crossingGateMapper');
const lprMapper = require('../mappers/lprMapper');
const { format_time } = require('../../../utils/greenParkingDateformat');


exports.indexParkingFee = async (obj, ip, port) => {

  try {
    
    let returnValue = {};

    const baseUrl = 'http://' + ip + ':' + port;
    
    const url = new URL(`${baseUrl}/pt/${encodeURIComponent(obj.index)}/${encodeURIComponent(obj.fee)}`);

    const resData = await axios.get(url.href, {
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
    logger.error(`parkingFee/ptService.js, indexParkingFee, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/ptService.js, indexParkingFee, ${JSON.stringify(obj)}, error: `, error);

    return {
      status : 'error'
      , docs : String(error)
    };
  }
}

exports.paymentRequest = async (obj, outside_ip, outside_port) => {

  const client = await pool.connect();

  try {
    
    let returnValue = {};
    let requestObj = {};
    requestObj.kind = 'payment';
    
    let binds = [
      outside_ip
      , obj.crossing_gate_ip
      , obj.crossing_gate_port
    ];
    let query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);
    
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows) && (resParkingLocationInfo.rows.length > 0)) {

      for(let i in resParkingLocationInfo.rows) {

        const parkingLocationInfo = resParkingLocationInfo.rows[i];

        if(parkingLocationInfo.direction == 'out') {
          
          binds = [obj.lp]; // 차량번호 검색
          query = await lprMapper.getLpVehicleInfo();
          const resOutVehicleInfo = await client.query(query, binds);
          
          if((resOutVehicleInfo) && (resOutVehicleInfo.rows) && (resOutVehicleInfo.rows.length > 0)) {
            
            const carInfo = resOutVehicleInfo.rows[0];
            
            requestObj.ip = resParkingLocationInfo.rows[i].pt_ip;
            requestObj.port = resParkingLocationInfo.rows[i].pt_port;
            requestObj.location = resParkingLocationInfo.rows[i].location;
            requestObj.cmd = 'PARK_FEE_INFO';
            requestObj.lp = obj.lp;
            requestObj.in_time = Number(carInfo.in_time);
            requestObj.out_time = Number(carInfo.out_time);
            requestObj.parkingfee = obj.parking_fee;
            requestObj.feetype = 999999;

            if(requestObj.parking_fee == 0) {
              requestObj.feetype = 0; // 정산할 주차요금 없음
            } else if(requestObj.parking_fee > 0) {

              requestObj.feetype = 1; // 정산할 주차요금 있음
            } else {
              // parkingfee 가 -1 이면, 999999(주차요금 계산 불가)
              requestObj.parking_fee = 0;
            }
            
            // console.log('여기 paymentRequest, requestObj : ', requestObj);
            const baseUrl = 'http://' + outside_ip + ':' + outside_port;
            // const url = new URL(`${baseUrl}/pt/${encodeURIComponent(obj.index)}/${encodeURIComponent(obj.fee)}`);
            const url = baseUrl + '/여기';
            const resData = await axios.post(url, requestObj, {
              timeout: 10 * 1000
            });
            // console.log('여기 paymentRequest, resData.data : ', resData.data);
            
            if((resData.data) && (resData.data.kind == 'payment')) {
              
              if(resData.data.cmd == 'PARK_FEE_DONE') {
                // 정상 결제
                returnValue.status = 'ok';
                returnValue.docs = resData.data;

                let returnPayment = resData.data;
                if(carInfo.discount_fee) {
                  // 사전정산으로 이미 할인금액이 있으면
                  returnPayment.discount_fee = carInfo.discount_fee;
                } else {
                  // 사전정산으로 이미 할인금액이 없으면 이번에 할인 받음
                  returnPayment.discount_fee = obj.discount_fee;
                }

                // receive_lpr_log 결제 정보 저장(update)
                binds = [
                  requestObj.lp
                  , requestObj.in_time

                  , returnPayment.parkingfee + (typeof carInfo.parking_fee === 'number' ? carInfo.parking_fee : 0) // 주차요금
                  , returnPayment.discount_fee
                  , returnPayment.paytype // 1 : "IC카드", 2: "MS카드", 3:"RF카드"
                  , returnPayment.restype // 'typeB'(정상결제),     typeA(비정상적인 결제) 
                  , returnPayment.cardinfo // 결제카드정보(번호)
                  , returnPayment.approvno // 결제 승인번호
                  , returnPayment.paydate // 결제 승인날짜
                  , returnPayment.paytime // 결제 승인시간
                  , returnPayment.memberid // 가맹점 번호
                  , returnPayment.termid // 결제단말기 번호
                  , returnPayment.issuer // 결제카드 발급사명
                  , returnPayment.acquirer // 결제 매입사명
                ];
                query = await lprMapper.setReceiveLprPaymentLog();
                await client.query(query, binds);
              }

            } else {

              if(resData.data.message) {

                returnValue.docs = resData.data.message;

              } else {
                returnValue.status = 'ng';
                returnValue.docs = '주차 관제 서버 오류';
              }
            }

          } // if((resOutVehicleInfo) && (resOutVehicleInfo.rows) && (resOutVehicleInfo.rows.length > 0))
        }
      } // for i
      
    } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows) && (resParkingLocationInfo.rows.length > 0))
    
    return returnValue;

  } catch (error) {
    logger.error(`parkingFee/ptService.js, paymentRequest, ${JSON.stringify(obj)}, error: `, error);
    console.log(`parkingFee/ptService.js, paymentRequest, ${JSON.stringify(obj)}, error: `, error);
  } finally {
    client.release();
  }
}

exports.getReFeeCalculation = async (outside_ip, outside_port, crossing_gate_ip, crossing_gate_port, lp, reduction_name) => {
  
  const client = await pool.connect();

  try {

    let reductionNameList = [];
    
    if((reduction_name) && (reduction_name.trim().length > 0)) {
      reductionNameList = reduction_name.split(',').map(s => `%${s.trim()}%`); // ex) ['%경차%', '%장애인%']
    } 
    
    let binds = [lp];
    let query = await lprMapper.getLpVehicleInfo(); // 차량번호 검색
    const resOutVehicleInfo = await client.query(query, binds);
    
    let resReductionPolicyList = {};
    resReductionPolicyList.rows = [];
    if(reductionNameList.length > 0) {

      binds = [reductionNameList];
      query = await lprMapper.getReductionPolicySearchList(); // 감면정책 배열로 검색
      resReductionPolicyList = await client.query(query, binds);
    }
    
    binds = [
      outside_ip
      , crossing_gate_ip
      , crossing_gate_port
    ];
    
    query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);
    
    let fee_calculation_result = {}; // 계산결과, 리턴값
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows) && (resParkingLocationInfo.rows.length > 0)) {

      for(let i in resParkingLocationInfo.rows) {

        const parkingLocationInfo = resParkingLocationInfo.rows[i];

        if(parkingLocationInfo.direction == 'out') {
          
          fee_calculation_result.outside_idx = parkingLocationInfo.outside_idx;
          fee_calculation_result.inside_idx = parkingLocationInfo.inside_idx;
          fee_calculation_result.line_idx = parkingLocationInfo.line_idx;
          fee_calculation_result.ledd_ip = parkingLocationInfo.ledd_ip;
          fee_calculation_result.ledd_port = parkingLocationInfo.ledd_port;
          fee_calculation_result.ledd_index = parkingLocationInfo.ledd_index;
          fee_calculation_result.outside_ip = parkingLocationInfo.outside_ip;
          fee_calculation_result.outside_port = parkingLocationInfo.outside_port;
          fee_calculation_result.pt_ip = parkingLocationInfo.pt_ip; // 정산기 ip
          fee_calculation_result.pt_port = parkingLocationInfo.pt_port; // 정산기 port
          fee_calculation_result.location = parkingLocationInfo.location;
          fee_calculation_result.lp = lp; // 차량번호
          fee_calculation_result.image_url = ''; // 차량 이미지
          
          fee_calculation_result.parkingfee = 0;
          fee_calculation_result.discountfee = 0;
          fee_calculation_result.reduction_name = reduction_name;
          fee_calculation_result.feetype = 999999; // 1(정산할 주차요금 있음), 0(정산할 주차요금없음), 999999(주차요금 계산 불가)
          fee_calculation_result.prepayment = 0; // 사전정산 금액
        }
      } // for
    }
    // 차량검색된 결과가 있으면
    if((resOutVehicleInfo) && (resOutVehicleInfo.rows) && (resOutVehicleInfo.rows.length > 0)) {

      let carInfo = resOutVehicleInfo.rows[0];
      carInfo.lp_type = reduction_name;
      
      const resFeeCalculation = await feeCalculation.feeCalculationCheck(carInfo, resReductionPolicyList);
      fee_calculation_result.parkingfee = resFeeCalculation.parkingfee;
      fee_calculation_result.discountfee = resFeeCalculation.discount_fee;
      fee_calculation_result.feetype = resFeeCalculation.feetype;

      if(resOutVehicleInfo.rows[0].paydate) {
        fee_calculation_result.prepayment = resOutVehicleInfo.rows[0].parking_fee; // 사전정산 금액
      }

      fee_calculation_result.in_time = Number(resOutVehicleInfo.rows[0].in_time);
      fee_calculation_result.in_time_person = resOutVehicleInfo.rows[0].in_time_person;

      if(resOutVehicleInfo.rows[0].out_time) {
        fee_calculation_result.out_time = Number(resOutVehicleInfo.rows[0].out_time);
        fee_calculation_result.out_time_person = resOutVehicleInfo.rows[0].out_time_person;
      } else {
        // 출차시간 없으면 현재시간 적용
        fee_calculation_result.out_time = new Date().getTime();
        fee_calculation_result.out_time_person = format_time(new Date());
      }

      fee_calculation_result.image_url = 'http://' + outside_ip + ':' + outside_port + carInfo.out_image_url_header + carInfo.out_folder_name + '/' + carInfo.out_fname;

    } // if((resOutVehicleInfo) && (resOutVehicleInfo.rows) && (resOutVehicleInfo.rows.length > 0))
    
    return fee_calculation_result;

  } catch (error) {
    logger.error('parkingFee/ptService.js, getReFeeCalculation, error: ', error);
    console.log('parkingFee/ptService.js, getReFeeCalculation, error: ', error);
  } finally {
    client.release();
  }
}