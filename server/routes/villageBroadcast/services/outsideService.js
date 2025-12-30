const { pool } = require('../../../db/postgresqlPool');
const axios = require("axios");
const logger = require('../../../logger');
const outsideMapper = require('../mappers/outsideMapper');
const speakerMapper = require('../mappers/speakerMapper');
const cameraMapper = require('../../observer/mappers/cameraMapper');
const guardianliteMapper = require('../mappers/guardianliteMapper');
const mainServiceName = 'broadcast';
const warningBoardService = require('../../common/services/warningBoardService');
const eventMapper = require('../mappers/eventMapper');

exports.getSites = async (token) => {
   const client = await pool.connect();
  
    try {
  
      const response = await axios.get(`https://greenitkr.towncast.kr/api/sites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = response.data;
      
      return data
    } catch (error) {
      console.error('데이터 저장 중 오류 발생: ', error);
    } finally {
      await client.release(); 
    }
}

exports.addSite = async (token, siteId) => {

  const client = await pool.connect();

  try {

    const sites = await this.getSites(token);
    const siteExists = sites.some(site => site.id === siteId);

    if (!siteExists) {
      return { status: false, message: '존재하지 않은 송신기입니다.' };
    }

    const existingSiteQuery = await client.query(`SELECT * FROM vb_outside WHERE site_id = $1`, [siteId]);
    if (existingSiteQuery.rows.length > 0) {
      return { status: false, message: '송신기가 이미 등록되었습니다.' };
    }

    const siteCountQuery = await client.query(`SELECT COUNT(*) FROM vb_outside WHERE site_id IS NOT NULL`);
    const siteCount = parseInt(siteCountQuery.rows[0].count, 10);
    if (siteCount > 0) {
      return { status: false, message: '송신기는 하나만 등록할 수 있습니다.' };
    }

    const response = await axios.get(`https://greenitkr.towncast.kr/api/transmitters?siteid=${siteId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response.data;
   

    for (const item of data) {
      const { id, name, address, lng, lat, status, receivers } = item;

      const resOutside = await client.query(
      `INSERT INTO vb_outside (site_transmitter_id, outside_name, location, left_location, top_location, service_type, alarm_status, site_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING idx`,
      [id, name, address, lng, lat, 'broadcast', false, siteId]
      );

      const outsideIdxQuery = await client.query(
        `SELECT idx FROM vb_outside 
         WHERE site_transmitter_id = $1
         AND site_id = $2`,
        [id, siteId]
      );
      const outsideIdx = outsideIdxQuery.rows[0].idx;

      for (const receiver of receivers) {
      const { id: receiverId, name, status: receiverStatus, address: receiverAddress, lng: leftLocation, lat: topLocation } = receiver;
      const speakerStatus = receiverStatus == 'connected' ? 'ON' : 'OFF';

      binds = [outsideIdx, name, receiverId, speakerStatus, receiverAddress, leftLocation, topLocation];
      let querySpeaker = await speakerMapper.addSpeaker();
      await client.query(querySpeaker, binds);
      }

      if (global.websocket) {
        global.websocket.emit("vb_areaList-update", { areaList: { 'add': resOutside.rows.length } });
        global.websocket.emit('vb_camera-update', { camera: resOutside.rows.length });
        global.websocket.emit('vb_speaker-update', { speaker: resOutside.rows.length });
        global.websocket.emit("vb_guardianlites-update", { guardianlites: resOutside.rows.length });
      }
    }

    return { status: true, message: '등록 성공' };
  } catch (error) {
    console.error('데이터 저장 중 오류 발생: ', error);
    throw error;
  } finally {
    await client.release();
  }
};






exports.addOutside = async (
  { 
    outsideName, location, leftLocation, topLocation, service_type, 
    cameraIdx, guardianliteIp, speakerIp, vmsName, useStatus
  }
) => {

  const client = await pool.connect();

  try {

    let returnValue = {
      status: false,
      message: 'success',
    }

    // 가디언라이트 ip 검색
    let binds = [guardianliteIp];
    let queryGuardianliteInfo = await guardianliteMapper.getGuardianliteInfo();
    const resGuardianliteInfo = await client.query(queryGuardianliteInfo, binds);

    // 스피커 ip 검색
    binds = [speakerIp];
    let querySpeakerIpInfo = await speakerMapper.getSpeakerIpInfo();
    const resSpeakerIpInfo = await client.query(querySpeakerIpInfo, binds);

    if(resGuardianliteInfo && resGuardianliteInfo.rows.length > 0) {
      returnValue.message = '가디언라이트 ip 가 이미 등록되어 있습니다.';
    } else if(resSpeakerIpInfo && resSpeakerIpInfo.rows.length > 0) {
      returnValue.message = '스피커 ip 가 이미 등록되어 있습니다.';
    } else {

      await client.query('BEGIN');

      // 정상등록 가능
      returnValue.status = true

      binds = [outsideName, location, leftLocation, topLocation, service_type];
      let queryOutside = await outsideMapper.addOutside();
      const resOutside = await client.query(queryOutside, binds);

      // outside(개소) 저장되면
      if(resOutside && resOutside.rows.length > 0) {

        const outsideIdx = resOutside.rows[0].idx;


        // 카메라 연동
        if(cameraIdx && outsideIdx) {
          binds = [cameraIdx, null, outsideIdx, null, null, leftLocation, topLocation, vmsName, 'broadcast', useStatus];
          let queryCamera = await cameraMapper.modifyCamera();
          await client.query(queryCamera, binds);


          let updateCameraIdQuery = await outsideMapper.updateCameraIdQuery();
          await client.query(updateCameraIdQuery, [cameraIdx, outsideIdx]);  
        }

        // 가디언라이트 저장
        if(guardianliteIp) {
          binds = [guardianliteIp, null, outsideIdx];
          let queryGuardianlite = await guardianliteMapper.addGuardianlite();
          await client.query(queryGuardianlite, binds);
        }

        // 스피커 저장
        if(speakerIp) {
          const speakerStatus = 'ON';
          binds = [outsideIdx, null, speakerIp, speakerStatus, null, leftLocation, topLocation];
          let querySpeaker = await speakerMapper.addSpeaker();
          await client.query(querySpeaker, binds);
        }

      }

      await client.query('COMMIT');

      if (global.websocket) {
        global.websocket.emit("vb_areaList-update", { areaList: { 'add': resOutside.rows.length } });
        global.websocket.emit('vb_camera-update', { camera: resOutside.rows.length });
        global.websocket.emit("vb_guardianlites-update", { guardianlites: resOutside.rows.length });
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, addOutside, error: ', error);
    console.log('villageBroadcast/outsideService.js, addOutside, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getOutsideInfo = async ({ idx }) => {

  const client = await pool.connect();

  try {

    const outsideIdx = idx;

    let binds = [outsideIdx];

    let query = await outsideMapper.getOutsideInfo();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, getOutsideInfo, error: ', error);
    console.log('villageBroadcast/outsideService.js, getOutsideInfo, error: ', error);
  } finally {
    await client.release();
  }
}


async function getLatestDataFromDb(client) {
  const query = "SELECT * FROM vb_outside ORDER BY updated_at DESC LIMIT 1";
  const { rows } = await client.query(query);
  return rows[0] || null;
}




exports.getOutsideList = async () => {

  const client = await pool.connect();

  try {
    // const newData = await fetchApiData();

    // if (!newData) return; // 외부 API 에러 시 종료

    let binds = [];

    let query = await outsideMapper.getOutsideList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, getOutsideList, error: ', error);
    console.log('villageBroadcast/outsideService.js, getOutsideList, error: ', error);
  } finally {
    await client.release();
  }
}

/**
 * 1. outside(개소) 삭제
 * 2. 스피커 초기화(개소 연결 삭제)
 * 3. 가디언라이트 초기화(개소 연결 삭제)
 * 4. 카메라 위치 초기화(null), 카메라 연결된 outside(null), 사용상태 false, 알람상태 false
 * 5. 워닝보드 삭제
 */
exports.deleteOutside = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const outsideIdx = idx;
    let binds = [outsideIdx];
    let query = await outsideMapper.deleteOutside();

    await client.query('BEGIN');
    const res = await client.query(query, binds);
    
    // 삭제 성공하면
    if(res && res.rowCount > 0) {

     // 스피커의 개소(outside) 삭제
      binds = [outsideIdx];
      let queryResetAreaQuery = await speakerMapper.deleteOutsideSpeaker();
      await client.query(queryResetAreaQuery, binds);

      // 가디언라이트 초기화(개소 연결 삭제)
      binds = [outsideIdx, null];
      let queryResetGuardianLiteQuery = await guardianliteMapper.modifyOutsideGuardianlite();
      await client.query(queryResetGuardianLiteQuery, binds);

      // 카메라 초기화
      binds = [outsideIdx, mainServiceName, null, null, null, null, null, null];
      let queryResetCamera = await cameraMapper.deleteOutsideCameraLocation();
      await client.query(queryResetCamera, binds);
    }

    await client.query('COMMIT');

    binds = [outsideIdx];
    let queryLatestEventOutsideInfo = await eventMapper.getLatestEventOutsideInfo();
    let resLatestEventOutsideInfo = await client.query(queryLatestEventOutsideInfo, binds);

    if(resLatestEventOutsideInfo && resLatestEventOutsideInfo.rows.length > 0) {
      // 워닝보드 삭제
      await warningBoardService.deleteWarningBoard({ 
        mainService : 'broadcast'
        , eventIdx: resLatestEventOutsideInfo.rows[0].event_idx 
      });
    }

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("vb_areaList-update", { areaList: { 'remove': res.rowCount } });
      global.websocket.emit("vb_cameras-update", { cameraList: { 'update': res.rowCount } });
      global.websocket.emit("vb_speaker-update", { speakerList: { 'update': res.rowCount } });
      global.websocket.emit("vb_guardianlites-update", { guardianlites: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, deleteOutSide, error: ', error);
    console.log('villageBroadcast/outsideService.js, deleteOutSide, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getUnLinkDeviceList = async () => {

  const client = await pool.connect();

  try {

    let binds = [];

    let query = await outsideMapper.getUnLinkDeviceList();

    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, getUnLinkDeviceList, error: ', error);
    console.log('villageBroadcast/outsideService.js, getUnLinkDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getOutsideDeviceList = async () => {

  const client = await pool.connect();

  try {

    let returnValue = [];

    let binds = [];
    let query = await outsideMapper.getOutsideList();
    const res = await client.query(query, binds);

    if((res) && (res.rows) && (res.rows.length > 0)) {

      for(let i in res.rows) {

        let temp = {
          outside_idx : res.rows[i].outside_idx
          , outside_name : res.rows[i].outside_name
          , outside_location : res.rows[i].outside_location
          , speaker : []
          , camera : []
        };
        
        if(res.rows[i].speaker_idx) {
          temp.speaker.push({
            speaker_idx : res.rows[i].speaker_idx
          , speaker_name : res.rows[i].speaker_name
          , speaker_ip : res.rows[i].speaker_ip
          , speaker_status : res.rows[i].speaker_status
          , linked_status : res.rows[i].linked_status
          });
        }

        if(res.rows[i].camera_idx) {
          temp.camera.push({
            camera_idx : res.rows[i].camera_idx
          , camera_id : res.rows[i].camera_id
          , vms_name : res.rows[i].vms_name
          , main_service_name : res.rows[i].main_service_name
          , camera_ip : res.rows[i].camera_ip
          });
        }

        returnValue.push(temp);

      } // for
    }

    return returnValue;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, getOutsideDeviceList, error: ', error);
    console.log('villageBroadcast/outsideService.js, getOutsideDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getAllDeviceList = async () => {

  const client = await pool.connect();

  try {

    let returnValue = [];

    let outterTemp = {
      speaker : []
      , camera : []
    };

    // 스피커 검색 후 저장
    let binds = [];
    let query = await speakerMapper.getSpeakerList();
    const resSpeakerList = await client.query(query, binds);

    for(let i in resSpeakerList.rows) {
      
      let innerTemp = {
        speaker_idx : resSpeakerList.rows[i].speaker_idx
        , speaker_name : resSpeakerList.rows[i].speaker_name
        , speaker_ip : resSpeakerList.rows[i].speaker_ip
        , speaker_status : resSpeakerList.rows[i].speaker_status
        , linked_status : resSpeakerList.rows[i].speaker_linked_status
      };

      outterTemp.speaker.push(innerTemp);
    }

    // 카메라 검색 후 저장
    binds = ['broadcast'];
    query = await cameraMapper.getAllCameraList();
    const resAllCameraList = await client.query(query, binds);

    for(let i in resAllCameraList.rows) {
      
      let innerTemp = {
        camera_idx : resAllCameraList.rows[i].camera_idx
        , camera_id : resAllCameraList.rows[i].camera_id
        , vms_name : resAllCameraList.rows[i].vms_name
        , main_service_name : resAllCameraList.rows[i].main_service_name
        , camera_name : resAllCameraList.rows[i].camera_name
        , camera_ip : resAllCameraList.rows[i].camera_ip
        , use_status : resAllCameraList.rows[i].use_status
        , service_type : resAllCameraList.rows[i].service_type
        , linked_status : resAllCameraList.rows[i].linked_status
      };

      outterTemp.camera.push(innerTemp);
    }

    returnValue.push(outterTemp);

    return returnValue;

  } catch (error) {
    logger.info('villageBroadcast/outsideService.js, getAllDeviceList, error: ', error);
    console.log('villageBroadcast/outsideService.js, getAllDeviceList, error: ', error);
  } finally {
    await client.release();
  }
}