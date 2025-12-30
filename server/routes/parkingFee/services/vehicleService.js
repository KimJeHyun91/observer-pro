const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const lprMapper = require('../mappers/lprMapper');
const { format_time, format_date } = require('../../../utils/greenParkingDateformat');
const crossingGateMapper = require('../mappers/crossingGateMapper');
const crossingGateService = require('../services/crossingGateService');


exports.setManualLprInLogInfo = async (outside_ip, crossing_gate_ip, crossing_gate_port, lp, lp_type, contents) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let res = [];

    let binds = [
      outside_ip
      , crossing_gate_ip // 차단기 ip
      , crossing_gate_port // 차단기 port
    ];
    let query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);

    // 차단기가 매핑 되어 있으면
    if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

      for(let i in resParkingLocationInfo.rows) {

        const parkingLocationInfo = resParkingLocationInfo.rows[i];

        // 입차, in 고정값
        if(parkingLocationInfo.direction == 'in') {

          binds = [
            lp // 차량번호
            , lp_type // 차량타입(일반차량, 장애인 등등)
            , new Date().getTime() // 입출차 시간(unix)
            , format_time(new Date()) // 입출차 시간(YYYY-MM-dd HH:mm:ss)
            , crossing_gate_ip // 차단기 ip
            , crossing_gate_port // 차단기 port
            , parkingLocationInfo.direction // in, out
            , parkingLocationInfo.location // ex) '입차1', '출차1'
            , null // 차량이미지 파일이름
            , null // 폴더 이름
            , null // 이미지 헤더
            , outside_ip // 주차장 ip
            , contents // 비고
          ];
          query = await lprMapper.setReceiveLprInLog();
          res = await client.query(query, binds);
          
          // 차단기 제어
          let obj = {};
          obj.kind = 'control';
          obj.location = parkingLocationInfo.location;
          obj.gate_control = 'up';
          obj.loop_event_time = new Date().getTime(); // 현재시각(unix)

          await crossingGateService.control(obj, outside_ip, parkingLocationInfo.outside_port);

          // 전광판 제어
          
          break;
        }
      } // for i
    } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0))

    await client.query('COMMIT');

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, setManualLprInLogInfo, error: ', error);
    console.log('parkingFee/vehicleService.js, setManualLprInLogInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.setManualLprOutLogInfo = async (outside_ip, crossing_gate_ip, crossing_gate_port, lp, parking_fee, discount_fee, contents) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let res = [];

    let binds = [
      outside_ip
      , crossing_gate_ip // 차단기 ip
      , crossing_gate_port // 차단기 port
    ];
    let query = await crossingGateMapper.getParkingLocationInfo();
    const resParkingLocationInfo = await client.query(query, binds);

    binds = [lp]; // 차량번호 검색
    query = await lprMapper.getLpVehicleInfo();
    const resVehicleInfo = await client.query(query, binds);

    // 차량번호가 검색되면
    if((resVehicleInfo) && (resVehicleInfo.rows.length > 0)) {

      // 차단기가 매핑 되어 있으면
      if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0)) {

        for(let i in resParkingLocationInfo.rows) {

          const parkingLocationInfo = resParkingLocationInfo.rows[i];

          // 출차, out 고정값
          if(parkingLocationInfo.direction == 'out') {

            binds = [
              lp // 차량번호
              , resVehicleInfo.rows[0].in_time // 입차시간

              , new Date().getTime() // 입출차 시간(unix)
              , format_time(new Date()) // 입출차 시간(YYYY-MM-dd HH:mm:ss)
              , crossing_gate_ip // 차단기 ip
              , crossing_gate_port // 차단기 port
              , parkingLocationInfo.direction // in, out
              , parkingLocationInfo.location // ex) '입차1', '출차1'
              , null // 차량이미지 파일이름
              , null // 폴더 이름
              , null // 이미지 헤더
              , parking_fee
              , discount_fee
              , contents // 비고
            ];
            query = await lprMapper.setReceiveLprOutLog();
            res = await client.query(query, binds);
            
            // 차단기 제어
            let obj = {};
            obj.kind = 'control';
            obj.location = parkingLocationInfo.location;
            obj.gate_control = 'up';
            obj.loop_event_time = new Date().getTime(); // 현재시각(unix)

            await crossingGateService.control(obj, outside_ip, parkingLocationInfo.outside_port);

            // 전광판 제어

            break;
          }
        } // for i
      } // if((resParkingLocationInfo) && (resParkingLocationInfo.rows.length > 0))

    }

    await client.query('COMMIT');

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, setManualLprOutLogInfo, error: ', error);
    console.log('parkingFee/vehicleService.js, setManualLprOutLogInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.getVehicleList = async (outside_ip, start_date, end_date, lp) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      start_date + ' 00:00:00'
      , end_date + ' 23:59:59'
      , outside_ip
    ];
    let query = '';
    
    if((lp) && (lp.length > 0)) {
      const regLp = lp.replace(/[^a-zA-Z0-9가-힣\s]/g, ''); // 영문/숫자/한글만 남김
      binds.push('%' + regLp + '%');
      query = await lprMapper.getReceiveLprBasicLpList(); // 날짜 범위 + 차량번호

    } else {

      query = await lprMapper.getReceiveLprBasicList(); // 기본 날짜 범위 검색
    }

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getVehicleList, error: ', error);
    console.log('parkingFee/vehicleService.js, getVehicleList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getLpCurrentSituation = async (outside_ip, start_date, end_date) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      start_date + ' 00:00:00'
      , end_date + ' 23:59:59'
      , outside_ip
    ];
    
    let query = await lprMapper.getLpCurrentSituation();
    
    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getLpCurrentSituation, error: ', error);
    console.log('parkingFee/vehicleService.js, getLpCurrentSituation, error: ', error);
  } finally {
    await client.release();
  }
}

