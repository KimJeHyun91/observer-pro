const logger = require('../../../logger');
const { pool } = require('../../../db/postgresqlPool');
const lprMapper = require('../mappers/lprMapper');
const { paydate_paytime } = require('../../../utils/greenParkingDateformat');

/**
 * 
 * @param {*} carInfo : pf_receive_lpr_log 테이블 내용(json)
 * @returns 
 */
exports.feeCalculationCheck = async (carInfo, reductionPolicyList) => {
  
  const client = await pool.connect();

  let returnValue = {};
  returnValue.parkingfee = -1;
  returnValue.discount_fee = 0;
  returnValue.reduction_name = carInfo.lp_type;
  returnValue.feetype = 999999;

  try {

    let resReductionPolicyList = [];

    let out_time_person = '';
    if(carInfo.out_time_person) {
      out_time_person = new Date(carInfo.out_time_person);
    } else {
      out_time_person = new Date();
    }
    
    let binds = [];
    let query = await lprMapper.getFeePolicy(); // 기본정책
    const resFeePolicy = await client.query(query, binds);
    
    // 파라미터값에 감면정책이 없으면
    if(!reductionPolicyList) {
      query = await lprMapper.getReductionPolicyList(); // 감면정책
      resReductionPolicyList = await client.query(query, binds);
    }
    
    // 사전 정산을 했으면
    if(carInfo.pre_paydate) {
      
      const payment_time_person = new Date(paydate_paytime(carInfo.pre_paydate, carInfo.pre_paytime));
      const diffMinutes = Math.ceil((out_time_person - payment_time_person) / (1000 * 60));
      
      // 요금정책에서 settlement_duration 시간 확인
      if(diffMinutes > Number(resFeePolicy.rows[0].settlement_duration)) {
        // 요금 납부했지만, 사전정산 후 시간이 지나서 출구 요금계산해야함
        // 기본정책 적용
        returnValue.parkingfee = feePolicyCalculation(resFeePolicy.rows[0], diffMinutes);
        returnValue.reduction_name = '일반차량';

      } else {
        // 요금 납부, 시간 안지남. 그냥 출차
        returnValue.parkingfee = 0;
      }

    } else {
      // 사전 정산을 안했으면 출구 요금계산
      const in_time_person = new Date(carInfo.in_time_person);
      const parkingMinutes = Math.ceil((out_time_person - in_time_person) / (1000 * 60));
      let feeMinutes = Number(parkingMinutes) - Number(resFeePolicy.rows[0].free_duration); // 주차시간 - 무료시간
      // console.log('parkingMinutes : ', parkingMinutes);
      
      // 주차요금 받아야 함
      if(feeMinutes > 0) {

        // 재계산
        if(reductionPolicyList) {

          returnValue = reFeeCalculation(resFeePolicy.rows, reductionPolicyList.rows, feeMinutes, returnValue);

        } else {
          // 출차할 때 계산
          returnValue = totalFeeCalculation(resFeePolicy.rows, resReductionPolicyList.rows, carInfo, feeMinutes, returnValue);
        }
        
      } else {
        // 무료시간 안에 출차함
        returnValue.parkingfee = 0;
      }
    }

    if(returnValue.parkingfee == 0) {
      returnValue.feetype = 0; // 정산할 주차요금 없음
    } else if(returnValue.parkingfee > 0) {

      returnValue.parkingfee = Math.ceil(returnValue.parkingfee / 100) * 100;
      returnValue.discount_fee = Math.floor(returnValue.discount_fee / 100) * 100;
      returnValue.feetype = 1; // 정산할 주차요금 있음
    } else {
      // parkingfee 가 -1 이면, 999999(주차요금 계산 불가)
      returnValue.parkingfee = 0;
    }
    
  } catch (error) {
    logger.error(`parkingFee/feeCalculation.js, feeCalculationCheck, error: `, error);
    console.log(`parkingFee/feeCalculation.js, feeCalculationCheck, error: `, error);
  } finally {
    client.release();
  }
  // console.log('returnValue : ', returnValue);
  return returnValue;
}
// 총 요금계산
const totalFeeCalculation = (resFeePolicy, resReductionPolicyList, carInfo, feeMinutes, returnValue) => {
  
  try {
    
    const basicFeePolicy = resFeePolicy[0];
    
    returnValue.reduction_name = carInfo.lp_type;

    // 일반차량이면
    if(carInfo.lp_type == '일반차량') {

      // 등록차량이 아니면(일반차량) 기본정책으로만 요금계산
      returnValue.parkingfee = feePolicyCalculation(basicFeePolicy, feeMinutes);

    } else {
      // 등록차량
      for(let i in resReductionPolicyList) {
        
        const reductionPolicy = resReductionPolicyList[i];

        // 등록차량 감면정책 확인
        if(carInfo.lp_type == reductionPolicy.reduction_name) {
          // console.log('total reductionPolicy : ', reductionPolicy.reduction_name);

          // 요금시간 - 감면시간 계산
          let resultMinutes = feeMinutes - Number(reductionPolicy.reduction_minute);
          // console.log('total resultMinutes : ', resultMinutes);

          // 요금시간이 더 크면 요금계산
          if(resultMinutes > 0) {

            // 감면된 요금시간으로 요금계산
            returnValue.parkingfee = feePolicyCalculation(basicFeePolicy, resultMinutes);
            if(Number(reductionPolicy.reduction_minute) > 0) {
              returnValue.discount_fee = returnValue.discount_fee + feePolicyCalculation(basicFeePolicy, Number(reductionPolicy.reduction_minute));
            }
            // console.log('1 total 감면시간 parkingfee : ', returnValue.parkingfee);
            // console.log('1 total 감면시간 discount_fee : ', returnValue.discount_fee);

            if(returnValue.parkingfee > 0) {

              // 주차요금 - 감면요금 적용
              const resultFee = returnValue.parkingfee - Number(reductionPolicy.reduction_fee);
              
              // console.log('2 total 감면시간 parkingfee : ', returnValue.parkingfee);
              // console.log('2 total 감면시간 discount_fee : ', returnValue.discount_fee);

              if(resultFee > 0) {
                // 주차요금 - (주차요금 * 감면 비율) 적용
                if(reductionPolicy.reduction_ratio > 0) {
                  let discountFee = (returnValue.parkingfee * (Number(reductionPolicy.reduction_ratio) / 100));
                  returnValue.parkingfee = returnValue.parkingfee - discountFee;
                  returnValue.discount_fee = returnValue.discount_fee + discountFee;
                  // console.log('3 total 감면시간 parkingfee : ', returnValue.parkingfee);
                  // console.log('3 total 감면시간 discount_fee : ', returnValue.discount_fee);
                }
              } else {
                // 요금계산 끝
                returnValue.discount_fee = returnValue.discount_fee + returnValue.parkingfee;
                returnValue.parkingfee = 0;
              }
            } // if(returnValue.parkingfee > 0)

          } else {
            // 감면 받음
            returnValue.parkingfee = 0;
            returnValue.discount_fee = feePolicyCalculation(basicFeePolicy, feeMinutes);
          }
          break;
        }
      } // for i
    }

  } catch (error) {
    logger.error(`parkingFee/feeCalculation.js, totalFeeCalculation, error: `, error);
    console.log(`parkingFee/feeCalculation.js, totalFeeCalculation, error: `, error);
  }
  
  return returnValue;
}

