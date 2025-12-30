const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const eventMapper = require('../mappers/eventMapper');
const cameraMapper = require('../mappers/cameraMapper');
const serviceTypeMapper = require('../../common/mappers/serviceTypeMapper');
const eventTypeMapper = require('../../common/mappers/eventTypeMapper');
const { parsingOccurTime } = require('../../../utils/formatDateTime');
const warningBoardService = require('../../common/services/warningBoardService');
const outsideMapper = require('../mappers/outsideMapper');


exports.detectFire = async (cameraIp, cameraId, vmsIp, vmsName, updateOccurTime) => {
  
  const client = await pool.connect();

  try {

    let returnValue = null;

    let binds = ['mgist'];
    let query = await serviceTypeMapper.getServiceTypeInfo();
    const serviceTypeInfo = await client.query(query, binds);

    binds = [1]; // event type id 1:  화재감지
    query = await eventTypeMapper.getEventTypeInfo();
    const eventTypeInfo = await client.query(query, binds);

    if(serviceTypeInfo && !serviceTypeInfo.rows[0].use_service_type) {

      console.log('Mgist 서비스 비활성화로 인한 화재 이벤트 검출 무시');

    } else if(eventTypeInfo && !eventTypeInfo.rows[0].use_event_type) {

      console.log('화재 이벤트 검출 비활성화');

    } else {
      
      binds = [cameraId, vmsName];
      query = await cameraMapper.getCameraIdVmsInfo();
      const resCameraInfo = await client.query(query, binds);

      // 카메라가 현재 사용중이면 event 테이블에 저장
      if((resCameraInfo) && (resCameraInfo.rows.length > 0) && (resCameraInfo.rows[0].use_status)) {

        const outsideIdx = resCameraInfo.rows[0].outside_idx;
        const cameraIdx = resCameraInfo.rows[0].camera_idx;

        const eventOccurTime = updateOccurTime && await parsingOccurTime(updateOccurTime);
        
        const label = `${cameraId}.${resCameraInfo.rows[0].camera_name}(${vmsName})`;
        const eventType = eventTypeInfo.rows[0].event_type;
        const eventTypeId = eventTypeInfo.rows[0].event_type_id;
        const serviceType = eventTypeInfo.rows[0].service_type;
        const useWarningBoard = eventTypeInfo.rows[0].use_warning_board;
        const usePopup = eventTypeInfo.rows[0].use_popup;
        const severityId = eventTypeInfo.rows[0].severity_id;

        binds = [eventType, `${eventType} ${label}`, eventTypeId, serviceType, eventOccurTime, severityId, cameraIdx];
        
        query = await eventMapper.addVmsEvent();

        await client.query('BEGIN');
        let res = await client.query(query, binds);

        let eventIdx;

        // 이벤트 테이블 저장 성공
        if(res.rows && res.rows.length > 0) {
          
          eventIdx = res.rows[0].idx

          // 카메라 알람 상태 변경
          binds = [cameraIdx];
          query = await cameraMapper.modifyCameraAlarmStatus();
        
          await client.query(query, binds);
        }

        await client.query('COMMIT');
        
        returnValue = res.rowCount;

        binds = [outsideIdx];
        query = await outsideMapper.getOutSideInfo();
        const resOutsideInfo = await client.query(query, binds);
        
        let locationInfo = '';
        if(resOutsideInfo && resOutsideInfo.rows.length > 0) {
          locationInfo = resOutsideInfo.rows[0].outside_name;
        }
        const cameraInfo =  `${cameraId}.${resCameraInfo.rows[0].camera_name}`;

        // 워닝보드 사용
        if(severityId === 3 && useWarningBoard) {
          warningBoardService.insertWarningBoard({ mainService: 'inundation', eventIdx, serviceType, eventTypeId, locationInfo, cameraInfo });
        }

        // 팝업 사용
        if(usePopup) {
          global.requestRtspEvent(`${vmsIp}:${vmsName}:${cameraId}`);

          global.websocket && global.websocket.emit("fl_eventList", {
            eventList: [{
              lastEvent: {
                eventIdx: eventIdx,
                eventName: eventType,
                deviceId: cameraId,
                deviceType: 'camera',
                outsideIdx: outsideIdx,
                serviceType: serviceType,
                label: label,
                cameraId: cameraId,
                ipaddress: cameraIp,
                severityId: severityId
              }
            }]
          });
        } else {
          if(global.websocket) {
            global.websocket.emit("fl_eventList", { eventList: res.rowCount });
          }
        }
      } else {
        // 카메라 사용중이 아닐 경우
        console.log(`Location information for this equipment(${cameraId}) is not available. occurrence: ${updateOccurTime}`);
        returnValue = `Location information for this equipment(${cameraId}) is not available. occurrence: ${updateOccurTime}`;
      }
    }

    return returnValue;

  } catch (error) {
    logger.info('inundationControl/vmsEventService.js, detectFire, error: ', error);
    console.log('inundationControl/vmsEventService.js, detectFire, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}