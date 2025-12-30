const logger = require('../../logger');
const net = require("net");
const deviceService = require('../../routes/parkingManagement/services/deviceService');
const socketMap = new Map();
const eventLogMessageMap = new Map();

// 센서 연결 상태 업데이트 함수
const updateDeviceStatus = async (deviceIdx, isConnected) => {
  const prevStatus = await deviceService.getDeviceLinkedStatus(deviceIdx);
  
  // 이전 상태와 다를 경우에만 업데이트
  if (prevStatus !== isConnected) {
    await deviceService.modifyLinkedStatusDevice({ 
      deviceIdx: deviceIdx, 
      linkedStatus: isConnected 
    });
    global.websocket.emit("pm_area-update", { areaList: { 'update': 1 } });
  }
};

// 센서 연결 상태 확인 함수
const checkSensorDataTime = async (deviceIdx, jsonData, socket) => {
  const currentDate = new Date();
  const sensorDate = new Date(jsonData.sensorData.pdt);
  
  // 시간 계산
  const timeHour = Math.abs(currentDate - sensorDate) / (1000 * 60 * 60);

  const inAreaDevice = await deviceService.inAreaDevice(deviceIdx);

  if(inAreaDevice.rows.length > 0){
    await deviceService.defaultInAreaSensor(deviceIdx,jsonData.sensorData.det)
  }

  // 3시간 이상 차이 날 경우 센서 연결 해제
  if (timeHour >= 3) {
    console.log(`${deviceIdx} 디바이스의 센서 데이터가 3시간 이상 지연됨. 소켓 삭제`);
    socket.destroy();
    socketMap.delete(deviceIdx);
    await updateDeviceStatus(deviceIdx, false);

    // 해제 된 처음 메시지만 보냄
    if(!eventLogMessageMap.has(deviceIdx)){
      eventLogMessageMap.get(deviceIdx);
      await deviceService.getDeviceCheck(deviceIdx);
    }
    return false;
  } 

  // 센서 정상 작동 시 알람 상태 해제
  eventLogMessageMap.delete(deviceIdx);
  await deviceService.updateDeviceAlarmStatus(null, deviceIdx, false);
  await updateDeviceStatus(deviceIdx, true);

  return true;
};

exports.connectParkingSensorSocket = async (jsonData) => {
  try {
    const deviceIdx = jsonData.deviceIdx;
    const deviceIp = jsonData.deviceIp;
    const devicePort = jsonData.devicePort;

    const writeData = {
      message: jsonData.message,
      auth: jsonData.auth,
      sensorData: null
    }
    const writeDataString = JSON.stringify(writeData) + "\0";

    // 기존 소켓이 존재하는 경우
    if (socketMap.has(deviceIdx)) {
      const existingSocket = socketMap.get(deviceIdx);
      
      // 소켓이 연결된 상태인지 확인
      if (existingSocket && !existingSocket.destroyed) {
        console.log(`기존 소켓 재사용: ${deviceIdx}`);
        // 새로운 데이터를 기존 소켓으로 전송
        existingSocket.write(writeDataString, (err) => {
          if (err) {
            console.error(`기존 소켓 데이터 전송 실패: ${err.message}`);
            // 에러 발생시 기존 소켓 제거 후 새로운 소켓 생성
            socketMap.delete(deviceIdx);
            createNewSocket();
          }
        });
        return;
      } else {
        // 소켓이 끊어진 상태면 Map에서 제거
        console.log(`끊어진 소켓 제거: ${deviceIdx}`);
        socketMap.delete(deviceIdx);
      }
    }

    // 새로운 소켓 생성 함수
    const createNewSocket = () => {
      const socket = new net.Socket();
    
      socket.connect(devicePort, deviceIp, async () => {
        console.log(`새로운 소켓 서버 연결 성공: ${deviceIp}:${devicePort}:${deviceIdx}`);
        socket.write(writeDataString);
      });

      socketMap.set(deviceIdx, socket);

      socket.on("data", async (data) => {      
        let jsonData = JSON.parse(data.toString().split('\0')[0]);
        const message = jsonData.message;

        // 접속 여부 확인용
        if(message == 'hello-ok') {
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_hello_ok', { message: jsonData });
          }

        } else if(message == 'get-ok') {
          await checkSensorDataTime(deviceIdx, jsonData, socket);
    
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_get_ok', { message: jsonData });
          }
        } else if(message == 'subscribe-ok') {
          // 기존에 있던 디바이스 구독 시 센서 상태 체크 요청
          const getRequestData = {
            ...jsonData,
            message: "get"
          };
          
          const getRequestString = JSON.stringify(getRequestData) + "\0";
          socket.write(getRequestString);
      
          // 센서 이벤트 구독 요청
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_subscribe_ok', { message: jsonData });
          }

        } else if(message == 'unsubscribe-ok') {
          // 센서 이벤트 구독 취소
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_unsubscribe_ok', { message: jsonData });
          }

        } else if(message == 'event-sensor') {
          deviceService.updateEventSensor(jsonData);

          // 센서 이벤트 발생시 센서브릿지에서 전송
          // if(global.websocket) {
          //   global.websocket.emit('pm_devices_sensor_event_sensor', { message: jsonData });
          // }
        } else if(message == 'parse-err') {
          // 요청 시 데이터 포멧이 잘못된 경우
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_parse_err', { message: jsonData });
          }

        } else if(message == 'login-err ') {
          // 요청 시 auth 정보가 잘못된 경우
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_login_err', { message: jsonData });
          }

        } else if(message == 'subscribe-err ') {
          // 요청 시 subscribe가 실패한 경우
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_subscribe_err', { message: jsonData });
          }

        } else if(message == 'command-err') {
          // 요청 시 message가 유효하지 않은 경우
          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_command_err', { message: jsonData });
          }

        } else if(message != 'event-welcome') {
          // event-welcome: 접속 시 센서브릿지에서 전송
          // 무시함
          // console.log('worker/parking/sensorSocket.js, connectParkingSensorSocket, message : ', message);
        } else {
          await deviceService.modifyLinkedStatusDevice({ deviceIdx: deviceIdx, linkedStatus: false });

          if(global.websocket) {
            global.websocket.emit('pm_devices_sensor_else', { message: jsonData });
          }
        }
      });

      socket.on("close", () => {
        console.log(`ParkingSensor 서버와 연결이 종료되었습니다. ${deviceIdx}`);
        socketMap.delete(deviceIdx); // 소켓 연결 종료 시 Map에서 제거
      });

      socket.on("error", (error) => {
        console.error(`ParkingSensor TCP 연결 에러: ${error.message} : ${deviceIdx}`);
        socketMap.delete(deviceIdx); // 에러 발생 시 Map에서 제거
      });
    }

    // 최초 연결이거나 끊어진 소켓인 경우 새로운 소켓 생성
    createNewSocket();
    
  } catch (error) {
    logger.info('worker/parking/sensorTCPSocket.js, connectParkingSensorSocket, error: ', error);
    console.log('worker/parking/sensorTCPSocket.js, connectParkingSensorSocket, error: ', error);
  } 
}

