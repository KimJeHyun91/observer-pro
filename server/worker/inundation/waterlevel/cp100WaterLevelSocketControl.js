const net = require("net");
const EventEmitter = require("events");
const { pool } = require("../../../db/postgresqlPool");
const logger = require("../../../logger");
const { addOperLog } = require("../../../utils/addOperLog");
const { executeAutoControlWithGroupCheck } = require('./waterlevelAutoControl');

const waterLevelState = new Map();
const waterLevelEmitter = new EventEmitter();

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
};

// 자동 재연결 설정
const RECONNECTION_CONFIG = {
  DATA_TIMEOUT: 30000,       
  MAX_RETRY_COUNT: 5,        
  RETRY_DELAY_BASE: 5000,    
  MAX_RETRY_DELAY: 60000,    
  HEALTH_CHECK_INTERVAL: 10000
};

const healthCheckTimers = new Map();

const startHealthCheck = (ipaddress) => {
  if (healthCheckTimers.has(ipaddress)) {
    clearInterval(healthCheckTimers.get(ipaddress));
  }

  const timer = setInterval(async () => {
    const state = waterLevelState.get(ipaddress);
    if (!state) return;

    const now = Date.now();
    const timeSinceLastData = state.lastDataTime ? now - state.lastDataTime : Infinity;

    logger.debug(`[CP100] 헬스 체크: ${ipaddress}, 마지막 데이터: ${timeSinceLastData}ms 전, 상태: ${state.status}`);

    if (state.status === CONNECTION_STATUS.CONNECTED && 
        timeSinceLastData > RECONNECTION_CONFIG.DATA_TIMEOUT) {
      
      logger.warn(`[CP100] 데이터 타임아웃: ${ipaddress}, ${timeSinceLastData}ms 동안 데이터 없음, 재연결 시도`);
      
      if (state.socket && !state.socket.destroyed) {
        state.socket.destroy();
      }
      
      await attemptReconnection(ipaddress);
    }
  }, RECONNECTION_CONFIG.HEALTH_CHECK_INTERVAL);

  healthCheckTimers.set(ipaddress, timer);
};

const attemptReconnection = async (ipaddress) => {
  const state = waterLevelState.get(ipaddress);
  if (!state) return;

  if (state.retryCount >= RECONNECTION_CONFIG.MAX_RETRY_COUNT) {
    logger.error(`[CP100] 최대 재시도 횟수 초과: ${ipaddress}, 재연결 포기`);
    state.status = CONNECTION_STATUS.DISCONNECTED;
    waterLevelState.set(ipaddress, state);
    await updateWaterLevelStatusInDB(ipaddress, false);
    return;
  }

  const retryCount = (state.retryCount || 0) + 1;
  const delay = Math.min(
    RECONNECTION_CONFIG.RETRY_DELAY_BASE * Math.pow(2, retryCount - 1),
    RECONNECTION_CONFIG.MAX_RETRY_DELAY
  );

  logger.info(`[CP100] 재연결 시도: ${ipaddress}, ${retryCount}/${RECONNECTION_CONFIG.MAX_RETRY_COUNT}, ${delay}ms 후`);

  state.status = CONNECTION_STATUS.RECONNECTING;
  state.retryCount = retryCount;
  state.lastRetryTime = Date.now();
  waterLevelState.set(ipaddress, state);

  setTimeout(async () => {
    try {
      await connectTcp(ipaddress, 4470, retryCount);
    } catch (error) {
      logger.error(`[CP100] 재연결 실패: ${ipaddress}, 오류: ${error.message}`);
      await attemptReconnection(ipaddress);
    }
  }, delay);
};

const updateLastDataTime = (ipaddress) => {
  const state = waterLevelState.get(ipaddress);
  if (state) {
    state.lastDataTime = Date.now();
    waterLevelState.set(ipaddress, state);
  }
};

const dbCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const websocketQueue = [];

const getCachedDBData = async (ip, queryType) => {
  const cacheKey = `${ip}_${queryType}`;
  const cached = dbCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  return null;
};

