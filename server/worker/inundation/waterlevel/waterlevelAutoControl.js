const { pool } = require('../../../db/postgresqlPool');
const { addOperLog } = require('../../../utils/addOperLog');
const { SpeakerControl } = require('../speakerControl');
const EventEmitter = require('events');
const net = require('net');
const logger = require('../../../logger');
const { sendToSignboard } = require('../../../utils/signboardNotification');

const THRESHOLD_CONSECUTIVE_COUNT = 3;
const THRESHOLD_WATING_TIME = 60 * 1000;

const CONTROL_CONFIG = {
  GROUP_PRIORITY: true,        // 그룹 제어 우선
  ALLOW_FALLBACK: false,       // 개별 제어 폴백 허용
  LOG_DETAILED: true,
  CONTROL_MODES: {
    INDIVIDUAL: 'individual',   // 개별 제어만
    GROUP_ONLY: 'group_only',   // 그룹 제어만
    HYBRID: 'hybrid'           // 개별 + 그룹 제어 모두 가능
  }
};

const thresholdExceedCounts = new Map();
const firstThresholdExceedTime = new Map();

const getAllLinkedInfoByIP = async (ip) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        wlac.water_level_idx,
        wlac.outside_idx,
        wlac.auto_control_enabled,
        wlac.control_mode,
        o.outside_name,
        o.location,
        o.crossing_gate_ip,
        o.crossing_gate_status,
        o.controller_model,
        s.speaker_ip,
        s.speaker_id,
        s.speaker_password
      FROM fl_water_level_auto_control wlac
      JOIN fl_water_level wl ON wlac.water_level_idx = wl.idx
      JOIN fl_outside o ON wlac.outside_idx = o.idx
      LEFT JOIN fl_speaker s ON o.idx = s.outside_idx
      WHERE wl.water_level_ip = $1
    `;
    const result = await client.query(query, [ip]);
    return result.rows;
  } catch (error) {
    console.error(`IP ${ip}에 연동된 모든 정보 조회 중 오류:`, error);
    return [];
  } finally {
    client.release();
  }
};

const getCurrentGateStatus = async (gateIp) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT crossing_gate_status 
        FROM fl_outside 
        WHERE crossing_gate_ip = $1
      `;
      const result = await client.query(query, [gateIp]);

      if (result.rows.length > 0) {
        const status = result.rows[0].crossing_gate_status;
        logger.debug(`[getCurrentGateStatus] ${gateIp}: ${status ? 'OPEN' : 'CLOSE'}`);
        return status;
      }

      logger.warn(`[getCurrentGateStatus] ${gateIp}: 차단기 정보 없음`);
      return null;

    } finally {
      client.release();
    }
  } catch (error) {
    logger.error(`[getCurrentGateStatus] ${gateIp} 상태 조회 중 오류:`, error);
    return null;
  }
};

const getWaterLevelGroup = async (groupId) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT idx, group_name, threshold_mode 
      FROM fl_water_level_group 
      WHERE idx = $1
    `;
    const result = await client.query(query, [groupId]);
    return result.rows[0];
  } catch (error) {
    console.error(`그룹 ${groupId} 정보 조회 중 오류:`, error);
    return null;
  } finally {
    client.release();
  }
};

const getGroupWaterLevels = async (groupId) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        wl.idx,
        wl.water_level_ip as ip,
        wl.threshold,
        wl.curr_water_level,
        wlgm.water_level_role
      FROM fl_water_level_group_mapping wlgm
      JOIN fl_water_level wl ON wlgm.water_level_idx = wl.idx
      WHERE wlgm.group_idx = $1
      ORDER BY wlgm.water_level_role
    `;
    const result = await client.query(query, [groupId]);
    return result.rows;
  } catch (error) {
    console.error(`그룹 ${groupId}의 수위계들 조회 중 오류:`, error);
    return [];
  } finally {
    client.release();
  }
};

