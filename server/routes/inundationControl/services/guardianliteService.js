const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const guardianliteMapper = require('../mappers/guardianliteMapper');
const axios = require("axios");
const axiosRetry = require('axios-retry').default;
const qs = require('qs')
const FormData = require('form-data');
const { addOperLog } = require('../../../utils/addOperLog');

axiosRetry(axios, {
  retries: 5,
  retryDelay: (retry) => {
    const delay = Math.pow(2, retry) * 100;
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }
});

exports.getGuardianliteInfo = async ({ guardianliteIp }) => {

  const client = await pool.connect();

  try {

    let binds = [guardianliteIp];

    let query = await guardianliteMapper.getGuardianliteInfo();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, getGuardianliteInfo, error: ', error);
    console.log('inundationControl/guardianliteService.js, getGuardianliteInfo, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getGuardianliteList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await guardianliteMapper.getGuardianliteList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, getGuardianliteList, error: ', error);
    console.log('inundationControl/guardianliteService.js, getGuardianliteList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addGuardianlite = async ({ outsideIdx, dimensionType, guardianliteIp, guardianliteName }) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    if(!guardianliteName) {
      guardianliteName = null;
    }

    let binds = [guardianliteIp];
    let query = await guardianliteMapper.getGuardianliteInfo();
    const resGuardianliteIpInfo = await client.query(query, binds);
    
    // 가디언라이트 ip 이미 등록되어 있으면
    if(resGuardianliteIpInfo && resGuardianliteIpInfo.rows.length > 0) {

      returnValue.message = '가디언라이트 ip 가 이미 등록되어 있습니다.';
      
    } else {
      // 가디언라이트 ip 가 없으면 등록
      binds = [outsideIdx, guardianliteIp, guardianliteName, dimensionType];
      await client.query('BEGIN');
      query = await guardianliteMapper.addGuardianlite();
      const resAddGuardianlite = await client.query(query, binds);
      await client.query('COMMIT');
  
      if((resAddGuardianlite) && (resAddGuardianlite.rows.length > 0) && (global.websocket)) {
        global.websocket.emit("fl_guardianlites-update", { guardianlites: resAddGuardianlite.rows.length });
        returnValue.status = true;
        returnValue.message = 'success';
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, addGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteService.js, addGuardianlite, error: ', error);
    await client.query('ROLLBACK');
    return returnValue;
  } finally {
    await client.release();
  }
}

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
      try {
        console.log(`가디언라이트 로그인 시도: ${guardianliteIp}, 사용자: ${userId}`);
        
        let form = new FormData();
        form.append('id', userId);
        form.append('password', userPw);
      
        const response = await axios({
          method: 'post',
          url: `http://${guardianliteIp}`,
          data: qs.stringify(form),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          cancelToken: new CancelToken((c) => {
            cancel = c;
          }),
          timeout: 10000, // 10초 타임아웃 추가
        });
        
        console.log(`가디언라이트 로그인 응답 상태: ${response.status}`);
        return response;
      } catch (error) {
        console.error(`가디언라이트 로그인 실패 (${guardianliteIp}):`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code
        });
        throw error;
      }
    };

    const sendCommand = async (url) => {
      try {
        console.log(`가디언라이트 명령 전송: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'Host': guardianliteIp,
            'Connection': 'keep-alive',
          },
          timeout: 10000 // 타임아웃 증가
        });
        
        console.log(`가디언라이트 명령 응답 상태: ${response.status}`);
        return response;
      } catch (error) {
        console.error(`가디언라이트 명령 전송 실패 (${url}):`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code
        });
        throw error;
      }
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
            channel.push(ch === '#000000' ? 'OFF' : 'ON');
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
                , channel[0]
                , channel[1]
                , channel[2]
                , channel[3]
                , channel[4]
                , channel[5]
                , channel[6]
                , channel[7]
                , temper
              ];
              const queryStringGl = await guardianliteMapper.modifyGuardianliteChannel();
              const resUpdateGl = await client.query(queryStringGl, binds);
              if (global.websocket && resUpdateGl && resUpdateGl.rowCount === 1) {
                binds = [guardianliteIp];
                const updateGlStatus = await guardianliteMapper.modifyGuardianliteStatus();
                await client.query(updateGlStatus, binds);
    
                const updatedGuardianlite = {
                  guardianlite_ip: guardianliteIp,
                  ch1: channel[0],
                  ch2: channel[1],
                  ch3: channel[2],
                  ch4: channel[3],
                  ch5: channel[4],
                  ch6: channel[5],
                  ch7: channel[6],
                  ch8: channel[7],
                  temper: temper,
                };
                global.websocket.emit("fl_guardianlites-update", updatedGuardianlite);
    
                returnValue = true;
              }
            }
          }
        } else {
          console.error(`guardianlite 응답 결과 파싱 값(채널, 온도) 오류: 파싱 채널 수: ${channel.length}, 온도: ${temper}(inundationControl/services/guardianliteService.js)`);
        }
      } else {
        console.error(`guardianlite 응답결과 문자열 분할수(channel) 오류: split수 ${arrSplit1.length}(inundationControl/services/guardianliteService.js)`);
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
        console.log('Re-login failed(inundationControl/services/guardianliteService.js)');
      }
    } else {
      console.log('Unexpected response(inundationControl/services/guardianliteService.js):', resGuardianlite?.data);
    }

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    console.log('inundationControl/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    
    // 가디언라이트 연결 에러 상세 로그
    if (error.response) {
      console.error(`가디언라이트 HTTP 에러 (${guardianliteIp}):`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error(`가디언라이트 네트워크 에러 (${guardianliteIp}):`, error.message);
    } else {
      console.error(`가디언라이트 기타 에러 (${guardianliteIp}):`, error.message);
    }
    
    await client.query('ROLLBACK');
    return false; // 에러 시 false 반환
  } finally {
    await client.release();
  }
}

exports.modifyGuardianliteChannelLabel = async ({ guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label, ch7_label, ch8_label, operatorId }) => {

  const client = await pool.connect();

  try {

    await client.query('BEGIN');
    let binds = [guardianliteIp, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, ch6_label, ch7_label, ch8_label];
    let query = await guardianliteMapper.modifyGuardianliteChannelLabel();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("fl_guardianlites-update", { guardianlites: res.rowCount });
    }
    
    addOperLog({
      logAction: 'addoper', 
      operatorId: operatorId, 
      logType: '가디언라이트 채널명 변경', 
      logDescription: `가디언라이트 채널명 변경 성공`, 
      reqIp: '' 
    });

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, modifyGuardianliteChannelLabel, error: ', error);
    console.log('inundationControl/guardianliteService.js, modifyGuardianliteChannelLabel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyOutsideGuardianlite = async ({ guardianliteIp, outsideIdx }) => {

  const client = await pool.connect();

  try {

    if(!outsideIdx) {
      outsideIdx = null;
    }
    await client.query('BEGIN');
    let binds = [guardianliteIp, outsideIdx];
    let query = await guardianliteMapper.modifyOutsideGuardianlite();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("fl_guardianlites-update", { guardianlites: res.rowCount });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, modifyOutsideGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteService.js, modifyOutsideGuardianlite, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.deleteGuardianlite = async ({ guardianliteIp }) => {

  const client = await pool.connect();

  try {

    await client.query('BEGIN');
    let binds = [guardianliteIp];
    let query = await guardianliteMapper.deleteGuardianlite();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("fl_guardianlites-update", { guardianlites: res.rowCount });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/guardianliteService.js, deleteGuardianlite, error: ', error);
    console.log('inundationControl/guardianliteService.js, deleteGuardianlite, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}
