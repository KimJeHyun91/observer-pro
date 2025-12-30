const rtsp = require('rtsp-ffmpeg');
const axios = require('axios');
const { pool } = require('../db/postgresqlPool');
const logger = require('../logger');
const { fn_mainServicePrefix } = require('../utils/mainServicePrefix');
const { updateStartDateTime } = require('../utils/calcDateTime');
const { sendMaintenanceNotification } = require('./productManager/maintenanceNotification');

// 영상전송상태 저장용 map 자료구조
const mapStream = new Map();
const mapArchive = new Map();
const mapStreamEvent = new Map();
const mapArchiveSOP = new Map();

module.exports = async (io) => {
  /**
   * Create WebSocket server.
   */
  io.on('connection', async (socket) => {
    
    console.log(`WebSocket Connected: ${socket.handshake.address}/${socket.id}`);

    // 실시간 영상
    socket.on('cameraStream', async (received) => {

      try {

        if((received) && (received.cameraId) && (received.cmd)) {

          const arrStream = mapStream.get(socket.id);
          const mainService = received.cameraId.split(':')[0];
          const vmsName = received.cameraId.split(':')[1];
          const cameraId = toInteger(received.cameraId.split(':')[2]);

          // vms 테이블 접근할 때, 서비스 별로 구분하기 위해서 사용하는 함수
          const mainServicePrefix = await fn_mainServicePrefix(mainService);
          let mainServiceName = 'observer';
          if(mainService) {
            mainServiceName = mainService;
          }

          if(received.cmd === 'on') {

            // 접속한 클라이언트에서 스트림을 요청한 적이 있으면 배열에서 카메라 아이디로 스트림 찾기
            if(arrStream) {
              
              let bExist = false;
              for(const item of arrStream) {

                if(item.cameraId === received.cameraId) {
                  bExist = true;
                  console.log(`${received.cameraId} 라이브 영상 요청무시`);
                  break;
                }
              }

              if(bExist === false) {
                await requestRTSP(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName);
              }

            } else {  
              // 접속한 클라이언트에서 스트림을 요청한 적이 없으면 스트림 생성
              await requestRTSP(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName);
            }

          } else if(received.cmd === 'off') {

            if(arrStream) {

              for(const item of arrStream) {
                if(item.cameraId === received.cameraId) {
                  if(item.stream) {
                    item.stream.stop();
                    console.log(`${item.cameraId} 라이브 영상 종료`, new Date());
                  }
                  break;
                }
              }
              const filtered = arrStream.filter((item) => item.cameraId !== received.cameraId);
              mapStream.set(socket.id, filtered);
            }
          }
        }

      } catch(error) {
        logger.info('worker/serverSocket.js, socket.on(cameraStream, error: ', error);
        console.error('worker/serverSocket.js, socket.on(cameraStream, error: ', error);
      }
    });

    // 녹화 영상
    socket.on('archiveStream', async (received) => {

      try {
        
        if((received) && (received.startDateTime) && (received.cmd)) {

          const arrArchive = mapArchive.get(socket.id);
          const mainService = received.cameraId.split(':')[0];
          const vmsName = received.cameraId.split(':')[1];
          const cameraId = received.cameraId.split(':')[2].split('.')[0];
          const startDateTime = received.startDateTime;
  
          // vms 테이블 접근할 때, 서비스 별로 구분하기 위해서 사용하는 함수
          const mainServicePrefix = await fn_mainServicePrefix(mainService);
          let mainServiceName = 'observer';
          if(mainService) {
            mainServiceName = mainService;
          }

          if(received.cmd === 'on') {

            // 접속한 클라이언트에서 스트림을 요청한 적이 있으면 배열에서 카메라 아이디로 스트림 찾기
            if(arrArchive) {

              let bExist = false;
              for(const item of arrArchive) {
                if((item.cameraId === received.cameraId) && (item.startDateTime === received.startDateTime)) {
                  bExist = true;
                  console.log(`${received.cameraId} 녹화 영상 요청무시`);
                  break;
                }
              }
              if(bExist === false) {
                requestRTSPArchive(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName, startDateTime);
              }

            } else {
              // 접속한 클라이언트에서 스트림을 요청한 적이 없으면 스트림 생성
              requestRTSPArchive(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName, startDateTime);
            }

          } else if(received.cmd === 'off') {

            if(arrArchive) {

              for(const item of arrArchive) {
                if((item.cameraId === received.cameraId) && (item.startDateTime === received.startDateTime)) {
                  if(item.stream) {
                    item.stream.stop();
                    console.log(`${item.cameraId} 녹화 영상 종료`, new Date());
                  }
                  break;
                }
              }

              const filtered = arrArchive.filter((item) => !((item.cameraId === received.cameraId) && (item.startDateTime === received.startDateTime)));
              mapArchive.set(socket.id, filtered);
            }
          }
        }

      } catch (error) {
        logger.info('worker/serverSocket.js, socket.on(archiveStream, error: ', error);
        console.error('worker/serverSocket.js, socket.on(archiveStream, error: ', error);
      }
    });

    socket.on('stopCameraStreamEvent', (received) => {
      const { cameraId } = received;
      stopRtspEvent(socket, cameraId);
    });

    socket.on('stopArchiveStreamSOPEvent', (received) => {
      console.log('stopArchiveStreamSOPEvent 채널 도달 ', received);
      const { cameraId, startDateTime } = received;
      stopRtspSOPEvent(socket, cameraId, startDateTime);
    });

    socket.on('disconnect', () => {

      const arrStream = mapStream.get(socket.id);
      const arrArchive = mapArchive.get(socket.id);

      if(arrStream) {

        for(const item of arrStream) {
          if(item.stream) {
            item.stream.stop();
            console.log(`${item.cameraId} 영상 종료`, new Date());
          }
        }

        mapStream.delete(socket.id);
      }

      if(arrArchive) {

        for(const item of arrArchive) {
          if(item.stream) {
            item.stream.stop();
            console.log(`${item.cameraId} 영상 종료`, new Date());
          }
        }
        mapArchive.delete(socket.id);
      }

      console.log(`WebSocket Disconnected: ${socket.handshake.address}/${socket.id}`);
    });

    function toInteger(num) {
      if (num % 1 === 0) {
        return num; // Already an integer
      }
      return Math.floor(num); // Convert to integer
    }

  });

  // global(전역) 객체에 이벤트 팝업 함수 적용
  global.requestRtspEvent = async function(eventCameraId, mainServiceName) {
    const client = await pool.connect();

    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    const vmsName = eventCameraId.split(':')[1];
    const cameraId = eventCameraId.split(':')[2];
    const arrStreamEvent = mapStreamEvent.get(eventCameraId);

    try {
      if(arrStreamEvent){
        console.log(`${eventCameraId} 이벤트 라이브 영상 요청무시`);
        return;
      }

      let binds = [];

      const queryVms = `
      SELECT * FROM 
        ob_vms
      WHERE
        main_service_name = '${mainServiceName}'
      AND
        vms_name = '${vmsName}';
      `;

      const resVms = await client.query(queryVms, binds);
      if(!resVms || !resVms.rows || resVms.rows.length !== 1){
        console.log(`해당 vms(${vmsName})가 없습니다.`);
        return;
      }
      const vms = resVms.rows[0];
      const res = await streamingEventVms(vms);
      if(res.success){
        return res;
      } else {
        const result = await requestDomainVmsList(vmsName, mainServiceName, streamingEventVms);
        if(!result.success){
          global.websocket.emit(`${mainServicePrefix}_cameraStreamEventErr`, { 
            cameraId: eventCameraId,
            message: result.message || 'VMS RTSP 스트리밍 요청에 실패했습니다.'  
          });
        }
      } 
    } catch (error) {

      logger.info('worker/serverSocket.js, global.requestRtspEvent, error: ', error);
      console.error('worker/serverSocket.js, global.requestRtspEvent, error: ', error);
      await requestDomainVmsList(vmsName, mainServiceName, streamingEventVms);
      global.websocket.emit(`${mainServicePrefix}_cameraStreamEventErr`, { 
        cameraId: eventCameraId,
        message: error.message || 'VMS RTSP 스트리밍 요청에 실패했습니다.'  
      });
    } finally {
      await client.release();
    }
     /* vms streaming request code */
    async function streamingEventVms(vms) {
      try {
        let username = 'root';
        let password = 'root';

        let mgist_ip = 'localhost';
        let mgist_port = 80;
  
        username = vms.vms_id;
        password = vms.vms_pw;
        mgist_ip = vms.vms_ip;
        mgist_port = vms.vms_port;
  
        const timeout = 6000;
        const streamInfoUrl = `http://${username}:${password}@${mgist_ip}:${mgist_port}/live/media/${vmsName}/DeviceIpint.${cameraId.split('.')[0]}/SourceEndpoint.video:0:0?format=rtsp`;
        const streamInfo = await axios.get(streamInfoUrl, { timeout });
        if(streamInfo.status === 200) {
          const rtsp_path = streamInfo.data.rtsp.path;
          const rtsp_port = streamInfo.data.rtsp.port;
          // const url = `rtsp://${username}:${password}@${mgist_ip}:${rtst_port}/${accessPoint.replace('0:0', '0:1')}`;
          const url = `rtsp://${username}:${password}@${mgist_ip}:${rtsp_port}/${rtsp_path}`;
          console.log('live event stream url: ', url);
          const stream = new rtsp.FFMpeg({
            input: url,
            rate: 10,
            resolution: '1920x1080',
            quality: 3,
            arguments: [
              '-rtsp_transport', 'tcp',
              //  '-vf', 'nlmeans'
            ]
          });
    
          mapStreamEvent.set(eventCameraId, { sockets: Array.from(io.sockets.sockets.values()), stream });
          console.log(`${eventCameraId} 이벤트 라이브 영상 시작`, new Date());

          // 소켓, 각 서비스별로
          const pipeStream = (data) => {
            const base64Data = data.toString('base64');
            io.sockets.emit(`${mainServicePrefix}_cameraStreamEvent`, {
              cameraId: eventCameraId,
              data: base64Data
            });
          }
          stream.on('data', pipeStream);
          return {
            success: true
          }
        } else {
          console.log('The camera does not have an rtsp path');
          return {
            success: false,
            message: '해당 카메라의 RTSP 정보가 없습니다.'
          }
        }
      } catch(error) {
        console.log('streaming main code error: ', error);
        let message = '';
        if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
          message = `VMS 서버에 연결이 되지 않습니다.`;
        } else if(error.code === 'ECONNABORTED') {
          message = `VMS 요청시간을 초과하였습니다.`;
        } else if(error.code === 'ERR_INVALID_URL') {
          message = `유효하지 않은 URL 입니다.`;
        } else if(error.response) {
          message = error.response.statusText;
        }
        throw new Error(message);
      }
    }
  }

  // global(전역) 객체에 SOP RTSP 녹화 영상 함수 적용
  global.requestArchiveSOP = async function(eventCameraId, mainServiceName, startDateTime) {
    const client = await pool.connect();  
    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    const vmsName = eventCameraId.split(':')[1];
    const cameraId = eventCameraId.split(':')[2];

    const eventDateTime = updateStartDateTime(startDateTime, -10);
    
    try {
    const arrArchiveSOPEvent = mapArchiveSOP.get(`${eventCameraId}-${startDateTime}`);
    if(arrArchiveSOPEvent){
      console.log(`${eventCameraId} SOP 이벤트 녹화 영상 요청 무시`);
      return;
    }
      let binds = [];
      const queryVms = `
      SELECT * FROM 
        ob_vms
      WHERE
        main_service_name = '${mainServiceName}'
      AND
        vms_name = '${vmsName}';
      `;
      const resVms = await client.query(queryVms, binds);
      if(!resVms || !resVms.rows || resVms.rows.length !== 1){
        console.log(`해당 vms(${vmsName})가 없습니다.`);
        return;
      }
      const vms = resVms.rows[0];
      const res = await streamingArchiveSOPVms(vms);
      if(res.success){
        return res;
      } else {
        const result = await requestDomainVmsList(vmsName, mainServiceName, streamingArchiveSOPVms);
        if(!result.success){
          global.websocket.emit(`${mainServicePrefix}_archiveStreamSOPErr`, { 
            cameraId: eventCameraId,
            message: result.message || 'VMS RTSP SOP 녹화 영상 스트리밍 요청에 실패했습니다.',
            startDateTime
          });
        }
      } 
    } catch (error) {
      logger.info('worker/serverSocket.js, global.requestRtspEvent, error: ', error);
      console.error('worker/serverSocket.js, global.requestRtspEvent, error: ', error);
      await requestDomainVmsList(vmsName, mainServiceName, streamingArchiveSOPVms);
      global.websocket.emit(`${mainServicePrefix}_archiveStreamSOPErr`, { 
        cameraId: eventCameraId,
        message: error.message || 'VMS RTSP SOP 녹화 영상 스트리밍 요청에 실패했습니다.',
        startDateTime
      });
    } finally {
      await client.release();
    }
    /* vms streaming archive SOP request code */
    async function streamingArchiveSOPVms(vms) {
      try {
        let username = 'root';
        let password = 'root';
        let mgist_ip = 'localhost';
        let mgist_port = 80;
        username = vms.vms_id;
        password = vms.vms_pw;
        mgist_ip = vms.vms_ip;
        mgist_port = vms.vms_port;
        const timeout = 6000;
        const streamInfoUrl = `http://${username}:${password}@${mgist_ip}:${mgist_port}/live/media/${vmsName}/DeviceIpint.${cameraId.split('.')[0]}/SourceEndpoint.video:0:0?format=rtsp`;
        const streamInfo = await axios.get(streamInfoUrl, { timeout });
        if(streamInfo.status === 200) {
          const rtsp_path = streamInfo.data.rtsp.path;
          const rtsp_port = streamInfo.data.rtsp.port;
          const url = `rtsp://${username}:${password}@${mgist_ip}:${rtsp_port}/archive/${rtsp_path}/${eventDateTime}?speed=1`;
          console.log('SOP archive stream url: ', url);
          const stream = new rtsp.FFMpeg({
            input: url,
            rate: 10,
            resolution: '1920x1080',
            quality: 3,
            arguments: [
              '-rtsp_transport', 'tcp',
              //  '-vf', 'nlmeans'
            ]
          });
          console.log(`${eventCameraId}-${startDateTime}`);
          mapArchiveSOP.set(`${eventCameraId}-${startDateTime}`, { sockets: Array.from(io.sockets.sockets.values()), stream });
          console.log(`${eventCameraId} 이벤트 SOP 녹화 영상 시작`, new Date());
          // 소켓, 각 서비스별로
          const pipeStream = (data) => {
            const base64Data = data.toString('base64');
            io.sockets.emit(`${mainServicePrefix}_archiveStreamSOP`, {
              cameraId: eventCameraId,
              data: base64Data,
              startDateTime
            });
          }
          stream.on('data', pipeStream);
          return {
            success: true
          }
        } else {
          console.log('The camera does not have an rtsp path');
          return {
            success: false,
            message: '해당 카메라의 RTSP 정보가 없습니다.'
          }
        }
      } catch(error) {
        console.log('streaming main code error: ', error);
        let message = '';
        if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
          message = `VMS 서버에 연결이 되지 않습니다.`;
        } else if(error.code === 'ECONNABORTED') {
          message = `VMS 요청시간을 초과하였습니다.`;
        } else if(error.code === 'ERR_INVALID_URL') {
          message = `유효하지 않은 URL 입니다.`;
        } else if(error.response) {
          message = error.response.statusText;
        }
        throw new Error(message);
      }
    }
  }
  global.websocket = io;
}

