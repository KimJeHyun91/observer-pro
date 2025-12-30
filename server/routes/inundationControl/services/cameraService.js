const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const cameraMapper = require('../mappers/cameraMapper');
const axios = require("axios");
const vmsMapper = require('../mappers/vmsMapper');


exports.getUnUseCameraList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];

    // 연결(사용)되지 않은 카메라 가져오기
    let query = await cameraMapper.getUnUseCameraList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/cameraService.js, getUnUseCameraList, error: ', error);
    console.log('inundationControl/cameraService.js, getUnUseCameraList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.getCameraLiveStream = async ({ cameraId, vmsName }) => {
  
  const client = await pool.connect();

  let returnValue = {};

  try {

    let status = false;
    let message = '';

    let binds = [];
    let query = await vmsMapper.getVmsList();
    const resVmsList = await client.query(query, binds);

    if(resVmsList && resVmsList.rows.length > 0) {

      for(let i in resVmsList.rows) {

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
  
          if((restResponse) && (restResponse.data) && (restResponse.data.path)) {
  
            status = true
            message = `http://${vms_ip}:${vms_port}` + restResponse.data.path;
  
            break; // 영상 찾으면 반복문 탈출, break
  
          } else {
  
            message = 'no rest api result';
            continue; // 영상 못 찾으면 continue, 다시 찾기
          }

        } catch (error) {
          logger.info('inundationControl/cameraService.js, getCameraLiveStream, restResponse, error: ', error.code);
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
    logger.info('inundationControl/cameraService.js, getCameraLiveStream, error: ', error);
    console.log('inundationControl/cameraService.js, getCameraLiveStream, error: ', error);

    let message = '';
    if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
      message = `VMS 서버에 연결이 되지 않습니다.`;
    } else if(error.code === 'ECONNABORTED') {
      message = `VMS 요청시간을 초과하였습니다.`;
    } else if(error.code === 'ERR_INVALID_URL') {
      message = `유효하지 않은 URL 입니다.`;
    } else if(error.response) {
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
exports.modifyCamera = async ({ idx, camera_angle, outside_idx, left_location, top_location }) => {

  const client = await pool.connect();

  try {
    
    const cameraIdx = idx;

    let query = await cameraMapper.modifyCamera();
    let binds = [cameraIdx, camera_angle, outside_idx, left_location, top_location];

    await client.query('BEGIN');
    let res = await client.query(query, binds);
    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("fl_cameras-update", { cameraList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/cameraService.js, modifyCamera, error: ', error);
    console.log('inundationControl/cameraService.js, modifyCamera, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

// 카메라 위치 삭제
exports.deleteCameraLocation = async ({ idx }) => {

  const client = await pool.connect();

  try {
    
    const cameraIdx = idx;

    await client.query('BEGIN');

    let queryCamera = await cameraMapper.deleteCameraLocation();
    let binds = [cameraIdx, null, null, null, null];
    let res = await client.query(queryCamera, binds);

    await client.query('COMMIT');

    if(res.rowCount > 0 && global.websocket) {
      global.websocket.emit("fl_cameras-update", { cameraList: {'update':res.rowCount} });
      global.websocket.emit("fl_event-update", { eventList: {'update':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/cameraService.js, deleteCameraLocation, error: ', error);
    console.log('inundationControl/cameraService.js, deleteCameraLocation, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.getAllCameraList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];
    
    let query = await cameraMapper.getAllCameraList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/cameraService.js, getAllCameraList, error: ', error);
    console.log('inundationControl/cameraService.js, getAllCameraList, error: ', error);
  } finally {
    await client.release();
  }
}