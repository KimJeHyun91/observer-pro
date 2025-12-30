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
    , event.sop_detection
    , event.sop_msg
    , event.snapshot_path AS event_snapshot_path
    , event_type.id AS event_type_id
    , event_type.event_type
    , event_type.use_warning_board
    , event_type.use_popup
    , event_type.use_event_type
    , service_type.service_type
    , service_type.service_type_kr
    , service_type.service_type_image
    , service_type.use_service_type
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.left_location AS outside_left_location
    , outside.top_location AS outside_top_location
    , inside.idx AS inside_idx
    , inside.inside_name
    , inside.map_image_url AS inside_map_image_url
    , device.idx AS device_idx
    , device.device_id
    , device.device_name
    , device.device_ip
    , device.device_type
    , device.device_location
    , device.left_location AS device_left_location
    , device.top_location AS device_top_location
    , device.service_type AS device_service_type
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
    (SELECT * FROM event_log) event
    LEFT JOIN 
    (SELECT * FROM ob_event_type) event_type
    ON
      event.event_type_id = event_type.id
    LEFT JOIN
    (SELECT * FROM ob_service_type) service_type
    ON
      event.service_type = service_type.service_type
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event.severity_id = severity.id
    LEFT JOIN 
    (SELECT * FROM ob_outside) outside
    ON
      event.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM ob_inside) inside
    ON
      event.inside_idx = inside.idx
    LEFT JOIN 
    (SELECT * FROM ob_device) device
    ON
      event.device_idx = device.idx
    LEFT JOIN
    (SELECT * FROM ob_camera) camera
    ON
      event.camera_idx = camera.idx
  )
  WHERE
	  event.idx = $1;
  `;

  return query;
}

exports.getEventsGroupByImportance = async (outsideIdx) => {
  if(outsideIdx == null){
    return `
      SELECT 
        severity_id, COUNT(*) severity_per_count
      FROM 
        event_log
      WHERE
        event_occurrence_time >= $1
      AND
        event_occurrence_time <= $2
      AND
        main_service_name = $3
      GROUP BY severity_id
      `;
  } else {
    return `
    SELECT 
      severity_id, COUNT(*) severity_per_count
    FROM 
      event_log
    WHERE
      event_occurrence_time >= $1
    AND
      event_occurrence_time <= $2
    AND
      main_service_name = $3
    AND
      outside_idx = $4
    GROUP BY severity_id
    `;
  };
};

exports.getEventsGroupByAck = async (outsideIdx) => {
  if(outsideIdx == null){
    return `
      SELECT 
        is_acknowledge, COUNT(*) ack_per_count
      FROM 
        event_log
      WHERE
        event_occurrence_time >= $1
      AND
        event_occurrence_time <= $2
      AND
        main_service_name = $3
      GROUP BY is_acknowledge
      `;
  } else {
    return `
    SELECT 
      is_acknowledge, COUNT(*) ack_per_count
    FROM 
      event_log
    WHERE
      event_occurrence_time >= $1
    AND
      event_occurrence_time <= $2
    AND
      main_service_name = $3
    AND
      outside_idx = $4
    GROUP BY is_acknowledge
    `;
  };
};

exports.getEventsGroupBySOP = async () => {
  return `SELECT
    CASE 
        WHEN false_alarm_idx IS NULL THEN 'NULL'
        ELSE 'NOT NULL'
    END AS false_alarm_group,
    COUNT(*) AS count
  FROM event_log
  WHERE 
    sop_idx IS NOT NULL
  AND
    event_occurrence_time >= $1
  AND
    event_occurrence_time <= $2
  AND
    main_service_name = $3
  AND
    is_acknowledge = TRUE
  GROUP BY false_alarm_group
  ORDER BY false_alarm_group;`
};

exports.getEventsGroupByDeviceDashboard = async () => {
  return `SELECT 
      device_type, COUNT(*) device_type_per_count
    FROM 
      event_log event
    WHERE
      event_occurrence_time >= $1
    AND
      event_occurrence_time <= $2
    AND
      main_service_name = $3
    GROUP BY device_type`;
};

exports.getEventsGroupByDevice = async () => {
  return `SELECT 
      device_type, COUNT(*) device_type_per_count
    FROM 
      event_log event
    WHERE
      event_occurrence_time >= $1
    AND
      event_occurrence_time <= $2
    AND
      main_service_name = $3
    AND
      outside_idx = $4
    GROUP BY device_type
  `;
};

exports.getEventsGroupByEventName = async () => {
  const query = `
    SELECT 
      event_name, COUNT(*) event_name_per_count
    FROM 
      event_log
    WHERE
      event_occurrence_time >= $1
    AND
      event_occurrence_time <= $2
    AND
      main_service_name = $3
    GROUP BY event_name
    `;
  return query;
};

exports.getEventListBySeverityId = async (filter, outsideIdx) => {
  let condition = "WHERE main_service_name='origin'";
  if(filter === 'unAck'){
    condition += " AND is_acknowledge=FALSE"
  };
  if(outsideIdx != null){
    condition += ` AND event.outside_idx=${outsideIdx}`;
  };
  let query = `
    SELECT 
      event.idx,
      event_name,
      description,
      location,
      event_idx,
      event_type_id,
      main_service_name,
      event_occurrence_time,
      event_end_time,
      event.severity_id,
      is_acknowledge,
      acknowledge_user,
      acknowledged_at,
      use_sop,
      event.sop_idx,
      false_alarm_idx,
      connection,
      event.outside_idx,
      event.inside_idx,
      inside.map_image_url,
      device_type,
      device_name,
      device_ip,
      camera_id
    FROM
      event_log event
    LEFT OUTER JOIN
      ob_inside inside
    ON 
      event.inside_idx = inside.idx
    LEFT JOIN 
      ob_event_type event_type
    ON
      event.event_type_id = event_type.id
    ${condition}
    ORDER BY
      severity_id
    DESC,
      event.created_at
    DESC
    LIMIT 200
    `;
  return query;
};

exports.getEventListByLatest = async (filter, outsideIdx) => {
  let condition = "WHERE main_service_name='origin'";
  if(filter === 'unAck'){
    condition += " AND is_acknowledge=FALSE"
  };
  if(outsideIdx != null){
    condition += ` AND event.outside_idx=${outsideIdx}`;
  };
  let query = `
    SELECT 
      event.idx,
      event_name,
      description,
      location,
      event_idx,
      event_type_id,
      main_service_name,
      event_occurrence_time,
      event_end_time,
      event.severity_id,
      is_acknowledge,
      acknowledge_user,
      acknowledged_at,
      use_sop,
      event.sop_idx,
      false_alarm_idx,
      connection,
      event.outside_idx,
      event.inside_idx,
      inside.map_image_url,
      device_type,
      device_name,
      device_ip,
      camera_id
    FROM
      event_log event
    LEFT OUTER JOIN
      ob_inside inside
    ON 
      event.inside_idx = inside.idx
    LEFT JOIN 
      ob_event_type event_type
    ON
      event.event_type_id = event_type.id
    ${condition}
    ORDER BY
      event.created_At
    DESC,
      severity_id
    DESC
    LIMIT 200
    `;
  return query;
};

exports.ackEvents = async () => {
  let query = `
  UPDATE 
    event_log 
  SET 
    is_acknowledge = TRUE,
    acknowledge_user = $1,
    acknowledged_at = $2,
    is_clear_sop_stage = $5
  WHERE 
    (idx) IN (
        SELECT * FROM UNNEST($3::int[])
    )
    AND main_service_name=$4
  RETURNING device_type;