// 실시간 라이브 스트리밍 요청 함수
async function requestRTSP(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName) {
  const client = await pool.connect();
  try {
    let binds = [];
    const queryVms = `
      SELECT * FROM 
        ob_vms
      WHERE
        main_service_name = '${mainServiceName}'
      AND
        vms_name = '${vmsName}';
      `;
    const resVms = await client.query(queryVms, binds);
    if(!resVms || !resVms.rows || resVms.rows.length !== 1){
      console.log(`해당 vms(${vmsName})가 없습니다.`);
      return;
    }

    const vms = resVms.rows[0];

    socket.emit(`${mainServicePrefix}_cameraStream`, {
      username : vms.vms_id,
      password : vms.vms_pw,
      mgist_ip : vms.vms_ip,
      mgist_port: vms.vms_port,
      vms_name : vmsName,
      cameraId : cameraId,
      streamType : 'live',
      main_service_name : mainServiceName
    });

    // const vms = resVms.rows[0];
    // const res = await streamingVms(vms);
    // if(res.success){
    //   return res;
    // } else {
    //   const result = await requestDomainVmsList(vmsName, mainServiceName, streamingVms);
    //   if(!result.success){
    //     global.websocket.emit(`${mainServicePrefix}_cameraStreamErr`, { 
    //       cameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
    //       message: result.message || 'VMS RTSP 스트리밍 요청에 실패했습니다.'  
    //     });
    //   }
    // }
  } catch (error) {
    logger.info('worker/serverSocket.js, function requestRTSP, error: ', error);
    console.log('worker/serverSocket.js, function requestRTSP, error: ', error);
    await requestDomainVmsList(vmsName, mainServiceName, streamingVms);
    global.websocket.emit(`${mainServicePrefix}_cameraStreamErr`, { 
      cameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
      message: error.message || 'VMS RTSP 스트리밍 요청에 실패했습니다.'  
    });
  } finally {
    await client.release();
  }

  /* vms streaming request code */
  async function streamingVms(vms) {
    try {
      let username = 'root';
      let password = 'root';
      let mgist_ip = 'localhost';
      let mgist_port = 80;

      username = vms.vms_id;
      password = vms.vms_pw;
      mgist_ip = vms.vms_ip;
      mgist_port = vms.vms_port;

      const timeout = 6000;
      const streamInfoUrl = `http://${username}:${password}@${mgist_ip}:${mgist_port}/live/media/${vmsName}/DeviceIpint.${cameraId.split('.')[0]}/SourceEndpoint.video:0:0?format=rtsp`;
      const streamInfo = await axios.get(streamInfoUrl, { timeout });
      if(streamInfo.status === 200) {
        const rtsp_path = streamInfo.data.rtsp.path;
        const rtsp_port = streamInfo.data.rtsp.port;
        // const url = `rtsp://${username}:${password}@${mgist_ip}:${rtst_port}/${accessPoint.replace('0:0', '0:1')}`;
        const url = `rtsp://${username}:${password}@${mgist_ip}:${rtsp_port}/${rtsp_path}`;
        console.log('live stream url: ', url);
        const stream = new rtsp.FFMpeg({
          input: url,
          rate: 10,
          resolution: '1920x1080',
          quality: 3,
          arguments: [
            '-rtsp_transport', 'tcp',
            //  '-vf', 'nlmeans'
          ]
        });
        mapStream.set(socket.id, [{ cameraId: received.cameraId, stream }]);
        console.log(`${received.cameraId} 라이브 영상 시작`, new Date());
        // 소켓, 각 서비스별로
        const pipeStream = (data) => {
          socket.emit(`${mainServicePrefix}_cameraStream`, {
            cameraId: received.cameraId,
            data: data.toString('base64')
          });
        }
        stream.on('data', pipeStream);
        return {
          success: true
        }
      } else {
        console.log('The camera does not have an rtsp path');
        return {
          success: false,
          message: '해당 카메라의 RTSP 정보가 없습니다.'
        }
      }
    } catch(error) {
      console.log('streaming main code error: ', error);
      let message = '';
      if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
        message = `VMS 서버에 연결이 되지 않습니다.`;
      } else if(error.code === 'ECONNABORTED') {
        message = `VMS 요청시간을 초과하였습니다.`;
      } else if(error.code === 'ERR_INVALID_URL') {
        message = `유효하지 않은 URL 입니다.`;
      } else if(error.response) {
        message = error.response.statusText;
      }
      throw new Error(message);
    }
  }
}

