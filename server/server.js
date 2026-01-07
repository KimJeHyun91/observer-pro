const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const cron = require('node-cron');
const socketIO = require('socket.io');
const { serverConfig, mapConfig, failOverConfig } = require('./config');
const WebSocket = require('ws');
const axios = require('axios');
const fs = require('fs');  

const app = express();

app.use(express.json({ limit: '1000mb', extended: true }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));

let corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.7.199:5173'
    // prod
    // 'http://192.168.7.119:5173',
    // 'http://192.168.7.249:5173'
  ],
  credentials: true
};
app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(express.text());
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'build'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));
app.use(express.static(path.join(process.cwd(), 'public')));
// app.use('/tiles', express.static(path.join(process.cwd(), 'public/tiles')));

/**
   지도 타일 정적 매핑
 */
const TILES_DIR =
  process.env.TILES_SRC || 'C:\\GIT\\tiles';
const SAT_TILES_DIR =
  process.env.SAT_TILES_SRC || process.env.TILES_SAT_SRC || 'C:\\GIT\\satellite_tiles';

console.log('[tiles] mount =>', TILES_DIR);
console.log('[satellite_tiles] mount =>', SAT_TILES_DIR);

// 경로 존재 여부만 확인 (스캔/복사 없음)
if (!fs.existsSync(TILES_DIR)) {
  console.warn('[tiles] source missing:', TILES_DIR);
}
if (!fs.existsSync(SAT_TILES_DIR)) {
  console.warn('[satellite_tiles] source missing:', SAT_TILES_DIR);
}

// ⚠️ SPA 캐치올/다른 static보다 "먼저" 선언해야 함
app.use('/tiles', express.static(TILES_DIR, {
  maxAge: '30d',
  immutable: true,
  etag: false,
  lastModified: false,
  fallthrough: false, // ← 파일 없으면 여기서 404로 끝 (SPA로 안 넘어감)
}));

app.use('/satellite_tiles', express.static(SAT_TILES_DIR, {
  maxAge: '30d',
  immutable: true,
  etag: false,
  lastModified: false,
  fallthrough: false, // ← 동일
}));

/**
   log manage
 */
const { cleanupOldLogs } = require('./utils/addOperLog');
cron.schedule('0 0 * * *', cleanupOldLogs);

/**
 * DB manager
 */
const dbmanager = require('./db/dbmanager');

/**
 * session
 */
const exSession = require('express-session');
const pgSession = require('connect-pg-simple')(exSession);
const { pool } = require('./db/postgresqlPool');
const sessionMaxAge = 1000 * 60 * 60 * 24; // 24시간

app.use(exSession({
  store: new pgSession({
    pool: pool,                  // PostgreSQL 연결 풀
    tableName: 'users_session',  // 테이블 이름 (기본값: 'session')
    createTableIfMissing: true, // 자동 생성 옵션
  }),
  secret: 'observer_pro', // 세션을 암호화하기 위한 비밀 키
  resave: false, // 변경되지 않아도 세션을 항상 저장할지 여부
  saveUninitialized: false, // 초기화되지 않은 세션도 저장할지 여부
  rolling: false,
  cookie: {
    maxAge: sessionMaxAge, // 브라우저 쿠키 유효기간
    httpOnly: true, // httpOnly or not (default true)
    secure: false, // true면 HTTPS 환경에서만 쿠키 전송
  },
}));

/**
 * Router
 */

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const commonRouter = require('./routes/commonRouter');
app.use('/api/common', commonRouter);

const observerRouter = require('./routes/observerRouter');
app.use('/api/observer', observerRouter);

const inundationRouter = require('./routes/inundationRouter');
app.use('/api/inundation', inundationRouter);

const parkingRouter = require('./routes/parkingRouter');
app.use('/api/parking', parkingRouter);

// const parkingFeeRouter = require('./routes/parkingFeeRouter');
// app.use('/api/parkingFee', parkingFeeRouter);
const parkingFeeRouter = require('./parking-fee-server-refactoring/src/api/routes');
app.use('/api/parking-fee', parkingFeeRouter);

const broadcastRouter = require('./routes/broadcastRouter');
app.use('/api/broadcast', broadcastRouter);

const tunnelRouter = require('./routes/tunnelRouter');
app.use('/api/tunnel', tunnelRouter);

const productManagerRouter = require('./routes/productManagerRouter');
app.use('/api/productManager', productManagerRouter);

const threedRouter = require('./routes/threedRouter');
app.use('/api/threed', threedRouter);

