const ping = require('ping');
const logger = require('../../logger');
const { addOperLog } = require('../../utils/addOperLog');
const { getEbellsPing } = require('../../routes/observer/services/ebellService');
const { getAllCameraList } = require('../../routes/observer/services/cameraService');
const { getGuardianliteList } = require('../../routes/observer/services/guardianliteService');
const { getAcus } = require('../../routes/observer/services/doorService');
const { pool } = require('../../db/postgresqlPool');

const updateStatusConnect = async (device) => {
  let query = '';
  const { device_type, device_ip, idx } = device;
  const pgPool = pool;
  try {
    switch(device_type){
      case 'ebell':
        query = `UPDATE ob_device SET linked_status=true, updated_at=NOW() WHERE device_ip='${device_ip}' AND linked_status=false`;
        break;
      case 'camera':
        query = `UPDATE ob_camera SET linked_status=true, updated_at=NOW() WHERE idx='${idx} AND linked_status=false'`;
        break;
      case 'guardianlite':
        query = `UPDATE ob_guardianlite SET status=true, updated_at=NOW() WHERE guardianlite_ip='${device_ip}' AND status=false`;
        break;
      case 'acu':
        query = `UPDATE ob_device SET linked_status=true, updated_at=NOW() WHERE device_ip='${device_ip}' AND linked_status=false`;
        break;
      default:
        throw new Error('updateStatusConnect, unknown device type');
    }
    return await pgPool.query(query);
  } catch (error) {
    console.log('worker/main/checkPingDevices.js, updateStatusConnect, err: ', error);
    logger.error('worker/main/checkPingDevices.js, updateStatusConnect, err: ', error);
  }
}

const updateStatusDisConnect = async (device) => {
  let query = '';
  const { device_type, device_ip, idx } = device;
  const pgPool = pool;
  try {
    switch(device_type){
      case 'ebell':
        query = `UPDATE ob_device SET linked_status=false, updated_at=NOW() WHERE device_ip='${device_ip}' AND linked_status=true`;
        break;
      case 'camera':
        query = `UPDATE ob_camera SET linked_status=false, updated_at=NOW() WHERE idx=${idx} AND linked_status=true`;
        break;
      case 'guardianlite':
        query = `UPDATE ob_guardianlite SET status=false, updated_at=NOW() WHERE guardianlite_ip='${device_ip}' AND status=true`;
        break;
      case 'acu':
        query = `UPDATE ob_device SET linked_status=false, updated_at=NOW() WHERE device_ip='${device_ip}' AND linked_status=true`;
        break;
      default:
        throw new Error('updateStatusDisConnect, unknown device type');
    }
    return await pgPool.query(query);
  } catch (error) {
    console.log('worker/main/checkPingDevices.js, updateStatusDisConnect, err: ', error);
    logger.error('worker/main/checkPingDevices.js, updateStatusDisConnect, err: ', error);
  }
}

const updateClientDeviceStatus = async (type) => {
  switch(type){
      case 'camera':
      return global.websocket.emit("ob_cameras-update", { cameraList: { 'update': new Date() }});
    case 'ebell':
      return global.websocket.emit('ob_ebells-update', { ebellList: {'update': new Date() }});
    case 'guardianlite':
      return global.websocket.emit('ob_guardianlites-update', { guardianlites: new Date()});
    case 'acu':
      return global.websocket.emit('ob_doors-update', { doorList: {'update': new Date() }});
    default:
      throw new Error('updateClientDeviceStatus, unknown device type');
  }
}

const handleManageDeviceStatusLog = (isAlive, device) => {
  const { device_ip, device_type, camera_id, camera_name } = device;
  let logType;
  let logDescription;
  logType = isAlive ? 'Ping connection Successful':'Ping connection Failed';
  try {
    switch(device_type){
      case 'ebell':
        logDescription = isAlive ?`ebell ${device_ip} Ping connection Successful`:`ebell ${device_ip} Ping connection Failed`;
        break;
      case 'camera':
        logDescription = isAlive ?`camera ${device_ip}(${camera_id}.${camera_name}) Ping connection Successful`:`camera ${device_ip}(${camera_id}.${camera_name}) Ping connection Failed`;
        break;
      case 'guardianlite':
        logDescription = isAlive ?`guardianlite ${device_ip} Ping connection Successful`:`guardianlite ${device_ip} Ping connection Failed`;
        break;
      default:
        break;
    }
    addOperLog({
      logAction: 'addoper', 
      operatorId: 'System', 
      logType, 
      logDescription, 
      reqIp: '' 
    });
  } catch (error) {
    console.log('worker/main/checkPingDevices.js, handleManageDeviceStatusLog, err: ', error);
    logger.error('worker/main/checkPingDevices.js, handleManageDeviceStatusLog, err: ', error);
  }
}

const syncDeviceStatus = async (isAlive, device) => {
  if((isAlive && device.linked_status) || (!isAlive && !device.linked_status)){
    return;
  }
  let result;
  try {
    if(isAlive) {
      result = await updateStatusConnect(device);
    } else {
      result = await updateStatusDisConnect(device);
    }
    if(result?.rowCount === 1 && global.websocket) {
      updateClientDeviceStatus(device.type);
      handleManageDeviceStatusLog(isAlive, device);
    }
    return result;
  } catch(error) {
    console.log('worker/main/checkPingDevices.js, syncDeviceStatus, err: ', error);
    logger.error('worker/main/checkPingDevices.js, syncDeviceStatus, err: ', error);
  }
}

const pingCheck = async (devices) => {
  await Promise.all(devices.map(async (device) => {
    let res = await ping.promise.probe(device.device_ip, {
      timeout: 10,
      min_reply: 4
    });
    if (res) await syncDeviceStatus(res.alive, { ...device });
  }));
};

const pingIntervalTime = 1000 * 1 * 30 * 1;
let pingIntervalId;

exports.startCheckOriginDevices = () => {
  if(pingIntervalId) clearInterval(pingIntervalId);

  pingIntervalId = setInterval(async () => {
    try {
      const devices = [];
      const ebellsList = await getEbellsPing();
      const cameras = await getAllCameraList({ mainServiceName: 'origin' })
      const guardianliteList = await getGuardianliteList({});
      const acuList = await getAcus();
      if(ebellsList?.length > 0){
        devices.push(...ebellsList);
      }
      if(cameras?.length> 0){
        devices.push(...cameras.map((camera) => ({...camera, idx: camera.camera_idx, device_ip: camera.camera_ip, device_type: 'camera'})));
      }
      if(guardianliteList?.length > 0){
        devices.push(...guardianliteList.map((guardianlite) => ({  linked_status: guardianlite.status, device_ip: guardianlite.guardianlite_ip, device_type: 'guardianlite'})));
      }
      if(acuList?.result?.length > 0){
        devices.push(...acuList.result);
      }
      devices.length > 0 && pingCheck(devices);

    } catch(error) {
      console.log('worker/main/checkPingDevices.js, startCheckOriginDevices, err: ', error);
      logger.error('worker/main/checkPingDevices.js, startCheckOriginDevices, err: ', error);
    }
  }, pingIntervalTime);
}

exports.stopCheckOriginDevices = () => {
  clearInterval(pingIntervalId);
};