// 녹화 영상 요청 함수
async function requestRTSPArchive(socket, received, vmsName, cameraId, mainServicePrefix, mainServiceName, startDateTime) {

  const client = await pool.connect();
  const eventDateTime = updateStartDateTime(startDateTime, -3);
  try {
    let binds = [];
    const queryVms = `
      SELECT * FROM 
        ob_vms
      WHERE
        main_service_name = '${mainServiceName}'
      AND
        vms_name = '${vmsName}';
      `;
    const resVms = await client.query(queryVms, binds);
    if(!resVms || !resVms.rows || resVms.rows.length !== 1){
      console.log(`해당 vms(${vmsName})가 없습니다.`);
      return;
    }
    const vms = resVms.rows[0];
    const res = await streamingVms(vms);
    if(res.success){
      return res;
    } else {
      const result = await requestDomainVmsList(vmsName, mainServiceName, streamingVms);
      if(!result.success){
        global.websocket.emit(`${mainServicePrefix}_archiveStreamErr`, { 
          cameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
          message: result.message || 'VMS RTSP 스트리밍 요청에 실패했습니다.'  
        });
      }
    }
  } catch (error) {
    logger.info('worker/serverSocket.js, function requestRTSPArchive, error: ', error);
    console.log('worker/serverSocket.js, function requestRTSPArchive, error: ', error);
    await requestDomainVmsList(vmsName, mainServiceName, streamingVms);
    global.websocket.emit(`${mainServicePrefix}_archiveStreamErr`, { 
      cameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
      startDateTime,
      message: error.message || 'VMS RTSP 녹화 스트리밍 요청에 실패했습니다.'  
    });
  } finally {
    await client.release();
  }
   /* vms streaming request code */
  async function streamingVms(vms) {
    try {
      let username = 'root';
      let password = 'root';
      let mgist_ip = 'localhost';
      let mgist_port = 80;

      username = vms.vms_id;
      password = vms.vms_pw;
      mgist_ip = vms.vms_ip;
      mgist_port = vms.vms_port;

      const timeout = 6000;
      const streamInfoUrl = `http://${username}:${password}@${mgist_ip}:${mgist_port}/live/media/${vmsName}/DeviceIpint.${cameraId.split('.')[0]}/SourceEndpoint.video:0:0?format=rtsp`;
      const streamInfo = await axios.get(streamInfoUrl, { timeout });
      if(streamInfo.status === 200) {
        const rtsp_path = streamInfo.data.rtsp.path;
        const rtsp_port = streamInfo.data.rtsp.port;
        // const url = `rtsp://${username}:${password}@${mgist_ip}:${rtst_port}/${accessPoint.replace('0:0', '0:1')}`;
        const url = `rtsp://${username}:${password}@${mgist_ip}:${rtsp_port}/archive/${rtsp_path}/${eventDateTime}?speed=1`;
        console.log('arhive stream url: ', url);
        const stream = new rtsp.FFMpeg({
          input: url,
          rate: 10,
          resolution: '1920x1080',
          quality: 3,
          arguments: [
            '-rtsp_transport', 'tcp',
            //  '-vf', 'nlmeans'
          ]
        });
        mapArchive.set(socket.id, [{ cameraId: received.cameraId, stream, startDateTime }]);
        console.log(`${received.cameraId} 녹화 영상 시작`, new Date());
        // 소켓, 각 서비스별로
        const pipeStream = (data) => {
          socket.emit(`${mainServicePrefix}_archiveStream`, {
            cameraId: received.cameraId,
            data: data.toString('base64'),
            startDateTime
          });
        }
        stream.on('data', pipeStream);
        return {
          success: true
        }
      } else {
        console.log('The camera does not have an rtsp path');
        return {
          success: false,
          message: '해당 카메라의 RTSP 정보가 없습니다.'
        }
      }
    } catch(error) {
      console.log('streaming main code error: ', error);
      let message = '';
      if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
        message = `VMS 서버에 연결이 되지 않습니다.`;
      } else if(error.code === 'ECONNABORTED') {
        message = `VMS 요청시간을 초과하였습니다.`;
      } else if(error.code === 'ERR_INVALID_URL') {
        message = `유효하지 않은 URL 입니다.`;
      } else if(error.response) {
        message = error.response.statusText;
      }
      throw new Error(message);
    }
  }
}

