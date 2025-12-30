const eventTypeService = require('../../routes/tunnel/services/eventTypeService');
const commonService = require('../../routes/common/services/commonService');
const { sendCurtainCommand } = require('./outsideConnect');
const billboardSocketControl = require('./billboardSocketControl');
const logger = require('../../logger');
const { pool } = require('../../db/postgresqlPool');
const ModbusRTU = require('modbus-serial');
require('dotenv').config();

const DEFAULT_PORT = 502;
const UNIT_ID = Number(process.env.SLAVE_ID) || 1;
const REGISTER_ADDR = 15;

let lastDbSaveTimestamp = 0;

const closeWithTimeout = (client, timeout = 2000) => {
  return Promise.race([
    client.close(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('client.close() timeout')), timeout)
    )
  ]);
};

async function markDeviceConnectionStatus(idx, isConnected, barrierIdx = null) {
  if (!idx) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE tm_water_level SET linked_status = $1 WHERE idx = $2`,
      [isConnected, idx]
    );

    if (barrierIdx) {
      await client.query(
        `UPDATE tm_outside SET barrier_status = $1 WHERE idx = $2`,
        [isConnected, barrierIdx]
      );
    }

    await client.query('COMMIT');

    if (global.websocket) {
      global.websocket.emit("tm_waterLevel-update", { isConnected });
    }

    // console.log(`🔗 linked_status=${isConnected} 처리 완료 (water_level_idx=${idx}, barrier_idx=${barrierIdx})`);
  } catch (err) {
    await client.query('ROLLBACK');
    // console.error(`❌ 상태 업데이트 실패 (water_level_idx=${idx}, barrier_idx=${barrierIdx}):`, err.message);
  } finally {
    client.release();
  }
}

async function writeThreshold() {
  const { getWaterLevelList } = require('../../routes/tunnel/services/waterGaugeService');
  const getWaterLevelRes = await getWaterLevelList();
  const waterLevelList = (getWaterLevelRes.data || [])
    .filter(item => item.communication === 'control_in')
    .sort((a, b) => a.idx - b.idx);

  if (waterLevelList.length === 0) {
    // console.warn('⚠️ control_in 수위계가 없습니다.');
    return;
  }

  for (const device of waterLevelList) {
    try {
      const client = new ModbusRTU();
      // console.log(`▶ Threshold 설정: ${device.ip}:${DEFAULT_PORT} → ${device.threshold}`);
      await client.connectTCP(device.ip, { port: DEFAULT_PORT });
      client.setID(UNIT_ID);

      const outsideIdx = device.outside_info?.[0]?.idx;
      await markDeviceConnectionStatus(device.idx, true, outsideIdx);
      await client.writeRegister(16, device.threshold);
      // console.log(`   ✅ threshold 설정 완료: ${device.threshold}`);

      await closeWithTimeout(client);
    } catch (err) {
      // console.error(`❌ threshold 설정 실패 (ip=${device.ip}): ${err.message}`);
      await markDeviceConnectionStatus(device?.idx, false);
    }
  }
}

async function writeThresholdByIdx(waterLevelIdx) {
  const { getWaterLevelList } = require('../../routes/tunnel/services/waterGaugeService');
  const getWaterLevelRes = await getWaterLevelList();

  // control_in 중에서 해당 idx만 찾기
  const device = (getWaterLevelRes.data || [])
    .filter(item => item.communication === 'control_in')
    .find(item => Number(item.idx) === Number(waterLevelIdx));

  if (!device) {
    // console.warn(`⚠️ control_in 수위계 중 idx=${waterLevelIdx} 을(를) 찾을 수 없습니다.`);
    return false;
  }

  try {
    const client = new ModbusRTU();
    // console.log(`▶ [단일] Threshold 설정: idx=${device.idx}, ${device.ip}:${DEFAULT_PORT} → ${device.threshold}`);
    await client.connectTCP(device.ip, { port: DEFAULT_PORT });
    client.setID(UNIT_ID);

    const outsideIdx = device.outside_info?.[0]?.idx;
    await markDeviceConnectionStatus(device.idx, true, outsideIdx);

    // 기존 writeThreshold와 동일하게 16번 주소에 쓰기
    await client.writeRegister(16, device.threshold);
    // console.log(`   ✅ [단일] threshold 설정 완료: ${device.threshold}`);

    await closeWithTimeout(client);
    return true;
  } catch (err) {
    // console.error(`❌ [단일] threshold 설정 실패 (idx=${device?.idx}, ip=${device?.ip}): ${err.message}`);
    await markDeviceConnectionStatus(device?.idx, false);
    return false;
  }
}

// 16비트 unsigned(0~65535) → signed(-32768~32767) 변환 후, 음수면 0으로 보정
function checkWaterLevel(val) {
  const signed = (val > 0x7FFF) ? (val - 0x10000) : val; // 0x8000~0xFFFF → 음수
  return signed < 0 ? 0 : signed;
}


async function readAndLogWaterLevels() {
  const { getWaterLevelList } = require('../../routes/tunnel/services/waterGaugeService');
  const getWaterLevelRes = await getWaterLevelList();
  const waterLevelList = (getWaterLevelRes.data || [])
    .filter(item => item.communication === 'control_in')
    .sort((a, b) => a.idx - b.idx);

  if (waterLevelList.length === 0) {
    // console.warn('⚠️ control_in 수위계가 없습니다.');
    return;
  }

  const now = Date.now();
  const shouldSaveToDb = now - lastDbSaveTimestamp > 5 * 60 * 1000;

  for (const device of waterLevelList) {
    try {
      const client = new ModbusRTU();
      // console.log(`▶ 연결: ${device.ip}:${DEFAULT_PORT} (unitID ${UNIT_ID}), idx=${device.idx}`);
      await client.connectTCP(device.ip, { port: DEFAULT_PORT });
      client.setID(UNIT_ID);

      const outsideIdx = device.outside_info?.[0]?.idx;
      await markDeviceConnectionStatus(device.idx, true, outsideIdx);

      const resp = await client.readHoldingRegisters(REGISTER_ADDR, 1);
      let level = resp.data[0];
      level = checkWaterLevel(level)
      // console.log(`📥 수위 [idx=${device.idx}, ip=${device.ip}]: ${level}`);


      await closeWithTimeout(client);
      const eventData = {
        idx: device.idx,
        name: device.name,
        location: device.location,
        waterLevel: level,
        threshold: parseInt(device.threshold),
        outside_info: device.outside_info?.[0] || {},
        outside_ip: device.ip
      };
      await writeEventLog(eventData, "수위계");

      const automatic = device.outside_info[0].automatic;
      const outside_ip = device.ip
      if (automatic) {
        // 차단막 제어
        const floodCheck = await checkFloodStatus(outside_ip)
        if (floodCheck) {
          const res = await sendCurtainCommand(outside_ip, '작동');
          if (res) {
            // 전광판 메시지 수정
            await MakeBillboardMSG(device.outside_info[0].idx);
            // 이벤트 전송
            await writeEventLog(eventData, '차단막');
          }
        }
      }

      if (shouldSaveToDb) {
        await pool.query(
          `INSERT INTO tm_water_level_log (water_level_idx, water_level) VALUES ($1, $2)`,
          [device.idx, level]
        );
        await pool.query(
          `UPDATE tm_water_level SET curr_water_level = $1 WHERE idx = $2`,
          [level, device.idx]
        );
        // console.log(`   ✅ DB 기록 완료: idx=${device.idx}, level=${level}`);
      }
    } catch (err) {
      // console.error(`❌ idx=${device?.idx}, ip=${device?.ip} 읽기/기록 실패: ${err.message}`);
      const outsideIdx = device.outside_info?.[0]?.idx;
      await markDeviceConnectionStatus(device?.idx, false, outsideIdx);
    }
  }

  if (shouldSaveToDb) {
    lastDbSaveTimestamp = now;
  }
}

async function MakeBillboardMSG(outsideIdx) {

  try {
    // 전광판 제어
    const sql = `
      SELECT b.idx, b.billboard_ip, b.controller_type
      FROM tm_mapping_tunnel_billboard AS mtb
      JOIN tm_billboard AS b
        ON b.idx = mtb.billboard_idx
      WHERE mtb.outside_idx = $1
        AND b.manufacturer = 'Y-Control';
    `;
    const billboardList = await pool.query(sql, [outsideIdx]);

    // VMS 전광판
    const vmsBillboards = billboardList.rows.filter(
      row => row.controller_type?.toLowerCase() === 'vms'
    );

    for (const board of vmsBillboards) {
      try {
        const connectRes = await billboardSocketControl.sendToBillboard(
          board.billboard_ip,
          '진입금지',
          'red',
          'singleBillboard',
          'admin00',
          '',
          'vms',
          'Y-Control'
        );

        const ok = Array.isArray(connectRes?.success) && connectRes.success.length > 0;
        if (ok) {
          // 3-a) 성공: linked_status=true 반영하고 커밋
          await pool.query(
            `UPDATE tm_billboard 
              SET linked_status = $1, 
                  billboard_msg = $2, 
                  billboard_color = $3, 
                  updated_at = NOW()
              WHERE idx = $4`,
            [true, '진입금지', 'red', board.idx]
          );


        } else {
          // 롤백 후 별도로 상태만 false로 표기
          await pool.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [false, board.idx]
          );
        }

      } catch (err) {
        console.error('❌ 터널 전광판 진입금지 메시지 오류 발생', err.message);
      }
    }

    // LCS 전광판
    const lcsBillboards = billboardList.rows.filter(
      row => row.controller_type?.toLowerCase() === 'lcs'
    );

    for (const board of lcsBillboards) {
      try {
        const connectRes = await billboardSocketControl.sendToBillboard(
          board.billboard_ip,
          '8007',
          '',          // color 미사용이면 공백
          'singleBillboard',             // type
          'admin00',              // id (operator)
          '',
          'lcs',     // (원 코드 유지)
          'Y-Control'
        );

        const ok = Array.isArray(connectRes?.success) && connectRes.success.length > 0;
        if (ok) {
          // 3-a) 성공: linked_status=true 반영하고 커밋
          await pool.query(
            `UPDATE tm_billboard 
              SET linked_status = $1, 
                  billboard_msg = $2, 
                  billboard_color = $3, 
                  updated_at = NOW()
              WHERE idx = $4`,
            [true, '8007', '', board.idx]
          );


        } else {
          // 롤백 후 별도로 상태만 false로 표기
          await pool.query(
            'UPDATE tm_billboard SET linked_status = $1 WHERE idx = $2',
            [false, board.idx]
          );
        }

      } catch (err) {
        console.error('❌ 터널 전광판 진입금지 메시지 오류 발생', err.message);
      }
    }

    if (global.websocket) {
      global.websocket.emit('tm_billboard-update', { billboard: { modify: 'success' } });
    }

  } catch (err) {
    console.error('❌ 터널 전광판 진입금지 메시지 오류 발생', err.message);
  }
}


/**
 * 40010.01 침수 상태 확인 함수
 * @param {string} ip - 제어반(PLC) IP 주소
 * @returns {Promise<boolean|null>} true=침수, false=정상, null=통신 실패
 */
async function checkFloodStatus(ip) {
  const client = new ModbusRTU();

  try {
    // 1) Modbus TCP 연결
    await client.connectTCP(ip, { port: DEFAULT_PORT });
    client.setID(UNIT_ID);

    // 2) 40010 → 실제 주소는 9
    const resp = await client.readHoldingRegisters(9, 1);
    const registerValue = resp.data[0];

    // 3) 40010.01 → 레지스터의 bit1 확인 (0=정상, 1=침수)
    const isFlooded = ((registerValue >> 1) & 1) === 1;

    // 4) 연결 종료 후 결과 반환
    await client.close();
    return isFlooded;
  } catch (err) {
    console.error(`❌ 침수 상태 읽기 실패 (ip=${ip}):`, err.message);
    try { await client.close(); } catch { }
    return null; // 통신 실패 시 null 반환
  }
}

async function deleteOldWaterLevelLogs() {
  try {
    const res = await pool.query(`
      DELETE FROM tm_water_level_log
      WHERE created_at < NOW() - INTERVAL '7 days'
    `);
    // console.log(`🧹 7일 초과 로그 삭제 완료: ${res.rowCount}건`);
  } catch (err) {
    // console.error('❌ 로그 삭제 중 오류 발생:', err.message);
  }
}

async function writeEventLog(eventData, description) {
  try {
    const levelState = getLevelStatus(eventData.waterLevel, eventData.threshold);
    const result = await eventTypeService.getEventTypeList();

    let matchedEvent;
    let device_type;

    if (description === '수위계') {
      matchedEvent = result.find(item => item.event_type === levelState?.event_type);
      device_type = 'waterlevel';
    } else {
      matchedEvent = result.find(item => item.event_type === '차단기 자동제어');
      device_type = 'crossinggate';
    }

    // 매칭되는 이벤트가 없으면 스킵
    if (!matchedEvent) return;

    // ✅ 여기서 중복(미인증 잔여) 체크
    const canWrite = await checkDuplicationEvent(matchedEvent.event_type_id, eventData.name);
    if (!canWrite) {
      return;
    }

    // 통과 → 새 이벤트 로그 생성
    await commonService.addEventLog({
      event_name: matchedEvent.event_type,
      device_name: eventData.name,
      description: description,
      location: eventData.location,
      main_service_name: 'tunnel',
      device_type: device_type,
      severity_id: matchedEvent.severity_id,
      device_idx: eventData.idx,
      event_type_id: matchedEvent.event_type_id,
      use_popup: matchedEvent.use_popup,
      outside_idx: eventData.outside_info.idx,
      outside_name: eventData.outside_info.outside_name,
      outside_location: eventData.outside_info.location,
      lat: eventData.outside_info.top_location,
      lng: eventData.outside_info.left_location,
      outside_ip: eventData.outside_ip
    });

    return;
  } catch (error) {
    return { skipped: true, reason: 'error' };
  }
}


async function checkDuplicationEvent(event_type_id, device_name) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT is_acknowledge
      FROM event_log
      WHERE event_type_id = $1
        AND device_name = $2
    `;
    const { rows } = await client.query(query, [event_type_id, device_name]);

    if (rows.length === 0) {
      // 조건에 맞는 로그가 없으면 true 반환
      return true;
    }

    const hasUnack = rows.some(row => row.is_acknowledge === false);
    return !hasUnack;
  } catch (err) {
    console.error('checkDuplicationEvent error:', err);
    throw err;
  } finally {
    client.release();
  }
}


