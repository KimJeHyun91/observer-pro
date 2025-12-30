const logger = require('../../logger');
const net = require("net");
const parkingFeeService = require('../../routes/parkingFee/services/outsideService');
const crossingGateService = require('../../routes/parkingFee/services/crossingGateService');

const retrySeconds = 5 * 1000;
const maxRetryCount = 3;  // 최대 재시도 횟수
const parkingIntervalTimeout = 60;
const socketTimeout = (60 + 30); // 주차장 상태 체크보다 30초 많게 설정함.

const parkingStatusClose = 'lock';

// ip, socket 저장 배열
let ipSocketArray = [];

/**
 * 
 * @param {*} ipaddress : 서버 ip
 * @param {*} socket_port : socket_port
 * @param {*} port : port (서버 port)
 * @returns 
 */
// tcp 소켓 연결
exports.connectTcp = async(ipaddress, socket_port, port) => {
  
  try {
    
    const ipSocket = ipSocketArray.find((item) => item.ipaddress === ipaddress);
    
    let socket = null;
    if(!ipSocket) {
      socket = net.connect({
        host: ipaddress,
        port: socket_port
      });
    }

    return await waitForResponse(ipaddress, socket_port, socket, port);

  } catch (error) {
    console.log(`parkingFeeSocketClient.js, connectTcp(${ipaddress}), error : `, error);
    logger.error(`parkingFeeSocketClient.js, connectTcp(${ipaddress}), error : `, error);
    return error;
  }
}

