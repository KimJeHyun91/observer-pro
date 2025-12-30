exports.addOutside = async () => {

  let query = `
  INSERT INTO fl_outside (
    outside_name
    , location
    , crossing_gate_ip
    , left_location
    , top_location
    , service_type
    , controller_model
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7
  ) RETURNING idx;
  `;

  return query;
}

exports.getOutSideInfo = async () => {

  let query = `
  SELECT 
    outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
    , outside.crossing_gate_ip
    , outside.crossing_gate_status
    , outside.left_location AS outside_left_location
    , outside.top_location AS outside_top_location
    , outside.service_type
    , outside.linked_status AS outside_linked_status
    , outside.alarm_status AS outside_alarm_status
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_name
    , camera.camera_ip
    , speaker.idx AS speaker_idx
    , speaker.speaker_name
    , speaker.speaker_ip
    , speaker.speaker_msg
    , speaker.speaker_id
    . speaker.speaker_password
    , speaker.speaker_status
    , speaker.linked_status AS speaker_linked_status
    , billboard.idx AS billboard_idx
    , billboard.billboard_name
    , billboard.billboard_ip
    , billboard.billboard_msg
    , billboard.billboard_color
    , billboard.billboard_status
    , billboard.billboard_controller_model
    , billboard.linked_status AS billboard_linked_status
    , signboard.idx AS signboard_idx
    , signboard.signboard_name
    , signboard.signboard_ip
    , signboard.signboard_status
    , signboard.signboard_controller_model
    , signboard.linked_status AS signboard_linked_status
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
    , water_level.linked_status AS water_level_linked_status
    , water_level.use_status
    , guardianlite.guardianlite_ip
    , guardianlite.guardianlite_name
    , guardianlite.linked_status AS guardianlite_linked_status
    , guardianlite.user_id
    , guardianlite.user_pw
    , guardianlite.ch1
    , guardianlite.ch2
    , guardianlite.ch3
    , guardianlite.ch4
    , guardianlite.ch5
    , guardianlite.ch6
    , guardianlite.ch7
    , guardianlite.ch8
    , guardianlite.temper
    , guardianlite.ch1_label
    , guardianlite.ch2_label
    , guardianlite.ch3_label
    , guardianlite.ch4_label
    , guardianlite.ch5_label
    , guardianlite.ch6_label
    , guardianlite.ch7_label
    , guardianlite.ch8_label
  FROM (
    (SELECT * FROM fl_outside) outside
    LEFT JOIN
    (SELECT * FROM ob_camera WHERE main_service_name = 'inundation') camera
    ON
      outside.idx = camera.outside_idx
    LEFT JOIN
    (SELECT * FROM fl_speaker) speaker
    ON
      outside.idx = speaker.outside_idx
    LEFT JOIN
    (SELECT * FROM fl_billboard) billboard
    ON
      outside.idx = billboard.outside_idx
    LEFT JOIN
     (SELECT * FROM fl_signboard) signboard
    ON
      outside.idx = signboard.outside_idx
    LEFT JOIN
    (SELECT * FROM fl_outside_water_level) outside_water_level
    ON
      outside.idx = outside_water_level.outside_idx
    LEFT JOIN
    (SELECT * FROM fl_water_level) water_level
    ON
      outside_water_level.water_level_idx = water_level.idx
    LEFT JOIN
    (SELECT * FROM fl_guardianlite) guardianlite
    ON
      outside.idx = guardianlite.outside_idx
  )
  WHERE 
    outside.idx = $1;
  `;

  return query;
}

