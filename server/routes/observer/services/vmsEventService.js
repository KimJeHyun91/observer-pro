const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const vmsEventMapper = require('../mappers/vmsEventMapper');
const cameraMapper = require('../mappers/cameraMapper');
const serviceTypeMapper = require('../../common/mappers/serviceTypeMapper');
const eventTypeMapper = require('../../common/mappers/eventTypeMapper');
const { parsingOccurTime } = require('../../../utils/formatDateTime');
const { fn_mainServicePrefix } = require('../../../utils/mainServicePrefix');
const waterLevelMapper = require('../../inundationControl/mappers/waterLevelMapper');
const { getSetting } = require('../../common/services/commonService');

exports.detectFire = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 1 });
};

exports.detectSmoke = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 2 });
};

exports.detectMotion = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 3 });
};

exports.detectLoiter = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 4 });
};

exports.detectAbandonment = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 5 });
};

exports.detectTrespass = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 6 });
};

exports.detectLeave = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 7 });
};

exports.detectLinecross = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 8 });
};

exports.detectQueue = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 9 });
};

exports.detectFalldown = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 10 });
};

exports.detectSittingPosture = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 11 });
};

exports.detectStop = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 12 });
};

exports.detectMove = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 13 });
};

exports.detectPeopleCount = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 14 });
};

exports.detectShortDistance = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 15 });
};

exports.detectHandrail = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 16 });
};

exports.detectHandsUp = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 17 });
};

exports.detectFace = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 18 });
};

exports.detectPerson = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 26 });
};

exports.detectCar = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 27 });
};

exports.detectSafetyHelmet = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 28 });
};

exports.detectLostRecord = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 31 });
};

exports.detectLostCamera = async ({ cameraId, vmsName, mainServiceName, updateOccurTime }) => {
  return processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx: 32 });
};

exports.detectLostServer = async ({ vmsName, vmsIp, mainServiceName, updateOccurTime }) => {
  return processVmsEventLost({ vmsName, vmsIp, mainServiceName, updateOccurTime, eventTypeId: 33 });
};

exports.detectLostArchive = async ({ vmsName, vmsIp, mainServiceName, updateOccurTime }) => {
  return processVmsEventLost({ vmsName, vmsIp, mainServiceName, updateOccurTime, eventTypeId: 34 });
};

exports.detectVehicleNumber = async ({ vehicleNum, eventCameraId, occurDateTime, mainServiceName }) => {
  const vmsName = eventCameraId.split(':')[1];
  const id = eventCameraId.split(':')[2];
  const recogDateTime = occurDateTime && await parsingOccurTime(occurDateTime);

  const client = await pool.connect();

  try {
    let query;
    const useDetect = await getSetting({ settingName: 'ANPR 차량번호 검출' });
    if(!useDetect || !useDetect[0] || useDetect[0].setting_value === 'unuse'){
      return {
        success: false,
        message: '차량번호 검출 비활성화'
      };
    };
    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);

    const binds = [vehicleNum, eventCameraId, recogDateTime];
    query = vmsEventMapper.detectVehicleNumber();

    global.websocket && global.websocket.emit(`${mainServicePrefix}_anpr-vehicleNumber`, {
      vehicleNum,
      vmsName,
      cameraId: id
    });

    const result = await client.query(query, binds); 
    if(result && result.rowCount === 1){
      return {
        success: true
      }
    }
  } catch (err) {
    console.error(err);
    throw new Error(err.message || `detectVehicleNumber(${vehicleNum}(${eventCameraId})) error occurDateTime: ${occurTime}`)
  } finally {
    await client.release();
  };
}