// 연속 임계치 초과 감지 함수
const checkConsecutiveThresholdExceed = (ip, currentWaterLevel, threshold) => {
  const now = Date.now();
  const key = `${ip}_${threshold}`;

  // 현재 수위가 임계치를 초과하는지 확인
  const isExceeded = currentWaterLevel > threshold;

  if (isExceeded) {
    const firstTime = firstThresholdExceedTime.get(key) || 0;
    const count = thresholdExceedCounts.get(key) || 0;

    if (firstTime === 0) {
      // 첫 번째 임계치 초과
      thresholdExceedCounts.set(key, 1);
      firstThresholdExceedTime.set(key, now);
    } else {
      const timeElapsed = now - firstTime;

      if (timeElapsed <= THRESHOLD_WATING_TIME) {
        const newCount = count + 1;
        thresholdExceedCounts.set(key, newCount);

        if (newCount >= THRESHOLD_CONSECUTIVE_COUNT) {
          console.log(`[임계치 감지] ${ip}: ${threshold}mm 초과 연속 ${newCount}회 감지 (${timeElapsed}ms 이내)`);
          return true;
        }
      } else {
        thresholdExceedCounts.set(key, 1);
        firstThresholdExceedTime.set(key, now);
      }
    }

    return false;
  } else {
    // 임계치 미초과 시
    const count = thresholdExceedCounts.get(key);
    if (count && count > 0) {
      const firstTime = firstThresholdExceedTime.get(key);
      const timeElapsed = now - firstTime;

      if (timeElapsed > THRESHOLD_WATING_TIME) {
        thresholdExceedCounts.delete(key);
        firstThresholdExceedTime.delete(key);
      }
    }
    return false;
  }
};

const resetThresholdExceedCount = (ip, threshold) => {
  const key = `${ip}_${threshold}`;
  thresholdExceedCounts.delete(key);
  firstThresholdExceedTime.delete(key);
  console.log(`[임계치 감지] ${ip}: 자동제어 실행 완료로 인한 카운트 리셋`);
};

// 실시간 수위 데이터 조회 함수
const getRealTimeWaterLevel = async (ip) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT curr_water_level 
        FROM fl_water_level 
        WHERE water_level_ip = $1
      `;
      const result = await client.query(query, [ip]);
      if (result.rows.length > 0) {
        return result.rows[0].curr_water_level * 1000; // m → mm 변환
      }
      return null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`실시간 수위 데이터 조회 중 오류 (${ip}):`, error);
    return null;
  }
};

// 수위계 IP로 그룹 조회
const getWaterLevelGroupByIP = async (ip) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT wlg.idx as group_idx, wlg.group_name, wlg.threshold_mode
      FROM fl_water_level_group_mapping wlgm
      JOIN fl_water_level_group wlg ON wlgm.group_idx = wlg.idx
      JOIN fl_water_level wl ON wlgm.water_level_idx = wl.idx
      WHERE wl.water_level_ip = $1
    `;
    const result = await client.query(query, [ip]);
    return result.rows[0];
  } catch (error) {
    console.error(`IP ${ip}의 그룹 정보 조회 중 오류:`, error);
    return null;
  } finally {
    client.release();
  }
};

// 수위계의 제어 모드 확인
const getWaterLevelControlMode = async (ip) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT DISTINCT wlac.control_mode
      FROM fl_water_level_auto_control wlac
      JOIN fl_water_level wl ON wlac.water_level_idx = wl.idx
      WHERE wl.water_level_ip = $1
      LIMIT 1
    `;
    const result = await client.query(query, [ip]);
    return result.rows[0]?.control_mode || CONTROL_CONFIG.CONTROL_MODES.INDIVIDUAL;
  } catch (error) {
    console.error(`IP ${ip}의 제어 모드 조회 중 오류:`, error);
    return CONTROL_CONFIG.CONTROL_MODES.INDIVIDUAL;
  } finally {
    client.release();
  }
};


const getLinkedCrossingGatesByIP = async (ip) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        o.idx as outside_idx,
        o.outside_name,
        o.location,
        o.crossing_gate_ip,
        o.crossing_gate_status,
        o.controller_model,
        s.speaker_ip,
        s.speaker_id,
        s.speaker_password
      FROM fl_water_level_auto_control wlac
      JOIN fl_water_level wl ON wlac.water_level_idx = wl.idx
      JOIN fl_outside o ON wlac.outside_idx = o.idx
      LEFT JOIN fl_speaker s ON o.idx = s.outside_idx
      WHERE wl.water_level_ip = $1 
      AND wlac.auto_control_enabled = true
      AND o.crossing_gate_status = true  -- 열린 상태의 차단기만 선택
    `;
    const result = await client.query(query, [ip]);

    return result.rows;
  } catch (error) {
    console.error(`IP ${ip}에 연동된 차단기 정보 조회 중 오류:`, error);
    return [];
  } finally {
    client.release();
  }
};
// 그룹 임계치 상태 확인
const checkThresholdStatus = (ip, currentWaterLevel, threshold) => {
  return checkConsecutiveThresholdExceed(ip, currentWaterLevel, threshold);
};

