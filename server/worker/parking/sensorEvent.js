const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const deviceMapper = require('../../routes/parkingManagement/mappers/deviceMapper');
const { connectParkingSensorSocket } = require('./sensorTCPSocket');
const net = require("net");

exports.sensorIsCheck = async ({ userId, userPw, deviceIp, devicePort, deviceNo16 }) => {
  return new Promise((resolve) => {
    const SERVER_HOST = deviceIp;
    const SERVER_PORT = devicePort;

    const jsonData = {
      message: "hello",
      auth: {
        devNo: parseInt(deviceNo16, 16),
        userID: userId,
        userPW: userPw,
      },
      sensorData: null,
    };

    const jsonString = JSON.stringify(jsonData) + "\0";
    const client = new net.Socket();

    client.connect(SERVER_PORT, SERVER_HOST, () => {
      console.log("센서 서버 연결 성공");
      client.write(jsonString);
    });

    let isInitialData = true;

    client.on("data", (data) => {
        const response = JSON.parse(data.toString().split('\0')[0]);
    
        // 무조건 처음 event-welcome는 뜨기 때문에 초기 데이터 무시
        if (isInitialData && response.message === "event-welcome") {
            isInitialData = false;
            return;
        }
    
        client.destroy();
        resolve(response);
    });
    
    client.on("error", (error) => {
      console.error("센서 서버 연결 중 오류 발생 : ", error);
      client.destroy();
      resolve({
        message: "센서 확인 실패 - 정보를 확인 후 다시 등록 해 주세요.",
      });
    });

    client.on("close", () => {
      console.log("센서 서버와 연결 종료");
    });
  });
};

exports.addAloneSocket = async (device) => {
  try {
      const {
        idx,
        user_id,
        user_pw,
        device_ip,
        device_port,
        device_no10,
      } = device;

      const sensorData = {
        deviceIdx: idx, 
        deviceIp: device_ip, 
        devicePort: device_port,
        auth: {
          devNo: device_no10,
          userID: user_id,
          userPW: user_pw,
        },
        message: "subscribe",
      };
      
      // 소켓 구독 요청
      await connectParkingSensorSocket(sensorData);
  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, addAloneSocket, error: ', error);
    console.log('worker/parking/sensorEvent.js, addAloneSocket, error: ', error);
  }
};

const deviceData = async () => {

  const client = await pool.connect();

  try {

    let returnValue = [];

    let binds = [];
    let query = await deviceMapper.getDeviceIpList();
    const resDeviceIpList = await client.query(query, binds);

    if((resDeviceIpList) && (resDeviceIpList.rows) && (resDeviceIpList.rows.length > 0)) {

      for(let i in resDeviceIpList.rows) {
        
        let temp = {
          deviceIdx : resDeviceIpList.rows[i].idx
          , deviceIp : resDeviceIpList.rows[i].device_ip
          , devicePort : resDeviceIpList.rows[i].device_port
          , auth : {
            devNo : resDeviceIpList.rows[i].device_no10
            , userID : resDeviceIpList.rows[i].user_id
            , userPW : resDeviceIpList.rows[i].user_pw
          }
        };

        returnValue.push(temp);

      } // for i

    } else {
      console.log('parking sensor 정보가 없습니다.');
    }

    return returnValue;

  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, authData, error: ', error);
    console.log('worker/parking/sensorEvent.js, authData, error: ', error);
  } finally {
    await client.release();
  }
}

exports.helloSocket = async () => {

  try {

    let data = await deviceData();
    
    for(let i in data) {
      data[i].message = 'hello';
      connectParkingSensorSocket(data[i]);
    }

  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, helloSocket, error: ', error);
    console.log('worker/parking/sensorEvent.js, helloSocket, error: ', error);
  }
}

exports.getSocket = async () => {
  
  try {

    let data = await deviceData();
    
    for(let i in data) {
      data[i].message = 'get';
      connectParkingSensorSocket(data[i]);
    }

  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, getSocket, error: ', error);
    console.log('worker/parking/sensorEvent.js, getSocket, error: ', error);
  }

}

exports.subscribeSocket = async () => {
  
  try {

    let data = await deviceData();
    
    for(let i in data) {
      data[i].message = 'subscribe';
      connectParkingSensorSocket(data[i]);
    }

  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, subscribeSocket, error: ', error);
    console.log('worker/parking/sensorEvent.js, subscribeSocket, error: ', error);
  }

}

exports.unsubscribeSocket = async () => {
  
  try {

    let data = await deviceData();
    
    for(let i in data) {
      data[i].message = 'unsubscribe';
      connectParkingSensorSocket(data[i]);
    }

  } catch (error) {
    logger.info('worker/parking/sensorEvent.js, unsubscribeSocket, error: ', error);
    console.log('worker/parking/sensorEvent.js, unsubscribeSocket, error: ', error);
  }

}