async function processVmsEvent({ cameraId, vmsName, mainServiceName, updateOccurTime, eventIdx }) {
  const client = await pool.connect();

  try {
    let returnValue = null;
    let eventCameraId = `${mainServiceName}:${vmsName}:${cameraId}`;
    let binds = ['mgist'];
    let query = await serviceTypeMapper.getServiceTypeInfo();

    // TODO : 실제 안씀 추후 조건 자체 & DB 테이블 삭제 해줘야함
    const serviceTypeInfo = await client.query(query, binds);

    //ex: event type id 1:  화재감지
    binds = [eventIdx]; 

    query = await eventTypeMapper.getEventTypeInfo(mainServiceName.toLowerCase());
    const eventTypeInfo = await client.query(query, binds);

    if(serviceTypeInfo && !serviceTypeInfo.rows[0].use_service_type) {

      console.log('Mgist 서비스 비활성화로 인한 지능형 이벤트 검출 무시');

    } else if(eventTypeInfo && !eventTypeInfo.rows[0].use_event_type) {

      console.log('지능형 이벤트 검출 비활성화');

    } else {
      
      binds = [cameraId, vmsName, mainServiceName];
      query = await cameraMapper.getCameraIdVmsInfo();
      const resCameraInfo = await client.query(query, binds);

      for(let i in resCameraInfo.rows) {

        // 카메라가 현재 사용중이면 event 테이블에 저장
        if((resCameraInfo) && (resCameraInfo.rows.length > 0) && (resCameraInfo.rows[i].use_status)) {

          const deviceIdx = resCameraInfo.rows[i].camera_idx;
          const outsideIdx = resCameraInfo.rows[i].outside_idx;
          const insideIdx = resCameraInfo.rows[i].inside_idx;
          const dimensionType = resCameraInfo.rows[i].dimension_type;
          const topLocation = resCameraInfo.rows[i].top_location;
          const leftLocation = resCameraInfo.rows[i].left_location;
          const waterLevelIdx = resCameraInfo.rows[i].water_level_idx;
          const mainServiceName = resCameraInfo.rows[i].main_service_name;
          const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
          const servcieType = resCameraInfo.rows[i].service_type;
          eventCameraId = `${mainServiceName}:${vmsName}:${cameraId}:${servcieType}`;
          const eventOccurTime = updateOccurTime && await parsingOccurTime(updateOccurTime);
          
          const deviceType = 'camera';
          const cameraIp = resCameraInfo.rows[i].camera_ip; 
          const label = `${cameraId}.${resCameraInfo.rows[i].camera_name}(${vmsName})`;
          const eventType = eventTypeInfo.rows[0].event_type;
          let locationInfo = '';
          let mapImageURL = '';

          if(outsideIdx === 0){
            locationInfo = '실외';
            mapImageURL = null;
          }

          if(dimensionType === '2d') {
            binds = [outsideIdx];
            query = await vmsEventMapper.getOutSideInfo(mainServicePrefix);
            const resOutsideInfo = await client.query(query, binds);
  
            if(resOutsideInfo && resOutsideInfo.rows.length > 0) {
              locationInfo = resOutsideInfo.rows[0].outside_name;
            }
          } else if(dimensionType === '3d'){
            binds = [outsideIdx];
            query = await vmsEventMapper.getThreedModel(outsideIdx);
            const resThreeDModelInfo = await client.query(query, binds);
  
            if(resThreeDModelInfo && resThreeDModelInfo.rows.length > 0) {
              locationInfo = resThreeDModelInfo.rows[0].name;
            }
          }

          let resInsideInfo;
          let resWaterLevelDeviceInfo;
          if(insideIdx) {
            // fl: 침수, vb: 마을방송 
            // inside 없음.
            if((mainServicePrefix !== 'fl') && (mainServicePrefix !== 'vb')) {
              binds = [insideIdx];
              query = await vmsEventMapper.getInSideInfo(mainServicePrefix);
              resInsideInfo = await client.query(query, binds);
            }
          } else {
            if((mainServicePrefix == 'fl') && (waterLevelIdx)) {
              // 수위계(water level)
              binds = [waterLevelIdx];
              query = await waterLevelMapper.getWaterLevelDeviceInfo();
              resWaterLevelDeviceInfo = await client.query(query, binds);
            }
          }
          
          if(resInsideInfo && resInsideInfo.rows.length > 0) {
            
            locationInfo = locationInfo + ' ' + resInsideInfo.rows[0].inside_name;
            mapImageURL = resInsideInfo.rows[0].map_image_url;
          } else if(resWaterLevelDeviceInfo && resWaterLevelDeviceInfo.rows.length > 0) {
            
            locationInfo = locationInfo + ' ' + resWaterLevelDeviceInfo.rows[0].water_level_name;
          }

          const eventTypeId = eventTypeInfo.rows[0].event_type_id;
          const useSOP = eventTypeInfo.rows[0].use_sop;
          const SOPIdx = eventTypeInfo.rows[0].sop_idx;
          const usePopup = eventTypeInfo.rows[0].use_popup;
          const severityId = eventTypeInfo.rows[0].severity_id;
          
          binds = [eventType, `${eventType} ${label}`, locationInfo, eventTypeId, mainServiceName, eventOccurTime, severityId, SOPIdx, outsideIdx, insideIdx, waterLevelIdx, deviceIdx, deviceType, label, cameraIp, eventCameraId, dimensionType];
          query = await vmsEventMapper.addVmsEvent();

          await client.query('BEGIN');
          let res = await client.query(query, binds);

          let eventIdx;

          // 저장 성공
          if(res.rows && res.rows.length > 0) {
            
            eventIdx = res.rows[0].idx

            // 카메라 알람 상태 변경
            binds = [mainServiceName, vmsName, cameraId];
            query = await cameraMapper.modifyCameraAlarmStatus();
          
            await client.query(query, binds);
          }

          await client.query('COMMIT');
          returnValue = res.rowCount;
          if(useSOP && SOPIdx) {
            global.websocket && global.websocket.emit(`${mainServicePrefix}_events-SOP`, {
              SOPEvent: {
                SOPIdx,
                eventName: eventType,
                eventIdx,
                occurDateTime: eventOccurTime,
                locationInfo: {
                  location: locationInfo,
                  mapImageURL
                },
                eventTypeId,
                mainServiceName,
                outsideIdx,
                insideIdx,
                dimensionType,
                severityId,
                eventCameraId
              }
            });
            global.websocket.emit(`${mainServicePrefix}_events-update`, { eventList: {'create':res.rows[0]} });
            global.websocket.emit("cm_event_log-update", { eventLog: { 'update': res.rowCount } });
            return returnValue;
          };
          // 팝업 사용
          if(usePopup) {
            global.websocket && global.websocket.emit(`${mainServicePrefix}_events-update`, {
              eventPopup: {
                eventIdx,
                eventName: eventType,
                deviceIdx,
                deviceType,
                outsideIdx,
                insideIdx,
                dimensionType,
                deviceName: label,
                cameraId,
                ipaddress: cameraIp,
                severityId,
                mapImageURL,
                topLocation,
                leftLocation,
                mainServiceName,
                vmsName,
                service_type : 'mgist'
              }
            });
          }
          global.websocket.emit(`${mainServicePrefix}_events-update`, { eventList: {'create':res.rows[0]} });
          global.websocket.emit("cm_event_log-update", { eventLog: { 'update': res.rowCount } });
          global.websocket.emit("ob_cameras-update", { cameraList: { 'update': res.rowCount } });
        } else {
          // 카메라 사용중이 아닐 경우
          console.log(`Location information for this equipment(${cameraId}) is not available. occurrence: ${updateOccurTime}`);
        }
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('observer/vmsEventService.js, processVmsEvent, error: ', error);
    console.log('observer/vmsEventService.js, processVmsEvent, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  };
};

async function processVmsEventLost({ vmsName, vmsIp, mainServiceName, updateOccurTime, eventTypeId: paramsEventTypeId }) {
  const client = await pool.connect();
  try {
    let returnValue = null;
    let binds = ['mgist'];
    let query = await serviceTypeMapper.getServiceTypeInfo();
    const serviceTypeInfo = await client.query(query, binds);
    
    binds = [paramsEventTypeId]; 

    query = await eventTypeMapper.getEventTypeInfo();
    const eventTypeInfo = await client.query(query, binds);

    if(serviceTypeInfo && !serviceTypeInfo.rows[0].use_service_type) {
      console.log('Mgist 서비스 비활성화로 인한 지능형 이벤트 검출 무시');
      return;
    } else if(eventTypeInfo && !eventTypeInfo.rows[0].use_event_type) {
      console.log('지능형 이벤트 검출 비활성화');
      return;
    }

    const mainServicePrefix = await fn_mainServicePrefix(mainServiceName);
    const eventOccurTime = updateOccurTime && await parsingOccurTime(updateOccurTime);
    const eventType = eventTypeInfo.rows[0].event_type;
    const eventTypeId = eventTypeInfo.rows[0].event_type_id;
    const useSOP = eventTypeInfo.rows[0].use_sop;
    const SOPIdx = eventTypeInfo.rows[0].sop_idx;
    const severityId = eventTypeInfo.rows[0].severity_id;
    const deviceType = 'vms';
    const deviceIp = vmsIp;
    const deviceName = vmsName;

    binds = [eventType, eventTypeId, mainServiceName, eventOccurTime, severityId, SOPIdx, deviceType, deviceName, deviceIp];
    query = await vmsEventMapper.addVmsEventLost();
    let res = await client.query(query, binds);
    let eventIdx;

    if(res == null || !res.rows || !res.rows.length === 0){
      return;
    };
    
    // 저장 성공
    eventIdx = res.rows[0].idx;
    returnValue = res.rowCount;

    if(useSOP && SOPIdx) {
      global.websocket && global.websocket.emit(`${mainServicePrefix}_events-SOP`, {
        SOPEvent: {
          SOPIdx,
          eventName: eventType,
          eventIdx,
          occurDateTime: eventOccurTime,
          eventTypeId,
          mainServiceName,
          severityId,
        }
      });
    };
    global.websocket.emit(`${mainServicePrefix}_events-update`, { eventList: {'create':res.rows[0]} });
    global.websocket.emit("cm_event_log-update", { eventLog: { 'update': res.rowCount } });

    return returnValue;

  } catch (error) {
    logger.info('observer/vmsEventService.js, processVmsEventLost, error: ', error);
    console.log('observer/vmsEventService.js, processVmsEventLost, error: ', error);
  } finally {
    await client.release();
  };
};