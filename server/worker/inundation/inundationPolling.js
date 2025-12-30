const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const { syncGuardianlites, initializeGuardianliteCache } = require('./guardianlitePolling');
const { checkCrossingGate, checkBillboard, initializeDeviceCaches, checkSpeaker, checkWaterLevel, checkCamera } = require('./checkPingDevices');
const cp100WaterLevelControl = require('./waterlevel/cp100WaterLevelSocketControl');
const aiboxWaterLevelControl = require('./waterlevel/aiboxWaterlevelApiControl');
const wooritechWaterLevelControl = require('./waterlevel/wooritechWaterLevelPollingControl');
const { startLogCleanup, stopLogCleanup } = require('./waterlevel/waterLevelLogCleanup');

const ipProcessingQueues = new Map();
const waterLevelEventState = new Map();

const EVENT_PRIORITY = {
  38: 1, // 위험 수위 감지 (주의)
  39: 2, // 위험 수위 감지 (경계)
  40: 3, // 위험 수위 감지 (심각)
  44: 4  // 위험 수위 감지 (대피)
};

const timerIds = {
  guardianlite: null,
  camera: null,
  waterLevel: null,
  speaker: null
};

const POLLING_INTERVALS = {
  guardianlite: 1000 * 60 * 60, // 1시간
  camera: 1000 * 60 * 30,       // 30분
  waterLevel: 1000 * 60 * 32,   // 32분
  speaker: 1000 * 60 * 35,      // 35분
  billboard: 1000 * 60 * 45     // 45분
};

/**
 * @param {string} ip - 수위계 IP
 * @returns {Object} 처리 큐 객체
 */
const getOrCreateProcessingQueue = (ip) => {
  if (!ipProcessingQueues.has(ip)) {
    ipProcessingQueues.set(ip, {
      processing: false,
      queue: [],
      metadata: {
        deviceType: null,
        waterLevelIdx: null,
        threshold: null,
        lastProcessTime: null
      }
    });
  }
  return ipProcessingQueues.get(ip);
};

/**
 * @param {string} ip - 수위계 IP
 * @param {string} deviceType - 장치 타입 (CP100/AIBOX)
 */
const setDeviceMetadata = async (ip, deviceType) => {
  const queue = getOrCreateProcessingQueue(ip);

  if (queue.metadata.deviceType && queue.metadata.deviceType !== deviceType) {
    logger.error(`IP 충돌 감지! ${ip}에 ${queue.metadata.deviceType}가 이미 설정되어 있는데 ${deviceType}로 접근 시도`);
    return false;
  }

  queue.metadata.deviceType = deviceType;

  if (!queue.metadata.waterLevelIdx) {
    queue.metadata.waterLevelIdx = await getWaterLevelIdx(ip);
  }

  if (!queue.metadata.threshold) {
    queue.metadata.threshold = await getThresholdFromDB(ip);
  }

  return true;
};

/**
 * @param {string} ip - 수위계 IP
 */
const processQueue = async (ip) => {
  const queueData = ipProcessingQueues.get(ip);
  if (!queueData || queueData.processing || queueData.queue.length === 0) {
    return;
  }

  queueData.processing = true;

  try {
    while (queueData.queue.length > 0) {
      const task = queueData.queue.shift();
      await processWaterLevelTask(task, queueData.metadata);
    }
  } catch (error) {
    logger.error(`큐 처리 중 오류 발생 (${ip}):`, error);
  } finally {
    queueData.processing = false;
    queueData.metadata.lastProcessTime = Date.now();
  }
};

/**
 * @param {Object} task - 처리할 태스크
 * @param {Object} metadata - IP별 메타데이터
 */
const processWaterLevelTask = async (task, metadata) => {
  const { type, data } = task;
  const { ip, waterLevel, timestamp, threshold } = data;

  if (!metadata.waterLevelIdx) {
    logger.error(`수위계 인덱스가 없음: ${ip}`);
    return;
  }

  if (type === 'data') {
    await saveWaterLevelData(ip, waterLevel, timestamp, metadata);
  } else if (type === 'threshold') {
    await createWaterLevelEventLog(ip, waterLevel, threshold, metadata.deviceType);
  }
};