`;
  return query;
};

exports.ackEventSOPFalseAlarm = async () => {
  let query = `
  UPDATE 
    event_log 
  SET 
    is_acknowledge = TRUE,
    acknowledge_user = $1,
    acknowledged_at = $2,
    false_alarm_idx = $4,
    is_clear_sop_stage = NULL
  WHERE 
    (idx) IN (
        SELECT * FROM UNNEST($3::int[])
    )
    AND main_service_name=$5
  RETURNING device_type;
`;
  return query;
};

exports.ackEventsInBuilding = async () => {
  let query = `
    UPDATE 
      event_log 
    SET 
      is_acknowledge = TRUE,
      acknowledge_user = $1,
      acknowledged_at = $2
    WHERE 
      (idx) IN (
          SELECT * FROM UNNEST($3::int[])
      ) 
      AND main_service_name=$5
      AND outside_idx=$4
    RETURNING device_type
  `;
  return query;
};

exports.searchEvents = async ({ 
  eventName, 
  severityId,
  location, 
  startDate,
  startTime, 
  endDate,
  endTime, 
  deviceType,
  deviceName,
  deviceIp,
  isAck
}) => {
  const conditions = [];
  const binds = [];
  let index = 1;

  if (eventName) {
    conditions.push(`event_name = $${index++}`);
    binds.push(eventName);
  }

  if (severityId != null) {
    conditions.push(`severity_id = $${index++}`);
    binds.push(severityId);
  }

  if (startDate) {
    conditions.push(`event_occurrence_time >= $${index++}`);
    binds.push(startDate);
  }

  if (endDate) {
    conditions.push(`event_occurrence_time <= $${index++}`);
    binds.push(endTime === '' ? `${endDate}T235900`:`${endDate}T${endTime}`);
  }

  if (startTime) {
    conditions.push(`RIGHT(event_occurrence_time, 6) >= $${index++}`);
    binds.push(startTime);
  }

  if (endTime) {
    conditions.push(`RIGHT(event_occurrence_time, 6) <= $${index++}`);
    binds.push(endTime);
  }

  if (location) {
    conditions.push(`location = $${index++}`);
    binds.push(location);
  }

  if (deviceType) {
    conditions.push(`device_type = $${index++}`);
    binds.push(deviceType);
  }

  if (deviceName) {
    conditions.push(`device_name = $${index++}`);
    binds.push(deviceName);
  }

  if (deviceIp) {
    conditions.push(`device_ip = $${index++}`);
    binds.push(deviceIp);
  }

  if (isAck != null) {
    conditions.push(`is_acknowledge = $${index++}`);
    binds.push(isAck);
  }
  // 기본 조건은 항상 들어감
  conditions.push(`main_service_name = $${index}`);
  binds.push('origin');

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      idx,
      event_name,
      description,
      location,
      event_idx,
      event_type_id,
      main_service_name,
      event_occurrence_time,
      event_end_time,
      severity_id,
      is_acknowledge,
      acknowledge_user,
      acknowledged_at,
      sop_idx,
      false_alarm_idx,
      connection,
      device_type,
      device_name,
      device_ip,
      camera_id
    FROM
      event_log
    ${whereClause}
    ORDER BY
      created_at
    DESC
  `;
  return { query, binds };
};

