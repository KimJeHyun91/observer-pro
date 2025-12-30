const EventEmitter = require("events");
const { pool } = require("../../../db/postgresqlPool");
const { executeQuery } = require("../../../db/mysqlPool");
const logger = require("../../../logger");
const { addOperLog } = require("../../../utils/addOperLog");
const { executeAutoControlWithGroupCheck } = require('./waterlevelAutoControl');

const waterLevelEmitter = new EventEmitter();

// 추후 설정파일에서 관리할 필요 있음. (군위 설치 후 일주일 간 모니터링 필요.) ==> 현재 5일 주기로 수위데이터 정리중
const POLLING_INTERVAL = 8 * 1000; // 8초

let pollingTimer = null;
let isPolling = false;

const lastPollingTime = new Map();
const wooritechState = new Map();

const processWaterLevelData = async (waterLevel, mysqlData, pgClient) => {
  try {
    const rawWaterLevel = parseFloat(mysqlData.waterLv);
    
    if (isNaN(rawWaterLevel) || rawWaterLevel < 0) {
      logger.warn(`[우리기술] ${waterLevel.water_level_name}: 잘못된 수위 값 ${mysqlData.waterLv}`);
      return;
    }

    const currentWaterLevel = rawWaterLevel;
    const waterLevelMm = currentWaterLevel * 1000;
    const thresholdMm = waterLevel.threshold * 1000;

    await pgClient.query(
      `UPDATE fl_water_level 
       SET curr_water_level = $1, updated_at = NOW() 
       WHERE idx = $2`,
      [currentWaterLevel, waterLevel.idx]
    );

    waterLevelEmitter.emit('data', {
      ip: waterLevel.water_level_ip,
      waterLevel: waterLevelMm,
      timestamp: new Date(),
      deviceType: 'Wooritech'
    });

    logger.info(
      `[우리기술] 수위 업데이트: ${waterLevel.water_level_name}(UID:${waterLevel.water_level_uid}), ` +
      `${currentWaterLevel.toFixed(3)}m, EventTime=${mysqlData.EventTime}`
    );

    const ip = waterLevel.water_level_ip;
    const state = wooritechState.get(ip) || { 
      lastSentValue: null, 
      lastThresholdCheckTime: null 
    };

    const diff = state.lastSentValue !== null 
      ? Math.abs(waterLevelMm - state.lastSentValue) 
      : 9999;

    if (waterLevelMm > thresholdMm && thresholdMm > 0) {
      
        waterLevelEmitter.emit('thresholdExceeded', {
          ip: waterLevel.water_level_ip,
          waterLevel: waterLevelMm,
          threshold: thresholdMm,
          deviceType: 'Wooritech'
        });

        logger.warn(
          `[우리기술] 임계치 초과 (변화량 ${diff}mm): ${waterLevel.water_level_name}(UID:${waterLevel.water_level_uid}), ` +
          `수위=${currentWaterLevel.toFixed(3)}m, 임계치=${waterLevel.threshold}m`
        );

        try {
          logger.info(`[우리기술] 자동제어 실행 시작 (그룹 체크 포함): IP: ${waterLevel.water_level_ip}`);
          await executeAutoControlWithGroupCheck(
            waterLevel.water_level_ip, 
            waterLevelMm, 
            thresholdMm
          );
        } catch (error) {
          logger.error(`[우리기술] 자동제어 실행 중 오류: ${waterLevel.water_level_ip} - ${error.message}`);
        }

        state.lastSentValue = waterLevelMm;
        state.lastThresholdCheckTime = Date.now();
        wooritechState.set(ip, state);
        
      
    } else {
      if (state.lastSentValue !== null) {
        state.lastSentValue = null;
        wooritechState.set(ip, state);
        logger.debug(`[우리기술] 임계치 미만, 상태 리셋: ${waterLevel.water_level_name}`);
      }
    }

  } catch (error) {
    logger.error(
      `[우리기술] 수위계 ${waterLevel.water_level_name}(UID:${waterLevel.water_level_uid}) ` +
      `처리 중 오류:`, error
    );
  }
};