const waterLevelGroupRouter = require('./routes/waterLevelGroupRouter');
app.use('/api/waterLevelGroup', waterLevelGroupRouter);

// map initial position
app.get("/api/config", (req, res) => {
  res.json({
    initialLat: mapConfig.initialLat,
    initialLng: mapConfig.initialLng,
  });
});

// app.get('*', (req, res) => {
//   res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
// });

/**
 * Create Server dependencies.
 */
const debug = require('debug')('observer-server:server');
const http = require('http');
const { spawn } = require('child_process');

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(serverConfig.PORT || '4200');
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);
const clients = new Map();
const controlWSServer = new WebSocket.Server({ noServer: true });
const streamWSServer = new WebSocket.Server({ noServer: true });

// ffmpeg 프로세스를 생성하여 rtsp 영상을 mpeg-ts 스트림으로 변환
function createFFmpegStream(rtspUrl, cameraId, key, onData) {
  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',         // rtsp 연결 방식: tcp
    '-fflags', '+genpts',             // pts 생성 옵션
    '-i', rtspUrl,                    // 입력 스트림 (rtsp url)
    '-an',                            // 오디오 제거
    '-threads', '1',                  // 멀티스레드 제한
    '-c:v', 'mpeg1video',             // 비디오 코덱 설정
    '-b:v', '500k',                   // 비트레이트
    '-r', '30',                       // FPS 설정
    '-s', '640x360',                  // 출력 해상도
    '-f', 'mpegts',                   // 출력 포맷
    '-'                               // stdout으로 출력
  ]);

  // ffmpeg 으로 수신한 비디오 데이터를 콜백에 전달
  ffmpeg.stdout.on('data', onData);

  /**
   * ffmpeg stderr 로그에서 감지할 에러 메시지 패턴 정의
   * - 필요한 경우 다른 ffmpeg의 오류 패턴을 추가 하면 됩니다
   */
  const errorPattern = [
    'Server returned',         // 서버 응답 오류
    'method DESCRIBE failed',  // 인증/권한 오류
    'Connection refused',      // 포트 거부
    'Connection timed out',    // 연결 시간 초과
    'Network is unreachable',  // 네트워크 끊김
    'Immediate exit requested' // 강제 종료
  ];

  // ffmpeg stderr 로그 출력 및 오류 감지 처리
  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();

    // 타겟 ffmpeg 실행 중인지 보려면 주석 해제
    // console.log(`[${key} 번 카메라 FFmpeg ]${data}`);
    const m = msg.match(/RTSP\/1\.\d\s+(\d{3})\s+([^\r\n]+)/);
    if (m) {
      const [, code, reason] = m;
      console.log('RTSP status:', code, reason);
    }
    // rtsp 서버 오류 메시지 감지 시 클라이언트에 에러 전송
    if (errorPattern.some(p => msg.includes(p))) {
      sendErrorToClients(cameraId, `카메라 스트림 연결 실패`);
    }
  });

  // ffmpeg 종료 이벤트 처리 - 종료 로그만 출력하며 실제 로직에는 관여하지 않음
  ffmpeg.on('exit', (code, signal) => {
    if (code !== null) {
      console.log(`FFmpeg 프로세스 종료됨 / 종료 코드:  ${code}`);
    } else {
      console.log(`FFmpeg 프로세스 종료됨 / 종료 신호: ${signal}`);
    }
  });

  // ffmpeg 실행 에러 처리
  ffmpeg.on('error', (err) => {
    console.log(`FFmpeg 프로세스 오류: `, err);
  });

  return ffmpeg;
}

// webSocket 업그레이드 처리
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/control') {
    controlWSServer.handleUpgrade(req, socket, head, (ws) => {
      controlWSServer.emit('connection', ws, req)
    })
  } else if (req.url.startsWith('/stream/')) {
    streamWSServer.handleUpgrade(req, socket, head, (ws) => {
      streamWSServer.emit('connection', ws, req)
    })
  }
})

// 공통 에러 전송 함수
function sendErrorToClients(cameraId, message) {
  controlWSServer.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        cameraId,
        message
      }));
    }
  });
}

const {
  getIndependentCameraList,
  findCameraAccessPointByPK,
} = require('./routes/observer/services/cameraService');