// 기본정책 계산
const feePolicyCalculation = (basicFeePolicy, feeMinutes) => {

  let parkingfee = -1;
  
  try {

    parkingfee = Math.ceil(feeMinutes / basicFeePolicy.std_duration) * basicFeePolicy.std_fee;
    
  } catch (error) {
    logger.error(`parkingFee/feeCalculation.js, feePolicyCalculation, error: `, error);
    console.log(`parkingFee/feeCalculation.js, feePolicyCalculation, error: `, error);
  }
  
  return parkingfee;

} // feePolicyCalculation

// 재계산 요금계산
const reFeeCalculation = (resFeePolicy, resReductionPolicyList, feeMinutes, returnValue) => {
  
  try {
    
    const basicFeePolicy = resFeePolicy[0];
    
    if(resReductionPolicyList.length > 0) {

      // 등록차량, 또는 수동할인
      for(let i in resReductionPolicyList) {
        
        const reductionPolicy = resReductionPolicyList[i];
        // console.log('re reductionPolicy : ', reductionPolicy.reduction_name);

        // 요금시간 - 감면시간 계산
        let resultMinutes = feeMinutes - Number(reductionPolicy.reduction_minute);
        // console.log('re resultMinutes : ', resultMinutes);

        // 요금시간이 더 크면 요금계산
        if(resultMinutes > 0) {

          // 감면정책 여러개일 경우, feeMinutes 변수를 위해서 적용
          feeMinutes = resultMinutes; 

          // 감면된 요금시간으로 요금계산, returnValue.parkingfee 초기값이 -1 로 첫번째만 기본정책적용
          if(returnValue.parkingfee == -1) {

            returnValue.parkingfee = feePolicyCalculation(basicFeePolicy, feeMinutes);
          }

          returnValue.discount_fee = returnValue.discount_fee + feePolicyCalculation(basicFeePolicy, Number(reductionPolicy.reduction_minute));
          // console.log('1 re감면시간 parkingfee : ', returnValue.parkingfee);
          // console.log('1 re감면시간 discount_fee : ', returnValue.discount_fee);

          if(returnValue.parkingfee > 0) {

            // 주차요금 - 감면요금 적용
            let resultFee = returnValue.parkingfee - Number(reductionPolicy.reduction_fee);

            if(resultFee > 0) {

              returnValue.parkingfee = resultFee;
              returnValue.discount_fee = returnValue.discount_fee + Number(reductionPolicy.reduction_fee);
              // console.log('2 re감면요금 parkingfee : ', returnValue.parkingfee);
              // console.log('2 re감면요금 discount_fee : ', returnValue.discount_fee);
              
              if(returnValue.parkingfee > 0) {
                // 주차요금 - (주차요금 * 감면 비율) 적용
                if(reductionPolicy.reduction_ratio > 0) {
    
                  let discountFee = (returnValue.parkingfee * (Number(reductionPolicy.reduction_ratio) / 100));
    
                  returnValue.parkingfee = returnValue.parkingfee - discountFee;
    
                  if(discountFee > 0) {
                    returnValue.discount_fee = returnValue.discount_fee + discountFee;
                  }
                  // console.log('3 re감면비율 parkingfee : ', returnValue.parkingfee);
                  // console.log('3 re감면비율 discount_fee : ', returnValue.discount_fee);
                }
              }

            } else {
              /**
               * 감면요금 적용해서 마이너스 값 나오면 끝
               */
              returnValue.discount_fee = returnValue.discount_fee + returnValue.parkingfee;
              returnValue.parkingfee = 0;
              break;
            }
          } // if(returnValue.parkingfee > 0)

        } else {
          /**
           * 감면시간 적용해서 마이너스 값 나오면 끝
           */
          // 감면된 요금시간으로 요금계산, returnValue.parkingfee 초기값이 -1 로 첫번째만 기본정책적용
          if(returnValue.parkingfee == -1) {

            returnValue.discount_fee = feePolicyCalculation(basicFeePolicy, feeMinutes);
            returnValue.parkingfee = 0;

          } else {

            returnValue.discount_fee = returnValue.discount_fee + returnValue.parkingfee;
            returnValue.parkingfee = 0;
          }

          break;
        }
      } // for i

    } else {
      // 재계산 할때, 값이 없을 경우, 기본정책 적용
      returnValue.parkingfee = feePolicyCalculation(basicFeePolicy, feeMinutes);
    }
    
    
  } catch (error) {
    logger.error(`parkingFee/feeCalculation.js, reFeeCalculation, error: `, error);
    console.log(`parkingFee/feeCalculation.js, reFeeCalculation, error: `, error);
  }
  
  return returnValue;
}