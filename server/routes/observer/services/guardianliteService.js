const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const guardianliteMapper = require('../mappers/guardianliteMapper');
const axios = require("axios");
const axiosRetry = require('axios-retry').default;
const qs = require('qs')
const FormData = require('form-data');
const { getLocation } = require('../../../utils/getLocation');
const eventTypeMapper = require('../../common/mappers/eventTypeMapper');

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

exports.getGuardianliteList = async ({ inside_idx, outside_idx, dimension_type }) => {
  const client = await pool.connect();
  try {
    let binds = [];
    let query;
    if(inside_idx != null) {
      binds = [inside_idx];
      query = await guardianliteMapper.getGuardianliteList({ inside_idx, dimension_type });
    } else if(outside_idx != null) {
      binds = [outside_idx];
      query = await guardianliteMapper.getGuardianliteList({ outside_idx, dimension_type });
    } else {
      binds = [];
      query = await guardianliteMapper.getGuardianliteList({});
    }
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('main/guardianliteService.js, getGuardianliteList, error: ', error);
    console.log('main/guardianliteService.js, getGuardianliteList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addGuardianlite = async ({ 
  outside_idx, 
  inside_idx,
  dimension_type,
  top_location, 
  left_location, 
  guardianlite_ip, 
  guardianlite_name,
  ch1_label,
  ch2_label,
  ch3_label,
  ch4_label,
  ch5_label
}) => {

  const client = await pool.connect();

  let returnValue = {
    status: false,
    message: 'fail'
  };

  try {

    let binds = [guardianlite_ip];
    let query = await guardianliteMapper.getGuardianliteInfo();
    const resGuardianliteIpInfo = await client.query(query, binds);
    
    // 가디언라이트 ip 이미 등록되어 있으면
    if(resGuardianliteIpInfo && resGuardianliteIpInfo.rows.length > 0) {

      returnValue.message = '가디언라이트 ip 가 이미 등록되어 있습니다.';
      
    } else {
      ch1_label = setChannelLabel(ch1_label);
      ch2_label = setChannelLabel(ch2_label);
      ch3_label = setChannelLabel(ch3_label);
      ch4_label = setChannelLabel(ch4_label);
      ch5_label = setChannelLabel(ch5_label);
      // 가디언라이트 ip 가 없으면 등록
      binds = [
        outside_idx, 
        inside_idx, 
        dimension_type, 
        top_location, 
        left_location, 
        guardianlite_ip, 
        guardianlite_name, 
        ch1_label, 
        ch2_label, 
        ch3_label, 
        ch4_label, 
        ch5_label
      ];
      await client.query('BEGIN');
      query = await guardianliteMapper.addGuardianlite();
      const resAddGuardianlite = await client.query(query, binds);
      await client.query('COMMIT');
  
      if((resAddGuardianlite) && (resAddGuardianlite.rows.length > 0) && (global.websocket)) {
        console.log(resAddGuardianlite.rows)
        global.websocket.emit("ob_guardianlites-update", { guardianlites: resAddGuardianlite.rowCount });
        returnValue.status = true;
        returnValue.message = 'success';
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('observer/guardianliteService.js, addGuardianlite, error: ', error);
    console.log('observer/guardianliteService.js, addGuardianlite, error: ', error);
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
              if (global.websocket) {
                if(resUpdateGl && resUpdateGl.rowCount === 1){

                  binds = [guardianliteIp];
                  const updateGlStatus = await guardianliteMapper.modifyGuardianliteStatus();
                  await client.query(updateGlStatus, binds);
                  global.websocket.emit("ob_guardianlites-update", {  'popup': resUpdateGl.rows[0] });

                  returnValue = true;
                }
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
        console.log('Re-login failed(observer/services/guardianliteService.js)');
      }
    } else {
      console.log('Unexpected response(observer/services/guardianliteService.js):', resGuardianlite?.data);
    }

    await client.query('COMMIT');

    return returnValue;

  } catch (error) {
    logger.info('observer/services/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    console.log('observer/services/guardianliteService.js, modifyGuardianliteChannel, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyGuardianlite = async ({ guardianlite_ip, guardianlite_name, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label, new_guardianlite_ip }) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    ch1_label = setChannelLabel(ch1_label);
    ch2_label = setChannelLabel(ch2_label);
    ch3_label = setChannelLabel(ch3_label);
    ch4_label = setChannelLabel(ch4_label);
    ch5_label = setChannelLabel(ch5_label);
    let binds = [guardianlite_ip, new_guardianlite_ip, guardianlite_name, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label];
    let query = await guardianliteMapper.modifyGuardianlite();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("ob_guardianlites-update", { 'modify': res.rowCount });
      global.websocket.emit("ob_guardianlites-update", {  'popup': res.rows[0] });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('main/guardianliteService.js, modifyGuardianlite, error: ', error);
    console.log('main/guardianliteService.js, modifyGuardianlite, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.modifyGuardianliteLocation = async ({ guardianlite_ip, top_location, left_location }) => {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    let binds = [guardianlite_ip, top_location, left_location];
    let query = await guardianliteMapper.modifyGuardianliteLocation();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("ob_guardianlites-update", { 'modify-location': res.rowCount });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('main/guardianliteService.js, modifyGuardianliteLocation, error: ', error);
    console.log('main/guardianliteService.js, modifyGuardianliteLocation, error: ', error);
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
      global.websocket.emit("ob_guardianlites-update", { guardianlites: res.rowCount });
    }
    
    return res.rowCount;

  } catch (error) {
    logger.info('main/guardianliteService.js, deleteGuardianlite, error: ', error);
    console.log('main/guardianliteService.js, deleteGuardianlite, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
};

exports.addGuardianliteEvent = async (guardianliteIp) => {
  const client = await pool.connect();
  try {
    let binds;
    let query;
    //ex: event type id 35: PIDS 이벤트 감지
    binds = [20]; 
    query = await eventTypeMapper.getEventTypeInfo();
    const eventTypeInfo = await client.query(query, binds);
    if(eventTypeInfo && !eventTypeInfo.rows[0].use_event_type) {
      console.log('가디언라이트 이벤트 검출 비활성화');
      return;
    };

    await client.query('BEGIN');
    binds = [guardianliteIp];
    query = await guardianliteMapper.getGuardianliteInfo();
    const resGuardianliteIpInfo = await client.query(query, binds);
    if(!resGuardianliteIpInfo || !resGuardianliteIpInfo.rows || resGuardianliteIpInfo.rows.length === 0){
      return {
        success: false
      };
    };
    const { outside_idx, inside_idx, dimension_type, guardianlite_name } = resGuardianliteIpInfo.rows[0];
    const eventType = eventTypeInfo.rows[0].event_type;
    let eventTypeId = eventTypeInfo.rows[0].event_type_id;
    const mainServiceName = 'origin';
    let severityId = eventTypeInfo.rows[0].severity_id;
    let outsideIdx = outside_idx;
    let insideIdx = inside_idx;
    let dimensionType = dimension_type;
    let locationInfo = await getLocation(outsideIdx, insideIdx);
    
    let deviceType = 'guardianlite';
    let deviceName = guardianlite_name;
    let deviceIp = guardianliteIp;

    binds = [
      eventType, 
      `${deviceName} ${eventType}`,
      locationInfo.location,
      eventTypeId,
      mainServiceName,
      severityId,
      outsideIdx,
      insideIdx,
      dimensionType,
      deviceType,
      deviceName,
      deviceIp
    ];
    query = guardianliteMapper.addGuardianliteEvent();
    const result = await client.query(query, binds);
    await client.query('COMMIT');

    if(!result || !result.rows || result.rows.length === 0){
      return {
        success: false
      };
    };
      global.websocket.emit('ob_events-update', { eventList: {'create':result.rowCount} });
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': result.rowCount } });
      return {
        success: result.rowCount === 1
      }
  } catch(error) {
    logger.info('routes/observer/services/guardianliteService.js, addGuardianliteEvent, error: ', error);
    console.log('routes/observer/services/guardianliteService.js, addGuardianliteEvent, error: ', error);
    await client.query('ROLLBACK');
    throw new Error(error.message || 'routes/observer/services/guardianliteService.js addGuardianliteEvent server error')
  } finally {
    await client.release();
  };
};

function setChannelLabel(ch_label) {
  if(ch_label == null || ch_label === ''){
    return null
  } else {
    return ch_label
  }
};