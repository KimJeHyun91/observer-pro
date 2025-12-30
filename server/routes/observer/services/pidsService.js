const logger = require('../../../logger');
const pidsMapper = require('../mappers/pidsMapper');
const { pool } = require('../../../db/postgresqlPool');
const eventTypeMapper = require('../../common/mappers/eventTypeMapper');

exports.createPIDS = async ({ name, ipaddress, outside_idx = 0, inside_idx = 0, type = 'pids', location }) => {
  const client = await pool.connect();
  try {
    let binds;
    let query;
    await client.query('BEGIN');
    binds = [name, ipaddress, type, location, outside_idx, inside_idx]
    query = await pidsMapper.createPIDS();

    const res = await client.query(query, binds);
    if(!res || res.rowCount !== 1){
      await client.query('ROLLBACK');
      return {
        success: false
      }
    }
    binds = [name, ipaddress, 'pids', location, 0, 0];
    query = await pidsMapper.createPIDSZone();
    let resPidsZone = await client.query(query, binds);
    await client.query('COMMIT');
    if(resPidsZone.rowCount > 0){
      return {
        success: true
      }
    }
  } catch(error) {
    logger.info('observer/pidsService.js, create pids, error: ', error);
    console.log('observer/pidsService.js, create pids, error: ', error);
    await client.query('ROLLBACK');
    throw new Error(error.message || 'observer/pidsService.js create pids server error')
  } finally {
    await client.release();
  };
};

exports.getPIDS = async () => {
  const client = await pool.connect();
  try {
    const query = await pidsMapper.getPIDS();
    return await client.query(query);
  } catch(error) {
    logger.info('observer/pidsService.js, get pids, error: ', error);
    console.log('observer/pidsService.js, get pids, error: ', error);
    throw new Error(error.message || 'observer/pidsService.js get pids server error');
  } finally {
    await client.release();
  };
};

exports.getPIDSRoot = async () => {
  const client = await pool.connect();
  try {
    const query = await pidsMapper.getPIDSRoot();
    const result = await client.query(query);
    console.log(result);
    return result;
  } catch(error) {
    logger.info('observer/pidsService.js, getPIDSRoot, error: ', error);
    console.log('observer/pidsService.js, getPIDSRoot, error: ', error);
    throw new Error(error.message || 'observer/pidsService.js getPIDSRoot error');
  } finally {
    await client.release();
  };
};

exports.updatePIDS = async ({ idx, line_x1, line_x2, line_y1, line_y2, camera_id }) => {
  const client = await pool.connect();
  try {
    let binds;
    if(camera_id !== undefined){
      binds = [idx, camera_id];
    } else {
      binds = [idx, line_x1, line_x2, line_y1, line_y2];
    }
    const query = await pidsMapper.updatePIDSZoneLocation(camera_id);
    const res = await client.query(query, binds);
    if(!res || res.rowCount !== 1){
      return {
        success: false
      }
    }

    if(res.rowCount === 1){
      global.websocket.emit('ob_pids-update', { 'pidsList': {'update':res.rowCount} });
      return {
        success: true
      }
    }
  } catch(error) {
    logger.info('observer/pidsService.js, update PIDS zone, error: ', error);
    console.log('observer/pidsService.js, update PIDS zone, error: ', error);
    throw new Error(error.message || 'observer/pidsService.js update PIDS zone server error')
  } finally {
    await client.release();
  };
};

exports.removePIDS = async ({ idxs }) => {
  const client = await pool.connect();
  const removeIdxs = Array.isArray(idxs) ? idxs : [idxs];

  try {
    let totalDeletedRows = 0;

    for (const idx of removeIdxs) {
      let binds = [idx];
      let queryRemovePIDS = await pidsMapper.removePIDS();
      const res = await client.query(queryRemovePIDS, binds);
      // 삭제된 VMS 카운트 누적
      if (res && res.rowCount > 0) {
        totalDeletedRows += res.rowCount;
      };
    };

    if (global.websocket) {
      global.websocket.emit('ob_pids-update', { 'pidsList': {'update': totalDeletedRows} });
    };

    return {
      success: totalDeletedRows > 0
    };

  } catch (error) {
    logger.info('observer/pidsService.js, removePIDS, error: ', error);
    console.log('observer/pidsService.js, removePIDS, error: ', error);
    throw error;
  } finally {
    await client.release();
  };
};

