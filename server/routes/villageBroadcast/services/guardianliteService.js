const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const guardianliteMapper = require('../mappers/guardianliteMapper');
const axios = require("axios");
const axiosRetry = require('axios-retry').default;
const qs = require('qs')
const FormData = require('form-data');

axiosRetry(axios, {
  retries: 5,
  retryDelay: (retry) => {
    const delay = Math.pow(2, retry) * 100;
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }
});

exports.modifyGuardianliteChannel = async ({ guardianliteIp, userId, userPw, channel, cmd }) => {

  const client = await pool.connect();

  try {

    let returnValue = false;

    await client.query('BEGIN');

    let para = 'R';
    let command = cmd;
    // 채널1은 reset 만됨 - 채널1을 on으로 설정하면 reset 됨
    if (channel === 1) {
      command = 'on';
    }
    // 채널2~8 은 R2~R8 형식으로 파라메터가 사용됨
    if (channel > 1) {
      para += channel;
    }

    let timeout = 5000;
    let resGuardianlite = null;
    const CancelToken = axios.CancelToken;
    let cancel;

    const login = async () => {

      let form = new FormData();
      form.append('id', userId);
      form.append('password', userPw);
    
      return await axios({
        method: 'post',
        url: `http://${guardianliteIp}`,
        data: qs.stringify(form),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        cancelToken: new CancelToken((c) => {
          cancel = c;
        }),
      });
    };

    const sendCommand = async (url) => {
      return await axios.get(url, {
        headers: {
          'Host': guardianliteIp,
          'Connection': 'keep-alive',
        },
        timeout: 3000
      });
    };

    const processResponse = async (response) => {

      const arrSplit1 = response.data.split(`<td style="width: 50%; border:none;"><input`);
      const arrSplit2 = response.data.split('<span style="color:#FF0000"><h2>');
  
      const channel = [];
      let temper;
  
      if (arrSplit1.length >= 6) {
        arrSplit1.map((str, index) => {
          if (index > 0) {
            const indexChStart = str.indexOf(` value="ON" style="font-size:40px; color:`);
            const indexChLast = str.indexOf(`; background`);
            const ch = str.substring(indexChStart+41,indexChLast);
            channel.push(ch);
          }
        });
        const temperSplit = arrSplit2[1];
        temper = temperSplit.substring(7, 11);
  
        if (channel.length >= 5 && temper) {      

          let binds = [guardianliteIp];
          let queryGuardianliteIpInfo = await guardianliteMapper.getGuardianliteInfo();
          const resGuardianliteIpInfo = await client.query(queryGuardianliteIpInfo, binds);

          if ((resGuardianliteIpInfo) && (resGuardianliteIpInfo.rows) && (resGuardianliteIpInfo.rows.length > 0)) {

            const old = resGuardianliteIpInfo.rows[0];

            if (old.ch1 !== channel[0] || old.ch2 !== channel[1] ||
                old.ch3 !== channel[2] || old.ch4 !== channel[3] ||
                old.ch5 !== channel[4] || old.ch6 !== channel[5] ||
                old.ch7 !== channel[6] || old.ch8 !== channel[7] ||
                old.temper !== temper) {

              binds = [
                guardianliteIp
                , channel[0] === '#000000' ? 'OFF' : 'ON'
                , channel[1] === '#000000' ? 'OFF' : 'ON'
                , channel[2] === '#000000' ? 'OFF' : 'ON'
                , channel[3] === '#000000' ? 'OFF' : 'ON'
                , channel[4] === '#000000' ? 'OFF' : 'ON'
                , channel[5] === '#000000' ? 'OFF' : 'ON'
                , channel[6] === '#000000' ? 'OFF' : 'ON'
                , channel[7] === '#000000' ? 'OFF' : 'ON'
                , temper
              ];
              const queryStringGl = await guardianliteMapper.modifyGuardianliteChannel();
              const resUpdateGl = await client.query(queryStringGl, binds);
  
              if (global.websocket) {
                if(resUpdateGl && resUpdateGl.rowCount > 0){

                  binds = [guardianliteIp];
                  const updateGlStatus = await guardianliteMapper.modifyGuardianliteStatus();
                  await client.query(updateGlStatus, binds);

                  global.websocket.emit("vb_guardianlites-update", {  guardianlites: resUpdateGl.rowCount });

                  returnValue = true;
                }
              }
            }
          }
        } else {
          console.error(`guardianlite 응답 결과 파싱 값(채널, 온도) 오류: 파싱 채널 수: ${channel.length}, 온도: ${temper}(villageBroadcast/services/guardianliteService.js)`);
        }
      } else {
        console.error(`guardianlite 응답결과 문자열 분할수(channel) 오류: split수 ${arrSplit1.length}(villageBroadcast/services/guardianliteService.js)`);
      }
    };
    
    setTimeout(() => {
      if (resGuardianlite === null) {
        cancel && cancel('가디언라이트 연결 시간 초과');
      }
    }, timeout);

    resGuardianlite = await login();

    if (resGuardianlite && resGuardianlite.data && resGuardianlite.data.indexOf('LOGOUT') !== -1) {

      const url = `http://${guardianliteIp}?${para}=${command}`;
      resGuardianlite = await sendCommand(url);

      await processResponse(resGuardianlite);

    } else if (resGuardianlite && resGuardianlite.data && resGuardianlite.data.indexOf('LOGIN') !== -1) {

      resGuardianlite = await login();

      if (resGuardianlite && resGuardianlite.data && resGuardianlite.data.indexOf('LOGOUT') !== -1) {

        const url = `http://${guardianliteIp}?${para}=${command}`;
        resGuardianlite = await sendCommand(url);

        await processResponse(resGuardianlite);

      } else {
        console.log('Re-login failed(villageBroadcast/services/guardianliteService.js)');
      }
    } else {
      console.log('Unexpected response(villageBroadcast/services/guardianliteService.js):', resGuardianlite?.data);
    }

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.info('broadcast/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    console.log('broadcast/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyGuardianliteChannelLabel = async ({ guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label, ch7_label, ch8_label }) => {

  const client = await pool.connect();

  try {

    await client.query('BEGIN');
    let binds = [guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label, ch7_label, ch8_label];
    let query = await guardianliteMapper.modifyGuardianliteChannelLabel();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("vb_guardianlites-update", { guardianlites: res.rowCount });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('broadcast/guardianliteService.js, modifyGuardianliteChannelLabel, error: ', error);
    console.log('broadcast/guardianliteService.js, modifyGuardianliteChannelLabel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}