exports.searchEventsBySOP = async ({ 
  eventName, 
  isTruePositive, 
  location,
  startDate,
  startTime, 
  endDate,
  endTime, 
}) => {
  const conditions = [];
  const binds = [];
  let index = 1;

  if (eventName) {
    conditions.push(`event_name = $${index++}`);
    binds.push(eventName);
  }

  if (isTruePositive != null) {
    if(isTruePositive){
      conditions.push('false_alarm_idx IS NOT NULL');
    } else {
      conditions.push('false_alarm_idx IS NULL');
    }
  }

  if (startDate) {
    conditions.push(`event_occurrence_time >= $${index++}`);
    binds.push(startDate);
  }

  if (endDate) {
    conditions.push(`event_occurrence_time <= $${index++}`);
    binds.push(endTime === '' ? `${endDate}T235900`:`${endDate}T${endTime}`);
  }

  if (startTime) {
    conditions.push(`RIGHT(event_occurrence_time, 6) >= $${index++}`);
    binds.push(startTime);
  }

  if (endTime) {
    conditions.push(`RIGHT(event_occurrence_time, 6) <= $${index++}`);
    binds.push(endTime);
  }

  if (location) {
    conditions.push(`location = $${index++}`);
    binds.push(location);
  }

  // 기본 조건은 항상 들어감
  conditions.push(`main_service_name = $${index}`);
  binds.push('origin');

  const whereClause = conditions.length ? `WHERE is_acknowledge=TRUE AND sop_idx IS NOT NULL AND ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      idx AS event_idx,
      event_name,
      location,
      main_service_name,
      event_occurrence_time,
      event_end_time,
      acknowledge_user,
      acknowledged_at,
      sop_idx,
      false_alarm_idx,
      is_clear_sop_stage,
      camera_id
    FROM
      event_log
    ${whereClause}
    ORDER BY
      created_at
    DESC
  `;
  return { query, binds };
};


exports.findEventsByIdx = async () => {
  const query = `
    SELECT
      event_name,
      s.sop_name,
      event_occurrence_time,
      location,
      acknowledge_user,
      acknowledged_at,
      sop_idx,
      false_alarm_idx,
      is_clear_sop_stage
    FROM
      event_log event
    LEFT JOIN 
      sop s
    ON
      event.sop_idx = s.idx
    WHERE event.idx=$1
  `;
  return query;
};