const pollWooritechWaterLevel = async () => {
  if (isPolling) {
    logger.debug('[우리기술] 이전 폴링 진행 중, 스킵');
    return;
  }

  isPolling = true;

  try {
    const pgClient = await pool.connect();
    
    try {
      const waterLevelQuery = `
        SELECT idx, water_level_name, water_level_location, water_level_ip, 
              water_level_id, water_level_model, threshold, curr_water_level, 
              water_level_uid, use_status
        FROM fl_water_level 
        WHERE water_level_model = '우리기술'
        AND use_status = true
        AND water_level_uid IS NOT NULL
      `;
      const pgResult = await pgClient.query(waterLevelQuery);

      if (pgResult.rows.length === 0) {
        logger.debug('[우리기술] 등록된 수위계 없음');
        return;
      }

      for (const waterLevel of pgResult.rows) {
        const uid = String(waterLevel.water_level_uid);
        
        const lastTime = lastPollingTime.get(uid) || '20000101000000';

        const mysqlQuery = `
          SELECT UID, EventTime, waterLv 
          FROM tb_waterlvdata 
          WHERE UID = '${uid}' 
          AND EventTime > '${lastTime}'
          ORDER BY EventTime ASC
          LIMIT 1
        `;
        
        const mysqlData = await executeQuery(mysqlQuery);

        if (!mysqlData || mysqlData.length === 0) {
          logger.debug(`[우리기술] UID ${uid}: 새 데이터 없음`);
          continue;
        }

        const data = mysqlData[0];
        
        await processWaterLevelData(waterLevel, data, pgClient);

        lastPollingTime.set(uid, data.EventTime);
        
        logger.debug(`[우리기술] UID ${uid}: lastTime 업데이트 -> ${data.EventTime}`);
      }

    } finally {
      pgClient.release();
    }

  } catch (error) {
    logger.error('[우리기술] 폴링 중 오류:', error);
  } finally {
    isPolling = false;
  }
};

const startPolling = () => {
  if (pollingTimer) {
    logger.warn('[우리기술] 이미 폴링 중');
    return;
  }

  logger.info(`[우리기술] 폴링 시작 (${POLLING_INTERVAL}ms 주기)`);
  
  pollWooritechWaterLevel();
  
  pollingTimer = setInterval(pollWooritechWaterLevel, POLLING_INTERVAL);
};

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    lastPollingTime.clear();
    wooritechState.clear();
    logger.info('[우리기술] 폴링 중지');
  }
};

const handleWaterLevelManagement = async (data) => {
  const eventData = Array.isArray(data) ? data[0] : data;

  if (!eventData.cmd || !eventData.ipaddress) {
    logger.warn(`[우리기술] 잘못된 관리 데이터: ${JSON.stringify(data)}`);
    return;
  }

  const { cmd, ipaddress, water_level_uid, id } = eventData;

  try {
    if (cmd === "add") {
      logger.info(`[우리기술] 수위계 추가: ${ipaddress} (UID: ${water_level_uid})`);
      
      if (water_level_uid) {
        const now = new Date();
        const eventTime = now.toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14);
        lastPollingTime.set(String(water_level_uid), eventTime);
        logger.info(`[우리기술] UID ${water_level_uid}: 초기 조회 시간 설정 -> ${eventTime}`);
      }
      
      await addOperLog({
        logAction: 'addoper',
        operatorId: id || 'system',
        logType: 'Wooritech WaterLevel added',
        logDescription: `Wooritech WaterLevel(${ipaddress}, UID:${water_level_uid}) added`
      });
      
    } else if (cmd === "modify") {
      logger.info(`[우리기술] 수위계 수정: ${ipaddress} (UID: ${water_level_uid})`);
      await addOperLog({
        logAction: 'addoper',
        operatorId: id || 'system',
        logType: 'Wooritech WaterLevel modified',
        logDescription: `Wooritech WaterLevel(${ipaddress}, UID:${water_level_uid}) modified`
      });
      
    } else if (cmd === "remove") {
      logger.info(`[우리기술] 수위계 삭제: ${ipaddress} (UID: ${water_level_uid})`);
      
      if (water_level_uid) {
        lastPollingTime.delete(String(water_level_uid));
      }
      
      await addOperLog({
        logAction: 'addoper',
        operatorId: id || 'system',
        logType: 'Wooritech WaterLevel removed',
        logDescription: `Wooritech WaterLevel(${ipaddress}, UID:${water_level_uid}) removed`
      });
    }
  } catch (error) {
    logger.error(`[우리기술] 관리 작업 중 오류 (${cmd}):`, error);
  }
};

module.exports = {
  waterLevelEmitter,
  startPolling,
  stopPolling,
  handleWaterLevelManagement,
  pollWooritechWaterLevel
};