exports.addPIDSEvent = async ({ status = true, id }) => {
  const client = await pool.connect();
  try {
    let binds;
    let query;
    //ex: event type id 35: PIDS 이벤트 감지
    binds = [46]; 
    query = await eventTypeMapper.getEventTypeInfo();
    const eventTypeInfo = await client.query(query, binds);
    if(eventTypeInfo && !eventTypeInfo.rows[0].use_event_type) {
      console.log('지능형 이벤트 검출 비활성화');
      return;
    };

    await client.query('BEGIN');
    binds = [status, id];
    query = pidsMapper.updatePIDSZone();

    const resPidsZone = await client.query(query, binds);
    if(!resPidsZone || !resPidsZone.rows || resPidsZone.rows.length === 0){
      return {
        success: false
      };
    };
    if(resPidsZone.rowCount === 1 && global.websocket){
      global.websocket.emit('ob_pids-update', { 'pidsList': {'update': resPidsZone.rowCount} });
    };

    const { 
      pids_location, 
      outside_idx, 
      inside_idx,
      idx, 
      pids_type, 
      pids_ip, 
      camera_id,
      line_x1,
      line_x2,
      line_y1,
      line_y2
    } =  resPidsZone.rows[0];
    const eventType = eventTypeInfo.rows[0].event_type;
    let eventTypeId = eventTypeInfo.rows[0].event_type_id;
    const mainServiceName = 'origin';
    let deviceName = id;
    let locationInfo = pids_location;
    let severityId = eventTypeInfo.rows[0].severity_id;
    let outsideIdx = outside_idx;
    let insideIdx = inside_idx;
    let deviceIdx = idx;
    let deviceType = pids_type;
    let deviceIp = pids_ip;
    let cameraId = camera_id;

    const topLocation = `${(parseFloat(line_y1) + parseFloat(line_y2)) / 2}`;
    const leftLocation = `${(parseFloat(line_x1) + parseFloat(line_x2)) / 2}`;

    const useSOP = eventTypeInfo.rows[0].use_sop;
    let SOPIdx = eventTypeInfo.rows[0].sop_idx;
    const usePopup = eventTypeInfo.rows[0].use_popup;
    binds = [
      eventType, 
      `${deviceName} ${eventType}`,
      locationInfo,
      eventTypeId,
      mainServiceName,
      severityId,
      SOPIdx,
      outsideIdx,
      insideIdx,
      deviceIdx,
      deviceType,
      deviceName,
      deviceIp,
      cameraId
    ];
    query = pidsMapper.addPIDSEvent();
    let result = await client.query(query, binds);
    await client.query('COMMIT');

    if(!result || !result.rows || result.rows.length === 0){
      return {
        success: false
      };
    };
    const eventIdx = result.rows[0].idx;
    if(useSOP && SOPIdx) {
      global.websocket && global.websocket.emit('ob_events-SOP', {
        SOPEvent: {
          SOPIdx,
          eventName: eventType,
          eventIdx,
          occurDateTime: result.rows[0].event_occurrence_time,
          locationInfo,
          eventTypeId,
          mainServiceName,
          outsideIdx,
          insideIdx,
          severityId,
          eventCameraId: cameraId,
        }
      });
      global.websocket.emit('ob_events-update', { eventList: {'create':result.rows[0]} });
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': result.rowCount } });
      return {
        success: true
      };
    };
    // 팝업 사용
    if(usePopup) {
      global.websocket && global.websocket.emit('ob_events-update', {
        eventPopup: {
          eventIdx,
          eventName: eventType,
          deviceIdx,
          deviceType,
          outsideIdx,
          insideIdx,
          dimensionType: '2d',
          deviceName: deviceName,
          cameraId: cameraId.split(':')[2],
          ipaddress: deviceIp,
          severityId,
          mapImageURL: null,
          topLocation,
          leftLocation,
          mainServiceName,
          vmsName: cameraId.split(':')[1]
        }});
      }
      global.websocket.emit('ob_events-update', { eventList: {'create':result.rows[0]} });
      global.websocket.emit("cm_event_log-update", { eventLog: { 'update': result.rowCount } });
      return {
        success: true
      };
  } catch(error) {
    logger.info('observer/pidsService.js, addPIDSEvent, error: ', error);
    console.log('observer/pidsService.js, addPIDSEvent, error: ', error);
    await client.query('ROLLBACK');
    throw new Error(error.message || 'observer/pidsService.js addPIDSEvent server error')
  } finally {
    await client.release();
  };
};

exports.syncPIDSZoneAlarmStatus = async () => {

  const client = await pool.connect();

  try {

    /**
    이벤트 확인 시 장비 상태 동기화
     */
    const query = `
      UPDATE ob_pids pids
      SET 
        alarm_status = CASE 
          WHEN sub.has_unacknowledged_event THEN true
          ELSE false
        END,
        updated_at = NOW()
      FROM (
        SELECT 
          p.idx AS device_idx,
          EXISTS (
            SELECT 1
            FROM event_log e
            JOIN ob_event_type et ON e.event_type_id = et.id
            WHERE e.device_idx = p.idx
              AND e.is_acknowledge = false
              AND et.use_event_type = true
              AND e.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
          ) AS has_unacknowledged_event
        FROM ob_pids p
      ) sub
      WHERE pids.idx = sub.device_idx
        AND pids.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event
    `;
    
    const result = await client.query(query);

    if(global.websocket && result.rowCount > 0) {
      global.websocket.emit('ob_pids-update', { 'pidsList': {'update': result.rowCount} });
    };
  } catch (error) {
    logger.info('observer/pidsService.js, syncPIDSZoneAlarmStatus, error: ', error);
    console.log('observer/pidsService.js, syncPIDSZoneAlarmStatus, error: ', error);
    throw new Error(error.message || 'observer/pidsService.js, syncPIDSZoneAlarmStatus, error');
  } finally {
    await client.release();
  };
};