exports.getOutSideList = async () => {
  let query = `
  SELECT DISTINCT
    outside.idx AS outside_idx,
    outside.outside_name,
    outside.location AS outside_location,
    outside.crossing_gate_ip,
    outside.crossing_gate_status,
    outside.left_location AS outside_left_location,
    outside.top_location AS outside_top_location,
    outside.linked_status AS outside_linked_status,
    outside.service_type,
    outside.controller_model,

    camera.idx AS camera_idx,
    camera.camera_id,
    camera.vms_name,
    camera.camera_name,
    camera.camera_ip,
    camera.camera_angle,
    camera.left_location AS camera_left_location,
    camera.top_location AS camera_top_location,
    camera.linked_status AS camera_linked_status,

    speaker.idx AS speaker_idx,
    speaker.speaker_name,
    speaker.speaker_ip,
    speaker.speaker_port,
    speaker.speaker_msg,
    speaker.speaker_status,
    speaker.speaker_id,
    speaker.speaker_password,
    speaker.speaker_type,
    speaker.linked_status AS speaker_linked_status,

    billboard.idx AS billboard_idx,
    billboard.billboard_name,
    billboard.billboard_ip,
    billboard.billboard_port,
    billboard.billboard_msg,
    billboard.billboard_color,
    billboard.billboard_status,
    billboard.billboard_controller_model,
    billboard.linked_status AS billboard_linked_status,

    signboard.idx AS signboard_idx,
    signboard.signboard_name,
    signboard.signboard_ip,
    signboard.signboard_port,
    signboard.signboard_status,
    signboard.signboard_controller_model,
    signboard.linked_status AS signboard_linked_status,

    guardianlite.guardianlite_ip,
    guardianlite.guardianlite_name,
    guardianlite.linked_status AS guardianlite_linked_status,
    guardianlite.user_id,
    guardianlite.user_pw,
    guardianlite.ch1,
    guardianlite.ch2,
    guardianlite.ch3,
    guardianlite.ch4,
    guardianlite.ch5,
    guardianlite.ch6,
    guardianlite.ch7,
    guardianlite.ch8,
    guardianlite.temper,
    guardianlite.ch1_label,
    guardianlite.ch2_label,
    guardianlite.ch3_label,
    guardianlite.ch4_label,
    guardianlite.ch5_label,
    guardianlite.ch6_label,
    guardianlite.ch7_label,
    guardianlite.ch8_label

  FROM fl_outside AS outside
  LEFT JOIN (
    SELECT DISTINCT ON (outside_idx) 
      outside_idx,
      camera_id,
      vms_name,
      main_service_name
    FROM camera_outside_mapping
    ORDER BY outside_idx, camera_id
  ) AS mapping ON outside.idx = mapping.outside_idx
  LEFT JOIN ob_camera AS camera
    ON camera.camera_id = mapping.camera_id 
    AND camera.vms_name = mapping.vms_name 
    AND camera.main_service_name = mapping.main_service_name
    AND camera.main_service_name = 'inundation'

  LEFT JOIN fl_speaker AS speaker
    ON outside.idx = speaker.outside_idx

  LEFT JOIN fl_billboard AS billboard
    ON outside.idx = billboard.outside_idx

  LEFT JOIN fl_signboard AS signboard
    ON outside.idx = signboard.outside_idx

  LEFT JOIN fl_guardianlite AS guardianlite
    ON outside.idx = guardianlite.outside_idx

  ORDER BY outside.outside_name ASC;
  `;

  return query;
}


exports.getCrossingGateIpInfo = async () => {

  let query = `
  SELECT 
    idx
    , outside_name
    , location
    , crossing_gate_ip
    , crossing_gate_status
    , left_location
    , top_location
    , service_type
    , linked_status
    , alarm_status
  FROM
    fl_outside
  WHERE
    crossing_gate_ip = $1;
  `;

  return query;
}

exports.updateOutside = async () => {
  return `
    UPDATE fl_outside 
    SET 
      outside_name = $1,
      location = $2,
      crossing_gate_ip = $3,
      service_type = $4,
      controller_model = $6
    WHERE idx = $5
    RETURNING *;
  `;
};

exports.deleteOutsidePrevCamera = async () => {
  return `
    UPDATE ob_camera
    SET outside_idx = NULL, water_level_idx = NULL
    WHERE outside_idx = $1
  `;
};