// 그룹에 연결된 차단기들 조회
const getGroupLinkedCrossingGates = async (groupId) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT DISTINCT
        o.idx as outside_idx,
        o.outside_name,
        o.location,
        o.crossing_gate_ip,
        o.crossing_gate_status,
        o.controller_model,
        s.speaker_ip,
        s.speaker_id,
        s.speaker_password
      FROM fl_water_level_group_mapping wlgm
      JOIN fl_water_level wl ON wlgm.water_level_idx = wl.idx
      JOIN fl_water_level_auto_control wlac ON wl.idx = wlac.water_level_idx
      JOIN fl_outside o ON wlac.outside_idx = o.idx
      LEFT JOIN fl_speaker s ON o.idx = s.outside_idx
      WHERE wlgm.group_idx = $1 
      AND wlac.auto_control_enabled = true
      AND o.crossing_gate_status = true
    `;
    const result = await client.query(query, [groupId]);
    return result.rows;
  } catch (error) {
    console.error(`그룹 ${groupId}에 연결된 차단기들 조회 중 오류:`, error);
    return [];
  } finally {
    client.release();
  }
};

const executeGroupWaterLevelControl = async (groupId, triggerIP, currentWaterLevel, threshold) => {
  try {
    const group = await getWaterLevelGroup(groupId);
    if (!group) {
      console.log(`그룹 ${groupId} 정보를 찾을 수 없음`);
      return false;
    }

    const waterLevels = await getGroupWaterLevels(groupId);
    if (waterLevels.length === 0) {
      console.log(`그룹 ${groupId}에 수위계가 없음`);
      return false;
    }

    let allExceeded = true;
    let anyExceeded = false;
    const statusDetails = [];
    let maxCurrentLevel = 0;
    let minThreshold = Number.MAX_VALUE;

    for (const wl of waterLevels) {
      const realTimeWaterLevel = await getRealTimeWaterLevel(wl.ip);
      const currentWaterLevelMm = realTimeWaterLevel !== null ? realTimeWaterLevel : wl.curr_water_level * 1000;
      const thresholdInMm = wl.threshold * 1000;

      // 단순 임계치 초과 여부만 확인 (연속 조건 제외)
      const isExceeded = currentWaterLevelMm > thresholdInMm;

      statusDetails.push({
        ip: wl.ip,
        role: wl.water_level_role,
        currentLevel: currentWaterLevelMm / 1000,
        threshold: wl.threshold,
        isExceeded: isExceeded
      });

      maxCurrentLevel = Math.max(maxCurrentLevel, currentWaterLevelMm);
      minThreshold = Math.min(minThreshold, thresholdInMm);

      if (isExceeded) {
        anyExceeded = true;
      } else {
        allExceeded = false;
      }
    }

    // AND/OR 모드에 따른 조건 확인
    const shouldCheckConsecutive = group.threshold_mode === 'AND' ? allExceeded : anyExceeded;

    console.log(`[그룹 제어] ${group.group_name} (${group.threshold_mode} 모드):`, {
      allExceeded,
      anyExceeded,
      shouldCheckConsecutive,
      statusDetails
    });

    if (!shouldCheckConsecutive) {
      console.log(`그룹 ${group.group_name}: 기본 임계치 조건 미충족 - 자동제어 실행 안함`);
      return false;
    }

    const groupKey = `GROUP_${groupId}`;
    const groupConsecutiveCheck = checkConsecutiveThresholdExceed(groupKey, maxCurrentLevel, minThreshold);

    if (!groupConsecutiveCheck) {
      console.log(`그룹 ${group.group_name}: 연속 임계치 조건 미충족 - 자동제어 실행 안함`);
      return false;
    }

    const linkedGates = await getGroupLinkedCrossingGates(groupId);
    if (linkedGates.length === 0) {
      console.log(`그룹 ${group.group_name}에 연결된 열린 차단기가 없음`);
      resetThresholdExceedCount(groupKey, minThreshold);
      return false;
    }

    console.log(`[그룹 제어] ${group.group_name}: 연동된 열린 상태 차단기 ${linkedGates.length}개 발견`);

    const controlResults = [];

    for (const gate of linkedGates) {
      try {
        const currentGateStatus = await getCurrentGateStatus(gate.crossing_gate_ip);

        logger.info(`[그룹 제어] 처리 시작: ${gate.outside_name}(${gate.crossing_gate_ip}), DB상태: ${gate.crossing_gate_status ? 'OPEN' : 'CLOSE'}, 실시간상태: ${currentGateStatus ? 'OPEN' : 'CLOSE'}`);

        if (currentGateStatus === false) {
          logger.info(`[그룹 제어 스킵] 차단기 ${gate.outside_name}(${gate.crossing_gate_ip})는 이미 닫혀있음 (실시간 확인)`);

          controlResults.push({
            gateName: gate.outside_name,
            location: gate.location,
            ip: gate.crossing_gate_ip,
            success: true,
            skipped: true,
            reason: '이미 닫힌 상태 (실시간 확인)',
            timestamp: new Date().toISOString()
          });

          continue;
        }

        console.log(`[자동제어 시작] 차단기 ${gate.outside_name}(${gate.crossing_gate_ip}) - 열린 상태 확인`);

        if (gate.speaker_ip) {
          logger.info(`[그룹 제어] 스피커 방송 시작: ${gate.speaker_ip}`);
          await executeSpeakerBroadcast(gate);
          await new Promise(resolve => setTimeout(resolve, 5000));
          logger.info(`[그룹 제어] 스피커 방송 완료`);
        }

        console.log(`[자동제어] 차단기 제어 실행: ${gate.crossing_gate_ip} (${gate.outside_name})`);
        const controlResult = await executeCrossingGateControl(gate);
        console.log(`[자동제어] 차단기 제어 완료: ${controlResult ? '성공' : '실패'}`);

        controlResults.push({
          gateName: gate.outside_name,
          location: gate.location,
          ip: gate.crossing_gate_ip,
          success: controlResult,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error(`[자동제어 오류] 차단기 ${gate.outside_name} 처리 중:`, error.message);

        controlResults.push({
          gateName: gate.outside_name,
          location: gate.location,
          ip: gate.crossing_gate_ip,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (controlResults.length > 0) {
      const autoControlResult = {
        type: 'waterLevelAutoControl',
        waterLevelIP: ip,
        currentWaterLevel: currentWaterLevel,
        threshold: threshold,
        timestamp: new Date().toISOString(),
        results: controlResults,
        summary: {
          total: controlResults.length,
          success: controlResults.filter(r => r.success).length,
          failed: controlResults.filter(r => !r.success).length,
          skipped: controlResults.filter(r => r.skipped).length 
        }
      };

      if (global.websocket) {
        global.websocket.emit('fl_waterLevelAutoControlResult-update', autoControlResult);
      }

      console.log(`[자동제어 완료] IP ${ip}:`, autoControlResult.summary);
    } else {
      console.log(`[자동제어] IP ${ip}: 실행할 작업 없음 (모든 차단기 이미 닫힘)`);
    }

    resetThresholdExceedCount(ip, threshold);

    return true;
  } catch (error) {
    console.error(`IP ${ip} 자동제어 실행 중 오류:`, error);
    resetThresholdExceedCount(ip, threshold);
    return false;
  }
};

const executeAutoControlWithGroupCheck = async (ip, currentWaterLevel, threshold) => {
  try {
    const controlMode = await getWaterLevelControlMode(ip);

    const group = await getWaterLevelGroupByIP(ip);

    if (CONTROL_CONFIG.LOG_DETAILED) {
      console.log(`[제어 모드] IP ${ip}: ${group ? `그룹 '${group.group_name}' (${group.threshold_mode})` : '개별 제어'}, 제어모드: ${controlMode}`);
    }

    if (group) {
      console.log(`[그룹 제어] IP ${ip}가 그룹 '${group.group_name}'에 속함 - 그룹 제어 우선 실행`);

      const groupControlResult = await executeGroupWaterLevelControl(
        group.group_idx, ip, currentWaterLevel, threshold
      );

      if (groupControlResult) {
        console.log(`[그룹 제어] 그룹 '${group.group_name}' 제어 성공 - 개별 제어 생략`);
        return true;
      } else {
        if (controlMode === CONTROL_CONFIG.CONTROL_MODES.GROUP_ONLY) {
          console.log(`[그룹 제어] 그룹 '${group.group_name}' 조건 미충족 - 그룹 전용 모드로 제어 실행 안함`);
          return false;
        } else if (controlMode === CONTROL_CONFIG.CONTROL_MODES.HYBRID && CONTROL_CONFIG.ALLOW_FALLBACK) {
          console.log(`[폴백] 그룹 제어 실패 - 하이브리드 모드로 개별 제어로 폴백`);
          return await executeAutoControlByIP(ip, currentWaterLevel, threshold);
        } else {
          console.log(`[그룹 제어] 그룹 '${group.group_name}' 조건 미충족 - 제어 실행 안함`);
          return false;
        }
      }
    } else {
      if (controlMode === CONTROL_CONFIG.CONTROL_MODES.GROUP_ONLY) {
        console.log(`[개별 제어] IP ${ip} 그룹 전용 모드이지만 그룹에 속하지 않음 - 제어 실행 안함`);
        return false;
      } else {
        console.log(`[개별 제어] IP ${ip} 독립 수위계 - 개별 제어 실행`);
        return await executeAutoControlByIP(ip, currentWaterLevel, threshold);
      }
    }
  } catch (error) {
    console.error(`[제어 오류] IP ${ip} 제어 중 오류:`, error);
    return false;
  }
};

const executeSpeakerBroadcast = async (speakerInfo) => {
  try {
    console.log(`자동제어: 스피커 경고 방송 실행 - ${speakerInfo.speaker_ip}`);

    const client = await pool.connect();
    try {
      const query = `
        SELECT speaker_type, speaker_port 
        FROM fl_speaker 
        WHERE speaker_ip = $1
      `;
      const result = await client.query(query, [speakerInfo.speaker_ip]);

      if (!result.rows[0]) {
        console.error(`스피커 정보를 찾을 수 없음: ${speakerInfo.speaker_ip}`);
        return false;
      }

      const speakerType = result.rows[0].speaker_type || 'axis';
      const speakerPort = result.rows[0].speaker_port || '80';

      console.log(`스피커 타입: ${speakerType}, 포트: ${speakerPort}`);

      if (speakerType === 'aepel') {
        const audioQuery = `
          SELECT file_no 
          FROM fl_audio_file_manage 
          WHERE speaker_ip = $1 
          AND message LIKE '%차단기%' 
          AND speaker_type = 'aepel'
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const audioResult = await client.query(audioQuery, [speakerInfo.speaker_ip]);

        let fileNo = audioResult.rows[0]?.file_no || 50; // 기본값 50

        console.log(`Aepel 스피커 파일번호: ${fileNo}`);

        const playResult = await SpeakerControl.playAepelCGI(
          speakerInfo.speaker_ip,
          fileNo,
          2,  // 반복 2회
        );

        if (!playResult.success) {
          console.error(`Aepel 스피커 재생 실패: ${playResult.message}`);
          return false;
        }

      } else {
        const pathUrl = '/axis-cgi/playclip.cgi';
        const params = 'location=%EC%B0%A8%EB%8B%A8%EA%B8%B0%20%EC%9D%8C%EC%84%B1%20%EC%95%88%EB%82%B4.mp3&repeat=0&volume=100&audiooutput=1';

        await SpeakerControl.activateSpeaker(speakerInfo.speaker_ip, pathUrl, params);
      }

      await addOperLog({
        logAction: 'addoper',
        operatorId: 'system',
        logType: '자동제어 스피커 방송',
        logDescription: `수위계 임계치 초과로 ${speakerInfo.location} 스피커 경고 방송 실행 (${speakerType})`,
        reqIp: '192.168.7.149'
      });

      return true;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('스피커 방송 실행 중 오류:', error);
    return false;
  }
};