// control 소켓 연결 처리
controlWSServer.on('connection', (socket) => {
  let data;
  let cameraId;
  let key;
  let ffmpegProcess = null;
  let timeout = null;
  let rtspUrl;
  let readySent;

  // 클라이언트로부터 메시지 수신
  socket.on('message', async (msg) => {
    try {
      data = JSON.parse(msg.toString());
      cameraId = data.cameraId;
      if (data.type !== 'start') return;
      const { streamType, vms_name, main_service_name, startDateTime, service_type, access_point, camera_ip, rewind = 10 } = data;
      /* 
        TODO : 이쪽에 들어온 service_type으로 조건 줘야함 
        type : string
        ex) mgist, 개별 카메라(구분 문구)
      */

      if (streamType === 'live') {
        key = `${streamType}/${main_service_name}:${vms_name}:${cameraId}`;
      } else if (streamType === 'archive' && startDateTime) {
        key = `${streamType}/${main_service_name}:${vms_name}:${cameraId}:${startDateTime}`;
      };
      // 이미 stream이 존재하면 재생성하지 않고 바로 응답
      if (clients.has(key)) {
        console.log(`이미 실행 중인 스트림 cameraId  ${cameraId}`);

        socket.send(JSON.stringify({
          type: 'ready',
          cameraId
        }));
        return;
      }

      if (service_type === 'mgist') {
        let mgist_ip, mgist_port, username, password;
        const vms = await requestFindVms(main_service_name, vms_name);
        mgist_ip = vms.vms_ip;
        mgist_port = vms.vms_port;
        username = vms.vms_id;
        password = vms.vms_pw;

        let isFailOver = false;
        // rtsp stream 정보 요청
        let streamInfo;

        try {
          streamInfo = await getStreamInfo({ username, password, mgist_ip, mgist_port, access_point, vms_name, main_service_name });
        } catch (error) {
          if (error.code === 'ECONNABORTED') {
            mgist_ip = failOverConfig.ip;
            mgist_port = failOverConfig.port
            isFailOver = true;
            // streamInfo = await getStreamInfo({ username, password, mgist_ip, mgist_port, vms_name, cameraId });

            // // 필요 시 아래 주석도 사용 가능
            // const result = await requestDomainVmsList(main_service_name, vms_name, cameraId, getStreamInfo);
            // if (result.success) {
            //   streamInfo = result.data;
            // }
          } else {
            // 다른 에러는 다시 throw 하거나 처리
            console.error(error);
          }
        }
        if (isFailOver === false && (streamInfo == null || streamInfo.data == null || streamInfo.data.rtsp == null)) {
          return;
        };
        // rtsp 최종 url 구성
        let path, port;
        if (streamInfo && streamInfo.data && streamInfo.data.rtsp) {
          path = streamInfo.data.rtsp.path;
          port = streamInfo.data.rtsp.port;
        }
        const safeUser = encodeURIComponent(username);
        const safePass = encodeURIComponent(password);

        if (streamType === 'live') {
          rtspUrl = isFailOver === false ?
            `rtsp://${safeUser}:${safePass}@${mgist_ip}:${port}/${path}`
            :
            `rtsp://${safeUser}:${safePass}@${mgist_ip}:${mgist_port}/${access_point}`;
        } else if (streamType === 'archive') {
          rtspUrl = isFailOver === false ?
            `rtsp://${safeUser}:${safePass}@${mgist_ip}:${port}/${streamType}/${path}/${updateStartDateTime(startDateTime, -rewind)}?speed=1`
            :
            `rtsp://${safeUser}:${safePass}@${mgist_ip}:${mgist_port}/${streamType}/${access_point}/${updateStartDateTime(startDateTime, -rewind)}?speed=1`;
        }
        readySent = false;
      } else if (service_type === 'independent' && access_point) {
        const [id, pw, , profileToken] = access_point.split('\n');
        rtspUrl = await getRtspFromOnvif({
          CAM_HOST: camera_ip,
          CAM_USER: id,
          CAM_PASS: pw,
          userProfileToken: profileToken
        });
      } else if (service_type === 'independent' && access_point == null) {
        const findCameras = await getIndependentCameraList({ mainServiceName: main_service_name, cameraId });
        const access_point = findCameras[0].access_point;
        const camera_ip = findCameras[0].camera_ip;
        const [id, pw, , profileToken] = access_point.split('\n');
        rtspUrl = await getRtspFromOnvif({
          CAM_HOST: camera_ip,
          CAM_USER: id,
          CAM_PASS: pw,
          userProfileToken: profileToken
        });
      }
      console.log('rtspUrl:', rtspUrl);
      // ffmpeg 생성 및 연결
      ffmpegProcess = createFFmpegStream(rtspUrl, cameraId, key, (chunk) => {
        const streamData = clients.get(key);

        if (!streamData || !Array.isArray(streamData.sockets)) return;

        if (!readySent) {
          socket.send(JSON.stringify({
            type: 'ready',
            cameraId
          }));
          readySent = true;
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
        }

        if (!streamData || !Array.isArray(streamData.sockets)) return;

        // 연결 된 stream 소켓으로 전송
        streamData.sockets.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(chunk);
            } catch (e) {
              console.warn(`웹 소켓 에러  ${key}:`, e.message);
            }
          }
        });
      });

      // 30초 이상 연결이 지연되면 중단
      timeout = setTimeout(() => {
        if (!readySent) {
          console.log(`[${key}] FFmpeg 연결 지연 - 30초 초과 중단`);

          socket.send(JSON.stringify({
            type: 'error',
            cameraId,
          }));

          ffmpegProcess.kill('SIGINT');
          clients.delete(key);
        }
      }, 30000);

      // stream 상태 저장
      clients.set(key, {
        sockets: [],
        ffmpeg: ffmpegProcess
      });
    } catch (e) {
      console.log('Stream 생성 실패:', e.message);
      console.error('Stream 생성 실패:', e.message);
      const message = e.code === 'ECONNABORTED' ? '스트리밍 요청 시간이 초과 했습니다.' : e.message;
      socket.send(JSON.stringify({
        type: 'error',
        cameraId: data?.cameraId || '-000',
        message
      }));
    }

    async function getStreamInfo({ username, password, mgist_ip, mgist_port, vms_name, access_point, main_service_name }) {
      let streamInfoUrl;
      if(access_point != null) {
        streamInfoUrl =  `http://${mgist_ip}:${mgist_port}/live/media/${access_point.split('hosts/')[1]}?format=rtsp`;
      } else {
        const result = await findCameraAccessPointByPK({ mainServiceName: main_service_name, vmsName: vms_name, cameraId });
        if(result.length === 0) {
          throw new Error('카메라 정보를 찾을 수 없습니다.');
        }
        streamInfoUrl =  `http://${mgist_ip}:${mgist_port}/live/media/${result[0].access_point.split('hosts/')[1]}?format=rtsp`;
      }
      const response = await axios.get(streamInfoUrl, {
        auth: {
          username,
          password
        },
        timeout: 1000
      });
      return response;
    };
    // function normalizeNumber(value) {
    //   return value % 1 === 0 ? parseInt(value) : parseFloat(value.toString());
    // }
  });

  // control 소켓이 닫힐 때 ffmpeg 및 상태 정리 (연결 중 닫힐 시)
  socket.on('close', () => {
    if (!key) return;

    const current = clients.get(key);

    if (!current) {
      ffmpegProcess?.kill('SIGINT');
      return;
    }

    if (current.sockets.length === 0) {
      console.log(`연결 중 소켓 닫힘 / 스트림 종료: ${key}`);
      current.ffmpeg?.kill('SIGINT');
      clients.delete(key);
    }

    // ffmpeg 종료 이후에 timeout 정리
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  });
});

