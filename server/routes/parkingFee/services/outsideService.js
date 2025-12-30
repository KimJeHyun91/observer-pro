const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const insideMapper = require('../mappers/insideMapper');
const lineMapper = require('../mappers/lineMapper');
const crossingGateMapper = require('../mappers/crossingGateMapper');
// const parkingFeeSocketClient = require('../../../worker/parkingFee/parkingFeeSocketClient');
const axios = require('axios');

const parkingIntervalTimeout = 60; // 상태체크 timeout(단위: 초)
const parkingStatusClose = 'lock'; // 운영 종료


exports.getParkingList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    let query = await outsideMapper.getOutsideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/outsideService.js, getParkingList, error: ', error);
    console.log('parkingFee/outsideService.js, getParkingList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getParkingInfo = async (outside_ip) => {
  
  const client = await pool.connect();

  try {

    let binds = [outside_ip];
    let query = await outsideMapper.getOutsideIpInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.error('parkingFee/outsideService.js, getParkingInfo, error: ', error);
    console.log('parkingFee/outsideService.js, getParkingInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.setParkingInfo = async (outside_name, outside_ip, outside_port) => {
  
  const client = await pool.connect();

  try {

    let returnValue = [];
    
    let binds = [
      outside_name
      , outside_ip
      , outside_port
    ];
    let query = await outsideMapper.setOutsideInfo();

    await client.query('BEGIN');
    const res = await client.query(query, binds);

    // 주차장 저장성공
    if((res) && (res.rows.length > 0)) {

      // GTL 서버에서 차단기 config 내용 가져오기
      const configInfo = await getConfigInfo(outside_ip, outside_port);
      
      if((configInfo) && (configInfo.length > 0)) {
        
        for(let i in configInfo) {

          binds = [configInfo[i].ip, configInfo[i].port, configInfo[i].direction];
          query = await crossingGateMapper.getCrossingGateIpInfo();
          const resCrossingGateList = await client.query(query, binds);
          
          // 이미 저장된 차단기 정보가 없으면
          if((resCrossingGateList) && (resCrossingGateList.rows) && (resCrossingGateList.rows.length == 0)) {

            binds = [
              configInfo[i].ip
              , configInfo[i].port
              , configInfo[i].gate_index
              , configInfo[i].ledd_index
              , configInfo[i].pt_index
              , configInfo[i].direction
              , configInfo[i].location
              , configInfo[i].ledd_ip
              , configInfo[i].ledd_port
              , configInfo[i].pt_ip
              , configInfo[i].pt_port
            ];
            query = await crossingGateMapper.setCrossingGateInfo();

            await client.query(query, binds);
          }

        } // for i

        if((res) && (res.rows) && (res.rows.length > 0) && (global.websocket)) {
          global.websocket.emit("pf_parkings-update", { parkingList: { 'add': res.rows.length } });
        }

        returnValue = res.rows;

      } else { // if((configInfo) && (configInfo.length > 0))
        // config 정보 못가져오면
        await client.query('ROLLBACK');
      }

    } // if((res) && (res.rows.length > 0))
    
    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.error('parkingFee/outsideService.js, setParkingInfo, error: ', error);
    console.log('parkingFee/outsideService.js, setParkingInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

exports.updateParkingInfo = async (outside_idx, outside_name, outside_ip, outside_port, status) => {
  
  const client = await pool.connect();

  try {
    
    let returnValue = 0;

    let binds = [];
    let query = '';

    await client.query('BEGIN');

    // GTL 서버에서 config 내용 가져오기
    const configInfo = await getConfigInfo(outside_ip, outside_port);

    if((configInfo) && (configInfo.length > 0)) {
      
      for(let i in configInfo) {

        let innerBinds = [configInfo[i].ip, configInfo[i].port, configInfo[i].direction];
        let innerQuery = await crossingGateMapper.getCrossingGateIpInfo();
        const resCrossingGateList = await client.query(innerQuery, innerBinds);

        // 이미 저장된 차단기 정보가 없으면
        if((resCrossingGateList) && (resCrossingGateList.rows) && (resCrossingGateList.rows.length == 0)) {
          
          innerBinds = [
            configInfo[i].ip
            , configInfo[i].port

            , configInfo[i].gate_index
            , configInfo[i].ledd_index
            , configInfo[i].pt_index
            , configInfo[i].direction
            , configInfo[i].location
            , configInfo[i].ledd_ip
            , configInfo[i].ledd_port
            , configInfo[i].pt_ip
            , configInfo[i].pt_port
          ];
          innerQuery = await crossingGateMapper.setCrossingGateInfo();

          await client.query(innerQuery, innerBinds);
        }
      } // for i

      binds = [
        outside_idx
        , outside_name
        , outside_ip
        , outside_port
        , status
      ];
      query = await outsideMapper.updateOutsideInfo();
      const res = await client.query(query, binds);
      returnValue = res.rowCount;
      
      if((returnValue) && (returnValue > 0) && (global.websocket)) {
        global.websocket.emit("pf_parkings-update", { parkingList: { 'update': returnValue } });
      }
    } // if((configInfo) && (configInfo.length > 0))

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.error('parkingFee/outsideService.js, updateParkingInfo, error: ', error);
    console.log('parkingFee/outsideService.js, updateParkingInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteParkingInfo = async (outside_idx) => {
  
  const client = await pool.connect();

  try {

    await client.query('BEGIN');

    let binds = [];
    let query = '';

    binds = [outside_idx];
    query = await insideMapper.getInsideList();
    const resInsideList = await client.query(query, binds);

    // 층 정보가 있으면
    if((resInsideList) && (resInsideList.rows)) {

      let insideList = [];

      for(let i in resInsideList.rows) {
        insideList.push(resInsideList.rows[i].idx); // inside_idx
      }

      binds = [insideList];
      query = await lineMapper.getLineAnyList(); // inside_idx 배열로 라인 검색
      const resLineAnyList = await client.query(query, binds);

      // 라인 정보가 있으면
      if((resLineAnyList) && (resLineAnyList.rows)) {

        let lineList = [];

        for(let i in resLineAnyList.rows) {
          lineList.push(resLineAnyList.rows[i].idx); // line_idx
        }

        binds = [lineList];
        query = await crossingGateMapper.getLineCrossingGateAnyList(); // line_idx 배열로 차단기 idx 검색
        const resLineCrossingGateList = await client.query(query, binds);

        // 라인-차단기 매핑 정보가 있으면
        if((resLineCrossingGateList) && (resLineCrossingGateList.rows)) {

          for(let i in resLineCrossingGateList.rows) {

            binds = [resLineCrossingGateList.rows[i].crossing_gate_idx, false];
            query = await crossingGateMapper.updateCrossingGateUsedInfo(); // 차단기 사용상태 false
            await client.query(query, binds);
          }
        } // if((resLineCrossingGateList) && (resLineCrossingGateList.rows))

      } // if((resLineAnyList) && (resLineAnyList.rows))

    } // if((resInsideList) && (resInsideList.rows))
    
    binds = [outside_idx];
    query = await outsideMapper.deleteOutsideInfo();
    const res = await client.query(query, binds);

    // if(res.rowCount > 0) {
    //   await parkingFeeSocketClient.removeSocket(outside_ip);
    // }

    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("pf_parkings-update", { parkingList: { 'remove': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.error('parkingFee/outsideService.js, deleteParkingInfo, error: ', error);
    console.log('parkingFee/outsideService.js, deleteParkingInfo, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}


/**
 * 
 * GTL 서버에서 config 내용 가져오기
 */
const getConfigInfo = async (ip, port) => {
  
  let returnValue = [];

  try {

    const reqObj = {
      kind : 'get_config'
    };
    
    const baseUrl = 'http://' + ip + ':' + port;

    const url = baseUrl + '/config';
    const resData = await axios.post(url, reqObj, {
      timeout: 5 * 1000
    });
    
    if((resData.data) && (resData.data.status) && (resData.data.status == 'ok')) {

      if(resData.data.docs) {

        const iotb_list = resData.data.docs.iotb_list;
        const ledd_list = resData.data.docs.ledd_list;
        const pt_list = resData.data.docs.pt_list;

        // 차단기(iotb_list) 정보가 있으면
        if((resData.data.docs) && (resData.data.docs.iotb_list)) {
          
          for(let i in iotb_list) {

            let iotbData = iotb_list[i];
            
            let tempObj = {};
            
            if(iotbData.loop1) {
              
              tempObj.ip = iotbData.ip;
              tempObj.port = iotbData.port;
  
              tempObj.gate_index = iotbData.loop1.gate_index;
              tempObj.ledd_index = iotbData.loop1.ledd_index;
              tempObj.pt_index = iotbData.loop1.pt_index;
              tempObj.direction = iotbData.loop1.direction; //  in, out
              tempObj.location = iotbData.loop1.location; // 입차1, 입차2 등등
  
              tempObj.ledd_ip = '';
              tempObj.ledd_port = '';
              if(ledd_list.length > 0) {
                tempObj.ledd_ip = ledd_list[iotbData.loop1.ledd_index].ip;
                tempObj.ledd_port = ledd_list[iotbData.loop1.ledd_index].port;
              }
              
              tempObj.pt_ip = '';
              tempObj.pt_port = '';
              if((typeof(iotbData.loop1.pt_index) == 'number') && (iotbData.loop1.payment == 'yes')) {
                tempObj.pt_ip = pt_list[iotbData.loop1.pt_index].ip;
                tempObj.pt_port = pt_list[iotbData.loop1.pt_index].port;
              }
              
              returnValue.push(tempObj);

            } // if(data.loop1)

            if((iotbData.loop3) && (iotbData.loop3.location) && (iotbData.loop3.direction)) {
              
              tempObj = {};
              tempObj.ip = iotbData.ip;
              tempObj.port = iotbData.port;
  
              tempObj.gate_index = iotbData.loop3.gate_index;
              tempObj.ledd_index = iotbData.loop3.ledd_index;
              tempObj.pt_index = iotbData.loop3.pt_index;
              tempObj.direction = iotbData.loop3.direction; //  in, out
              tempObj.location = iotbData.loop3.location; // 출차1 등등
  
              tempObj.ledd_ip = '';
              tempObj.ledd_port = '';
              if(ledd_list.length > 0) {
                tempObj.ledd_ip = ledd_list[iotbData.loop3.ledd_index].ip;
                tempObj.ledd_port = ledd_list[iotbData.loop3.ledd_index].port;
              }

              tempObj.pt_ip = '';
              tempObj.pt_port = '';
              if((typeof(iotbData.loop3.pt_index) == 'number') && (iotbData.loop3.payment == 'yes')) {
                tempObj.pt_ip = pt_list[iotbData.loop3.pt_index].ip;
                tempObj.pt_port = pt_list[iotbData.loop3.pt_index].port;
              }
              
              returnValue.push(tempObj);
  
            } // if(data.loop3)

          } // for i

        } // if((resData.data.docs) && (resData.data.docs.iotb_list))
      } // if(resData.data.docs)

    } else {
      // ststus = 'ng' 일때
      returnValue = resData.data;
    }

  } catch (error) {
    logger.error('parkingFee/outsideService.js, getConfigInfo, error: ', error);
    console.log('parkingFee/outsideService.js, getConfigInfo, error: ', error);
  }

  return returnValue;
}

const getParkingFeeListStatus = async() => {

  try {
    
    const res = await this.getParkingList();
    
    // 주차장이 검색되면...
    for(let i in res) {
      
      const outside_idx = res[i].idx;
      const outside_name = res[i].outside_name;
      const outside_ip = res[i].outside_ip;
      const outside_port = res[i].outside_port;
      let status = res[i].status;
      let currentStatus = ''; // 연결 확인 후, 상태

      // 주차장 운영종료가 아니면(정상 운영이면), 상태 체크하기.
      if(status != parkingStatusClose) {

        const configInfo = await getConfigInfo(outside_ip, outside_port);

        if((configInfo) && (configInfo.length > 0)) {
          
          currentStatus = 'normal';

        } else {
          currentStatus = 'error';
        }
        
        if(status != currentStatus) {
          
          await this.updateParkingInfo(outside_idx, outside_name, outside_ip, outside_port, currentStatus);

          const emitData = {
            status : currentStatus
            , idx : outside_idx
          };
  
          if(global.websocket) {
            global.websocket.emit("pf_parking_status-update", { parking_status: { 'update': emitData } });
          }
        }

      } // if(res[i].status != parkingStatusClose)
      
    } // for

  } catch (error) {
    console.log(`parkingFee/outsideService.js, getParkingFeeListStatus, error : `, error);
    logger.error(`parkingFee/outsideService.js, getParkingFeeListStatus, error : `, error);
  }
}

exports.getParkingFeeListInit = async() => {
  await getParkingFeeListStatus();
}

let parkingInterval = null;
clearInterval(parkingInterval);
// 1분마다 주차장 소켓 연결확인(gtl 서버 소켓 확인)
parkingInterval = setInterval(async() => {
  await getParkingFeeListStatus();
}, 1 * 1000 * parkingIntervalTimeout);