exports.updateOutsideCamera = async () => {
  return `
    UPDATE ob_camera
    SET outside_idx = $2
    WHERE camera_ip = $1
    RETURNING *;
  `;
};

exports.addSpeaker = async () => {
  return `
    INSERT INTO fl_speaker (
      outside_idx,
      speaker_ip,
      speaker_msg,
      speaker_status
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *;
  `;
};

exports.updateOutsideSpeaker = async () => {
  return `
    UPDATE fl_speaker
    SET speaker_ip = $1
    WHERE outside_idx = $2
    RETURNING *;
  `;
};

exports.addBillboard = async () => {
  return `
    INSERT INTO fl_billboard (
      outside_idx,
      billboard_ip,
      billboard_msg,
      billboard_status
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *;
  `;
};

exports.updateOutsideBillboard = async () => {
  return `
    UPDATE fl_billboard
    SET billboard_ip = $1
    WHERE outside_idx = $2
    RETURNING *;
  `;
};

exports.addGuardianlite = async () => {
  return `
    INSERT INTO fl_guardianlite (
      outside_idx,
      guardianlite_ip,
      guardianlite_name
    ) VALUES (
      $1, $2, $3
    ) RETURNING *;
  `;
};

exports.updateOutsideGuardianlite = async () => {
  return `
    UPDATE fl_guardianlite
    SET guardianlite_ip = $1
    WHERE outside_idx = $2
    RETURNING *;
  `;
};

exports.addOutsideWaterLevel = async () => {
  return `
    INSERT INTO fl_outside_water_level (
      outside_idx,
      water_level_idx
    ) VALUES (
      $1, $2
    ) RETURNING idx;
  `;
};

exports.getAllAreaGroup = async () => {
  const query = `
    SELECT 
    ag.id,
    ag.name,
    json_agg(
      json_build_object(
        'outside_idx', o.idx,
        'outside_name', o.outside_name,
        'crossing_gate_ip', o.crossing_gate_ip
      )
    ) AS areas
  FROM fl_area_group ag
  LEFT JOIN fl_area_group_mapping agm ON ag.id = agm.group_id
  LEFT JOIN fl_outside o ON agm.area_idx = o.idx
  GROUP BY ag.id, ag.name;
  `;
  return query;
};