const executeCrossingGateControl = async (gateInfo) => {
  try {
    logger.info(`[executeCrossingGateControl] 시작: ${gateInfo.crossing_gate_ip}`);

    try {
      const client = await pool.connect();
      const result = await client.query(`
        UPDATE fl_outside 
        SET crossing_gate_status = false, updated_at = NOW() 
        WHERE crossing_gate_ip = $1
        RETURNING idx, outside_name
      `, [gateInfo.crossing_gate_ip]);
      client.release();

      if (result.rowCount > 0) {
        logger.info(`[executeCrossingGateControl] DB 즉시 업데이트 완료: ${gateInfo.crossing_gate_ip} -> CLOSE`);

        await sendToSignboard(gateInfo.crossing_gate_ip, false);

        if (global.websocket) {
          global.websocket.emit('fl_crossingGates-update', {
            id: result.rows[0].idx,
            crossing_gate_ip: gateInfo.crossing_gate_ip,
            crossing_gate_status: false,
            linked_status: true,
            outside_name: result.rows[0].outside_name,
            timestamp: new Date().toISOString()
          });

          global.websocket.emit('setGate', {
            ipaddress: gateInfo.crossing_gate_ip,
            status: false,
            cmd: 'close',
            linked_status: true,
            auto_controlled: true
          });

          logger.info(`[executeCrossingGateControl] WebSocket 이벤트 전송 완료`);
        }
      }
    } catch (dbError) {
      logger.error(`[executeCrossingGateControl] DB 업데이트 실패:`, dbError);
    }

    if (!global.gateEventEmitter || !global.gateEventEmitter.ready || global.gateEventEmitter.listenerCount('setGate') === 0) {
      logger.info(`[executeCrossingGateControl] gateEventEmitter 미준비 - 직접 제어 실행`);
      const result = await executeDirectGateControl(gateInfo);
      return result;
    }

    const eventData = {
      ipaddress: gateInfo.crossing_gate_ip,
      cmd: 'close',
      type: 'single',
      id: `수위계 자동제어 - ${gateInfo.location}`,
      outside_idx: gateInfo.outside_idx,
      controllerModel: gateInfo.controller_model || 'default'
    };

    logger.info(`[executeCrossingGateControl] gateEventEmitter 이벤트 발생`);
    global.gateEventEmitter.emit('setGate', eventData);

    await addOperLog({
      logAction: 'addoper',
      operatorId: 'system',
      logType: '차단기 자동제어',
      logDescription: `수위계 임계치 초과로 ${gateInfo.location} 차단기 자동 제어 (닫기)`,
      reqIp: '192.168.7.149'
    });

    logger.info(`[executeCrossingGateControl] 완료: ${gateInfo.crossing_gate_ip}`);
    return true;

  } catch (error) {
    logger.error(`[executeCrossingGateControl] 오류:`, error);
    return false;
  }
};

