const { pool } = require('../../db/postgresqlPool');
const logger = require('../../logger');

exports.buildingFloorAlarmStatus = async() => {

  const client = await pool.connect();

  try {

    
    /**
     * 빌딩에 이벤트 발생했는지 확인
     * service type 활성화 여부 확인
     * event type 활성화 여부 확인
     * 값이 있으면 true 로 업데이트
     */
    let queryOutside = `
    UPDATE ob_outside outside
    SET 
      alarm_status = CASE 
        WHEN sub.has_unacknowledged_event THEN true
        ELSE false
      END,
      updated_at = CASE
        WHEN outside.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event THEN NOW()
        ELSE outside.updated_at
      END
    FROM (
      SELECT
          o.idx AS outside_idx,
          EXISTS (
            SELECT 1
            FROM event_log e
            JOIN ob_event_type et ON e.event_type_id = et.id
            WHERE e.is_acknowledge = false
              AND et.use_event_type = true
              AND e.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
              AND o.idx = e.outside_idx
          ) AS has_unacknowledged_event
        FROM ob_outside o
    ) sub
    WHERE
      sub.outside_idx = outside.idx
      AND outside.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event;
    `;
    
    const resOutside = await client.query(queryOutside);

    /**
     * 층에 이벤트 발생했는지 확인
     * service type 활성화 여부 확인
     * event type 활성화 여부 확인
     * 값이 있으면 true 로 업데이트
     */
    let queryInside = `
    UPDATE ob_inside inside
    SET 
      alarm_status = CASE 
        WHEN sub.has_unacknowledged_event THEN true
        ELSE false
      END,
      updated_at = CASE 
        WHEN inside.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event THEN NOW()
        ELSE inside.updated_at
      END
    FROM (
      SELECT 
          i.idx AS inside_idx,
          EXISTS (
            SELECT 1
            FROM event_log e
            JOIN ob_event_type et ON e.event_type_id = et.id
            WHERE e.is_acknowledge = false
              AND et.use_event_type = true
              AND e.event_occurrence_time > TO_CHAR((NOW() - INTERVAL '1 day'), 'YYYYMMDD') || 'T' || TO_CHAR((NOW() - INTERVAL '1 day'), 'HH24MISS')
              AND i.idx = e.inside_idx
          ) AS has_unacknowledged_event
        FROM ob_inside i
    ) sub
    WHERE
      sub.inside_idx = inside.idx
      AND inside.alarm_status IS DISTINCT FROM sub.has_unacknowledged_event;
    `;

    const resInside = await client.query(queryInside);

    await client.query('COMMIT');
    if(!global.websocket){
      return;
    }

    // 건물 알람상태가 true 로 변경될 경우
    if(resOutside && resOutside.rowCount > 0) {
      global.websocket.emit("ob_buildings-update", { buildings: { 'update': resOutside.rowCount }});
    }
    
    // 층 알람상태가 true 로 변경될 경우
    if(resInside && resInside.rowCount > 0) {
      global.websocket.emit("ob_floors-update", { floorList: { 'update': resInside.rowCount }});
    }
    
  } catch (error) {
    logger.info('worker/pollings/observerPolling.js, buildingFloorAlarmStatus, error: ', error);
    console.log('worker/pollings/observerPolling.js, buildingFloorAlarmStatus, error: ', error);
    await client.query('ROLLBACK');
  } finally {
    await client.release();
  }
}