exports.deleteOutsideInfo = async () => {

  let query = `
  DELETE FROM
    fl_outside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyLinkedStatusOutside = async () => {

  let query = `
  UPDATE fl_outside
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getLinkedStatusCount = async () => {

  let query = `
    SELECT 
      SUM(linked_status::int) AS connected,
      COUNT(*) - SUM(linked_status::int) AS disconnected
    FROM (
      SELECT linked_status FROM fl_outside
      UNION ALL
      SELECT linked_status FROM fl_billboard
      UNION ALL
      SELECT linked_status FROM fl_speaker
      UNION ALL
      SELECT linked_status FROM fl_water_level
      UNION ALL
      SELECT linked_status FROM ob_camera WHERE main_service_name = 'inundation'
    ) AS all_devices;
  `;
  return query;
}

exports.getWaterLevelOutsideList = async () => {

  let query = `
  SELECT
    outside.idx
    , outside.outside_name
    , outside.location
    , outside.crossing_gate_ip
    , outside.crossing_gate_status
    , outside.left_location
    , outside.top_location
    , outside.service_type
    , outside.linked_status
    , outside.alarm_status
  FROM (
    (SELECT * FROM fl_outside) outside
  LEFT JOIN
  (SELECT * FROM fl_outside_water_level) outside_water_level
  ON
    outside.idx = outside_water_level.outside_idx
  LEFT JOIN
  (SELECT * FROM fl_water_level) water_level
  ON
    outside_water_level.water_level_idx = water_level.idx
  );
  `;

  return query;
}

exports.getUnLinkDeviceList = async () => {

  let query = `
  SELECT * FROM (
    (
      SELECT 
        COALESCE(outside.outside_name, '차단기') AS name
        , COALESCE(outside.location, '') AS location
        , outside.crossing_gate_ip AS ipAddress
        , '차단기' AS device_type
      FROM
        fl_outside AS outside 
      WHERE 
        linked_status = false
    )
    UNION
    (
      SELECT 
        COALESCE(billboard.billboard_name, '전광판') AS name
        , COALESCE(outside.outside_name, '') AS location
        , billboard.billboard_ip AS ipAddress
        , '전광판' AS device_type
      FROM
        fl_billboard AS billboard 
      LEFT JOIN
        fl_outside AS outside
      ON
        billboard.outside_idx = outside.idx
      WHERE 
        billboard.linked_status = false
    )
    UNION
    (
      SELECT 
        COALESCE(speaker.speaker_name, '스피커') AS name
        , COALESCE(outside.outside_name, '') AS location
        , speaker.speaker_ip AS ipAddress
        , '스피커' AS device_type
      FROM
        fl_speaker AS speaker 
      LEFT JOIN
        fl_outside AS outside
      ON
        speaker.outside_idx = outside.idx
      WHERE 
        speaker.linked_status = false
    )
    UNION
    (
      SELECT 
        COALESCE(water_level_name, '수위계') AS name
        , COALESCE(water_level_location, '') AS location
        , water_level_ip AS ipAddress
        , '수위계' AS device_type
      FROM
        fl_water_level
      WHERE
        linked_status = false
    )
    UNION
    (
      SELECT 
        COALESCE(camera.camera_name, '카메라') AS name
        , COALESCE(outside.location, '') AS location
        , camera.camera_ip AS ipAddress
        , '카메라' AS device_type
      FROM
        ob_camera AS camera 
      LEFT JOIN
        fl_outside AS outside
      ON
        camera.outside_idx = outside.idx
      WHERE 
        camera.linked_status = false
      AND
		    camera.main_service_name = 'inundation'
    )
  )
  ORDER BY
    name ASC;
  `;

  return query;
}


exports.getCompactOutSideList = async () => {

  let query = `
  SELECT 
    idx
    , outside_name
    , location
    , crossing_gate_ip
    , crossing_gate_status
    , service_type
    , linked_status
    , alarm_status
  FROM
    fl_outside
  ORDER BY
    outside_name ASC;
  `;

  return query;
}

exports.getWaterLevelOutsideInfo = async () => {
  let query = `
  SELECT
    outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
    , outside.crossing_gate_ip
    , outside.crossing_gate_status
    , water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.water_level_ip
    , water_level.water_level_port
    , water_level.water_level_id
    , water_level.water_level_pw
    , water_level.curr_water_level
    , water_level.water_level_model
    , water_level.threshold
    , water_level.left_location AS water_level_left_location
    , water_level.top_location AS water_level_top_location
    , water_level.linked_status AS water_level_linked_status
    , water_level.use_status AS water_level_use_status
    , water_level.alarm_status AS water_level_alarm_status
    , camera.camera_name
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.service_type
    FROM (
        (SELECT * FROM fl_water_level) water_level
        LEFT JOIN
        (SELECT * FROM fl_outside_water_level) outside_water_level
        ON
            water_level.idx = outside_water_level.water_level_idx
        LEFT JOIN
        (SELECT * FROM fl_outside) outside
        ON
            outside_water_level.outside_idx = outside.idx
        LEFT JOIN
        (SELECT * FROM ob_camera) camera
        ON
            water_level.idx = camera.water_level_idx
    )
    WHERE
        outside.idx = $1
  `;

  return query;
}

exports.getAllWaterLevelOutsideInfo = async () => {
  let query = `
  SELECT
    outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
    , outside.crossing_gate_ip
    , outside.crossing_gate_status
    , water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.water_level_ip
    , water_level.water_level_port
    , water_level.water_level_id
    , water_level.water_level_pw
    , water_level.curr_water_level
    , water_level.water_level_model
    , water_level.threshold
    , water_level.left_location AS water_level_left_location
    , water_level.top_location AS water_level_top_location
    , water_level.linked_status AS water_level_linked_status
    , water_level.use_status AS water_level_use_status
    , water_level.alarm_status AS water_level_alarm_status
    , camera.camera_name
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.service_type
  FROM (
      (SELECT * FROM fl_water_level) water_level
      LEFT JOIN
      (SELECT * FROM fl_outside_water_level) outside_water_level
      ON
          water_level.idx = outside_water_level.water_level_idx
      LEFT JOIN
      (SELECT * FROM fl_outside) outside
      ON
          outside_water_level.outside_idx = outside.idx
      LEFT JOIN
      (SELECT * FROM ob_camera) camera
      ON
          water_level.idx = camera.water_level_idx
  )
  ORDER BY
      water_level.idx
  `;

  return query;
}

exports.getWaterLevelCameraInfo = async () => {
  let query = `
  SELECT
    water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.water_level_ip
    , water_level.water_level_port
    , water_level.water_level_id
    , water_level.water_level_pw
    , water_level.curr_water_level
    , water_level.water_level_model
    , water_level.threshold
    , water_level.left_location AS water_level_left_location
    , water_level.top_location AS water_level_top_location
    , water_level.linked_status AS water_level_linked_status
    , water_level.use_status AS water_level_use_status
    , water_level.alarm_status AS water_level_alarm_status
    , camera.camera_name
    , camera.camera_id
    , camera.vms_name
    , camera.camera_ip
    , camera.service_type
    FROM (
        (SELECT * FROM fl_water_level) water_level
        LEFT JOIN
        (SELECT * FROM ob_camera) camera
        ON
            water_level.idx = camera.water_level_idx
    )
    WHERE
        water_level.idx = $1
  `;

  return query;
}

exports.updateAreaPosition = async () => {

  let query = `
  UPDATE fl_outside 
  SET 
    top_location = $2,
    left_location = $3
  WHERE idx = $1
  RETURNING *; 
  `;

  return query;
}

exports.getDashboardDevices = async () => {
  let query = `
    SELECT 
      o.outside_name AS area_name,
      '차단기' AS device_type,
      o.crossing_gate_ip AS device_ip,
      o.crossing_gate_status::TEXT AS status, 
      o.idx AS outside_idx,
      o.linked_status
    FROM fl_outside o
    UNION ALL
    SELECT 
      o.outside_name AS area_name,
      '스피커' AS device_type,
      s.speaker_ip AS device_ip,
      s.speaker_status AS status,
      o.idx AS outside_idx,
      o.linked_status
    FROM fl_outside o
    LEFT JOIN fl_speaker s ON o.idx = s.outside_idx
    UNION ALL
    SELECT 
      o.outside_name AS area_name,
      '전광판' AS device_type,
      b.billboard_ip AS device_ip,
      b.billboard_status AS status,
      o.idx AS outside_idx,
      o.linked_status
    FROM fl_outside o
    LEFT JOIN fl_billboard b ON o.idx = b.outside_idx
    UNION ALL
    SELECT 
      o.outside_name AS area_name,
      '가디언라이트' AS device_type,
      g.guardianlite_ip AS device_ip,
      g.status::TEXT AS status, 
      o.idx AS outside_idx,
      o.linked_status
    FROM fl_outside o
    LEFT JOIN fl_guardianlite g ON o.idx = g.outside_idx
    UNION ALL
    SELECT 
      o.outside_name AS area_name,
      '카메라' AS device_type,
      c.camera_ip AS device_ip,
      c.use_status::TEXT AS status, 
      o.idx AS outside_idx,
      o.linked_status
    FROM fl_outside o
    LEFT JOIN ob_camera c ON o.idx = c.outside_idx;
  `;

  return query;
};