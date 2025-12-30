const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');


exports.buildingFloorAlarmStatus = async() => {

  const client = await pool.connect();

  try {

    // 빌딩 알람 상태 초기화
    await client.query('BEGIN');
    let queryOutsideInit = `
    UPDATE pm_outside 
    SET 
      alarm_status = false
    `;
    await client.query(queryOutsideInit);

    /**
     * 빌딩에 이벤트 발생했는지 확인
     * service type 활성화 여부 확인
     * event type 활성화 여부 확인
     * 값이 있으면 true 로 업데이트
     */
    let queryOutside = `
    UPDATE pm_outside outside
    SET 
      alarm_status = true
      , updated_at = NOW()
    FROM (
      (
        SELECT camera.outside_idx
        FROM
          pm_event event
        JOIN
          ob_camera camera
        ON
          event.camera_id = 'concat(camera.main_service_name,:,camera.vms_name,:,camera.camera_id)'
        JOIN 
          ob_service_type service_type
        ON 
          camera.service_type = service_type.service_type
        JOIN 
          ob_event_type event_type
        ON 
          service_type.service_type = event_type.service_type
        WHERE
          event.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
        AND
          event.is_acknowledge = false
        AND
          camera.outside_idx > 0
        AND
          service_type.use_service_type = true
        AND
          event_type.use_event_type = true
        AND
          camera.main_service_name = 'parking'
        GROUP BY
          camera.outside_idx
      )
    ) sub
    WHERE
      sub.outside_idx = outside.idx;
    `;
    
    const resOutside = await client.query(queryOutside);

    // 층 알람 상태 초기화
    let queryInsideInit = `
    UPDATE pm_inside 
    SET 
      alarm_status = false
    `;
    await client.query(queryInsideInit);

    /**
     * 층에 이벤트 발생했는지 확인
     * service type 활성화 여부 확인
     * event type 활성화 여부 확인
     * 값이 있으면 true 로 업데이트
     */
    let queryInside = `
    UPDATE pm_inside inside
    SET 
      alarm_status = true
      , updated_at = NOW()
    FROM (
      (
        SELECT camera.outside_idx, camera.inside_idx
        FROM
          pm_event event
        JOIN
          ob_camera camera
        ON
          event.camera_id = 'concat(camera.main_service_name,:,camera.vms_name,:,camera.camera_id)'
         JOIN 
          ob_service_type service_type
        ON 
          camera.service_type = service_type.service_type
        JOIN 
          ob_event_type event_type
        ON 
          service_type.service_type = event_type.service_type
        WHERE
          event.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
        AND
          event.is_acknowledge = false
        AND
          camera.inside_idx > 0
        AND
          service_type.use_service_type = true
        AND
          event_type.use_event_type = true
        AND
          camera.main_service_name = 'parking'
        GROUP BY
          camera.outside_idx
          , camera.inside_idx
      )
    ) sub
    WHERE
      sub.outside_idx = inside.outside_idx
    AND 
      sub.inside_idx = inside.idx;
    `;

    const resInside = await client.query(queryInside);

    await client.query('COMMIT');
    
    if(global.websocket) {
      
      // 건물 알람상태가 true 로 변경될 경우
      if(resOutside && resOutside.rowCount > 0) {
        global.websocket.emit("pm_buildings-update", { buildings: { 'update': resOutside.rowCount } });
      }
      
      // 층 알람상태가 true 로 변경될 경우
      if(resInside && resInside.rowCount > 0) {
        global.websocket.emit("pm_floors-update", { floorList: { 'update': resInside.rowCount } });
      }
    }

  } catch (error) {
    logger.info('worker/parking/buildingFloorPolling.js, buildingFloorAlarmStatus, error: ', error);
    console.log('worker/parking/buildingFloorPolling.js, buildingFloorAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}