const executeDirectGateControl = async (gateInfo) => {
  try {
    const { crossing_gate_ip, controller_model, location } = gateInfo;
    const port = controller_model === '일체형' ? 2000 : 5000;

    try {
      const client = await pool.connect();
      const result = await client.query(`
        UPDATE fl_outside 
        SET crossing_gate_status = false, updated_at = NOW() 
        WHERE crossing_gate_ip = $1
        RETURNING idx, outside_name
      `, [crossing_gate_ip]);
      client.release();

      if (result.rowCount > 0) {
        logger.info(`[executeDirectGateControl] DB 즉시 업데이트 완료: ${crossing_gate_ip} -> CLOSE`);

        if (global.websocket) {
          global.websocket.emit('fl_crossingGates-update', {
            id: result.rows[0].idx,
            crossing_gate_ip: crossing_gate_ip,
            crossing_gate_status: false,
            linked_status: true,
            outside_name: result.rows[0].outside_name,
            timestamp: new Date().toISOString()
          });

          global.websocket.emit('setGate', {
            ipaddress: crossing_gate_ip,
            status: false,
            cmd: 'close',
            linked_status: true,
            auto_controlled: true
          });
        }
      }
    } catch (dbError) {
      logger.error(`[executeDirectGateControl] DB 업데이트 실패:`, dbError);
    }

    const result = await sendGateCommand(crossing_gate_ip, port, controller_model, 'close');

    if (result) {
      await addOperLog({
        logAction: 'addoper',
        operatorId: 'system',
        logType: '차단기 직접제어',
        logDescription: `수위계 임계치 초과로 ${location} 차단기 직접 제어 성공 (닫기)`,
        reqIp: '192.168.7.149'
      });

      return true;
    } else {
      logger.error(`[executeDirectGateControl] 차단기 ${crossing_gate_ip} 제어 실패`);

      await addOperLog({
        logAction: 'addoper',
        operatorId: 'system',
        logType: '차단기 직접제어실패',
        logDescription: `수위계 임계치 초과로 ${location} 차단기 직접 제어 실패 (닫기)`,
        reqIp: '192.168.7.149'
      });

      return false;
    }

  } catch (error) {
    logger.error(`[executeDirectGateControl] 직접 차단기 제어 중 오류:`, error);
    return false;
  }
};