const setCachedDBData = (ip, queryType, data) => {
  const cacheKey = `${ip}_${queryType}`;
  dbCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

// ground_value 조회 함수
const getGroundValueFromDB = async (ip) => {
  const cached = await getCachedDBData(ip, 'ground_value');
  if (cached !== null) {
    return cached;
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT ground_value FROM fl_water_level WHERE water_level_ip = $1", [ip]);
    const groundValue = parseInt(result.rows[0]?.ground_value || "10000");

    setCachedDBData(ip, 'ground_value', groundValue);
    return groundValue;
  } catch (error) {
    logger.error(`ground_value 조회 오류: ${ip} - ${error.message}`);
    return 10000;
  } finally {
    client.release();
  }
};

const sendWebSocketData = (event, data) => {
  if (global.websocket) {
    global.websocket.emit(event, data);
    // logger.info(`WebSocket 전송 성공: ${event}`);
    return true;
  } else {
    websocketQueue.push({ event, data, timestamp: Date.now() });
    if (websocketQueue.length > 100) {
      websocketQueue.shift(); // 가장 오래된 데이터 제거
    }
    logger.warn(`WebSocket 연결 없음, 데이터 큐에 저장: ${event}, 큐 크기: ${websocketQueue.length}`);
    return false;
  }
};

const flushWebSocketQueue = () => {
  if (!global.websocket || !global.websocket.connected) return;

  while (websocketQueue.length > 0) {
    const queuedData = websocketQueue.shift();
    global.websocket.emit(queuedData.event, queuedData.data);
    logger.info(`큐에 저장된 데이터 전송: ${queuedData.event}`);
  }
};

const connectTcp = async (ipaddress, port = 4470, retryCount = 0) => {
  const MAX_RETRY_COUNT = 3;
  const connection = waterLevelState.get(ipaddress);

  if (connection && connection.status === CONNECTION_STATUS.CONNECTED) {
    logger.info(`[CP100] 이미 연결됨: ${ipaddress}:${port}`);
    return connection.socket;
  }

  if (connection && connection.status === CONNECTION_STATUS.CONNECTING) {
    logger.info(`[CP100] 연결 중: ${ipaddress}:${port}`);
    return null;
  }

  if (retryCount >= MAX_RETRY_COUNT) {
    logger.error(`최대 재시도 횟수(${MAX_RETRY_COUNT}) 도달: ${ipaddress}:${port}`);
    waterLevelState.set(ipaddress, {
      status: CONNECTION_STATUS.DISCONNECTED,
      retryCount: retryCount,
      lastRetryTime: Date.now()
    });
    await updateWaterLevelStatusInDB(ipaddress, false);
    return null;
  }

  logger.info(`[CP100] TCP 연결 시도: ${ipaddress}:${port}, 재시도 횟수: ${retryCount}`);
  waterLevelState.set(ipaddress, {
    status: CONNECTION_STATUS.CONNECTING,
    retryCount: retryCount,
    lastRetryTime: Date.now(),
    lastDataTime: null
  });

  const socket = net.connect({ host: ipaddress, port, timeout: 10000 });
  socket.setEncoding("utf8");
  socket.setKeepAlive(true, 5000);

  return new Promise((resolve, reject) => {
    let setGroundResponseReceived = false;
    let setGroundTimeout = null;
    let reconnectTimeout = null;

    socket.on("connect", async () => {
      const groundValue = await getGroundValueFromDB(ipaddress);
      waterLevelState.set(ipaddress, {
        status: CONNECTION_STATUS.CONNECTED,
        socket,
        buffer: "",
        history: [],
        retryCount: 0,
        setGroundValue: groundValue,
        lastRetryTime: null,
        reconnectTimeout: null,
        lastDataTime: Date.now()
      });

      socket.write(`+SetGround=${groundValue}\r`);
      logger.info(`[CP100] SetGround 명령 전송: ${ipaddress}, ground_value=${groundValue}`);

      startHealthCheck(ipaddress);

      setGroundTimeout = setTimeout(() => {
        if (!setGroundResponseReceived) {
          logger.warn(`[CP100] SetGround 응답 타임아웃: ${ipaddress}`);
          socket.destroy();

          const currentState = waterLevelState.get(ipaddress);
          if (currentState && currentState.retryCount < MAX_RETRY_COUNT) {
            const delay = Math.min(5000 * Math.pow(2, currentState.retryCount), 30000);
            logger.info(`[CP100] SetGround 타임아웃 후 재연결 시도: ${ipaddress}, ${delay}ms 후`);
            setTimeout(() => {
              connectTcp(ipaddress, port, currentState.retryCount + 1);
            }, delay);
          }
        }
      }, 3000);

      updateWaterLevelStatusInDB(ipaddress, true);
      logger.info(`[CP100] 연결 성공 및 헬스 체크 시작: ${ipaddress}:${port}`);
      resolve(socket);
    });

    socket.on("data", (data) => {
      const dataStr = data.toString();

      if (dataStr.includes("-SetGround=")) {
        setGroundResponseReceived = true;
        if (setGroundTimeout) {
          clearTimeout(setGroundTimeout);
          setGroundTimeout = null;
        }

        const match = dataStr.match(/-SetGround=(\d+)/);
        if (match) {
          const setGroundValue = parseInt(match[1]);
          const state = waterLevelState.get(ipaddress);
          if (state) {
            state.setGroundValue = setGroundValue;
            waterLevelState.set(ipaddress, state);
            logger.info(`[CP100] SetGround 설정 완료: ${ipaddress}, 값=${setGroundValue}`);
          }
        }
        return;
      }

      updateLastDataTime(ipaddress);
      onWaterLevelDataReceived(ipaddress, dataStr);
    });

    socket.on("error", async (err) => {
      logger.error(`[CP100] 연결 오류: ${ipaddress}:${port} - ${err.message}`);

      if (setGroundTimeout) {
        clearTimeout(setGroundTimeout);
        setGroundTimeout = null;
      }

      if (healthCheckTimers.has(ipaddress)) {
        clearInterval(healthCheckTimers.get(ipaddress));
        healthCheckTimers.delete(ipaddress);
      }

      waterLevelState.set(ipaddress, {
        status: CONNECTION_STATUS.DISCONNECTED,
        retryCount: retryCount + 1,
        lastRetryTime: Date.now()
      });
      await updateWaterLevelStatusInDB(ipaddress, false);
      socket.destroy();

      if (retryCount < MAX_RETRY_COUNT && !reconnectTimeout) {
        const delay = Math.min(5000 * Math.pow(2, retryCount), 30000);
        reconnectTimeout = setTimeout(() => {
          connectTcp(ipaddress, port, retryCount + 1);
        }, delay);
      }
      reject(err);
    });

    socket.on("timeout", () => {
      logger.warn(`[CP100] 소켓 타임아웃: ${ipaddress}:${port}`);

      if (setGroundTimeout) {
        clearTimeout(setGroundTimeout);
        setGroundTimeout = null;
      }

      socket.destroy();

      if (retryCount < MAX_RETRY_COUNT && !reconnectTimeout) {
        const delay = Math.min(5000 * Math.pow(2, retryCount), 30000);
        reconnectTimeout = setTimeout(() => {
          connectTcp(ipaddress, port, retryCount + 1);
        }, delay);
      }
      reject(new Error("Socket timeout"));
    });

    socket.on("close", async () => {
      logger.info(`[CP100] 연결 종료: ${ipaddress}:${port}`);

      if (setGroundTimeout) {
        clearTimeout(setGroundTimeout);
        setGroundTimeout = null;
      }

      if (healthCheckTimers.has(ipaddress)) {
        clearInterval(healthCheckTimers.get(ipaddress));
        healthCheckTimers.delete(ipaddress);
      }

      const currentState = waterLevelState.get(ipaddress);
      if (currentState) {
        currentState.status = CONNECTION_STATUS.DISCONNECTED;
        currentState.retryCount = (currentState.retryCount || 0) + 1;
        currentState.lastRetryTime = Date.now();
        waterLevelState.set(ipaddress, currentState);
      }

      await updateWaterLevelStatusInDB(ipaddress, false);

      if (currentState && currentState.retryCount < MAX_RETRY_COUNT && !reconnectTimeout) {
        const delay = Math.min(5000 * Math.pow(2, currentState.retryCount), 30000);
        logger.info(`[CP100] 자동 재연결 시도: ${ipaddress}:${port}, ${delay}ms 후`);
        setTimeout(() => {
          connectTcp(ipaddress, port, currentState.retryCount);
        }, delay);
      }
    });
  });
};

// 수위 데이터 변환
const onWaterLevelDataReceived = async (ip, rawData) => {
  const state = waterLevelState.get(ip) || {
    buffer: "",
    lastValue: null,
    lastSentValue: null,
    lastSentTime: null,
    history: [],
    setGroundValue: null
  };

  state.buffer += rawData;

  let messageEnd;
  while ((messageEnd = state.buffer.indexOf("\r\n")) !== -1) {
    const completeMessage = state.buffer.slice(0, messageEnd);
    state.buffer = state.buffer.slice(messageEnd + 2);

    const match = completeMessage.match(/dist:(\d{5})mm\s+pow:(\d{4})\s+gauge:([+-]?\d{5})mm/);
    if (!match) {
      logger.warn(`잘못된 데이터 형식: ${ip} - ${completeMessage}`);
      continue;
    }

    const [, dist, pow, gauge] = match.map(Number);

    let groundValue = state.setGroundValue;
    if (!groundValue) {
      try {
        groundValue = await getGroundValueFromDB(ip);
        state.setGroundValue = groundValue;
        logger.info(`[CP100] ground_value 설정: ${ip} -> ${groundValue}mm`);
      } catch (error) {
        logger.error(`[CP100] ground_value 조회 실패: ${ip} - ${error.message}`);
        groundValue = 10000; // 기본값
      }
    }

    let waterLevel;
    if (gauge !== 0) {
      waterLevel = gauge;
      logger.debug(`[CP100] gauge 값 사용: ${ip} - gauge=${gauge}mm`);
    } else {
      waterLevel = Math.max(0, groundValue - dist);
      logger.debug(`[CP100] 거리 기반 계산: ${ip} - ground=${groundValue}mm, dist=${dist}mm, waterLevel=${waterLevel}mm`);
    }

    if (isNaN(waterLevel) || waterLevel < 0) {
      logger.warn(`[CP100] 잘못된 수위 값: ${ip} - waterLevel=${waterLevel}, gauge=${gauge}, dist=${dist}, ground=${groundValue}`);
      continue;
    }

    state.history = [...(state.history || []), { waterLevel, timestamp: new Date() }].slice(-10);
    waterLevelState.set(ip, { ...state, latest: { waterLevel, timestamp: new Date() } });

    const diff = state.lastSentValue !== null && !isNaN(state.lastSentValue) ? Math.abs(waterLevel - state.lastSentValue) : 9999;
    const now = new Date();
    const timeSinceLastSent = state.lastSentTime ? now - state.lastSentTime : 999999;
    
    logger.info(`[CP100] 수위 데이터: ${ip} - waterLevel=${waterLevel}mm, lastSent=${state.lastSentValue}mm, diff=${diff}mm, timeSinceLastSent=${timeSinceLastSent}ms`);

    if (state.lastSentValue === null || diff >= 20) {
      if (state) {
      const waterLevelIdx = await getWaterLevelIdx(ip);
      const log = {
        water_level_idx: waterLevelIdx,
        water_level_ip: ip,
        water_level: (waterLevel / 1000).toFixed(3), // mm -> m, 소수점 3자리
        created_at: now.toISOString(),
        device_type: 'cp100'
      };

      // logger.info(`[CP100] 데이터 전송 준비: ${ip}, waterLevel=${waterLevel}mm (${log.water_level}m), water_level_idx=${waterLevelIdx}, diff=${diff}`);

      const sent = sendWebSocketData("fl_water_level_log-update", [log]);

      if (waterLevelIdx) {
        waterLevelEmitter.emit('data', { 
          ip, 
          waterLevel, 
          timestamp: now 
        });
        // logger.info(`Emitter 데이터 전송: waterLevelIdx=${waterLevelIdx}, waterLevel=${waterLevel}mm`);
      } else {
        logger.warn(`수위계 idx 조회 실패: ${ip}`);
      }

      const threshold = await getThresholdFromDB(ip);
      if (threshold > 0 && waterLevel > threshold * 1000) { // threshold를 mm 단위로 변환
        waterLevelEmitter.emit("thresholdExceeded", { ip, waterLevel, threshold: threshold * 1000 });
        logger.info(`임계치 초과: ${ip}, 수위=${waterLevel}mm, 임계치=${threshold * 1000}mm`);
        
        // 자동제어 실행 (그룹 체크 포함)
        try {
          logger.info(`자동제어 실행 시작 (그룹 체크 포함): IP: ${ip}`);
          await executeAutoControlWithGroupCheck(ip, waterLevel, threshold * 1000); // mm 단위로 전달
        } catch (error) {
          logger.error(`자동제어 실행 중 오류: ${ip} - ${error.message}`);
        }
      }

      const client = await pool.connect();
      try {
        await client.query(
          "INSERT INTO fl_water_level_log (water_level_idx, water_level_value, created_at) " +
          "SELECT idx, $1, NOW() FROM fl_water_level WHERE water_level_ip = $2",
          [waterLevel / 1000, ip]
        );
        // logger.info(`DB 저장 성공: ${ip}, 수위=${waterLevel / 1000}m`);
      } catch (error) {
        logger.error(`DB 저장 오류: ${ip} - ${error.message}`);
      } finally {
        client.release();
      }

      state.lastValue = waterLevel;
      state.lastSentValue = waterLevel;
      state.lastSentTime = now;
      waterLevelState.set(ip, state);
    }
    } else {
      state.lastValue = waterLevel;
      waterLevelState.set(ip, state);
    }
  }
};

// db 내부 업데이트
const updateWaterLevelStatusInDB = async (ip, useStatus) => {
  const client = await pool.connect();
  try {
    await client.query("UPDATE fl_water_level SET use_status = $1, updated_at = NOW() WHERE water_level_ip = $2", [
      useStatus,
      ip,
    ]);
    logger.info(`DB 상태 업데이트 성공: ${ip}, use_status=${useStatus}`);
  } catch (error) {
    logger.error(`DB 상태 업데이트 오류: ${ip} - ${error.message}`);
  } finally {
    client.release();
  }
};

const getWaterLevelIdx = async (ip) => {
  const cached = await getCachedDBData(ip, 'idx');
  if (cached !== null) {
    return cached;
  }

  const result = await pool.query("SELECT idx FROM fl_water_level WHERE water_level_ip = $1", [ip]);
  const idx = result.rows[0]?.idx;

  setCachedDBData(ip, 'idx', idx);
  return idx;
};

const getThresholdFromDB = async (ip) => {
  const cached = await getCachedDBData(ip, 'threshold');
  if (cached !== null) {
    return cached;
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT threshold FROM fl_water_level WHERE water_level_ip = $1", [ip]);
    const threshold = parseFloat(result.rows[0]?.threshold || "0");
    console.log(`임계치 조회 성공: ${ip}, threshold=${threshold}`);

    setCachedDBData(ip, 'threshold', threshold);
    return threshold;
  } catch (error) {
    logger.error(`임계치 조회 오류: ${ip} - ${error.message}`);
    return 0;
  } finally {
    client.release();
  }
};

const handleWaterLevelManagement = async (data) => {
    console.log(`[handleWaterLevelManagement] Received data:`, JSON.stringify(data, null, 2));
    
    let waterLevelData;
    
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return;
        }
        waterLevelData = data[0];
    } else if (typeof data === 'object' && data !== null) {
        waterLevelData = data;
        console.log(`[handleWaterLevelManagement] Processing object data:`, waterLevelData);
    } else {
        console.error(`[handleWaterLevelManagement] Invalid data type:`, typeof data, data);
        return;
    }
    
    const { cmd, ipaddress, port, id, ground_value } = waterLevelData;
    
    if (!cmd || !ipaddress || !port) {
        console.error(`[handleWaterLevelManagement] Missing field: cmd=${cmd}, ipaddress=${ipaddress}, port=${port}`);
        return;
    }

    if (port !== '4470') {
        console.log(`[${ipaddress}] CP-100가 아닌 수위계 무시: ${ipaddress}:${port}`);
        return;
    }

    try {
        if (cmd === "add") {
            if (!waterLevelState.has(ipaddress)) {
                console.log(`[${ipaddress}] CP-100 수위계 추가: ${port}`);
                
                if (ground_value) {
                    const initialState = {
                        status: CONNECTION_STATUS.CONNECTING,
                        retryCount: 0,
                        lastRetryTime: Date.now(),
                        lastDataTime: null,
                        setGroundValue: ground_value  
                    };
                    waterLevelState.set(ipaddress, initialState);
                    setCachedDBData(ipaddress, 'ground_value', ground_value);
                }
                
                const connected = await connectTcp(ipaddress, parseInt(port));
                try {
                    await addOperLog({
                        logAction: 'addoper',
                        operatorId: id,
                        logType: 'WaterLevel added',
                        logDescription: `WaterLevel(${ipaddress}:${port}) added - ${connected ? 'connected' : 'connection failed'}`
                    });
                } catch (error) {
                    console.error(`[${ipaddress}] Failed to add operation log:`, error.message);
                }
            } else {
                console.log(`[${ipaddress}] 이미 등록된 수위계 - 스킵`);
            }
            
        } else if (cmd === "modify") {
            console.log(`[${ipaddress}] CP-100 수위계 수정 - ground_value: ${ground_value}`);
            
            const connection = waterLevelState.get(ipaddress);
            
            if (connection?.socket && !connection.socket.destroyed && ground_value) {
                console.log(`[${ipaddress}] 기존 연결 유지, SetGround 재전송: ${ground_value}mm`);
                
                connection.socket.write(`+SetGround=${ground_value}\r`);
                
                connection.setGroundValue = ground_value;
                waterLevelState.set(ipaddress, connection);
                
                dbCache.delete(`${ipaddress}_ground_value`);
                setCachedDBData(ipaddress, 'ground_value', ground_value);
                
                logger.info(`[CP100] ground_value 업데이트 완료: ${ipaddress} -> ${ground_value}mm`);
                
                try {
                    await addOperLog({
                        logAction: 'addoper',
                        operatorId: id,
                        logType: 'WaterLevel modified',
                        logDescription: `WaterLevel(${ipaddress}:${port}) ground_value updated to ${ground_value}mm`
                    });
                } catch (error) {
                    console.error(`[${ipaddress}] Failed to add modify operation log:`, error.message);
                }
            } 
            else {
                console.log(`[${ipaddress}] 소켓 없음, 재연결 시도`);
                
                if (connection?.socket) {
                    connection.socket.destroy();
                }
                waterLevelState.delete(ipaddress);
                dbCache.delete(`${ipaddress}_idx`);
                dbCache.delete(`${ipaddress}_threshold`);
                dbCache.delete(`${ipaddress}_ground_value`);
                
                if (ground_value) {
                    setCachedDBData(ipaddress, 'ground_value', ground_value);
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const connected = await connectTcp(ipaddress, parseInt(port));
                
                try {
                    await addOperLog({
                        logAction: 'addoper',
                        operatorId: id,
                        logType: 'WaterLevel modified',
                        logDescription: `WaterLevel(${ipaddress}:${port}) modified - ${connected ? 'connected' : 'connection failed'}`
                    });
                } catch (error) {
                    console.error(`[${ipaddress}] Failed to add modify operation log:`, error.message);
                }
            }
            
        } else if (cmd === "remove") {
            console.log(`[${ipaddress}] CP-100 수위계 삭제`);
            
            const connection = waterLevelState.get(ipaddress);
            if (connection?.socket) {
                connection.socket.destroy();
            }
            waterLevelState.delete(ipaddress);
            dbCache.delete(`${ipaddress}_idx`);
            dbCache.delete(`${ipaddress}_threshold`);
            dbCache.delete(`${ipaddress}_ground_value`);
            
            try {
                await addOperLog({
                    logAction: 'addoper',
                    operatorId: id,
                    logType: 'WaterLevel removed',
                    logDescription: `WaterLevel(${ipaddress}:${port}) removed`
                });
            } catch (error) {
                console.error(`[${ipaddress}] Failed to add remove operation log:`, error.message);
            }
            
        } else {
            console.error(`[${ipaddress}] Unknown water level management command: ${cmd}`);
        }
        
        console.log(`[handleWaterLevelManagement] Command ${cmd} completed for ${ipaddress}:${port}`);
        
    } catch (error) {
        console.error(`[${ipaddress}] Water level management error:`, error.message);
    }
};