// 이벤트 팝업 종료 함수(라이브)
async function stopRtspEvent(closeSocket, eventCameraId) {

  try {
    
    const isRtspEvent = mapStreamEvent.get(eventCameraId);

    if(isRtspEvent) {

      const { sockets, stream } = isRtspEvent;
      const filteredSockets = sockets.filter((socket) => socket.id !== closeSocket.id);

      if(filteredSockets.length === 0 && stream) {
        stream.stop();
        mapStreamEvent.delete(eventCameraId);
        return;
      }

      mapStreamEvent.set(eventCameraId, { sockets: Array.from(filteredSockets), stream });
    }

  } catch (error) {
    logger.info('worker/serverSocket.js, function stopRtspEvent, error: ', error);
    console.error('worker/serverSocket.js, function stopRtspEvent, error: ', error);
  }  
}

// 이벤트 SOP 종료 함수(녹화)
async function stopRtspSOPEvent(closeSocket, eventCameraId, startDateTime) {

  try {
    const isRtspSOPEvent = mapArchiveSOP.get(`${eventCameraId}-${startDateTime}`);

    if(isRtspSOPEvent) {
      const { sockets, stream } = isRtspSOPEvent;
      const filteredSockets = sockets.filter((socket) => socket.id !== closeSocket.id);

      if(filteredSockets.length === 0 && stream) {
        stream.stop();
        mapArchiveSOP.delete(`${eventCameraId}-${startDateTime}`);
        return;
      }

      mapArchiveSOP.set(`${eventCameraId}-${startDateTime}`, { sockets: Array.from(filteredSockets), stream });
    }

  } catch (error) {
    logger.info('worker/serverSocket.js, function stopRtspSOPEvent, error: ', error);
    console.error('worker/serverSocket.js, function stopRtspSOPEvent, error: ', error);
  }  
}

/**
 * VMS 요청 연결 실패 시 다른 VMS에 요청
 * *전제: VMS List가 같은 도메인이어야 함
 */
async function requestDomainVmsList(vmsName, mainServiceName, callback) {
  let result = {
    success: false
  }
  let binds = [];
  const query = `
  SELECT * FROM 
    ob_vms
  WHERE
    main_service_name = '${mainServiceName}'
    AND
    vms_name != '${vmsName}';
  `;
  const client = await pool.connect();
  try {
    const resVmsList = await client.query(query, binds);
    if (resVmsList && resVmsList.rows.length > 0) {
      for(let vms of resVmsList.rows) {
          const result = await callback(vms);
          if(result.success){
            result.success = true;
            break; // 영상 찾으면 반복문 탈출
          }
      }
      return result;
    };
  } catch (error) {
    logger.info('worker/serverSocket.js, function requestRTSP, other same domain VMS List, error: ', error);
    console.log('worker/serverSocket.js, function requestRTSP, other same domain VMS List, error: ', error);
    result.message = error.message;
  } finally {
    client.release();
  };
}