const sendGateCommand = (ip, port, controllerModel, command) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;
    let timeouts = [];

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;

        timeouts.forEach(timeoutId => {
          if (timeoutId) clearTimeout(timeoutId);
        });
        timeouts = [];

        socket.removeAllListeners();

        if (socket.destroyed === false) {
          socket.destroy();
        }

        resolve(false);
      }
    };

    const timeout = setTimeout(() => {
      console.log(`[타임아웃] 차단기 ${ip}:${port} 연결/명령 전송 타임아웃`);
      cleanup();
    }, 10000);
    timeouts.push(timeout);

    socket.setTimeout(10000);

    socket.connect(port, ip, () => {
      let cmd;
      if (command === 'close') {
        if (controllerModel === '일체형') {
          cmd = "\x02GATE UNLOCK\x03\r\n";  // 리셋
        } else {
          cmd = "\x02SYSTEM RESET\x03\r\n";  // 리셋
        }
      }

      socket.write(cmd);

      const resetTimeout = setTimeout(() => {
        const closeCmd = "\x02GATE DOWN\x03\r\n";
        console.log(`[디버깅] 닫기 명령 전송: ${closeCmd}`);
        socket.write(closeCmd);

        const closeTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;

            timeouts.forEach(timeoutId => {
              if (timeoutId) clearTimeout(timeoutId);
            });
            timeouts = [];

            socket.removeAllListeners();

            if (socket.destroyed === false) {
              socket.destroy();
            }

            resolve(true);
          }
        }, 1000);
        timeouts.push(closeTimeout);
      }, 2000);
      timeouts.push(resetTimeout);
    });

    socket.on('error', (err) => {
      console.error(`[소켓 오류] 차단기 ${ip}:${port}:`, err.message);
      if (err.code === 'ECONNREFUSED') {
        console.warn(`[연결 거부] 차단기 ${ip}:${port} - 서비스가 실행되지 않거나 포트가 닫혀있음`);
      }
      cleanup();
    });

    socket.on('close', () => {
      console.log(`[소켓 종료] 차단기 ${ip}:${port} 연결 종료`);
      cleanup();
    });

    socket.on('timeout', () => {
      console.log(`[소켓 타임아웃] 차단기 ${ip}:${port} 연결 타임아웃`);
      cleanup();
    });

    socket.on('end', () => {
      console.log(`[소켓 종료] 차단기 ${ip}:${port} 연결 종료됨`);
      cleanup();
    });
  });
};