const waitForResponse = async(ipaddress, socket_port, socket, port) => {
  
  return new Promise((resolve, reject) => {
    
    socket.on('connect', async() => {
      // console.log(`parkingFeeSocketClient.js, TCP client connected(${socket.address().address})`);
            ipSocketArray = ipSocketArray.filter((item) => item.ipaddress !== ipaddress);
      ipSocketArray.push({ ipaddress, socket_port, socket });
      
      resolve('normal');

      await fn_parkingStatus('normal');
    });

    let receivedStrData = '';
    let start_index = -1;
    let end_index = -1;

    socket.on('data', async(data) => {
      // console.log(`parkingFeeSocketClient.js, TCP client ${ipaddress} Received data: ${data}`);
      
      receivedStrData += data.toString();
      
      start_index = receivedStrData.indexOf("#####");
      end_index = receivedStrData.indexOf("$$$$$");
      
      // 데이터 받기 완료이면...
      if((start_index == 0) && (end_index > 0) && (start_index < end_index)) {
        
        try {
          
          const receivedObjData = JSON.parse(receivedStrData.slice(5, -5)); // 앞에 5글자 '#####', 뒤에 5글자 '$$$$$' 제외하고 json으로 만듬.
          
          let returnData = {};

          const resParkingLocationInfo = await crossingGateService.getParkingLocationInfo(ipaddress, receivedObjData.ip, receivedObjData.port);
          
          // 차단기가 매핑 되어 있으면
          if((resParkingLocationInfo) && (resParkingLocationInfo.length > 0)) {

            const parkingLocation = resParkingLocationInfo[0].outside_name + ' ' + resParkingLocationInfo[0].inside_name + ' ' + resParkingLocationInfo[0].line_name;

            /**
             * 입출차 데이터
             */
            if((receivedObjData) && (receivedObjData.kind == 'lpr')) {
              
              returnData = {
                kind : receivedObjData.kind
                , direction : receivedObjData.direction // in, out
                , location : receivedObjData.location // ex) '입차1', '출차1'

                , image : 'http://' + ipaddress + ':' + port + '/images/' + receivedObjData.folder_name + '/' + receivedObjData.fname
                , loop_event_time : receivedObjData.loop_event_time // 입출차 시간(unix)
                , lp : receivedObjData.lp // 차량번호
                , registered : receivedObjData.registered // 등록 상태
                , lp_type : receivedObjData.lp_type // 차량구분: 일반차량 등등 
                , ip : receivedObjData.ip // 차단기 ip
                , port : receivedObjData.port // 차단기 port
                , parking_location : parkingLocation // 주차장 위치

                , gate_index : receivedObjData.gate_index // gtl config.js 의 gate_index
                , ledd_index : receivedObjData.ledd_index // gtl config.js 의 ledd_index
                , pt_index : receivedObjData.pt_index // gtl config.js 의 pt_index

                , outside_ip : ipaddress
              };
              
              if(global.websocket) {
                global.websocket.emit("pf_lpr-update", { lpr: { 'update': returnData } });
              }

            } else if((receivedObjData) && (receivedObjData.kind == 'fee_calculation_result')) {

              let resParkingLocationInfo_in = [];
              let parkingLocation_in = ''
              if(receivedObjData && receivedObjData.obj_in) {
                resParkingLocationInfo_in = await crossingGateService.getParkingLocationInfo(ipaddress, receivedObjData.obj_in.ip, receivedObjData.obj_in.port);

                if (resParkingLocationInfo_in && resParkingLocationInfo_in.length > 0) {
                  parkingLocation_in = resParkingLocationInfo_in[0].outside_name + ' ' + resParkingLocationInfo_in[0].inside_name + ' ' + resParkingLocationInfo_in[0].line_name;
                }
              }
              
              /**
               * 차량 출차: 요금 계산, 요금 정산
               */
              returnData = {
                kind : receivedObjData.kind
                , direction : receivedObjData.direction // out
                , location : receivedObjData.location // ex) '출차1'
                , contents : receivedObjData.contents // 비고

                , image : 'http://' + ipaddress + ':' + port + '/images/' + receivedObjData.folder_name + '/' + receivedObjData.fname
                , loop_event_time : receivedObjData.loop_event_time // 출차 시간(unix)
                , lp : receivedObjData.lp // 차량번호
                , registered : receivedObjData.registered // 등록 상태
                , lp_type : receivedObjData.lp_type // 차량구분: 일반차량 등등 
                , ip : receivedObjData.ip // 차단기 ip
                , port : receivedObjData.port // 차단기 port
                , parking_location : parkingLocation // 주차장 위치

                , gate_index : receivedObjData.gate_index ? receivedObjData.gate_index : receivedObjData.index // gtl config.js 의 gate_index
                , ledd_index : receivedObjData.ledd_index // gtl config.js 의 ledd_index
                , pt_index : receivedObjData.pt_index // gtl config.js 의 pt_index

                , fee : receivedObjData.fee // 요금
                , total_fee: receivedObjData.total_fee // 총 요금

                , obj_in : {
                  kind : receivedObjData.obj_in.kind
                  , direction : receivedObjData.obj_in.direction // in, out
                  , location : receivedObjData.obj_in.location // ex) '입차1', '출차1'

                  , image : 'http://' + ipaddress + ':' + port + '/images/' + receivedObjData.obj_in.folder_name + '/' + receivedObjData.obj_in.fname
                  , loop_event_time : receivedObjData.obj_in.loop_event_time // 입출차 시간(unix)
                  , lp : receivedObjData.obj_in.lp // 차량번호
                  , registered : receivedObjData.obj_in.registered // 등록 상태
                  , lp_type : receivedObjData.obj_in.lp_type // 차량구분: 일반차량 등등 
                  , ip : receivedObjData.obj_in.ip // 차단기 ip
                  , port : receivedObjData.obj_in.port // 차단기 port
                  , parking_location : parkingLocation_in // 주차장 위치

                  , gate_index : receivedObjData.obj_in.gate_index // gtl config.js 의 gate_index
                  , ledd_index : receivedObjData.obj_in.ledd_index // gtl config.js 의 ledd_index
                  , pt_index : receivedObjData.obj_in.pt_index // gtl config.js 의 pt_index
                  , payment_list: receivedObjData.obj_in.payment_list
                }

                , outside_ip : ipaddress
              };

              if(global.websocket) {
                global.websocket.emit("pf_fee_cal_result-update", { fee_cal_result: { 'update': returnData } });
              }

            } else if((receivedObjData) && (receivedObjData.kind == 'gate_state')) {
              
              /**
               * 차단기 상태
               */
              const updateCrossingGateStatusInfo = await crossingGateService.updateCrossingGateStatusInfo(receivedObjData.ip, receivedObjData.port, receivedObjData.location, receivedObjData.state);
              
              if((updateCrossingGateStatusInfo) && (updateCrossingGateStatusInfo > 0)) {
                returnData = receivedObjData;
                returnData.outside_ip = ipaddress;
                
                if(global.websocket) {
                  global.websocket.emit("pf_gate_state-update", { gate_state: { 'update': returnData } });
                }
              }
              
            }

          } // if((resParkingLocationInfo) && (resParkingLocationInfo.length > 0))
          
        } catch (error) {
            console.log(`parkingFeeSocketClient.js, Received data(${ipaddress}) try catch error : `, error);
            logger.error(`parkingFeeSocketClient.js, Received data(${ipaddress}) try catch error : `, error);
        } finally {
          // 초기화
          receivedStrData = '';
          start_index = -1;
          end_index = -1;
        }
        
      } // if((start_index == 0) && (end_index > 0) && (start_index < end_index))
    });

    socket.on('end', async() => {
      console.log(`parkingFeeSocketClient.js, TCP client ${ipaddress} disconnected`);
      await this.removeSocket(ipaddress);
    });
  
    socket.on('close', async() => {
      console.log(`parkingFeeSocketClient.js, TCP client ${ipaddress} Connection closed`);
      logger.error(`parkingFeeSocketClient.js, TCP client ${ipaddress} Connection closed`);
      await this.removeSocket(ipaddress);
      reject('error');
    });

    socket.on('error', async(error) =>  {
      console.log(`parkingFeeSocketClient.js, TCP client ${ipaddress} error: `, error);
      logger.error(`parkingFeeSocketClient.js, TCP client(${ipaddress}), error : `, error);

      await this.removeSocket(ipaddress);

      await fn_parkingStatus('error');

      reject('error');
    }); 
    
    socket.setTimeout(1000 * socketTimeout);
    socket.on('timeout', async() => {
      console.log(`TCP client(${ipaddress}:${port}) socket timeout`);
      logger.info(`TCP client(${ipaddress}:${port}) socket timeout`);
      socket.end();
      reject(`TCP client(${ipaddress}:${port}) socket timeout`);
    });

    const fn_parkingStatus = async(status) => {
      
      try {
        
        const getParkingInfo = await parkingFeeService.getParkingInfo(ipaddress);
        
        if((getParkingInfo) && (getParkingInfo.length > 0)) {

          const outside_socket_port = Number(getParkingInfo[0].outside_socket_port);
          await parkingFeeService.updateParkingInfo(
            getParkingInfo[0].idx
            , getParkingInfo[0].outside_name
            , getParkingInfo[0].outside_ip
            , getParkingInfo[0].outside_port
            , outside_socket_port
            , status
          );
          
          const emitData = {
            status : status
            , idx : getParkingInfo[0].idx
          };

          if(global.websocket) {
            global.websocket.emit("pf_parking_status-update", { parking_status: { 'update': emitData } });
          }
        }

      } catch (error) {
        console.log(`parkingFeeSocketClient.js, fn_parkingStatus try catch(${ipaddress}), error : `, error);
        logger.error(`parkingFeeSocketClient.js,fn_parkingStatus try catch(${ipaddress}), error : `, error);
      }
    }

  });
}

