const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const speakerMapper = require('../../routes/villageBroadcast/mappers/speakerMapper');
const cameraMapper = require('../../routes/observer/mappers/cameraMapper');
const vmsMapper = require('../../routes/observer/mappers/vmsMapper');
const ping = require('ping');
const { insertLog } = require('../../routes/common/services/commonService');
const mainServiceName = require('../../config').mainServiceName.broadcast;
const deviceMapper = require('../../routes/villageBroadcast/mappers/deviceMapper');


exports.checkSpeaker = async () => {

  let client;

  try {
    
    client = await pool.connect();
    let query = await speakerMapper.getSpeakerList();
    const resSpeakerList = await client.query(query);
    await client.release();

    if(resSpeakerList && resSpeakerList.rows.length > 0) {
      
      for(let data of resSpeakerList.rows) {

        let isLinkedStatus = false;

        // 스피커 ip 가 있으면
        if(data.speaker_ip) {

          const isPingCheck = await pingCheck(data.speaker_ip);
          
          // ping 체크, 연결되었다면
          if(isPingCheck) {
            isLinkedStatus = true;
          } else {
            await insertLog('System', '스피커 ping 체크', `${data.speaker_name}의 ip(${data.speaker_ip})가 연결되지 않았습니다.`, 'worker/broadcast/checkPingDevices.js');
          }

          client = await pool.connect();
          let binds = [data.speaker_idx, isLinkedStatus];
          query = await speakerMapper.modifyLinkedStatusSpeaker();
          const res = await client.query(query, binds);
          await client.release();

          if((res) && (res.rowCount > 0) && (global.websocket)) {
            global.websocket.emit("vb_speakers-update", { speakerList: res.rowCount });
          }
          
        } else {
          console.log(`스피커(${data.speaker_name})의 ip(${data.speaker_ip})가 존재하지 않습니다.(worker/broadcast/checkPingDevices.js)`);
        }
      }

    } else {
      console.log('스피커가 존재하지 않습니다.(worker/broadcast/checkPingDevices.js)');
    }

  } catch (error) {
    logger.info('worker/broadcast/checkPingDevice.js, checkSpeaker, error: ', error);
    console.log('worker/broadcast/checkPingDevice.js, checkSpeaker, error: ', error);
  }
}

exports.checkCamera = async () => {

  const client = await pool.connect();

  try {
    
    // vms 검색
    let binds = [mainServiceName];
    let query = await vmsMapper.getVmsList();
    const resVmsList = await client.query(query, binds);
    
    // vms 이름이 있으면
    if(resVmsList && resVmsList.rows.length > 0) {
      
      // vms 이름으로 카메라 리스트 검색
      for(let i = 0; i < resVmsList.rows.length; i++) {

        let binds = [resVmsList.rows[i].vms_name, mainServiceName, mainServiceName];
        query = await cameraMapper.getVmsNameCameraList();
        const resVmsNameCameraList = await client.query(query, binds);
        
        if(resVmsNameCameraList && resVmsNameCameraList.rows.length > 0) {
          // vms 이름 별로, 카메라 연결상태 확인 후 변경
          checkCameraLinkedStatus(resVmsNameCameraList.rows);
        }
      }

    } else {
      console.log('카메라가 존재하지 않습니다.(worker/broadcast/checkPingDevices.js)');
    }

  } catch (error) {
    logger.info('worker/broadcast/checkPingDevice.js, checkCamera, error: ', error);
    console.log('worker/broadcast/checkPingDevice.js, checkCamera, error: ', error);
  } finally {
    await client.release();
  }
}

const pingCheck = async (ipaddress) => {

  let res = await ping.promise.probe(ipaddress, {
    timeout: 5,
    min_reply: 2
  });
  
  return res.alive;
}

const checkCameraLinkedStatus = async (cameraArray) => {

  let client;
  
  try {
    
    let isLinkedStatus = false;
    
    for(let data of cameraArray) {

      // 카메라 ip 가 있으면
      if(data.camera_ip) {

        const isPingCheck = await pingCheck(data.camera_ip);
        
        // ping 체크, 연결되었다면
        if(isPingCheck) {
          isLinkedStatus = true;
        } else {
          await insertLog('System', '카메라 ping 체크', `camera_ip(${data.camera_ip} / ${data.vms_name} / ${data.camera_id}.${data.camera_name})가 연결되지 않았습니다.`, 'worker/broadcast/checkPingDevices.js');
        }

        client = await pool.connect();
        let binds = [data.camera_idx, isLinkedStatus];
        let query = await cameraMapper.modifyLinkedStatusCamera();
        const res = await client.query(query, binds);
        await client.release();

        if((res) && (res.rowCount > 0) && (global.websocket)) {
          global.websocket.emit("vb_cameras-update", { cameraList: res.rowCount });
        }
        
      } else {
        console.log(`카메라 camera_ip(${data.camera_ip} / ${data.camera_id}.${data.camera_name})가 존재하지 않습니다.(worker/broadcast/checkPingDevices.js)`);
      }
    }

  } catch (error) {
    logger.info('worker/broadcast/checkPingDevice.js, checkCameraLinkedStatus, error: ', error);
    console.log('worker/broadcast/checkPingDevice.js, checkCameraLinkedStatus, error: ', error);
  }
}

exports.checkDevice = async () => {

  let client;

  try {
    
    client = await pool.connect();
    let query = await deviceMapper.getDeviceList();
    const resDeviceList = await client.query(query);
    await client.release();

    if(resDeviceList && resDeviceList.rows.length > 0) {

      for(let data of resDeviceList.rows) {

        let isLinkedStatus = false;

        // 장치 ip 가 있으면
        if(data.device_ip) {

          const isPingCheck = await pingCheck(data.speaker_ip);

          // ping 체크, 연결되었다면
          if(isPingCheck) {
            isLinkedStatus = true;
          } else {
            await insertLog('System', '장치 ping 체크', `${data.device_name}/${data.device_type}의 ip(${data.device_ip})가 연결되지 않았습니다.`, 'worker/broadcast/checkPingDevices.js');
          }

          client = await pool.connect();
          let binds = [data.device_idx, isLinkedStatus];
          query = await deviceMapper.modifyLinkedStatusDevice();
          const res = await client.query(query, binds);
          await client.release();

          if((res) && (res.rowCount > 0) && (global.websocket)) {
            global.websocket.emit("vb_devices-update", { deviceList: res.rowCount });
          }

        } else {
          console.log(`장치(${data.device_name}/${data.device_type})의 ip(${data.device_ip})가 존재하지 않습니다.(worker/broadcast/checkPingDevices.js)`);
        }

      } // for
    }

  } catch (error) {
    logger.info('worker/broadcast/checkPingDevice.js, checkDevice, error: ', error);
    console.log('worker/broadcast/checkPingDevice.js, checkDevice, error: ', error);
  }
}