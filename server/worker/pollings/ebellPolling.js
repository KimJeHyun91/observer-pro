const { pool, getOrCreatePoolEBell } = require('../../db/postgresqlPool');
const logger = require('../../logger');
const serviceTypeService = require('../../routes/common/services/serviceTypeService');
const eventTypeService = require('../..//routes/common/services/eventTypeService');
const deviceService = require('../../routes/observer/services/deviceService');
const { getLocation } = require('../../utils/getLocation');
const { ebellConfig } = require('../../config');

exports.ebellDevice = async () => {

  let ebellClient;
  let client;

  try {
    ebellClient = await getOrCreatePoolEBell(ebellConfig).connect();
    client = await pool.connect();

    let query = `
    SELECT * FROM
      eb_device
    WHERE
      type = 'ebell' 
    ORDER BY 
      idx;
    `;
    const resEbellDevice = await ebellClient.query(query);

    if(resEbellDevice && resEbellDevice.rows.length > 0) {

      const strArr = resEbellDevice.rows.map((row) => {
        const strValue = `(
          '${row['extension']}',
          '${row['type']}', 
          '${row['name']}', 
          '${row['location']}', 
          '${row['ipaddress']}',
          'ebell',
          ${row['status'] === 0 ? true:false}
          )`;
        return strValue;
      });

      const queryValues = strArr.join(',');

      query = `
      INSERT INTO ob_device AS ori (
        device_id
        , device_type
        , device_name
        , device_location
        , device_ip
        , service_type
        , alarm_status
      ) VALUES ${queryValues}
      ON CONFLICT (device_ip) DO 
      UPDATE SET
        device_id = EXCLUDED.device_id
        , device_type = EXCLUDED.device_type
        , device_name = EXCLUDED.device_name
        , device_location = EXCLUDED.device_location
        , service_type = EXCLUDED.service_type
        , alarm_status = EXCLUDED.alarm_status
        , updated_at = NOW()
      WHERE
        ori.device_id != EXCLUDED.device_id
      OR ori.device_type != EXCLUDED.device_type
      OR ori.device_name != EXCLUDED.device_name
      OR ori.device_location != EXCLUDED.device_location
      OR ori.service_type IS NULL
      OR ori.alarm_status != EXCLUDED.alarm_status
      `;

      await client.query('BEGIN');
      const resDevice = await client.query(query);
      await client.query('COMMIT');

      if(resDevice && resDevice.rowCount > 0) {
        if (global.websocket) {
          global.websocket.emit("ob_deviceList", { deviceList: resDevice.rows.length });
        }
      }
    }

  } catch (error) {
    logger.info('worker/pollings/ebellPolling.js, ebellDevice, error: ', error);
    console.log('worker/pollings/ebellPolling.js, ebellDevice, error: ', error);
    if(client) {
      await client.query('ROLLBACK');
    }
  } finally {
    if(ebellClient) {
      await ebellClient.release();
    }
    if(client) {
      await client.release();
    }
  }
}