// 연결된 소켓에 메시지 보내기
exports.sendMessageToSocket = async(ipaddress, port, message) => {
      
  const ipSocket = ipSocketArray.find((item) => item.ipaddress === ipaddress);

  let socket = null;
  if(ipSocket) {
    socket = ipSocket.socket;
  }

  let timerId = null;
  let retries = 0;

  return new Promise((resolve, reject) => {

    const attemptWrite = () => {

      if(socket) {

        socket.write(message, (error) => {
          if(error) {
            console.log(`parkingFeeSocketClient.js, TCP client Write(${ipaddress}), error : `, error);
            logger.error(`parkingFeeSocketClient.js, TCP client Write(${ipaddress}), error : `, error);
            retry();
          } else {
            // console.log(`parkingFeeSocketClient.js, TCP client(${ipaddress}) message write successfully`);

            resolve(waitForResponse(ipaddress, ipSocket.port, socket, port));
          }
        });

      } else {
        console.log(`parkingFeeSocketClient.js, TCP client Socket with ipaddress(${ipaddress}) not found(sendMessageToSocket)`);
        logger.info(`parkingFeeSocketClient.js, TCP client Socket with ipaddress(${ipaddress}) not found(sendMessageToSocket)`);
        reject(`parkingFeeSocketClient.js, TCP client Socket with ipaddress(${ipaddress}) error: not found(sendMessageToSocket)`);
      }
    };

    const retry = () => {
      
      if (retries >= maxRetryCount) {
        console.log(`parkingFeeSocketClient.js, TCP client(${ipaddress}) Exceeded max Retry`);
        logger.info(`parkingFeeSocketClient.js, TCP client(${ipaddress}) Exceeded max Retry`);
        reject(`parkingFeeSocketClient.js, TCP client(${ipaddress}) error: Exceeded max Retry`);
        clearTimeout(timerId);
        return;
      }
      retries++;
      timerId = setTimeout(attemptWrite, retrySeconds);
    };

    attemptWrite();
  });
}

