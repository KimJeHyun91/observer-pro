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
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color AS severity_color
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.alarm_status AS camera_alarm_status
    , device.idx AS device_idx
    , device.device_id
    , device.device_ip
    , device.device_name
    , device.device_type
  FROM (
    (SELECT * FROM 
      vb_event 
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
    (SELECT * FROM vb_outside) outside
    ON
      event.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event.severity_id = severity.id
    LEFT JOIN
    (SELECT * FROM ob_camera) camera
    ON
      event.camera_idx = camera.idx
    LEFT JOIN
    (SELECT * FROM vb_device) device
    ON
      event.device_idx = device.idx
  );
  `;

  return query;
}

exports.addEvent = async () => {
  
  let query = `
  INSERT INTO vb_event (
    event_name
    , description
    , event_type_id
    , service_type
    , event_occurrence_time
    , severity_id
    , outside_idx
    , device_idx
    , camera_idx
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
  );
  `;

  return query;
}