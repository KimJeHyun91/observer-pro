const { pool } = require('../../../db/postgresqlPool');
const logger = require('../../../logger');
const deviceMapper = require('../mappers/deviceMapper');

exports.modifyDeviceAlarmStatusEvent = async ({ idx }) => {
  
  const client = await pool.connect();

  try {

    const deviceIdx = idx;

    let binds = [deviceIdx];
    let query = await deviceMapper.modifyDeviceAlarmStatusEvent();
    const res = await client.query(query, binds);

    if (res && res.rowCount > 0) {
      if (global.websocket) {
        global.websocket.emit("ob_deviceList-update", { deviceList: { 'update': res.rows.length } });
      }
    }

  } catch (error) {
    logger.info('observer/deviceService.js, modifyDeviceAlarmStatusEvent, error: ', error);
    console.log('observer/deviceService.js, modifyDeviceAlarmStatusEvent, error: ', error);
  } finally {
    await client.release();
  };
};

exports.syncDeviceAlarmStatus = async () => {

  const client = await pool.connect();

  try {

    /**
    이벤트 확인 시 장비 상태 동기화
     */
    let queryDevice = `
      UPDATE ob_device device
      SET 
        alarm_status = CASE 
          WHEN sub.has_unacknowledged_event THEN true
          ELSE false
        END,
        updated_at = NOW()
      FROM (
        SELECT 
          d.idx AS device_idx,
          EXISTS (
            SELECT 1
            FROM event_log e
            JOIN ob_event_type et ON e.event_type_id = et.id
            WHERE e.device_idx = d.idx
              AND e.is_acknowledge = false
              AND et.use_event_type = true
              AND e.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
          ) AS has_unacknowledged_event
        FROM ob_device d
      ) sub
      WHERE device.idx = sub.device_idx
        AND device.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event
      RETURNING device_type
    `;
    
    const resultDevice = await client.query(queryDevice);

    if(global.websocket && resultDevice.rowCount > 0) {
      updateDeviceAlarmStatus(resultDevice.rows[0].device_type, resultDevice.rowCount);
    };
    
    function updateDeviceAlarmStatus(deviceType, rowCount) {
      switch(deviceType){
        case 'door':
          return global.websocket.emit('ob_doors-update', { doorList: {'update':rowCount} });
          break;
        case 'ebell':
          return global.websocket.emit('ob_ebells-update', { ebellList: {'update':rowCount} });
          break;
        default:
          throw new Error(`unKnown deviceType error: ${deviceType}`);
          break;
      }
    }
  } catch (error) {
    logger.info('observer/deviceService.js, syncDeviceAlarmStatus, error: ', error);
    console.log('observer/deviceService.js, syncDeviceAlarmStatus, error: ', error);
    throw new Error(error.message || 'observer/deviceService.js, syncDeviceAlarmStatus, error');
  } finally {
    await client.release();
  };
};