// 소켓 제거
exports.removeSocket = async(ipaddress) => {
  
  try {
    
    let returnValue = '';

    const ipSocket = ipSocketArray.find((item) => item.ipaddress === ipaddress);
    
    let socket = null;
    if(ipSocket) {
      socket = ipSocket.socket;
    }

    if(socket) {
      
      socket.destroy();

      ipSocketArray = ipSocketArray.filter((item) => item.ipaddress !== ipaddress);

      returnValue = `removeSocket ${ipaddress} success`;

    } else {
      console.log(`parkingFeeSocketClient.js, TCP client Socket with ipaddress(${ipaddress}) not found(removeSocket)`);

      returnValue = `error: ${ipaddress} not found`;
    }
    
    return returnValue;

  } catch (error) {
    console.log(`parkingFeeSocketClient.js, removeSocket(${ipaddress}), error : `, error);
    logger.error(`parkingFeeSocketClient.js, removeSocket(${ipaddress}), error : `, error);
  }
}

exports.getParkingFeeListInit = async() => {

  try {

    const res = await parkingFeeService.getParkingList();
    
    // 주차장이 검색되면...
    for(let i in res) {
      
      // 주차장 운영종료가 아니면(정상 운영이면)
      if(res[i].status != parkingStatusClose) {

        const ipaddress = res[i].outside_ip;
        const outside_socket_port = res[i].outside_socket_port;
        const port = res[i].outside_port;
        
        await this.connectTcp(ipaddress, outside_socket_port, port);
      }   
    } // for
    
  } catch (error) {
    console.log(`parkingFeeSocketClient.js, getParkingFeeListInit, error : `, error);
    logger.error(`parkingFeeSocketClient.js, getParkingFeeListInit, error : `, error);
  }
}

const getParkingFeeListStatus = async() => {

  try {
    
    const res = await parkingFeeService.getParkingList();
    
    // 주차장이 검색되면...
    for(let i in res) {
      
      const outside_ip = res[i].outside_ip;
      const outside_socket_port = res[i].outside_socket_port;
      const port = res[i].port;

      // 주차장 운영종료가 아니면(정상 운영이면), 상태 체크하기.
      if(res[i].status != parkingStatusClose) {

        const ipSocket = ipSocketArray.find((item) => item.ipaddress === outside_ip);

        if((ipSocket) && (res[i].status == 'normal')) {
          // 값이 있으므로 정상연결 상태
          continue;

        } else {
          // 값이 없거나 error 상태
          await this.connectTcp(outside_ip, outside_socket_port, port);
        }
      } // if(res[i].status != 'close')
      
    } // for

  } catch (error) {
    console.log(`parkingFeeSocketClient.js, getParkingFeeListStatus, error : `, error);
    logger.error(`parkingFeeSocketClient.js, getParkingFeeListStatus, error : `, error);
  }
}

let parkingInterval = null;
clearInterval(parkingInterval);
// 1분마다 주차장 소켓 연결확인(gtl 서버 소켓 확인)
parkingInterval = setInterval(async() => {
  await getParkingFeeListStatus();
}, 1 * 1000 * parkingIntervalTimeout);