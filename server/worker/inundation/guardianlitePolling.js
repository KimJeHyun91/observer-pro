
const { pool } = require('../../db/postgresqlPool');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const qs = require('qs');
const { insertLog } = require('../../routes/common/services/commonService');


const CONFIG = {
  MAX_RETRIES: 2,
  TIMEOUT: 10000,
  RETRY_DELAY: 3000,
  CONSECUTIVE_FAILURE_THRESHOLD: 5,
  LOG_INTERVAL_MS: 5 * 60 * 1000,
  BATCH_SIZE: 10 // 동시 처리 장치 수
};

// 가디언라이트 상태 캐시
const guardianliteStatusCache = new Map();
const guardianliteDeviceCache = new Map();

let isSyncing = false;

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retry) => {
    const delay = Math.pow(2, retry) * 100;
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }
});

// HTML 파싱 함수 분리
const parseGuardianliteResponse = (htmlData) => {
  try {
    // 온도 파싱
    let temperature = null;
    const tempMatch = htmlData.match(/현재온도\s*:\s*(\d+\.?\d*)\s*°C/);
    if (tempMatch) {
      temperature = tempMatch[1];
      console.log(`온도: ${temperature}°C`);
    }

    // 채널 파싱
    const channels = [];

    for (let chNum = 2; chNum <= 5; chNum++) {
      const btnPattern = new RegExp(
        `<input[^>]*id="BTN_R${chNum}_ON"[^>]*>`,
        'i'
      );

      const btnMatch = htmlData.match(btnPattern);

      if (btnMatch) {
        const btnTag = btnMatch[0];

        const colorMatch = btnTag.match(/color:\s*(#[0-9A-Fa-f]{6})/i);

        if (colorMatch) {
          const colorCode = colorMatch[1];
          colorCode.toUpperCase() === '#FF0000' ? 'ON' : 'OFF';
          channels.push(colorCode);
        } else {
          channels.push('#000000');
        }
      } else {
        channels.push('#000000');
      }
    }

    if (channels.length !== 4) {
      return {
        success: false,
        error: `채널 수 오류: ${channels.length}개`
      };
    }

    return {
      success: true,
      data: {
        channels,
        temperature
      }
    };
  } catch (error) {
    console.error('파싱 중 예외:', error);
    return { success: false, error: error.message };
  }
};

// 채널 상태 변환 함수
const convertChannelsToStatus = (channels) => {
  const statuses = channels.map(channel =>
    channel.toUpperCase() === '#FF0000' ? 'ON' : 'OFF'
  );
  return statuses;
};

// db 업데이트
const buildUpdateQuery = (channels, temperature, ipaddress) => {
  const channelStatus = channels.map(channel =>
    channel.toUpperCase() === '#FF0000' ? 'ON' : 'OFF'
  );

  const channelUpdates = [
    `ch1='ON'`,
    ...channelStatus.map((status, index) =>
      `ch${index + 2}='${status}'`
    )
  ].join(', ');

  const temperatureUpdate = temperature ? `, temper='${temperature}'` : '';

  const query = `
    UPDATE "fl_guardianlite" 
    SET 
      ${channelUpdates}${temperatureUpdate},
      updated_at=NOW()
    WHERE 
      guardianlite_ip='${ipaddress}';
  `;

  return query;
};

const collectGuardianliteInfo = async (ipaddress, id, password) => {
  if (!ipaddress) {
    console.log(`collectGuardianliteInfo: 잘못된 IP 주소 - ${ipaddress}`);
    return false;
  }

  const client = await pool.connect();
  let transaction = false;

  try {
    let loginId = id;
    let loginPw = password;

    if (!loginId || !loginPw) {
      const credentialQuery = `
        SELECT user_id, user_pw 
        FROM fl_guardianlite 
        WHERE guardianlite_ip = $1
      `;
      const credentialResult = await client.query(credentialQuery, [ipaddress]);

      if (credentialResult.rows.length === 0) {
        console.log(`DB에서 가디언라이트 정보를 찾을 수 없음: ${ipaddress}`);
        return false;
      }

      loginId = credentialResult.rows[0].user_id;
      loginPw = credentialResult.rows[0].user_pw;
    }

    // 재시도 로직
    let response = null;
    let lastError = null;

    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`[${ipaddress}] 로그인 시도 ${attempt}/${CONFIG.MAX_RETRIES}`);

        const axiosInstance = axios.create({
          baseURL: `http://${ipaddress}`,
          timeout: CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          withCredentials: true
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        try {
          const loginResponse = await axiosInstance.post('/', qs.stringify({
            id: loginId,
            password: loginPw
          }), {
            signal: controller.signal
          });

          console.log(`[${ipaddress}] POST 응답 길이: ${loginResponse.data?.length || 0}`);

          if (!loginResponse.data || loginResponse.data.indexOf('LOGOUT') === -1) {
            console.log(`[${ipaddress}] POST 응답에 LOGOUT 없음 - 로그인 실패`);

            if (loginResponse.data && loginResponse.data.indexOf('LOGIN') !== -1) {
              console.log(`[${ipaddress}] 재로그인 시도`);

              const reLoginResponse = await axiosInstance.post('/', qs.stringify({
                id: loginId,
                password: loginPw
              }), {
                signal: controller.signal
              });

              if (!reLoginResponse.data || reLoginResponse.data.indexOf('LOGOUT') === -1) {
                throw new Error('재로그인 실패');
              }

              response = reLoginResponse;
            } else {
              throw new Error('로그인 응답 이상');
            }
          } else {
            response = loginResponse;
          }

          break;
        } finally {
          clearTimeout(timeoutId);
        }

      } catch (error) {
        lastError = error;
        if (attempt < CONFIG.MAX_RETRIES) {
          console.log(`[${ipaddress}] ${CONFIG.RETRY_DELAY}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        }
      }
    }

    if (!response?.data) {
      console.log(`가디언라이트 응답 없음 (${CONFIG.MAX_RETRIES}회 시도 후): ${ipaddress}`);
      if (lastError) {
        console.log(`마지막 오류: ${lastError.message}`);
      }
      return false;
    }

    const hasLogoutButton = response.data.includes('LOGOUT');
    const hasChannelButtons = response.data.includes('BTN_R2_ON') ||
      response.data.includes('BTN_R3_ON') ||
      response.data.includes('BTN_R4_ON');

    if (!hasLogoutButton && !hasChannelButtons) {
      console.log(`LOGOUT 버튼: ${hasLogoutButton}, 채널 버튼: ${hasChannelButtons}`);
      return false;
    }

    console.log(`가디언라이트 로그인 성공: ${ipaddress}`);

    // HTML 파싱
    const parseResult = parseGuardianliteResponse(response.data);
    if (!parseResult.success) {
      console.log(`파싱 오류 [${ipaddress}]: ${parseResult.error}`);
      return false;
    }

    const { channels, temperature } = parseResult.data;

    // 기존 데이터 조회
    const selectQuery = `SELECT * FROM fl_guardianlite WHERE guardianlite_ip = $1`;
    const selectResult = await client.query(selectQuery, [ipaddress]);

    if (!selectResult.rows.length) {
      return false;
    }

    const existingData = selectResult.rows[0];
    const channelStatus = convertChannelsToStatus(channels);

    // 변경 사항 확인
    const hasChanges = channelStatus.some((status, index) =>
      existingData[`ch${index + 1}`] !== status
    ) || (temperature && existingData.temper !== temperature);

    if (hasChanges) {
      await client.query('BEGIN');
      transaction = true;

      const updateQuery = buildUpdateQuery(channels, temperature, ipaddress);
      const updateResult = await client.query(updateQuery);

      if (global.websocket && updateResult.rowCount > 0) {
        const statusUpdateQuery = `
          UPDATE fl_guardianlite 
          SET status = true, updated_at = NOW() 
          WHERE guardianlite_ip = $1 
          AND (status = false OR status IS NULL)
        `;
        await client.query(statusUpdateQuery, [ipaddress]);
        global.websocket.emit('guardianlites', { guardianlites: updateResult.rowCount });
      }

      await client.query('COMMIT');
      transaction = false;

      console.log(`db 업데이트 완료: ${ipaddress}`);
    } else {
      console.log(`변경사항 없음: ${ipaddress}`);
    }

    return true;

  } catch (error) {
    if (transaction) {
      await client.query('ROLLBACK');
    }

    console.log(`collectGuardianliteInfo 오류 [${ipaddress}]:`, error.message);
    return false;

  } finally {
    await client.release();
  }
};

const initializeGuardianliteCache = async () => {
  const client = await pool.connect();

  try {
    const queryAll = `
      SELECT gl.*, fo.outside_name 
      FROM fl_guardianlite gl 
      LEFT JOIN fl_outside fo ON gl.outside_idx = fo.idx
    `;
    const result = await client.query(queryAll);

    if (result?.rows?.length > 0) {
      for (const device of result.rows) {
        const { guardianlite_ip, outside_name } = device;

        guardianliteDeviceCache.set(guardianlite_ip, {
          ...device,
          areaName: outside_name
        });

        guardianliteStatusCache.set(guardianlite_ip, {
          status: false,
          lastCheck: Date.now(),
          consecutiveFailures: 0,
          lastLogTime: 0
        });
      }

      console.log(`가디언라이트 캐시 초기화 완료: ${guardianliteDeviceCache.size}개 장치`);
    }
  } catch (error) {
    console.error('가디언라이트 캐시 초기화 실패:', error);
  } finally {
    await client.release();
  }
};

// 배치 처리 함수
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};


const syncGuardianlites = async () => {
  if (isSyncing) {
    console.log('가디언라이트 동기화가 이미 실행 중.');
    return;
  }

  isSyncing = true;
  console.log(`가디언라이트 동기화 시작: ${new Date().toISOString()}`);

  try {
    if (guardianliteDeviceCache.size === 0) {
      await initializeGuardianliteCache();
      return;
    }

    const client = await pool.connect();
    const changedDevices = [];
    const failedDevices = [];

    try {
      const devices = Array.from(guardianliteDeviceCache.entries());
      const deviceChunks = chunkArray(devices, CONFIG.BATCH_SIZE);

      for (const chunk of deviceChunks) {
        const promises = chunk.map(async ([ipaddress, deviceInfo]) => {
          const { user_id, user_pw, areaName } = deviceInfo;
          const cachedStatus = guardianliteStatusCache.get(ipaddress);

          try {
            const result = await collectGuardianliteInfo(ipaddress, user_id, user_pw);
            const newStatus = result === true;
            const currentStatus = cachedStatus.status;

            cachedStatus.lastCheck = Date.now();

            if (newStatus !== currentStatus) {
              cachedStatus.status = newStatus;
              cachedStatus.consecutiveFailures = newStatus ? 0 : cachedStatus.consecutiveFailures + 1;

              changedDevices.push({
                ipaddress,
                areaName,
                oldStatus: currentStatus,
                newStatus: newStatus
              });

              console.log(`[${ipaddress}] 상태 변경: ${currentStatus ? '연결' : '끊김'} -> ${newStatus ? '연결' : '끊김'}`);
            } else if (!newStatus) {
              cachedStatus.consecutiveFailures++;
            } else {
              cachedStatus.consecutiveFailures = 0;
            }

            if (!newStatus && cachedStatus.consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURE_THRESHOLD) {
              const timeSinceLastLog = Date.now() - cachedStatus.lastLogTime;
              if (timeSinceLastLog > CONFIG.LOG_INTERVAL_MS) {
                failedDevices.push({ ipaddress, areaName });
                cachedStatus.lastLogTime = Date.now();
              }
            }

          } catch (error) {
            console.error(`가디언라이트 ${ipaddress} 동기화 오류:`, error.message);
            cachedStatus.consecutiveFailures++;
            cachedStatus.lastCheck = Date.now();

            if (cachedStatus.consecutiveFailures >= CONFIG.CONSECUTIVE_FAILURE_THRESHOLD) {
              const timeSinceLastLog = Date.now() - cachedStatus.lastLogTime;
              if (timeSinceLastLog > CONFIG.LOG_INTERVAL_MS) {
                failedDevices.push({ ipaddress, areaName });
                cachedStatus.lastLogTime = Date.now();
              }
            }
          }
        });

        await Promise.allSettled(promises);
      }

      // DB 업데이트 (변경된 장치만)
      if (changedDevices.length > 0) {
        await client.query('BEGIN');

        for (const device of changedDevices) {
          const updateQuery = `
            UPDATE fl_guardianlite 
            SET status = $1, updated_at = NOW() 
            WHERE guardianlite_ip = $2
          `;
          await client.query(updateQuery, [device.newStatus, device.ipaddress]);
        }

        await client.query('COMMIT');
        console.log(`가디언라이트 상태 업데이트: ${changedDevices.length}개 장치`);
      }

      // 실패 로그 배치 처리
      if (failedDevices.length > 0) {
        await insertLog(
          'System',
          '가디언라이트 상태 동기화 실패',
          `${failedDevices.length}개 장치 동기화 실패: ${failedDevices.map(d => d.ipaddress).join(', ')}`,
          'worker/inundation/guardianlitePolling.js'
        );
      }

    } catch (error) {
      console.error('가디언라이트 동기화 오류:', error);
      await client.query('ROLLBACK');
    } finally {
      await client.release();
    }

  } finally {
    isSyncing = false;
    console.log(`가디언라이트 동기화 완료: ${new Date().toISOString()}\n`);
  }
};

module.exports = {
  collectGuardianliteInfo,
  syncGuardianlites,
  initializeGuardianliteCache
};