const handleCP100DataEvent = async (data) => {
  const { ip, waterLevel, timestamp } = data;

  const metadataSet = await setDeviceMetadata(ip, 'CP100');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'data',
    data: { ip, waterLevel, timestamp },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const handleCP100ThresholdEvent = async (data) => {
  const { ip, waterLevel, threshold } = data;

  const metadataSet = await setDeviceMetadata(ip, 'CP100');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'threshold',
    data: { ip, waterLevel, threshold },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const handleAiboxDataEvent = async (data) => {
  const { ip, waterLevel, timestamp } = data;

  const metadataSet = await setDeviceMetadata(ip, 'AIBOX');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'data',
    data: { ip, waterLevel, timestamp },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const handleAiboxThresholdEvent = async (data) => {
  const { ip, waterLevel, threshold } = data;

  const metadataSet = await setDeviceMetadata(ip, 'AIBOX');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'threshold',
    data: { ip, waterLevel, threshold },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const handleWooritechDataEvent = async (data) => {
  const { ip, waterLevel, timestamp } = data;

  const metadataSet = await setDeviceMetadata(ip, 'Wooritech');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'data',
    data: { ip, waterLevel, timestamp },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const handleWooritechThresholdEvent = async (data) => {
  const { ip, waterLevel, threshold } = data;

  const metadataSet = await setDeviceMetadata(ip, 'Wooritech');
  if (!metadataSet) {
    return;
  }

  const queue = getOrCreateProcessingQueue(ip);
  queue.queue.push({
    type: 'threshold',
    data: { ip, waterLevel, threshold },
    queueTime: Date.now()
  });

  setImmediate(() => processQueue(ip));
};

const waterLevelCache = new Map();
const thresholdCache = new Map();

const getWaterLevelIdx = async (ip) => {
  if (waterLevelCache.has(ip)) {
    return waterLevelCache.get(ip);
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT idx FROM fl_water_level WHERE water_level_ip = $1", [ip]);
    const idx = result.rows[0]?.idx;

    if (idx) {
      waterLevelCache.set(ip, idx);
      logger.debug(`수위계 인덱스 캐시 저장: ${ip} -> ${idx}`);
    } else {
      logger.warn(`수위계 정보를 찾을 수 없음: ${ip}`);
    }

    return idx;
  } catch (error) {
    logger.error(`getWaterLevelIdx error for IP ${ip}:`, error);
    return null;
  } finally {
    client.release();
  }
};

const getThresholdFromDB = async (ip) => {
  if (thresholdCache.has(ip)) {
    return thresholdCache.get(ip);
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT threshold FROM fl_water_level WHERE water_level_ip = $1", [ip]);
    const threshold = parseFloat(result.rows[0]?.threshold || "0");

    thresholdCache.set(ip, threshold);
    logger.debug(`임계치 캐시 저장: ${ip} -> ${threshold}m`);

    return threshold;
  } catch (error) {
    logger.error(`임계치 조회 오류: ${ip} - ${error.message}`);
    return 0;
  } finally {
    client.release();
  }
};

const saveWaterLevelData = async (ip, waterLevel, timestamp, metadata) => {
  if (!metadata.waterLevelIdx) {
    logger.error(`수위계 인덱스가 없어 데이터 저장 실패: ${ip}`);
    return;
  }

  const waterLevelValue = (waterLevel / 1000).toFixed(3); // mm -> m

  const client = await pool.connect();
  try {
    const result = await client.query(`
      WITH log_insert AS (
        INSERT INTO fl_water_level_log (water_level_idx, water_level_value, created_at) 
        VALUES ($1, $2, $3)
        RETURNING water_level_idx, water_level_value, created_at
      ),
      level_update AS (
        UPDATE fl_water_level 
        SET curr_water_level = $2, updated_at = NOW() 
        WHERE idx = $1
        RETURNING idx
      )
      SELECT * FROM log_insert
    `, [metadata.waterLevelIdx, waterLevelValue, timestamp]);

    logger.debug(`[${metadata.deviceType}] DB 저장 성공: ${ip}, 수위=${waterLevelValue}m, idx=${metadata.waterLevelIdx}`);

    if (global.websocket && result.rows.length > 0) {
      const logData = result.rows[0];
      const websocketData = {
        water_level_idx: logData.water_level_idx,
        water_level: logData.water_level_value,
        created_at: logData.created_at,
        water_level_ip: ip,
        device_type: metadata.deviceType // 장치 타입 명시
      };
      global.websocket.emit("fl_water_level_log-update", [websocketData]);
    }
  } catch (error) {
    logger.error(`[${metadata.deviceType}] 데이터 저장 오류: ${ip} - ${error.message}`);
  } finally {
    client.release();
  }
};

const createWaterLevelEventLog = async (ip, waterLevel, threshold, deviceType) => {
  const client = await pool.connect();

  try {
    const waterLevelQuery = `
      SELECT idx, water_level_name, water_level_location, threshold
      FROM fl_water_level 
      WHERE water_level_ip = $1
    `;
    const waterLevelResult = await client.query(waterLevelQuery, [ip]);

    if (waterLevelResult.rows.length === 0) {
      logger.warn(`수위계 정보를 찾을 수 없음: ${ip}`);
      return;
    }

    const waterLevelInfo = waterLevelResult.rows[0];
    const waterLevelInMeters = (waterLevel / 1000).toFixed(1);
    const thresholdInMeters = (threshold / 1000).toFixed(1);

    // 이벤트 타입 결정
    let eventTypeId = 38;
    if (waterLevel >= threshold * 1.5) {
      eventTypeId = 44;
    } else if (waterLevel >= threshold * 1.3) {
      eventTypeId = 40;
    } else if (waterLevel >= threshold * 1.1) {
      eventTypeId = 39;
    }

    // Severity ID 조회
    const eventTypeQuery = `SELECT severity_id FROM fl_event_type WHERE id = $1`;
    const eventTypeResult = await client.query(eventTypeQuery, [eventTypeId]);
    const severityId = eventTypeResult.rows.length > 0 ? eventTypeResult.rows[0].severity_id : 1;

    const duplicateCheckQuery = `
      SELECT idx 
      FROM event_log 
      WHERE device_idx = $1 
      AND severity_id = $2 
      AND is_acknowledge = false
      AND device_type = 'waterlevel'
      AND main_service_name = 'inundation'
      LIMIT 1
    `;
    const duplicateResult = await client.query(duplicateCheckQuery, [
      waterLevelInfo.idx, 
      severityId
    ]);

    if (duplicateResult.rows.length > 0) {
      logger.info(
        `[중복 방지] 같은 심각도(${severityId})의 미확인 이벤트 존재: ` +
        `${ip}, event_log.idx=${duplicateResult.rows[0].idx} - INSERT 생략`
      );
      return;
    }

    const eventLogQuery = `
      INSERT INTO event_log (
        event_name, description, location, main_service_name, device_type, 
        severity_id, device_idx, event_type_id, event_occurrence_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING idx
    `;

    const description = `[${deviceType}] 수위계(${waterLevelInfo.water_level_name}) 수위 ${waterLevelInMeters}m 감지 (임계치: ${thresholdInMeters}m)`;
    const eventLogResult = await client.query(eventLogQuery, [
      "임계치 수위",
      description,
      waterLevelInfo.water_level_location || "수위계 위치",
      "inundation",
      "waterlevel",
      severityId,
      waterLevelInfo.idx,
      eventTypeId,
      new Date().toISOString()
    ]);

    if (global.websocket) {
      const eventData = {
        id: eventLogResult.rows[0].idx,
        idx: eventLogResult.rows[0].idx,
        event_type_id: eventTypeId,
        location: waterLevelInfo.water_level_location || "수위계 위치",
        description: description,
        device_type: deviceType,
        event_occurrence_time: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace(/[-:.Z]/g, "").slice(0, 15),
        main_service_name: 'inundation',
      };

      global.websocket.emit("fl_events-update", eventData);
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': 1 } });
    }

    logger.info(`[${deviceType}] 이벤트 로그 생성 완료: ${ip}, 수위=${waterLevelInMeters}m, ` + `타입=${eventTypeId}, 심각도=${severityId}`);

  } catch (error) {
    logger.error(`수위 감지 이벤트 로그 생성 오류: ${ip} - ${error.message}`);
  } finally {
    client.release();
  }
};

const safeRemoveEventListeners = (control, controlName) => {
  try {
    if (control?.waterLevelEmitter && typeof control.waterLevelEmitter.removeAllListeners === 'function') {
      control.waterLevelEmitter.removeAllListeners("data");
      control.waterLevelEmitter.removeAllListeners("thresholdExceeded");
      logger.info(`${controlName} 이벤트 리스너 제거 완료`);
    }
  } catch (error) {
    logger.error(`${controlName} 리스너 제거 중 오류:`, error);
  }
};

const safeRegisterEventListeners = (control, controlName, dataHandler, thresholdHandler) => {
  try {
    if (control?.waterLevelEmitter && typeof control.waterLevelEmitter.on === 'function') {
      control.waterLevelEmitter.on("data", dataHandler);
      control.waterLevelEmitter.on("thresholdExceeded", thresholdHandler);
      logger.info(`${controlName} 이벤트 리스너 등록 완료`);
      return true;
    } else {
      logger.warn(`${controlName} waterLevelEmitter가 존재하지 않음`);
      return false;
    }
  } catch (error) {
    logger.error(`${controlName} 리스너 등록 중 오류:`, error);
    return false;
  }
};

const setupPollingTimers = () => {
  timerIds.camera = setInterval(() => {
    try { checkCamera(); } catch (error) { logger.error('checkCamera error:', error); }
  }, POLLING_INTERVALS.camera);

  timerIds.waterLevel = setInterval(() => {
    try { checkWaterLevel(); } catch (error) { logger.error('checkWaterLevel error:', error); }
  }, POLLING_INTERVALS.waterLevel);

  timerIds.speaker = setInterval(() => {
    try { checkSpeaker(); } catch (error) { logger.error('checkSpeaker error:', error); }
  }, POLLING_INTERVALS.speaker);

  timerIds.billboard = setInterval(() => {
    try { checkBillboard(); } catch (error) { logger.error('checkBillboard error:', error); }
  }, POLLING_INTERVALS.billboard);

  timerIds.guardianlite = setInterval(async () => {
    try { await syncGuardianlites(); } catch (error) { logger.error('syncGuardianlites error:', error); }
  }, POLLING_INTERVALS.guardianlite);

  logger.info('모든 폴링 타이머 설정 완료');
};

exports.startDevicePolling = async () => {
  try {
    logger.info('장치 폴링 시작...');

    await initializeDeviceCaches();
    await initializeGuardianliteCache();

    // 기존 리스너 정리
    safeRemoveEventListeners(cp100WaterLevelControl, 'CP100');
    safeRemoveEventListeners(aiboxWaterLevelControl, 'AIBOX');
    safeRemoveEventListeners(wooritechWaterLevelControl, 'Wooritech'); 

    // 새 리스너 등록
    safeRegisterEventListeners(cp100WaterLevelControl, 'CP100', handleCP100DataEvent, handleCP100ThresholdEvent);
    safeRegisterEventListeners(aiboxWaterLevelControl, 'AIBOX', handleAiboxDataEvent, handleAiboxThresholdEvent);
    safeRegisterEventListeners(wooritechWaterLevelControl, 'Wooritech', handleWooritechDataEvent, handleWooritechThresholdEvent);

    wooritechWaterLevelControl.startPolling();
    setupPollingTimers();

    // 지연 실행
    setTimeout(() => checkCamera(), 5000);
    setTimeout(() => checkWaterLevel(), 10000);
    setTimeout(() => checkSpeaker(), 15000);
    setTimeout(() => checkBillboard(), 20000);
    setTimeout(async () => {
      try { await syncGuardianlites(); } catch (error) { logger.error('Initial sync error:', error); }
    }, 60000);

    startLogCleanup();

    logger.info('Device polling 시작 완료');

  } catch (error) {
    logger.error("Device polling 초기화 오류:", error);
    throw error;
  }
};

exports.stopDevicePolling = () => {
  logger.info('Device polling 중지...');

  Object.entries(timerIds).forEach(([key, timerId]) => {
    if (timerId) {
      clearInterval(timerId);
      timerIds[key] = null;
    }
  });

  // 리스너 정리
  safeRemoveEventListeners(cp100WaterLevelControl, 'CP100');
  safeRemoveEventListeners(aiboxWaterLevelControl, 'AIBOX');
  safeRemoveEventListeners(wooritechWaterLevelControl, 'Wooritech');

  wooritechWaterLevelControl.stopPolling();
  
  stopLogCleanup();

  // 큐 및 캐시 정리
  ipProcessingQueues.clear();
  waterLevelCache.clear();
  thresholdCache.clear();
  waterLevelEventState.clear();

  logger.info('Device polling 중지 완료');
};

setInterval(() => {
  let totalQueueSize = 0;
  let activeQueues = 0;

  for (const [ip, queueData] of ipProcessingQueues) {
    if (queueData.queue.length > 0 || queueData.processing) {
      totalQueueSize += queueData.queue.length;
      activeQueues++;

      if (queueData.queue.length > 10) {
        logger.warn(`큐 적체 감지: ${ip}, 크기=${queueData.queue.length}, 처리중=${queueData.processing}`);
      }
    }
  }

  if (activeQueues > 0) {
    logger.debug(`큐 모니터링: 활성큐=${activeQueues}, 총대기=${totalQueueSize}`);
  }
}, 60000);

if (!global.waterLevelEventEmitter) {
  const EventEmitter = require('events');
  global.waterLevelEventEmitter = new EventEmitter();
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  exports.stopDevicePolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  exports.stopDevicePolling();
  process.exit(0);
});