const executeAutoControlByIP = async (ip, currentWaterLevel, threshold) => {
  try {
    const shouldExecute = checkConsecutiveThresholdExceed(ip, currentWaterLevel, threshold);
    if (!shouldExecute) {
      logger.info(`IP ${ip}: 연속 임계치 초과 조건 미충족 - 자동제어 실행 안함`);
      return false;
    }

    const linkedGates = await getLinkedCrossingGatesByIP(ip);
    if (linkedGates.length === 0) {
      logger.info(`IP ${ip}: 연동된 열린 차단기 없음`);
      resetThresholdExceedCount(ip, threshold);
      return false;
    }

    logger.info(`[자동제어] IP ${ip}: 연동된 열린 상태 차단기 ${linkedGates.length}개 발견`);

    const controlResults = [];

    for (const gate of linkedGates) {
      try {
        const currentGateStatus = await getCurrentGateStatus(gate.crossing_gate_ip);

        logger.info(`[자동제어] 처리 시작: ${gate.outside_name}(${gate.crossing_gate_ip}), DB상태: ${gate.crossing_gate_status ? 'OPEN' : 'CLOSE'}, 실시간상태: ${currentGateStatus ? 'OPEN' : 'CLOSE'}`);

        if (currentGateStatus === false) {
          logger.info(`[자동제어 스킵] 차단기 ${gate.outside_name}(${gate.crossing_gate_ip})는 이미 닫혀있음 (실시간 확인)`);

          controlResults.push({
            gateName: gate.outside_name,
            location: gate.location,
            ip: gate.crossing_gate_ip,
            success: true,
            skipped: true,
            reason: '이미 닫힌 상태 (실시간 확인)',
            timestamp: new Date().toISOString()
          });

          continue;
        }

        // 스피커 방송 (열린 상태일 때만)
        if (gate.speaker_ip) {
          logger.info(`[자동제어] 스피커 방송 시작: ${gate.speaker_ip}`);
          const speakerResult = await executeSpeakerBroadcast(gate);
          logger.info(`[자동제어] 스피커 방송 ${speakerResult ? '성공' : '실패'}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // 차단기 제어 실행
        logger.info(`[자동제어] 차단기 제어 시작: ${gate.crossing_gate_ip} (${gate.outside_name})`);
        const controlResult = await executeCrossingGateControl(gate);
        logger.info(`[자동제어] 차단기 제어 ${controlResult ? '성공' : '실패'}: ${gate.crossing_gate_ip}`);

        controlResults.push({
          gateName: gate.outside_name,
          location: gate.location,
          ip: gate.crossing_gate_ip,
          success: controlResult,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error(`[자동제어] 차단기 ${gate.outside_name} 처리 중 오류:`, error);

        controlResults.push({
          gateName: gate.outside_name,
          location: gate.location,
          ip: gate.crossing_gate_ip,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (controlResults.length > 0) {
      const autoControlResult = {
        type: 'waterLevelAutoControl',
        waterLevelIP: ip,
        currentWaterLevel: currentWaterLevel,
        threshold: threshold,
        timestamp: new Date().toISOString(),
        results: controlResults,
        summary: {
          total: controlResults.length,
          success: controlResults.filter(r => r.success && !r.skipped).length,
          failed: controlResults.filter(r => !r.success).length,
          skipped: controlResults.filter(r => r.skipped).length
        }
      };

      logger.info(`[자동제어] 결과 요약:`, autoControlResult.summary);

      if (global.websocket) {
        global.websocket.emit('fl_waterLevelAutoControlResult-update', autoControlResult);
        logger.info(`[자동제어] WebSocket 이벤트 전송 완료`);
      }
    } else {
      logger.info(`[자동제어] IP ${ip}: 실행할 작업 없음`);
    }

    resetThresholdExceedCount(ip, threshold);
    return true;

  } catch (error) {
    logger.error(`[자동제어] IP ${ip} 실행 중 오류:`, error);
    resetThresholdExceedCount(ip, threshold);
    return false;
  }
};

module.exports = {
  executeAutoControlByIP,
  executeAutoControlWithGroupCheck,
  executeGroupWaterLevelControl,
  executeSpeakerBroadcast,
  executeCrossingGateControl,
  getAllLinkedInfoByIP,
  checkConsecutiveThresholdExceed,
  resetThresholdExceedCount,
  getWaterLevelGroupByIP,
  getWaterLevelGroup,
  getGroupWaterLevels,
  getWaterLevelControlMode,
  getCurrentGateStatus,
  CONTROL_CONFIG
};