const getThresholdLevels = (threshold) => ({
  danger: threshold * 0.90,
  severe: threshold * 0.80,
  warning: threshold * 0.70,
  caution: threshold * 0.50,
  attention: threshold * 0.30,
});

const getLevelStatus = (level, threshold) => {
  const levels = getThresholdLevels(threshold);

  if (threshold === 0) return;
  if (level < levels.caution) return;
  if (level > levels.danger) return { event_type: '위험 수위 감지 (대피)' };
  if (level === levels.danger) return { event_type: '위험 수위 감지 (심각)' };
  if (level >= levels.severe) return { event_type: '위험 수위 감지 (심각)' };
  if (level >= levels.warning) return { event_type: '위험 수위 감지 (경계)' };
  if (level >= levels.caution) return { event_type: '위험 수위 감지 (주의)' };
};

exports.waterLevelConnect = async () => {
  // console.log('▶ Modbus 실행 준비');

  await writeThreshold();

  // console.log('▶ 30초마다 수위 읽기 및 이벤트 체크 시작');
  readAndLogWaterLevels().catch(err => {
    // console.error('❌ 초기 실행 오류:', err.message)
  });

  setInterval(() => {
    readAndLogWaterLevels().catch(err => {
      // console.error('❌ 주기 실행 오류:', err.message)
    })
  }, 30 * 1000);

  await deleteOldWaterLevelLogs();
  setInterval(() => {
    deleteOldWaterLevelLogs().catch(err => console.error('❌ 로그 삭제 오류:', err.message));
  }, 24 * 60 * 60 * 1000);
};

if (require.main === module) {
  exports.waterLevelConnect();
}

exports.writeThresholdByIdx = writeThresholdByIdx