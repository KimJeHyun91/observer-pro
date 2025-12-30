exports.addVmsEvent = async () => {
  
  let query = `
  INSERT INTO fl_event (
    event_name
    , description
    , event_type_id
    , service_type
    , event_occurrence_time
    , severity_id
    , camera_idx
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7
  ) RETURNING idx;
  `;

  return query;
}

exports.getEventInfo = async () => {
  
  let query = `
  SELECT 
    event.idx AS event_idx
    , event.event_name
    , event.description AS event_description
    , event.event_occurrence_time
    , event.event_end_time
    , event.is_acknowledge
    , event.acknowledge_user
    , event.acknowledged_at
    , event.snapshot_path AS event_snapshot_path
    , event_type.id AS event_type_id
    , event_type.event_type
    , event_type.use_warning_board
    , event_type.use_popup
    , event_type.use_event_type
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
    , outside.crossing_gate_ip
    , outside.crossing_gate_status
    , outside.left_location AS outside_left_location
    , outside.top_location AS outside_top_location
    , water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.water_level_ip
    , water_level.water_level_port
    , water_level.water_level_id
    , water_level.water_level_pw
    , water_level.curr_water_level
    , water_level.threshold
    , water_level.left_location AS water_level_left_location
    , water_level.top_location AS water_level_top_location	
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.left_location AS camera_left_location
    , camera.top_location AS camera_top_location
    , camera.access_point AS camera_access_point
    , camera.service_type AS camera_service_type
  FROM (
    (SELECT * FROM fl_event) event
    LEFT JOIN 
    (SELECT * FROM fl_event_type) event_type
    ON
      event.event_type_id = event_type.id
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event.severity_id = severity.id
    LEFT JOIN
    (SELECT * FROM fl_outside) outside
    ON
      event.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM fl_water_level_outside) water_level_outside
    ON
      outside.idx = water_level_outside.outside_idx
    LEFT JOIN
    (SELECT * FROM fl_water_level) water_level
    ON
      water_level_outside.water_level_idx = water_level.idx
    LEFT JOIN
    (SELECT * FROM ob_camera WHERE main_service_name = 'inundation') camera
    ON
		event.camera_idx = camera.idx
  )
WHERE
	event.idx = $1;
  `;

  return query;
}

exports.modifySnapShotPathEvent = async () => {
  
  let query = `
  UPDATE 
    fl_event 
  SET 
    snapshot_path = $2
  WHERE 
    idx = $1; 
  `;

  return query;
}