const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const vmsMapper = require('../mappers/vmsMapper');
const axios = require("axios");
const cameraMapper = require('../mappers/cameraMapper');
const { getExportArchiveVideoTime } = require('../../../utils/formatDateTime');
const { callSleep } = require('../../../worker/delaySync');


exports.getVmsList = async () => {
  
  const client = await pool.connect();

  try {

    let binds = [];

    let query = await vmsMapper.getVmsList();
    const res = await client.query(query, binds);

    return res.rows;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, getVmsList, error: ', error);
    console.log('inundationControl/vmsService.js, getVmsList, error: ', error);
  } finally {
    await client.release();
  }
}

exports.addVms = async ({ vms_id, vms_pw, vms_ip, vms_port }) => {
  
  const client = await pool.connect();

  let returnValue = {};

  try {
    
    let query = await vmsMapper.getVmsIpPortInfo();
    let binds = [vms_ip, vms_port];

    let res = await client.query(query, binds);
    query = '';
    binds = [];

    // 이미 저장된 ip, port 의 vms 가 없으면 저장
    if(res.rows.length === 0) {

      const encodePw = encodeURIComponent(vms_pw);
      const url = `http://${vms_id}:${encodePw}@${vms_ip}:${vms_port}/camera/list`;

      const isCameras = await axios.get(url, { timeout: 5000 }); 
      
      // vms에 등록된 카메라 있으면
      if(isCameras?.data?.cameras?.length > 0) {

        let vms_name = '';
        const resVmsName = await axios.get(`http://${vms_id}:${vms_pw}@${vms_ip}:${vms_port}/hosts/`, { timeout: 3000 }); 
        if(resVmsName && resVmsName.data) {
          vms_name = resVmsName.data[0];
        }

        query = await vmsMapper.addVms();
        binds = [vms_id, vms_pw, vms_ip, vms_port, vms_name];

        await client.query('BEGIN');
        const resVms = await client.query(query, binds);
        binds = [];

        let queryArray = isCameras.data.cameras.map(camera => {

          let camera_id = camera.displayId;
          let camera_name = camera.displayName;
          let camera_ip = camera.ipAddress;
          let service_type = 'mgist';
          let camera_vendor = camera.vendor;
          let camera_model = camera.model;
          let access_point = camera.archives[0].accessPoint;
          let vmsNameByCamera = null;

          // 카메라 별로 vms 이름 추출
          if((camera.videoStreams) && (camera.videoStreams.length > 0) && (camera.videoStreams[0].accessPoint)) {
            vmsNameByCamera = camera.videoStreams[0].accessPoint.split('/')[1];
          } else if((camera.audioStreams) && (camera.audioStreams.length > 0) && (camera.audioStreams[0].accessPoint)) {
            vmsNameByCamera = camera.audioStreams[0].accessPoint.split('/')[1];
          } else {
            vmsNameByCamera = camera.archives[0].accessPoint.split('/')[1];
          }

          const values = `
          (
          '${camera_id}', '${camera_name}', '${camera_ip}' 
          , '${vmsNameByCamera}', '${service_type}'
          , '${camera_vendor}', '${camera_model}', '${access_point}'
          )
          `;

          return values;
        });

        let queryValue = queryArray.join(',');

        // bind 로 bulk insert 불가하여 쿼리 직접 작성함.
        query = `
        INSERT INTO fl_camera (
          camera_id, camera_name, camera_ip
          , vms_name, service_type
          , camera_vendor, camera_model, access_point
        ) VALUES ${queryValue}
        ON CONFLICT (camera_id, vms_name)
        DO UPDATE 
        SET 
          camera_name = EXCLUDED.camera_name
          , camera_ip = EXCLUDED.camera_ip
          , camera_vendor = EXCLUDED.camera_vendor
          , camera_model = EXCLUDED.camera_model
          , access_point = EXCLUDED.access_point
          , updated_at = NOW();
        `;

        const resCamera = await client.query(query, binds);

        await client.query('COMMIT');

        // 카메라 정상 등록
        returnValue = {
          status: true,
          message: `VMS와 카메라가 정상적으로 등록되었습니다.`
        };

        if(resCamera.rowCount > 0 && global.websocket) {
          global.websocket.emit("fl_vms-update", { VMSList: {'add':resVms.rowCount} });
          global.websocket.emit("fl_cameras-update", { cameraList: {'add':resCamera.rowCount} });
        }

      } else {
        // 등록된 카메라 없으면
        returnValue = {
          status: false,
          message: `VMS(${vms_ip}:${vms_port})에 등록된 카메라가 없습니다.`
        };
      }

    } else {
      // 이미 등록된 vms
      returnValue = {
        status: false,
        message: `VMS(${vms_ip}:${vms_port}) 이미 등록된 VMS 입니다.`
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, addVms, error: ', error);
    console.log('inundationControl/vmsService.js, addVms, error: ', error);
    await client.query('ROLLBACK');
    
    let message = '';
    if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      message = `VMS(${vms_ip}:${vms_port}) 서버에 연결이 되지 않습니다.`;
    } else if(error.code === 'ECONNABORTED') {
      message = `VMS(${vms_ip}:${vms_port}) 요청시간을 초과하였습니다.`;
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

exports.modifyVms = async ({ vms_id, vms_pw, prev_vms_ip, new_vms_ip, prev_vms_port, new_vms_port }) => {
  
  const client = await pool.connect();

  let returnValue = {};

  try {

    // prev vms 검색
    let query = await vmsMapper.getVmsIpPortInfo();
    let binds = [prev_vms_ip, prev_vms_port]; 
    const prevVmsInfo = await client.query(query, binds);

     // new vms 검색
     query = await vmsMapper.getVmsIpPortInfo();
     binds = [new_vms_ip, new_vms_port];
     let newVmsInfo = await client.query(query, binds);

    // prev vms, 정보가 있으면
    if(prevVmsInfo && prevVmsInfo.rows.length > 0) {

      const vmsIdx = prevVmsInfo.rows[0].idx;

      // prev vms ip, port와 new vms ip, port 가 같거나 new vms ip, port 정보가 없으면, 수정 가능
      // vms 에 연결된 camera 데이터 수정(삭제 안함, sync 와 같음)
      if((prev_vms_ip === new_vms_ip && prev_vms_port === new_vms_port) || (newVmsInfo && newVmsInfo.rows.length === 0)) {
    
        const encodePw = encodeURIComponent(vms_pw);
        const url = `http://${vms_id}:${encodePw}@${new_vms_ip}:${new_vms_port}/camera/list`;

        const isCameras = await axios.get(url, { timeout: 5000 }); 

        // new vms에 등록된 카메라 있으면
        if(isCameras?.data?.cameras?.length > 0) {

          let vms_name = '';
          const resVmsName = await axios.get(`http://${vms_id}:${vms_pw}@${new_vms_ip}:${new_vms_port}/hosts/`, { timeout: 3000 }); 
          if(resVmsName && resVmsName.data) {
            vms_name = resVmsName.data[0];
          }

          await client.query('BEGIN');
          query = await vmsMapper.modifyVms();
          binds = [vmsIdx, vms_id, vms_pw, new_vms_ip, new_vms_port, vms_name];
          const resModifyVms = await client.query(query, binds);
          
          let resCamera;

          let queryArray = isCameras.data.cameras.map(camera => {

            let camera_id = camera.displayId;
            let camera_name = camera.displayName;
            let camera_ip = camera.ipAddress;
            let service_type = 'mgist';
            let camera_vendor = camera.vendor;
            let camera_model = camera.model;
            let access_point = camera.archives[0].accessPoint;
            let vmsNameByCamera = null;

            // 카메라 별로 vms 이름 추출
            if((camera.videoStreams) && (camera.videoStreams.length > 0) && (camera.videoStreams[0].accessPoint)) {
              vmsNameByCamera = camera.videoStreams[0].accessPoint.split('/')[1];
            } else if((camera.audioStreams) && (camera.audioStreams.length > 0) && (camera.audioStreams[0].accessPoint)) {
              vmsNameByCamera = camera.audioStreams[0].accessPoint.split('/')[1];
            } else {
              vmsNameByCamera = camera.archives[0].accessPoint.split('/')[1];
            }

            const values = `
            (
            '${camera_id}', '${camera_name}', '${camera_ip}'
            , '${vmsNameByCamera}', '${service_type}'
            , '${camera_vendor}', '${camera_model}', '${access_point}'
            )
            `;
  
            return values;
          });

          let queryValue = queryArray.join(',');
            
          // bind 로 bulk insert 가 어려워서 쿼리 직접 작성함.
          query = `
          INSERT INTO ob_camera (
            camera_id, camera_name, camera_ip
            , vms_name, service_type
            , camera_vendor, camera_model, access_point
          ) VALUES ${queryValue}
          ON CONFLICT (camera_id, vms_name)
          DO UPDATE 
          SET 
            vms_name = EXCLUDED.vms_name
            , camera_name = EXCLUDED.camera_name
            , camera_ip = EXCLUDED.camera_ip
            , camera_vendor = EXCLUDED.camera_vendor
            , camera_model = EXCLUDED.camera_model
            , access_point = EXCLUDED.access_point
            , updated_at = NOW();
          `;

          await client.query('COMMIT');

          // vms, 카메라 정상 등록
          returnValue = {
            status: true,
            message: `VMS와 카메라가 정상적으로 수정되었습니다.`
          };

          if((resModifyVms) && (resModifyVms.rowCount > 0) && (global.websocket)) {
            global.websocket.emit("fl_vms-update", { VMSList: {'update':resModifyVms.rowCount} });
          }

          if((resCamera) && (resCamera.rowCount > 0) && (global.websocket)) {
            global.websocket.emit("fl_cameras-update", { cameraList: {'update':resCamera.rowCount} });
          }

        } else {
          // 등록된 카메라 없으면
          returnValue = {
            status: false,
            message: `VMS(${new_vms_ip}:${new_vms_port})에 등록된 카메라가 없습니다.`
          };
        }

      } else {
        // 이미 등록된 vms
        returnValue = {
          status: false,
          message: `VMS(${new_vms_ip}:${new_vms_port}) 이미 등록된 VMS 입니다.`
        };
      }

    } else {
      // prev vms, 정보가 없으면
      returnValue = {
        status: false,
        message: `변경 전 VMS(${prev_vms_ip}:${prev_vms_port}) 정보가 없습니다.`
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, modifyVms, error: ', error);
    console.log('inundationControl/vmsService.js, modifyVms, error: ', error);
    await client.query('ROLLBACK');

    let message = '';
    if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') { 
      message = `VMS(${new_vms_ip}:${new_vms_port}) 서버에 연결이 되지 않습니다.`;
    } else if(error.code === 'ECONNABORTED') {
      message = `VMS(${new_vms_ip}:${new_vms_port}) 요청시간을 초과하였습니다.`;
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

exports.deleteVms = async ({ vmsName }) => {
  
  const client = await pool.connect();

  try {

    let binds = [vmsName];
    let queryVmsNameCameraList = await cameraMapper.getVmsNameCameraList();
    let resVmsNameCameraList = await client.query(queryVmsNameCameraList, binds);
    
    let vmsCameraList = [];

    await client.query('BEGIN');

    // 카메라 정보가 있으면
    if(resVmsNameCameraList && resVmsNameCameraList.rows.length > 0) {

      resVmsNameCameraList.rows.forEach(camera => {
        vmsCameraList.push(camera.camera_idx);
      });
      
      // 카메라 삭제
      let queryDeleteCamera = await cameraMapper.deleteVmsNameCameraList();
      await client.query(queryDeleteCamera, binds);
    }

    let query = await vmsMapper.deleteVms();
    const res = await client.query(query, binds);
    await client.query('COMMIT');

    if((res) && (res.rowCount > 0) && (global.websocket)) {
      global.websocket.emit("fl_vms-update", { VMSList: {'remove':res.rowCount} });
      global.websocket.emit("fl_cameras-update", { cameraList: {'remove':res.rowCount} });
    }

    return res.rowCount;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, deleteVms, error: ', error);
    console.log('inundationControl/vmsService.js, deleteVms, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}

exports.synchronizeVms = async ({ vms_id, vms_pw, vms_ip, vms_port }) => {
  
  const client = await pool.connect();

  let returnValue = {};

  try {
    
    let query = await vmsMapper.getVmsIpPortInfo();
    let binds = [vms_ip, vms_port];

    let res = await client.query(query, binds);
    query = '';
    binds = [];
        
    // 저장된 vms 확인 sync 시작
    if(res.rows.length > 0) {

      const vmsIdx = res.rows[0].idx;

      const encodePw = encodeURIComponent(vms_pw);
      const url = `http://${vms_id}:${encodePw}@${vms_ip}:${vms_port}/camera/list`;

      const isCameras = await axios.get(url, { timeout: 5000 }); 

      // vms에 등록된 카메라 있으면
      if(isCameras?.data?.cameras?.length > 0) {

        await client.query('BEGIN');
        
        let vms_name = '';
        const resVmsName = await axios.get(`http://${vms_id}:${vms_pw}@${vms_ip}:${vms_port}/hosts/`, { timeout: 3000 }); 
        if(resVmsName && resVmsName.data) {
          vms_name = resVmsName.data[0];
        }

        // 이전 vms 이름과 다르면 수정
        if(res.rows[0].vms_name !== vms_name) {

          binds = [vmsIdx, vms_id, vms_pw, vms_ip, vms_port, vms_name];
          query = await vmsMapper.modifyVms();
          await client.query(query, binds);
        }

        let queryArray = isCameras.data.cameras.map(camera => {

          let camera_id = camera.displayId;
          let camera_name = camera.displayName;
          let camera_ip = camera.ipAddress;
          let service_type = 'mgist';
          let camera_vendor = camera.vendor;
          let camera_model = camera.model;
          let access_point = camera.archives[0].accessPoint;
          let vmsNameByCamera = null;

          // 카메라 별로 vms 이름 추출
          if((camera.videoStreams) && (camera.videoStreams.length > 0) && (camera.videoStreams[0].accessPoint)) {
            vmsNameByCamera = camera.videoStreams[0].accessPoint.split('/')[1];
          } else if((camera.audioStreams) && (camera.audioStreams.length > 0) && (camera.audioStreams[0].accessPoint)) {
            vmsNameByCamera = camera.audioStreams[0].accessPoint.split('/')[1];
          } else {
            vmsNameByCamera = camera.archives[0].accessPoint.split('/')[1];
          }

          const values = `
          (
          '${camera_id}', '${camera_name}', '${camera_ip}'
          , '${vmsNameByCamera}', '${service_type}'
          , '${camera_vendor}', '${camera_model}', '${access_point}'
          )
          `;

          return values;
        });

        let queryValue = queryArray.join(',');
        
        // bind 로 bulk insert 가 어려워서 쿼리 직접 작성함.
        query = `
        INSERT INTO fl_camera (
          camera_id, camera_name, camera_ip
          , vms_name, service_type
          , camera_vendor, camera_model, access_point
        ) VALUES ${queryValue}
        ON CONFLICT (camera_id, vms_name)
        DO UPDATE 
        SET 
          vms_name = EXCLUDED.vms_name
          , camera_name = EXCLUDED.camera_name
          , camera_ip = EXCLUDED.camera_ip
          , camera_vendor = EXCLUDED.camera_vendor
          , camera_model = EXCLUDED.camera_model
          , access_point = EXCLUDED.access_point
          , updated_at = NOW();
        `;

        res = await client.query(query, binds);
        await client.query('COMMIT');
        
        if((res) && (res.rowCount > 0) && (global.websocket)) {
          global.websocket.emit("fl_vms-update", { VMSList: {'update':res.rowCount} });
          global.websocket.emit("fl_cameras-update", { cameraList: {'update':res.rowCount} });
        }

        // VMS 동기화
        returnValue = {
          status: true,
          message: `VMS가 동기화 되었습니다.`
        };

      } else {
        // 등록된 카메라 없으면
        returnValue = {
          status: false,
          message: `VMS(${vms_ip}:${vms_port})에 등록된 카메라가 없습니다.`
        };
      }

    } else {
      // 등록된 vms 없으면 
      returnValue = {
        status: false,
        message: `VMS(${vms_ip}:${vms_port}) 등록된 VMS가 없습니다.`
      };
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, synchronizeVms, error: ', error);
    console.log('inundationControl/vmsService.js, synchronizeVms, error: ', error);
    await client.query('ROLLBACK');

    let message = '';
    if(error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      message = `VMS(${vms_ip}:${vms_port}) 서버에 연결이 되지 않습니다.`;
    } else if(error.code === 'ECONNABORTED') {
      message = `VMS(${vms_ip}:${vms_port}) 요청시간을 초과하였습니다.`;
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

exports.exportArchive = async ({ camera_id, vms_name, occurDateTime }) => {

  const client = await pool.connect();

  let returnValue = {};

  try {
    
    let status = false;
    let message = '';
    let exportUrl = '';

    let query = await cameraMapper.getCameraIdVmsInfo();
    let binds = [camera_id, vms_name];
    
    let res = await client.query(query, binds);

    // 카메라 정보가 있으면
    if(res && res.rows.length > 0) {

      let vms_id = res.rows[0].vms_id;
      let vms_pw = res.rows[0].vms_pw;
      let vms_ip = res.rows[0].vms_ip;
      let vms_port = res.rows[0].vms_port;
      let accessPoint = res.rows[0].access_point;

      const eventDateTime = await getExportArchiveVideoTime(occurDateTime);
      
      let startDateTime;
      let endDateTime;
      if(eventDateTime) {
        startDateTime = eventDateTime.startDateTime;
        endDateTime = eventDateTime.endDateTime;
      }

      // export 할 날짜 정보가 있으면
      if(startDateTime && endDateTime) {
        
        const videoSourceId = accessPoint.split('hosts/')[1];

        const getExportIdURL = `http://${vms_id}:${vms_pw}@${vms_ip}:${vms_port}/export/archive/${videoSourceId}/${startDateTime}/${endDateTime}?waittimeout=30000`;
        const getExportIdResult = await axios.post(getExportIdURL, {
          "format": "mp4",
          "vc": 4,
          "comment": "comment"
        });

        let exportId;
        if(getExportIdResult && getExportIdResult.status === 202){
          exportId = getExportIdResult.headers.location;
        }

        // export id 가 있으면
        if(exportId) {

          const getExportStatusURL = `http://${vms_id}:${vms_pw}@${vms_ip}:${vms_port}${exportId}/status`;
          await axios.get(getExportStatusURL);
          await callSleep(1000 * 1 * 60 * 1.5);
          let getExportStatusResult = await axios.get(getExportStatusURL);

          if(getExportStatusResult?.data?.state === 0){
            message = '내보내기가 수행되지 않았습니다.';
          } else if(getExportStatusResult?.data?.state === 1){
            message = '내보내기가 완료되지 않았습니다.';
          } else if(getExportStatusResult?.data?.state === 3){
            message = '내보내기 오류가 발생했습니다.';
          } else if(getExportStatusResult?.data?.state === 4){
            message = '작업을 완료하는데 공간이 부족합니다.';
          } else if(getExportStatusResult?.data?.state === 5){
            message = '해당 이름의 파일이 이미 존재합니다.';
          } else if(getExportStatusResult?.data?.state === 6){
            message = '내보낼 데이터가 없습니다.';
          } else {

            let fileName;
            if(getExportStatusResult?.data?.files?.length === 1){
              fileName = getExportStatusResult.data.files[0];
            }

            // 파일이 있으면
            if(fileName) {

              status = true;
              message = '내보내기에 성공했습니다.';
              exportUrl = `http://${vms_id}:${vms_pw}@${vms_ip}:${vms_port}${exportId}/file?name=${fileName}`;

            } else {
              // 파일이 없으면
              message = `파일명을 찾을수 없습니다.(fileName is ${fileName})`
            }
          }

        } else {
          // export id 가 없으면
          message = `exportId를 가져오지 못했습니다.`
        }

      } else {
        // export 할 날짜 정보가 없으면
        message = `startDateTime is ${startDateTime}, endDateTime is ${endDateTime}`
      }

    } else {
      // 카메라 정보가 없으면
      message = 'db vms, camera not found';
    }
    
    returnValue = {
      status: status,
      message: message,
      exportUrl: exportUrl
    };

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/vmsService.js, exportArchive, error: ', error);
    console.log('inundationControl/vmsService.js, exportArchive, error: ', error);
  } finally {
    await client.release();
  }
}