const initializeCP100Connections = async () => {
  for (const [ip, state] of waterLevelState) {
    if (state.retryCount) {
        state.retryCount = 0;
        waterLevelState.set(ip, state);
    }
  }

  logger.info("CP-100 연결 초기화 시작");
  const client = await pool.connect();
  try {
    const query = `
      SELECT water_level_ip, water_level_port, water_level_name, use_status
      FROM fl_water_level 
      WHERE water_level_model = 'Mago CP100'
    `;
    const result = await client.query(query);
    logger.info(`DB에서 조회된 수위계 수: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      logger.warn("DB에서 수위계 데이터를 조회하지 못함");
      return;
    }
    
    for (const row of result.rows) {
      logger.info(`수위계 정보: IP=${row.water_level_ip}, 포트=${row.water_level_port}, 이름=${row.water_level_name}, 상태=${row.use_status}`);
    }
    
    for (const { water_level_ip, water_level_port, water_level_name } of result.rows) {
      logger.info(`수위계 연결 시도 시작: ${water_level_ip}:${water_level_port} (${water_level_name})`);
      try {
        await connectTcp(water_level_ip, parseInt(water_level_port));
        logger.info(`수위계 연결 시도 완료: ${water_level_ip}`);
      } catch (error) {
        logger.error(`수위계 ${water_level_ip} 연결 시도 실패: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`CP-100 연결 초기화 오류: ${error.message}`);
  } finally {
    client.release();
  }
};