// stream 소켓 연결 처리
streamWSServer.on('connection', (socket, req) => {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`);
  const cameraId = parsedUrl.pathname.split('/').pop();
  const vms_name = parsedUrl.searchParams.get('vms');
  const main_service_name = parsedUrl.searchParams.get('mainServiceName');
  const streamType = parsedUrl.searchParams.get('streamType');
  const startDateTime = parsedUrl.searchParams.get('startDateTime');
  let key;

  if (streamType === 'live') {
    key = `${streamType}/${main_service_name}:${vms_name}:${cameraId}`;
  } else if (streamType === 'archive' && startDateTime) {
    key = `${streamType}/${main_service_name}:${vms_name}:${cameraId}:${startDateTime}`;
  };

  const streamData = clients.get(key);
  if (!cameraId || !streamData) {
    console.log(`${key} 번 카메라 stream 없음`);
    return socket.close();
  }

  // stream 소켓 등록
  streamData.sockets.push(socket);
  console.log(`소켓 연결 / FFmpeg 시작 / 카메라 ID : ${key}`);

  // stream 소켓 연결 종료 시
  socket.on('close', () => {
    const current = clients.get(key);
    if (!current) return;

    // 연결 제거
    current.sockets = current.sockets.filter((s) => s !== socket);

    // 연결이 끝나면 ffmpeg 종료
    if (current.sockets.length === 0) {
      console.log(`모든 소켓 종료 / FFmpeg 종료 / 카메라 ID : ${key}`);
      current.ffmpeg?.kill('SIGINT');
      clients.delete(key);
    } else {
      clients.set(key, current);
    }
  });
});

/**
* Listen on provided port, on all network interfaces.
*/
const ip = require('ip');
const { requestFindVms } = require('./worker/rtspStream');
const { updateStartDateTime } = require('./utils/calcDateTime');
const { startDevicePolling } = require('./worker/inundation/inundationPolling');
// ajy 추가
const { waterLevelConnect } = require('./worker/tunnel/waterLevelConnect');
const { deletePostgresqlLog } = require("./worker/common/deletePostgresqlLog");
// 지도 타일 심볼릭 링크 생성
// const { linkTiles } = require("./worker/common/linkTiles");
const { getRtspFromOnvif } = require('./worker/common/onvifStream');
const crossingGateSocketControl = require('./worker/inundation/crossingGateSocketControl');
// const maintenanceNotification = require('./worker/productManager/maintenanceNotification');
const maintenanceNotification = require('./worker/productManager/maintenanceNotification');
// const cp100Control = require('./worker/inundation/cp100WaterLevelSocketControl');
const { connectEbellServer } = require('./worker/pollings/ebellSocketClient');
const { startCheckOriginDevices } = require('./worker/main/checkDevices');
const { autoSyncGuardianlites } = require('./worker/main/guardianlitePolling');

const initializeServer = async () => {
  try {
    await dbmanager.initMainDb();

    const io = socketIO(server, { cors: { origin: '*' } });
    require('./worker/serverSocket')(io);
    require('./worker/inundation/crossingGateSocketControl')(io);
    // cp100Control.cp100SocketHandler(io);
    // require('./worker/inundation/greenParkingGateSocketControl')(io);
    const billboardSocketControl = require('./worker/inundation/billboardSocketControl');
    billboardSocketControl.init(io);
    // connectEbellServer();
    // autoSyncGuardianlites();
    // startCheckOriginDevices();
    const barrierStatusSocketControl = require('./worker/tunnel/barrierStatusSocketControl');
    barrierStatusSocketControl.init(io);

    // require('./worker/parkingFee/parkingFeeSocketClient').getParkingFeeListInit(); // 그린파킹 주차장 소켓 연결(init), 사용안함
    const tmBillboardSocketControl = require('./worker/tunnel/billboardSocketControl');
    tmBillboardSocketControl.init(io);

    startDevicePolling();
    waterLevelConnect();
    deletePostgresqlLog();
    // linkTiles();

    server.listen(port, '0.0.0.0', () => { // '0.0.0.0' ipv4 로 출력하기 위해
      console.log('Server Start => ' + ip.address() + ':' + port);

      const actualIP = ip.address();
      serverConfig.IPv4 = actualIP;

    });

    // io.on("connection", socket => {
    //     console.log("socket connected:", socket.id);

    //     socket.on("pf_lpr-update", data => {
    //         io.emit("pf_lpr-update", data);
    //     });

    //     socket.on("pf_gate_state-update", data => {
    //         io.emit("pf_gate_state-update", data);
    //     });

    //     socket.on("pf_fee_calculation_result-update", data => {
    //         io.emit("pf_fee_calculation_result-update", data);
    //     });
    // });

    // 유지보수 만료 알림 전송(매일 오후 12시)
    // maintenanceNotification.startScheduler();

  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
};

/**
 * Start server initialization
 */
initializeServer();

server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const normalize_port = parseInt(val, 10);

  if (isNaN(normalize_port)) {
    // named pipe
    return val;
  }

  if (normalize_port >= 0) {
    // port number
    return normalize_port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

const { syncGuardianlites } = require('./worker/inundation/guardianlitePolling');
const billboardSocketControl = require('./worker/inundation/billboardSocketControl');
// const cp100WaterLevelControl = require('./worker/inundation/cp100WaterLevelSocketControl');


app.post('/api/inundation/resetSocket', async (req, res) => {
  try {
    const foreverProcess = spawn('forever', ['restart', 'observer-server'], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    foreverProcess.unref();
    await crossingGateSocketControl.initializeCrossingGates();
    await syncGuardianlites();
    await billboardSocketControl.initializeBillboards();
    // await cp100Control.initializeCP100Connections();
    res.json({ message: '서버 재시작이 시작되었습니다.' });
  } catch (error) {
    console.error('Forever 재시작 에러:', error);
    res.status(500).json({ error: '재시작 시작에 실패했습니다.' });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  if (req.path.match(/\.(js|css|map|ico|png|jpg|jpeg|gif|svg)$/)) {
    return res.status(404).send('File not found');
  }

  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

module.exports = app;