exports.updateReceiveLprLpTypeInfo = async (in_time, lp, lp_type) => {
  
  const client = await pool.connect();

  try {

    let binds = [in_time, lp, lp_type];
    let query = await lprMapper.updateReceiveLprLpTypeInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, updateReceiveLprLpTypeInfo, error: ', error);
    console.log('parkingFee/vehicleService.js, updateReceiveLprLpTypeInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getLpPaymentDetailList = async (outside_ip, start_date, end_date, lp) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      start_date + ' 00:00:00'
      , end_date + ' 23:59:59'
      , outside_ip
      , lp
    ];
    let query = await lprMapper.getLpPaymentDetailList();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getLpPaymentDetailList, error: ', error);
    console.log('parkingFee/vehicleService.js, getLpPaymentDetailList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getLpPaymentDetailInfo = async (lp, in_time) => {
  
  const client = await pool.connect();

  try {

    let binds = [
      lp
      , in_time
    ];
    let query = await lprMapper.getLpPaymentDetailInfo();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getLpPaymentDetailInfo, error: ', error);
    console.log('parkingFee/vehicleService.js, getLpPaymentDetailInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getDailyRevenue = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let binds = [outside_ip];
    let query = await lprMapper.getDailyRevenue();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getDailyRevenue, error: ', error);
    console.log('parkingFee/vehicleService.js, getDailyRevenue, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getTotalRevenue = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let binds = [outside_ip];
    let query = await lprMapper.getTotalRevenue();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getTotalRevenue, error: ', error);
    console.log('parkingFee/vehicleService.js, getTotalRevenue, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getDailyLpTypeRatio = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let today = format_date(new Date());
    
    let binds = [
      today + ' 00:00:00'
      , today + ' 23:59:59'
      , outside_ip
    ];
    let query = await lprMapper.getDailyLpTypeRatio();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getDailyLpTypeRatio, error: ', error);
    console.log('parkingFee/vehicleService.js, getDailyLpTypeRatio, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getDailyTimeFlow = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let today = format_date(new Date());
    
    let binds = [
      today + ' 00:00:00'
      , today + ' 23:59:59'
      , outside_ip
    ];
    let query = await lprMapper.getDailyTimeFlow();

    const res = await client.query(query, binds);
    
    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getDailyTimeFlow, error: ', error);
    console.log('parkingFee/vehicleService.js, getDailyTimeFlow, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getFloatingVehicle = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let returnValue = [];

    const viewCount = 4; //  5개의 행을 보여주려면 4, 4개의 행을 보여주려면 3 ...
    
    let binds = [
      viewCount
      , outside_ip
    ];
    let query = await lprMapper.getDailyFloatingVehicle();
    const resDailyFloatingVehicle = await client.query(query, binds);
    
    query = await lprMapper.getWeeksFloatingVehicle();
    const resWeeksFloatingVehicle = await client.query(query, binds);

    query = await lprMapper.getMonthsFloatingVehicle();
    const resMonthsFloatingVehicle = await client.query(query, binds);

    // 유동차량 일 단위로 반복문, viewCount 의 개수를 모두 같게 했기 때문에 결과 행의 갯수 같음
    for(let i in resDailyFloatingVehicle.rows) {
      
      const dailyFloatingVehicle = resDailyFloatingVehicle.rows[i]; // 일 단위
      const weeksFloatingVehicle = resWeeksFloatingVehicle.rows[i]; // 주 단위
      const monthsFloatingVehicle = resMonthsFloatingVehicle.rows[i]; // 월 단위
      
      let returnObj = {};
      returnObj.seq = dailyFloatingVehicle.seq;

      // 일 단위
      returnObj.date_series = dailyFloatingVehicle.date_series;
      returnObj.in_date_count = dailyFloatingVehicle.in_date_count;
      returnObj.out_date_count = dailyFloatingVehicle.out_date_count;

      // 주 단위
      returnObj.week_start = weeksFloatingVehicle.week_start;
      returnObj.week_end = weeksFloatingVehicle.week_end;
      returnObj.in_week_count = weeksFloatingVehicle.in_week_count;
      returnObj.out_week_count = weeksFloatingVehicle.out_week_count;

      // 월 단위
      returnObj.month_start = monthsFloatingVehicle.month_start;
      returnObj.month_end = monthsFloatingVehicle.week_end;
      returnObj.in_month_count = monthsFloatingVehicle.in_month_count;
      returnObj.out_month_count = monthsFloatingVehicle.out_month_count;

      returnValue.push(returnObj);
    }

    return returnValue;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getFloatingVehicle, error: ', error);
    console.log('parkingFee/vehicleService.js, getFloatingVehicle, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCurrentMonthUsageRate = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    const viewCount = 4; //  5개의 행을 보여주려면 4, 4개의 행을 보여주려면 3 ...
    
    let binds = [
      viewCount
      , outside_ip
    ];
    let query = await lprMapper.getCurrentMonthUsageRate();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/vehicleService.js, getCurrentMonthUsageRate, error: ', error);
    console.log('parkingFee/vehicleService.js, getCurrentMonthUsageRate, error: ', error);
  } finally {
    await client.release();
  }
}