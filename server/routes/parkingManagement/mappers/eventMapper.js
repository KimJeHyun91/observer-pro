exports.getLatestEventOutsideInfo = async () => {
  
  let query = `
  SELECT 
    event.idx AS event_idx
    , event.event_name
    , event.description
    , event.service_type 
    , event.event_occurrence_time
    , event.event_end_time
    , event.is_acknowledge
    , event.acknowledge_user
    , event.acknowledged_at
    , event.snapshot_path AS event_snapshot_path
    , event_type.id AS event_type_id
    , event_type.event_type AS event_type
    , event_type.use_warning_board
    , event_type.use_popup
    , event_type.use_event_type
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.alarm_status AS outside_alarm_status
    , inside.idx AS inside_idx
    , inside.inside_name
    , inside.alarm_status AS inside_alarm_status
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color AS severity_color
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.alarm_status AS camera_alarm_status
    , device.idx AS device_idx
    , device.device_ip
    , device.device_port
    , device.device_no16
    , device.device_type
    , device.use_status AS device_use_status
    , device.linked_status AS device_linked_status
    , area.idx AS area_idx
    , area.area_name
    , area.use_area
  FROM (
    (SELECT * FROM
      pm_event 
    WHERE
      outside_idx = $1
    ORDER BY
      idx DESC
    LIMIT 1
    ) event
    LEFT JOIN
    (SELECT * FROM pm_event_type) event_type
    ON
      event.event_type_id = event_type.id
    LEFT JOIN
    (SELECT * FROM pm_outside) outside
    ON
      event.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM pm_inside) inside
    ON
      event.inside_idx = inside.idx
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event.severity_id = severity.id
    LEFT JOIN
    (SELECT * FROM ob_camera) camera
    ON
      event.camera_id = 'concat(camera.main_service_name,:,camera.vms_name,:,camera.camera_id)'
    LEFT JOIN
    (SELECT * FROM pm_device) device
    ON
      event.device_idx = device.idx
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      device.idx = area.device_idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  );
  `;

  return query;
}

exports.getLatestEventInsideInfo = async () => {
  
  let query = `
  SELECT 
    event.idx AS event_idx
    , event.event_name
    , event.description
    , event.service_type 
    , event.event_occurrence_time
    , event.event_end_time
    , event.is_acknowledge
    , event.acknowledge_user
    , event.acknowledged_at
    , event.snapshot_path AS event_snapshot_path
    , event_type.id AS event_type_id
    , event_type.event_type AS event_type
    , event_type.use_warning_board
    , event_type.use_popup
    , event_type.use_event_type
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.alarm_status AS outside_alarm_status
    , inside.idx AS inside_idx
    , inside.inside_name
    , inside.alarm_status AS inside_alarm_status
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color AS severity_color
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.alarm_status AS camera_alarm_status
    , device.idx AS device_idx
    , device.user_id
    , device.user_pw
    , device.device_ip
    , device.device_port
    , device.device_no16
    , device.device_type
    , device.use_status AS device_use_status
    , device.linked_status AS device_linked_status
    , area.idx AS area_idx
    , area.area_name
    , area.use_area
  FROM (
    (SELECT * FROM 
      pm_event 
    WHERE
      outside_idx = $1
    AND
      inside_idx = $2
    ORDER BY
      idx DESC
    LIMIT 1
    ) event
    LEFT JOIN
    (SELECT * FROM pm_event_type) event_type
    ON
      event.event_type_id = event_type.id
    LEFT JOIN
    (SELECT * FROM pm_outside) outside
    ON
      event.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM pm_inside) inside
    ON
      event.inside_idx = inside.idx
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event.severity_id = severity.id
    LEFT JOIN
    (SELECT * FROM ob_camera) camera
    ON
      event.camera_id = 'concat(camera.main_service_name,:,camera.vms_name,:,camera.camera_id)'
    LEFT JOIN
    (SELECT * FROM pm_device) device
    ON
      event.device_idx = device.idx
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      device.idx = area.device_idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  );
  `;

  return query;
}