setInterval(async () => {
  const now = Date.now();
  const fiveMinutesAgo = now - 300000;

  for (const [ip, state] of waterLevelState) {
    if (state.lastValue && state.lastSentTime && state.lastSentTime.getTime() < fiveMinutesAgo) {
      const client = await pool.connect();
      try {
        await client.query(
          "INSERT INTO fl_water_level_log (water_level_idx, water_level_value, created_at) " +
          "SELECT idx, $1, NOW() FROM fl_water_level WHERE water_level_ip = $2",
          [state.lastValue / 1000, ip]
        );
        // logger.info(`주기적 DB 저장 성공: ${ip}, 수위=${state.lastValue / 1000}m`);

        state.lastSentTime = new Date();
        waterLevelState.set(ip, state);
      } catch (error) {
        logger.error(`주기적 DB 저장 오류: ${ip} - ${error.message}`);
      } finally {
        client.release();
      }
    }
  }
}, 300000);

setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  for (const [ip, state] of waterLevelState) {
    if (state.status === "disconnected" &&
      (!state.lastRetryTime || state.lastRetryTime < oneHourAgo) &&
      (!state.lastSentTime || state.lastSentTime.getTime() < oneHourAgo)) {
      waterLevelState.delete(ip);
      dbCache.delete(`${ip}_idx`);
      dbCache.delete(`${ip}_threshold`);
      dbCache.delete(`${ip}_ground_value`);
      logger.info(`비활성 수위계 정리: ${ip}`);
    }
  }
}, 3600000);

setInterval(() => {
  const now = Date.now();
  const cacheExpiry = now - CACHE_TTL;

  for (const [key, cached] of dbCache.entries()) {
    if (cached.timestamp < cacheExpiry) {
      dbCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

const startServer = async () => {
  await initializeCP100Connections();

  if (global.websocket) {
    global.websocket.on('connect', () => {
      logger.info('WebSocket 연결 복구됨, 큐에 저장된 데이터 전송 시작');
      flushWebSocketQueue();
    });
  }
};

startServer().catch((err) => {
  logger.error(`서버 시작 오류: ${err.message}`);
});

process.on("SIGINT", () => {
  logger.info("서버 종료");
  process.exit(0);
});

module.exports = {
  waterLevelEmitter,
  initializeCP100Connections,
  handleWaterLevelManagement,
};

module.exports.cp100SocketHandler = (io) => {
    io.on("connection", (socket) => {
        console.log(`waterlevel socket Connected: ${socket.handshake.address}/${socket.id} , ${new Date()}`);
        socket.on("manageWaterLevel", (data) => {
            handleWaterLevelManagement(data);
        });
    });
};