const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const FormData = require('form-data');
const qs = require('qs');
const { insertLog } = require('../../routes/common/services/commonService');

axiosRetry(axios, {
  retries: 3,
  retryDelay: (retry) => {
    const delay = Math.pow(2, retry) * 100;
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }
});

const collectGuardianliteInfo = async (ipaddress, id, password, retryCount = 0) => {
  const MAX_RETRIES = 3;
  const client = await pool.connect();

  try {
    if (!ipaddress) {
      console.log(`collectGuardianliteInfo: 장비의 ipaddress(${ipaddress})가 올바르지 않습니다.(worker/broadcast/guardianlitePolling.js)`);
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    let resGuardianlite = null;
    let cancel;

    let form = new FormData();
    form.append('id', id);
    form.append('password', password);

    try {
      resGuardianlite = await axios({
        method: 'post',
        url: `http://${ipaddress}`,
        data: qs.stringify({ id, password }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 로그인 성공 응답 확인
    if (resGuardianlite && resGuardianlite.data && resGuardianlite.data.indexOf('Login') === -1) {
      const arrSplit1 = resGuardianlite.data.split(`<td style="width: 50%; border:none;"><input`);
      const arrSplit2 = resGuardianlite.data.split('<span style="color:#FF0000"><h2>');

      if (arrSplit1.length >= 6) {
        const channel = [];
        arrSplit1.map((str, index) => {
          if (index > 0) {
            const indexChStart = str.indexOf(` value="ON" style="font-size:40px; color:`);
            const indexChLast = str.indexOf(`; background`);
            const ch = str.substring(indexChStart + 41, indexChLast);
            channel.push(ch);
          }
        });

        let temper;
        if (arrSplit2.length > 1) {
          const temperSplit = arrSplit2[1];
          temper = temperSplit.substring(7, 11);
        }

        if (channel.length >= 5 && temper) {
          let querySelect = `SELECT * FROM tm_guardianlite WHERE guardianlite_ip='${ipaddress}';`;
          const resSelect = await client.query(querySelect);

          if (resSelect && resSelect.rows && resSelect.rows.length > 0) {
            await client.query('BEGIN');

            const old = resSelect.rows[0];
            if (
              old.ch1 !== channel[0] ||
              old.ch2 !== channel[1] ||
              old.ch3 !== channel[2] ||
              old.ch4 !== channel[3] ||
              old.ch5 !== channel[4] ||
              old.ch6 !== channel[5] ||
              old.ch7 !== channel[6] ||
              old.ch8 !== channel[7] ||
              old.temper !== temper
            ) {
              const queryStringGl = `
                UPDATE "tm_guardianlite" 
                SET 
                  ch1='${channel[0] === '#000000' ? 'OFF' : 'ON'}', 
                  ch2='${channel[1] === '#000000' ? 'OFF' : 'ON'}', 
                  ch3='${channel[2] === '#000000' ? 'OFF' : 'ON'}', 
                  ch4='${channel[3] === '#000000' ? 'OFF' : 'ON'}', 
                  ch5='${channel[4] === '#000000' ? 'OFF' : 'ON'}', 
                  ch6='${channel[5] === '#000000' ? 'OFF' : 'ON'}', 
                  ch7='${channel[6] === '#000000' ? 'OFF' : 'ON'}', 
                  ch8='${channel[7] === '#000000' ? 'OFF' : 'ON'}', 
                  temper='${temper}',
                  updated_at=NOW()
                WHERE 
                  guardianlite_ip='${ipaddress}';
              `;
              const resGlUpdate = await client.query(queryStringGl);

              if (global.websocket && resGlUpdate && resGlUpdate.rowCount > 0) {
                const updateGlStatus = `
                  UPDATE tm_guardianlite 
                  SET status = false, updated_at=NOW() 
                  WHERE guardianlite_ip='${ipaddress}' 
                  AND (status=true OR status IS NULL);
                `;
                await client.query(updateGlStatus);
                global.websocket.emit('guardianlites', { guardianlites: resGlUpdate.rowCount });
              }
            }

            await client.query('COMMIT');
            return true;
          } else {
            console.log(`guardianlite 응답 결과 DB 조회 실패 또는 데이터 없음(guardianlite_ip='${ipaddress}').`);
            return false;
          }
        } else {
          console.log(`guardianlite 응답 결과 파싱 값 오류: 파싱채널 수: ${channel.length}, 온도 값: ${temper}(worker/broadcast/guardianlitePolling.js)`);
          return false;
        }
      } else {
        console.log(`guardianlite 응답 결과 문자열 분할수(ch) 오류: split수 ${arrSplit1.length} || ${new Date()}(worker/broadcast/guardianlitePolling.js)`);

        if (retryCount < MAX_RETRIES) {
          console.log(`재시도 중: ${retryCount + 1} / ${MAX_RETRIES}`);
          return await collectGuardianliteInfo(ipaddress, id, password, retryCount + 1);
        } else {
          console.log('재시도 횟수를 모두 소진했습니다.');
          return false;
        }
      }
    } else {
      console.log(`Guardianlite Login Failed.(worker/broadcast/guardianlitePolling.js, ip:${ipaddress})`);
      return false;
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('collectGuardianliteInfo error: ', error);
    return false;
  } finally {
    await client.release();
  }
};

const syncGuardianlites = async () => {
  const client = await pool.connect();

  try {
    // 전체 가디언라이트 장비 DB에서 읽기
    const queryAll = `SELECT * FROM tm_guardianlite;`;
    const resAll = await client.query(queryAll);

    if (resAll && resAll.rows && resAll.rows.length > 0) {
      for (const device of resAll.rows) {
        const { outside_idx, guardianlite_ip, user_id, user_pw } = device;
        let areaName;

        const queryAreaName = `SELECT outside_name FROM tm_outside WHERE idx=${outside_idx}`;
        const resAreaName = await client.query(queryAreaName);

        if (resAreaName && resAreaName.rows && resAreaName.rows.length === 1) {
          areaName = resAreaName.rows[0].outside_name;
        }

        try {
          const result = await collectGuardianliteInfo(guardianlite_ip, user_id, user_pw);
          if (result) {
            // await insertLog('System', '가디언라이트 상태 동기화', `${areaName}, 가디언 라이트(${guardianlite_ip}) 상태 동기화 성공`, 'worker/broadcast/guardianlitePolling.js');
          } else {
            if (result !== undefined) {
              await insertLog('System', '가디언라이트 상태 동기화 실패', `${areaName}, 가디언 라이트(${guardianlite_ip}) 상태 동기화 실패`, 'worker/broadcast/guardianlitePolling.js');
            }
          }
        } catch (error) {
          await insertLog('System', '가디언라이트 상태 동기화 실패', `${areaName} 가디언 라이트(${guardianlite_ip}) 상태 동기화 실패`, 'worker/broadcast/guardianlitePolling.js');
          // console.error('syncGuardianlites, collectGuardianliteInfo, error: ', error);
        }
      }
    }
  } catch (error) {
    // logger.info('worker/broadcast/guardianlitePolling.js, syncGuardianlites, error: ', error);
    console.log('worker/broadcast/guardianlitePolling.js, syncGuardianlites, error: ', error);
  } finally {
    await client.release();
  }
};

module.exports = {
  collectGuardianliteInfo,
  syncGuardianlites
};