exports.ebellEvent = async() => {

  let ebellClient;
  let client;

  try {
    
    ebellClient = await getOrCreatePoolEBell(ebellConfig).connect();
    client = await pool.connect();

    const serviceTypeInfo = await serviceTypeService.getServiceTypeInfo({ service_type : 'ebell' });
    const eventTypeInfo = await eventTypeService.getEventTypeInfo({ id: 19 });

    if((serviceTypeInfo) && (serviceTypeInfo.length > 0) && (!serviceTypeInfo[0].use_service_type)) {

      console.log('비상벨 서비스가 비활성화 상태입니다.');

    } else if((eventTypeInfo) && (eventTypeInfo.length > 0) && (!eventTypeInfo[0].use_event_type)) {

      console.log('비상벨 이벤트가 비활성화 상태입니다.');

    } else {

      let query = `
      SELECT e.*, d.name, d.ipaddress, d.display_id, d.group_idx 
      FROM 
        eb_device_event AS e 
      INNER JOIN (
        SELECT a.*, c.display_id 
        FROM 
          eb_device a 
        LEFT OUTER JOIN camera c 
        ON 
          a.camera_id = CAST(c.idx AS TEXT) 
        WHERE 
          a.type = 'ebell' 
        ORDER BY 
          a.idx
      ) AS d 
      ON e.extension = d.extension
      ORDER BY e.idx;
      `;

      const resEbellEvent = await ebellClient.query(query);

      // ebell 서버 DB에 이벤트가 있으면
      if((resEbellEvent) && (resEbellEvent.rows.length > 0)) {

        let strArr = [];
        let eventName;
        let locationInfo;
        const eventTypeId = eventTypeInfo[0].event_type_id;
        const mainServiceName = 'origin';
        let startDateTime;
        let severityId;
        let outsideIdx;
        let insideIdx;
        let dimensionType;
        let topLocation;
        let leftLocation;
        let deviceIdx;
        let deviceType;
        let deviceName;
        let deviceIp;
        let cameraId;
        let SOPIdx;
        for(let row of resEbellEvent.rows) {

          const queryDevice = `
          SELECT 
            idx, device_id, device_name, device_type, device_ip, service_type, outside_idx, inside_idx, dimension_type, camera_id, left_location, top_location
          FROM 
            ob_device
          WHERE
            device_ip = '${row['ipaddress']}'
          AND 
            device_type = 'ebell';
          `;
          const resDevice = await client.query(queryDevice);

          // ob_device에 ebell 장비가 있으면
          if(resDevice && resDevice.rows.length > 0) {
            
            deviceIdx = resDevice.rows[0].idx;
            deviceType = resDevice.rows[0].device_type;
            deviceName = resDevice.rows[0].device_name;
            deviceIp = resDevice.rows[0].device_ip;
            outsideIdx = resDevice.rows[0].outside_idx;
            insideIdx = resDevice.rows[0].inside_idx;
            dimensionType = resDevice.rows[0].dimension_type;
            if(outsideIdx == null || insideIdx == null ){
              console.log(`ebell(${resDevice.rows[0].ipaddress}) is not registered in map`);
              return;
            }
            eventName = eventTypeInfo[0].event_type;
            locationInfo = await getLocation(outsideIdx, insideIdx);
            startDateTime = row['callreq'];
            severityId = eventTypeInfo[0].severity_id;
            SOPIdx = eventTypeInfo[0].sop_idx,
            topLocation = resDevice.rows[0].top_location;
            leftLocation = resDevice.rows[0].left_location;
            cameraId = resDevice.rows[0].camera_id;
            const strValue = `(
              '${eventName}', 
              '${(row['status'] === 1)?row['name']+' 비상발생':(row['status'] === 2)?row['name']+' 비상발생(통화중)':row['name']+' 비상종료'}',
              '${locationInfo.location}',
              ${row['idx']},
              ${eventTypeId},
              '${mainServiceName}',
              '${startDateTime}', 
              '${row['callend']}', 
              ${severityId},
              ${SOPIdx},
              true,
              ${outsideIdx},
              ${insideIdx},
              '${dimensionType}',
              ${deviceIdx},
              '${deviceType}',
              '${deviceName}',
              '${deviceIp}',
              ${cameraId ? `'${cameraId}'`:null}
            )`;
            strArr.push(strValue);
          } else {
            // ob_device에 ebell 장비가 없으면
            console.log('ob_device ebell not found');
          }
        } 
        if(strArr.length > 0) {
          const queryValues = strArr.join(',');

          let queryEvent = `
          INSERT INTO event_log AS ori (
            event_name 
            , description
            , location
            , event_idx
            , event_type_id
            , main_service_name
            , event_occurrence_time 
            , event_end_time 
            , severity_id
            , sop_idx
            , connection
            , outside_idx
            , inside_idx
            , dimension_type
            , device_idx
            , device_type
            , device_name
            , device_ip
            , camera_id
          ) VALUES ${queryValues}
          ON CONFLICT (event_idx) WHERE event_idx IS NOT NULL
          DO UPDATE
          SET 
            description = EXCLUDED.description, 
            event_end_time = EXCLUDED.event_end_time
          WHERE
            ori.device_type = 'ebell' AND
            ori.description != EXCLUDED.description
            OR ori.event_end_time != EXCLUDED.event_end_time AND
            ori.event_idx IS NOT NULL
          RETURNING idx;
          `;
          const resEvent = await client.query(queryEvent);
          let eventIdx;
          if(resEvent && resEvent.rows[resEvent.rows.length-1]) {
            eventIdx = resEvent.rows[resEvent.rows.length-1].idx;
          }
          if(eventIdx == null){
            return;
          };
          const useSOP = eventTypeInfo[0].use_sop;
          const usePopup = eventTypeInfo[0].use_popup;
          deviceService.modifyDeviceAlarmStatusEvent({ deviceIdx });

          if(useSOP && SOPIdx) {
            global.websocket && global.websocket.emit('ob_events-SOP', {
              SOPEvent: {
                SOPIdx,
                eventIdx,
                eventName,
                locationInfo,
                eventTypeId,
                mainServiceName,
                outsideIdx,
                insideIdx,
                dimensionType,
                occurDateTime: startDateTime,
                severityId,
                eventCameraId: cameraId
              }
            });
            global.websocket.emit('ob_events-update', { eventList: { 'create': eventIdx } });
            global.websocket.emit("cm_event_log-update", { eventLog: { 'update': resEvent.rowCount } });
            return;
          };
          // 팝업 활성화 상태 
          if(usePopup) {
            global.websocket && global.websocket.emit('ob_events-update', {
              eventPopup: {
                eventIdx,
                eventName,
                location: locationInfo.location,
                outsideIdx,
                insideIdx,
                dimensionType,
                deviceIdx,
                deviceType,
                deviceName,
                ipaddress: deviceIp,
                cameraId: cameraId ? cameraId.split(':')[2]: null,
                topLocation,
                leftLocation,
                severityId,
                mapImageURL : locationInfo.mapImageURL,
                mainServiceName,
                vmsName: cameraId ? cameraId.split(':')[1]: null,
              }
            });
          };
          global.websocket.emit('ob_events-update', { eventList: {'create': eventIdx} });
          global.websocket.emit("cm_event_log-update", { eventLog: { 'update': resEvent.rowCount } });
        } else {
          console.log('strArr.length 가 없습니다.');
        }
      } else {
        // ebell 서버 DB에 이벤트가 없으면
        console.log('ebell server event not found');
      }
    }
  } catch (error) {
    logger.info('worker/pollings/ebellPolling.js, ebellEvent, error: ', error);
    console.log('worker/pollings/ebellPolling.js, ebellEvent, error: ', error);
  } finally {
    if(ebellClient) {
      await ebellClient.release();
    }
    if(client) {
      await client.release();
    }
  }
}