const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const cameraMapper = require('../mappers/cameraMapper');
const deviceMapper = require('../mappers/deviceMapper');
const vmsMapper = require('../mappers/vmsMapper');
const { fn_mainServicePrefix } = require('../../../utils/mainServicePrefix');
const { getServices, getProfiles, getProfileToken } = require('../../../worker/common/onvifStream');
const AxiosDigestAuth = require('@mhoc/axios-digest-auth');


exports.getUnUseCameraList = async ({ mainServiceName }) => {

  const client = await pool.connect();

  try {

    let binds = [mainServiceName, mainServiceName];

    // 연결(사용)되지 않은 카메라 가져오기
    let query = await cameraMapper.getUnUseCameraList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/cameraService.js, getUnUseCameraList, error: ', error);
    console.log('observer/cameraService.js, getUnUseCameraList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCameraLiveStream = async ({ cameraId, vmsName, mainServiceName }) => {

  const client = await pool.connect();

  let returnValue = {};

  try {

    let status = false;
    let message = '';

    let binds = [mainServiceName];
    let query = await vmsMapper.getVmsList();
    const resVmsList = await client.query(query, binds);

    if (resVmsList && resVmsList.rows.length > 0) {

      for (let i in resVmsList.rows) {

        const format = 'mjpeg';
        const valid_token_hours = 12;

        let camera_id = cameraId;
        let vms_id = resVmsList.rows[i].vms_id;
        let vms_pw = resVmsList.rows[i].vms_pw;
        let vms_ip = resVmsList.rows[i].vms_ip;
        let vms_port = resVmsList.rows[i].vms_port;
        let vms_name = vmsName;

        const url = `http://${vms_ip}:${vms_port}/live/media/${vms_name}/DeviceIpint.${camera_id}/SourceEndpoint.video:0:0?format=${format}&speed=1&w=480&h=360&valid_token_hours=${valid_token_hours}&enable_token_auth=1`;

        try {

          const restResponse = await axios({
            method: "get",
            url: url,
            timeout: 5000,
            auth: {
              username: vms_id,
              password: vms_pw
            },
            responseType: "json",
          });

          if ((restResponse) && (restResponse.data) && (restResponse.data.path)) {

            status = true
            message = `http://${vms_ip}:${vms_port}` + restResponse.data.path;

            break; // 영상 찾으면 반복문 탈출, break

          } else {

            message = 'no rest api result';
            continue; // 영상 못 찾으면 continue, 다시 찾기
          }

        } catch (error) {
          logger.info('observer/cameraService.js, getCameraLiveStream, restResponse, error: ', error.code);
          message = 'no rest api result';
          continue; // 영상 못 찾으면 continue, 다시 찾기
        }
      } // for

    } else {
      message = 'no camera in db';
    }

    returnValue = {
      status: status,
      message: message
    };

    return returnValue;

  } catch (error) {
    logger.info('observer/cameraService.js, getCameraLiveStream, error: ', error);
    console.log('observer/cameraService.js, getCameraLiveStream, error: ', error);

    let message = '';
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      message = `VMS 서버에 연결이 되지 않습니다.`;
    } else if (error.code === 'ECONNABORTED') {
      message = `VMS 요청시간을 초과하였습니다.`;
    } else if (error.code === 'ERR_INVALID_URL') {
      message = `유효하지 않은 URL 입니다.`;
    } else if (error.response) {
      message = error.response.statusText;
    }
    returnValue = {
      status: false,
      message: message
    };
    return returnValue;

  } finally {
    await client.release();
  }
}

// 카메라 정보 수정
exports.modifyCamera = async ({
  vms_name,
  camera_id,
  camera_angle,
  outside_idx,
  inside_idx,
  dimension_type,
  water_level_idx,
  left_location,
  top_location,
  mainServiceName,
  use_status = true,
  camera_type
}) => {
  const client = await pool.connect();

  try {

    let mainServicePrefix = await fn_mainServicePrefix(mainServiceName);

    let query = await cameraMapper.modifyCamera();
    let binds = [camera_id, camera_angle, outside_idx, inside_idx, dimension_type, water_level_idx, left_location, top_location, vms_name, mainServiceName, use_status, camera_type];

    await client.query('BEGIN');
    let res = await client.query(query, binds);
    await client.query('COMMIT');

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit(`${mainServicePrefix}_cameras-update`, { cameraList: { 'update': res.rowCount } });
      global.websocket.emit(`${mainServicePrefix}_event-update`, { eventList: { 'update': res.rowCount } });
    }

    if (res.rowCount === 1) {
      return {
        success: true
      }
    }

  } catch (error) {
    logger.info('observer/cameraService.js, modifyCamera, error: ', error);
    console.log('observer/cameraService.js, modifyCamera, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

// 카메라 위치 삭제
exports.deleteCameraLocation = async ({ vmsName, cameraId, mainServiceName }) => {

  const client = await pool.connect();

  try {

    let mainServicePrefix = await fn_mainServicePrefix(mainServiceName);

    const cameraKey = `${mainServiceName}:${vmsName}:${cameraId}`;

    let binds = [];

    await client.query('BEGIN');

    // 장비에서 카메라 연결 삭제
    binds = [cameraKey];
    let queryDevice = await deviceMapper.deleteCameraId(binds);
    await client.query(queryDevice);

    let queryCamera = await cameraMapper.deleteCameraLocation();
    binds = [mainServiceName, vmsName, cameraId, null, null, null, null];
    let res = await client.query(queryCamera, binds);

    await client.query('COMMIT');

    if (res.rowCount > 0 && global.websocket) {
      global.websocket.emit(`${mainServicePrefix}_cameras-update`, { cameraList: { 'update': res.rowCount } });
      global.websocket.emit(`${mainServicePrefix}_event-update`, { eventList: { 'update': res.rowCount } });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('observer/cameraService.js, deleteCameraLocation, error: ', error);
    console.log('observer/cameraService.js, deleteCameraLocation, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getAllCameraList = async ({ mainServiceName }) => {

  const client = await pool.connect();

  try {

    let binds = [mainServiceName];
    let query;
    if (mainServiceName === 'origin') {
      query = await cameraMapper.getOriginCameraList();
    } else {
      query = await cameraMapper.getAllCameraList();
    }
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/cameraService.js, getAllCameraList, error: ', error);
    console.log('observer/cameraService.js, getAllCameraList, error: ', error);
    throw error;
  } finally {
    if (client && !client._ending) {
      await client.release();
    }
  };
};

exports.getIndependentCameraList = async ({ mainServiceName, cameraId }) => {

  const client = await pool.connect();

  try {
    const binds = [mainServiceName, 'independent'];
    let query = cameraMapper.getIndependentCameraList();
    if (cameraId) {
      binds.push(cameraId);
      query = cameraMapper.getIndependentCameraDetail();
    }
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('observer/cameraService.js, getIndependentCameraList, error: ', error);
    console.log('observer/cameraService.js, getIndependentCameraList, error: ', error);
    throw error;
  } finally {
    if (client && !client._ending) {
      await client.release();
    }
  };
};

exports.findCameraAccessPointByPK = async ({ mainServiceName, vmsName, cameraId }) => {

  const client = await pool.connect();

  try {
    const binds = [mainServiceName, vmsName, cameraId];
    const query = cameraMapper.findCameraAccessPointByPK();
    const res = await client.query(query, binds);
    return res.rows;
  } catch (error) {
    logger.info('observer/cameraService.js, findCameraByPK, error: ', error);
    console.log('observer/cameraService.js, findCameraByPK, error: ', error);
    throw error;
  } finally {
    if (client && !client._ending) {
      await client.release();
    }
  };
};

exports.getPresetList = async (camInfo) => {
  const client = await pool.connect();

  const camId = camInfo.cameraId || camInfo.camId;

  if (!camId) {
    await client.release();
    throw new Error('Camera ID is required');
  }

  let integerCamId = '';
  if (camId.includes('.')) {
    integerCamId = camId.split('.')[0];
  } else {
    integerCamId = camId;
  }
  const mainServiceName = camInfo.mainServiceName;
  const vmsName = camInfo.vmsName;

  try {
    let query = vmsMapper.getVmsInfo();
    let binds = [vmsName, mainServiceName];

    await client.query('BEGIN');
    let res = await client.query(query, binds);

    if (res && res.rowCount > 0) {
      let serverUrl = "http://" + res.rows[0].vms_id + ":" + res.rows[0].vms_pw + "@" + res.rows[0].vms_ip + ":" + res.rows[0].vms_port;
      let url = serverUrl + "/control/telemetry/preset/info/" + res.rows[0].vms_name + "/DeviceIpint." + integerCamId + '/TelemetryControl.0';
      console.log(url)

      try {
        const axiosRes = await axios.get(url, { timeout: 10000 }); // 10초 타임아웃 추가
        await client.query('COMMIT');
        return axiosRes;
      } catch (axiosError) {
        console.log(`failed to get preset list : `, axiosError);
        await client.query('ROLLBACK');

        // VMS 서버 연결 실패 시 기본 프리셋 목록 반환
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
          console.log('VMS 서버 연결 실패, 기본 프리셋 목록 반환');
          return {
            data: {
              "0": "프리셋 1",
              "1": "프리셋 2",
              "2": "프리셋 3"
            }
          };
        }

        throw new Error(`Failed to get preset list: ${axiosError.message}`);
      }
    } else {
      await client.query('ROLLBACK');
      throw new Error('VMS 정보를 찾을 수 없습니다.');
    }
  } catch (error) {
    console.log(`get preset list failed:`, error.message);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.log('Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    try {
      await client.release();
    } catch (releaseError) {
      console.log('Client release failed:', releaseError.message);
    }
  }
}

exports.setPresetPosition = async (camInfo) => {
  const client = await pool.connect();
  const { cameraId, vmsName, presetNumber, mainServiceName } = camInfo;
  try {
    let query = vmsMapper.getVmsInfo();
    let binds = [vmsName, mainServiceName];

    await client.query('BEGIN');
    let res = await client.query(query, binds);

    if (res && res.rowCount > 0) {
      let serverUrl = "http://" + res.rows[0].vms_id + ":" + res.rows[0].vms_pw + "@" + res.rows[0].vms_ip + ":" + res.rows[0].vms_port;
      let url = serverUrl + "/control/telemetry/preset/go/" + vmsName + "/DeviceIpint." + cameraId + '/TelemetryControl.0?pos=' + presetNumber + '&session_id=0';

      try {
        const axiosRes = await axios.get(url);
        await client.query('COMMIT');
        return axiosRes;
      } catch (axiosError) {
        console.log(`failed to get preset list : `, axiosError);
        await client.query('ROLLBACK');
        throw new Error(`Failed to get preset list: ${axiosError.message}`);
      }
    } else {
      await client.query('ROLLBACK');
      throw new Error('VMS 정보를 찾을 수 없습니다.');
    }

  } catch (error) {
    console.log(`get preset list failed : ${error}`);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.release();
  }
}

exports.ptzCameraControl = async ({
  cameraId,
  direction,
  mode,
  eventType,
  vmsName,
  mainServiceName
}) => {
  const client = await pool.connect();

  try {
    if (vmsName && vmsName !== '') {
      return await handleVmsPtzControl({
        client,
        cameraId,
        direction,
        mode,
        eventType,
        vmsName,
        mainServiceName
      });
    } else {
      // independent 카메라 제어
      return await handleIndependentPtzControl({
        client,
        cameraId,
        direction,
        eventType,
        mainServiceName
      });
    }

  } catch (error) {
    logger.error('ptzCameraControl error:', error);
    throw error;
  } finally {
    await client.release();
  };
};

async function handleVmsPtzControl({
  client,
  cameraId,
  direction,
  mode,
  eventType,
  vmsName,
  mainServiceName
}) {

  let ptzInfo = {
    command: direction,
    mouseevent: eventType
  };

  let query = vmsMapper.getVmsInfo();
  let binds = [vmsName, mainServiceName];

  await client.query('BEGIN');
  let res = await client.query(query, binds);
  await client.query('COMMIT');

  if (!res || res.rowCount === 0) {
    throw new Error('VMS 정보를 찾을 수 없습니다.');
  }

  const vmsInfo = res.rows[0];
  const serverUrl = `http://${vmsInfo.vms_id}:${vmsInfo.vms_pw}@${vmsInfo.vms_ip}:${vmsInfo.vms_port}`;

  const speed = ptzInfo.mouseevent === "mousedown" ? 0.05 : 0;
  const cmdAndParams = createCmdAndParams(ptzInfo, speed);

  await sendPTZCommand(serverUrl, vmsInfo, cameraId, cmdAndParams, mode);

  if (ptzInfo.mouseevent === "mousedown") {
    setTimeout(() => {
      sendStopCommand(serverUrl, vmsInfo, cameraId, direction, mode);
    }, 1500);
  }

  return { success: true, type: 'vms' };
}

async function handleIndependentPtzControl({
  client,
  cameraId,
  direction,
  eventType,
  mainServiceName
}) {

  const binds = [mainServiceName, 'independent', cameraId];
  const query = cameraMapper.getIndependentCameraDetail();
  const res = await client.query(query, binds);

  if (!res || res.rowCount === 0) {
    throw new Error('독립 카메라 정보를 찾을 수 없습니다.');
  }

  const cameraInfo = res.rows[0];
  const cameraIp = cameraInfo.ip_address;

  const accessPoint = cameraInfo.access_point || '';
  const [id, pw, profileTokensStr, selectedToken] = accessPoint.split('\n').map(s => s.trim());

  if (!id || !pw) {
    throw new Error('카메라 인증 정보가 없습니다.');
  }

  let profileToken = selectedToken;
  if (!profileToken && profileTokensStr) {
    const firstToken = profileTokensStr.split(',')[0];
    if (firstToken) {
      profileToken = firstToken.split(':')[0]; // "token:name" 형식에서 token만 추출
    }
  }

  if (!profileToken) {
    throw new Error('ONVIF 프로파일 토큰을 찾을 수 없습니다.');
  }

  const { ptzCameraControl: onvifPtzControl } = require('../../../utils/ptzService');

  const result = await onvifPtzControl({
    cameraId,
    direction,
    eventType,
    mainServiceName,
    cameraIp,
    cameraUser: id,
    cameraPass: pw,
    cameraProfileToken: profileToken,
    autoStopMs: 1500 // 1.5초 후 자동 정지
  });

  return { success: true, type: 'independent', ...result };
}

exports.removeCameraLocation = async ({ outsideIdx, insideIdx, mainServiceName }) => {
  const client = await pool.connect();

  try {

    let binds = [];
    let query;
    if (outsideIdx != null) {
      binds = [outsideIdx, mainServiceName];
      query = await cameraMapper.removeCameraLocationInBuilding();
    } else if (insideIdx != null) {
      binds = [insideIdx, mainServiceName]
      query = await cameraMapper.removeCameraLocationInFloor();
    }
    const res = await client.query(query, binds);

    return {
      success: res.rowCount === 1
    };

  } catch (error) {
    logger.info('observer/cameraService.js, removeCameraLocation, error: ', error);
    console.log('observer/cameraService.js, removeCameraLocation, error: ', error);
  } finally {
    await client.release();
  }
};

function createCmdAndParams(ptzInfo, speed) {
  let cmdAndParams = {};
  const directions = {
    'left': { ptzcmd: 'move', params: `pan=-${speed}&tilt=0` },
    'right': { ptzcmd: 'move', params: `pan=${speed}&tilt=0` },
    'up': { ptzcmd: 'move', params: `pan=0&tilt=${speed}` },
    'down': { ptzcmd: 'move', params: `pan=0&tilt=-${speed}` },
    'zoomin': { ptzcmd: 'zoom', params: `value=${speed}` },
    'zoomout': { ptzcmd: 'zoom', params: `value=-${speed}` },
    'focusin': { ptzcmd: 'focus', params: `value=${speed}` },
    'focusout': { ptzcmd: 'focus', params: `value=-${speed}` }
  }
  const stopDirections = {
    'left stop': { ptzcmd: 'move', params: `pan=0&tilt=0` },
    'right stop': { ptzcmd: 'move', params: `pan=0&tilt=0` },
    'up stop': { ptzcmd: 'move', params: `pan=0&tilt=0` },
    'down stop': { ptzcmd: 'move', params: `pan=0&tilt=0` },
    'zoomin stop': { ptzcmd: 'zoom', params: `value=0` },
    'zoomout stop': { ptzcmd: 'zoom', params: `value=0` },
    'focusin stop': { ptzcmd: 'focus', params: `value=0` },
    'focusout stop': { ptzcmd: 'focus', params: `value=0` }
  }
  if (ptzInfo.mouseevent === 'mousedown') {
    cmdAndParams = directions[ptzInfo.command];
  } else if (ptzInfo.mouseevent === 'mouseup') {
    cmdAndParams = stopDirections[ptzInfo.command + ' stop'];
  }
  return cmdAndParams;
}

function sendStopCommand(serverUrl, vmsInfo, id, direction, mode) {
  let cmdAndParams;
  if (direction.includes('zoom') || direction.includes('focus')) {
    cmdAndParams = { ptzcmd: direction.includes('zoom') ? 'zoom' : 'focus', params: 'value=0' };
  } else {
    cmdAndParams = { ptzcmd: 'move', params: 'pan=0&tilt=0' };
  }

  const subUrl = `/TelemetryControl.0?mode=${mode}&${cmdAndParams.params}&session_id=0`;
  const ptzUrl = `${serverUrl}/control/telemetry/${cmdAndParams.ptzcmd}/${vmsInfo.vms_name}/DeviceIpint.${id}${subUrl}`;

  return axios.get(ptzUrl)
    .then(() => console.log(`Stop command sent for ${direction}`))
}

async function sendPTZCommand(serverUrl, vmsInfo, id, cmdAndParams, mode) {
  const telemetryControlId = `${vmsInfo.vms_name}/DeviceIpint.${id.split('.')[0]}/TelemetryControl.0`;
  const subUrl = `?mode=${mode}&${cmdAndParams.params}&session_id=0`;
  const ptzUrl = `${serverUrl}/control/telemetry/${cmdAndParams.ptzcmd}/${telemetryControlId}${subUrl}`;

  console.log(`Sending PTZ command: ${ptzUrl}`);
  try {
    const response = await axios.get(ptzUrl);
    console.log(`PTZ command sent successfully: ${cmdAndParams.ptzcmd}`);
    return response.data;
  } catch (error) {
    console.error(`Error sending PTZ command: ${error.message}`);
    throw error;
  };
};

exports.addCamera = async ({ mainServiceName, name, ipAddress, id, pw }) => {

  const client = await pool.connect();
  const uniqueId = uuidv4();
  try {
    const vmsName = '';
    const serviceType = 'independent';
    const digestAuth = new AxiosDigestAuth.default({
      username: id,
      password: pw,
    });
    const services = await getServices({ digestAuth, CAM_HOST: ipAddress, CAM_USER: id, CAM_PASS: pw });
    if (!services || services.length === 0) {
      return {
        success: false,
        message: '카메라의 ONVIF 서비스를 가져오지 못했습니다. 아이디, 비밀번호, IP주소를 확인해주세요.'
      }
    }
    const mediaXAddr = await getProfiles(services);
    if (!mediaXAddr) {
      return {
        success: false,
        message: 'ONVIF Media Service URL 조회 실패'
      }
    };
    const profileTokens = await getProfileToken({ mediaXAddr, digestAuth, CAM_USER: id, CAM_PASS: pw });
    if (!profileTokens || profileTokens.length === 0) {
      return {
        success: false,
        message: 'ONVIF Profile Token 조회 실패'
      }
    };
    let profileTokenStr = profileTokens.map((t) => `${t.token}:${t.name}`).join(',');
    const accessPoint = `${id}\n${pw}\n${profileTokenStr}`;
    let binds = [uniqueId, vmsName, mainServiceName, name, ipAddress, serviceType, accessPoint];

    let query = cameraMapper.addCamera();
    const res = await client.query(query, binds);
    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    if (res.rowCount === 1) {
      global.websocket.emit(`${mainServicePrefix}_cameras-update`, { cameraList: { 'update': res.rowCount } });
      return {
        success: true
      }
    };

    return {
      success: false
    };

  } catch (error) {
    logger.info('observer/cameraService.js, addCamera, error: ', error);
    console.log('observer/cameraService.js, addCamera, error: ', error);
    return {
      success: false,
      message: error.message || '카메라 추가 중 오류가 발생했습니다. 아이디, 비밀번호, IP주소를 확인해주세요.'
    }
  } finally {
    await client.release();
  };
};

exports.removeCamera = async ({ idxs, mainServiceName }) => {

  const client = await pool.connect();
  try {

    const query = cameraMapper.removeCamera(idxs);
    const res = await client.query(query);

    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    if (res.rowCount > 0) {
      global.websocket.emit(`${mainServicePrefix}_cameras-update`, { cameraList: { 'update': res.rowCount } });
      return {
        success: true
      };
    };

    return {
      success: false
    };

  } catch (error) {
    logger.info('observer/cameraService.js, removeCamera, error: ', error);
    console.log('observer/cameraService.js, removeCamera, error: ', error);
  } finally {
    await client.release();
  };
};

exports.updateCamera = async ({ idx, name, ipAddress, id, pw, mainServiceName, profileTokens, profileToken }) => {

  const client = await pool.connect();
  try {
    const accessPoint = `${id}\n${pw}\n${profileTokens}\n${profileToken}`;
    let binds = [idx, name, ipAddress, accessPoint];

    let query = cameraMapper.updateCamera();
    const res = await client.query(query, binds);

    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    if (res.rowCount === 1) {
      global.websocket.emit(`${mainServicePrefix}_cameras-update`, { cameraList: { 'update': res.rowCount } });
      return {
        success: true
      };
    };

    return {
      success: false
    };

  } catch (error) {
    logger.info('observer/cameraService.js, updateCamera, error: ', error);
    console.log('observer/cameraService.js, updateCamera, error: ', error);
  } finally {
    await client.release();
  };
};

exports.syncCameraAlarmStatus = async () => {

  const client = await pool.connect();

  try {

    /**
    이벤트 확인 시 카메라 알람 상태 동기화
     */
    let queryDevice = `
      UPDATE ob_camera camera
      SET 
        alarm_status = CASE 
          WHEN sub.has_unacknowledged_event THEN true
          ELSE false
        END,
        updated_at = NOW()
      FROM (
        SELECT 
          c.main_service_name,
          c.vms_name,
          c.camera_id,
          EXISTS (
            SELECT 1
            FROM event_log e
            JOIN ob_event_type et ON e.event_type_id = et.id
            WHERE e.camera_id = c.main_service_name || ':' || c.vms_name || ':' || c.camera_id
              AND e.is_acknowledge = false
              AND et.use_event_type = true
              AND e.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
          ) AS has_unacknowledged_event
        FROM ob_camera c
      ) sub
      WHERE 
        camera.main_service_name = sub.main_service_name
        AND camera.vms_name = sub.vms_name
        AND camera.camera_id = sub.camera_id
        AND camera.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event
    `;

    const resultCamera = await client.query(queryDevice);

    if (global.websocket && resultCamera.rowCount > 0) {
      global.websocket.emit("ob_cameras-update", { cameraList: { 'update': resultCamera.rowCount } });
    };

  } catch (error) {
    logger.info('observer/cameraService.js, syncCameraAlarmStatus, error: ', error);
    console.log('observer/deviceService.js, syncCameraAlarmStatus, error: ', error);
    throw new Error(error.message || 'observer/cameraService.js, syncCameraAlarmStatus, error');
  } finally {
    await client.release();
  };
};