exports.sensorGetRequest = async (jsonData) => {
  return new Promise((resolve, reject) => {
    const getRequestData = {
      message: "get",
      auth: jsonData.auth,
      sensorData: null,
    };

    const getRequestString = JSON.stringify(getRequestData) + "\0";
    const socket = new net.Socket();

    // 타이머: 10초 동안 응답이 없으면 소켓 닫기
    const timeout = setTimeout(() => {
      console.error(`GET 소켓 응답 대기 시간 초과: ${jsonData.deviceIdx}`);
      socket.destroy(); // 소켓 닫기
      reject(new Error(`GET 소켓 서버 시간 초과 : ${jsonData.deviceIdx}`));
    }, 10000); // 10초 = 10000ms

    // 서버에 연결
    socket.connect(jsonData.devicePort, jsonData.deviceIp, () => {
      console.log(`GET 소켓 서버에 연결 성공: ${jsonData.deviceIp}:${jsonData.devicePort}`);
      socket.write(getRequestString, (err) => {
        if (err) {
          clearTimeout(timeout); // 타이머 정리
          console.error(`GET 요청 전송 실패: ${err.message}`);
          socket.destroy(); // 소켓 닫기
          reject(err);
        } else {
          console.log(`GET 요청 전송 성공: ${jsonData.deviceIdx}`);
        }
      });
    });

    socket.on("data", (data) => {
      const jsonResponse = JSON.parse(data.toString().split("\0")[0]);
      const message = jsonResponse.message;

      if (message === "get-ok") {
        clearTimeout(timeout); // 타이머 정리
        socket.destroy(); // 소켓 닫기
        resolve(jsonResponse); // 응답 반환
      }
    });

    // 소켓 종료
    socket.on("close", () => {
      console.log(`GET 소켓 연결 종료: ${jsonData.deviceIdx}`);
    });

    // 소켓 에러
    socket.on("error", (err) => {
      clearTimeout(timeout); // 타이머 정리
      console.error(`GET 소켓 에러: ${err.message}`);
      socket.destroy(); // 소켓 닫기
      reject(err);
    });
  });
};

exports.unsubscribeAndRemoveSocket = async (jsonData) => {
  if (!socketMap.has(jsonData.deviceIdx)) {
    console.log(`해당 deviceIdx(${jsonData.deviceIdx})에 대한 소켓이 없습니다.`);
    return false;
  }

  const socket = socketMap.get(jsonData.deviceIdx);

  const unsubscribeData = {
    message: "unsubscribe",
    auth: jsonData.auth,
    sensorData: null,
  };

  const unsubscribeString = JSON.stringify(unsubscribeData) + "\0";

  socket.write(unsubscribeString, (err) => {
    if (err) {
      console.error(`구독 취소 메시지 전송 실패: ${err.message}`);
    } else {
      console.log(`구독 취소 메시지 전송 성공: ${jsonData.deviceIdx}`);
    }
  });

  socket.destroy();
  socketMap.delete(jsonData.deviceIdx);
  console.log(`구독 소켓 삭제 완료: ${jsonData.deviceIdx}`);
};