exports.addWaterLevelDevice = async () => {

  let query = `
  INSERT INTO fl_water_level (
    water_level_name
    , water_level_location
    , water_level_ip
    , water_level_port
    , water_level_id
    , water_level_pw
    , water_level_model
    , ground_value
    , use_status
    , water_level_uid
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
  ) RETURNING idx;
  `;

  return query;
}

exports.addWaterLevelToMap = async () => {

  let query = `
  UPDATE fl_water_level 
  SET
    left_location = $1
    , top_location = $2
    , updated_at = NOW()
    WHERE
      idx = $3;
  `;

  return query;
}

exports.removeWaterLevelToMap = async () => {
  let query = `
  UPDATE fl_water_level 
  SET
    left_location = null
    , top_location = null
    , updated_at = NOW()
    WHERE
      idx = $1;
  `;

  return query;
}

exports.updateOutsideWaterlevel = async () => {
  return `
  UPDATE fl_outside_water_level 
  SET
    water_level_idx = $1,
    updated_at = NOW()
  WHERE
    outside_idx = $2
    AND water_level_idx IS DISTINCT FROM $1;
  `;
}

exports.modifyWaterLevelDevice = async () => {

  let query = `
  UPDATE fl_water_level
  SET
    water_level_name = $2
    , water_level_location = $3
    , water_level_ip = $4
    , water_level_port = $5
    , water_level_id = $6
    , water_level_pw = $7
    , ground_value = $8
    , water_level_uid = $9
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getWaterLevelDeviceList = async () => {

  let query = `
  SELECT 
    idx AS water_level_idx
    , water_level_name
    , water_level_location
    , water_level_ip
    , water_level_port
    , water_level_id
    , water_level_pw
    , water_level_model
    , curr_water_level
    , threshold
    , water_level_uid
    , ground_value
    , left_location
    , top_location
    , linked_status
    , use_status
  FROM
    fl_water_level
  ORDER BY
    water_level_name ASC;
  `;

  return query;
}

exports.deleteWaterLevel = async () => {

  let query = `
  DELETE FROM
    fl_water_level
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getWaterLevelInfoByIdx = async () => {

  let query = `
  SELECT
    water_level_ip,
    water_level_port,
    water_level_model,
    water_level_uid
  FROM
    fl_water_level
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getWaterLevelDeviceInfo = async () => {

  let query = `
  SELECT
    idx AS water_level_idx
    , water_level_name
    , water_level_location
    , water_level_ip
    , water_level_port
    , water_level_id
    , water_level_pw
    , curr_water_level
    , threshold
    , left_location
    , top_location
    , linked_status
    , use_status
  FROM
    fl_water_level
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getWaterLevelDeviceIPInfo = async () => {

  let query = `
  SELECT
    idx AS water_level_idx
    , water_level_name
    , water_level_location
    , water_level_ip
    , water_level_port
    , water_level_id
    , water_level_pw
    , curr_water_level
    , threshold
    , left_location
    , top_location
    , linked_status
    , use_status
  FROM
    fl_water_level
  WHERE
    water_level_ip = $1;
  `;

  return query;
}

exports.modifyThresholdWaterLevel = async () => {

  let query = `
  UPDATE 
    fl_water_level
  SET
    threshold = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyLinkedStatusWaterLevel = async () => {

  let query = `
  UPDATE 
    fl_water_level
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getOutsideWaterLevelList = async () => {

  let query = `
  SELECT
    water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.use_status
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location
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
  );
  `;

  return query;
}

exports.changeUseStatus = async () => {
  let query = `
  UPDATE 
    fl_water_level
  SET
    use_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.addOutsideWaterLevel = async () => {
  let query = `
  INSERT INTO fl_outside_water_level (
    outside_idx, water_level_idx
  ) VALUES (
    $1, $2
  );
  `;

  return query;
}

exports.deleteAllOutsideWaterLevel = async () => {
  let query = `
  DELETE FROM fl_outside_water_level 
  WHERE water_level_idx = $1;
  `;

  return query;
}

exports.deleteAllOutsideWaterLevel = async () => {
  let query = `
  UPDATE fl_outside_water_level 
  SET outside_idx = $2
  WHERE water_level_idx = $1;
  `;

  return query;
}


exports.addOutsideWaterLevelBatch = async () => {
  let query = `
  INSERT INTO fl_outside_water_level (
    outside_idx, 
    water_level_idx
  ) VALUES (
    $1, $2
  );
  `;

  return query;
}

exports.deleteOutsideIdxWaterLevel = async () => {
  let query = `
  DELETE FROM
    fl_outside_water_level
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.deleteOutsideWaterLevelIdx = async () => {
  let query = `
  DELETE FROM
    fl_outside_water_level
  WHERE
    water_level_idx = $1;
  `;

  return query;
}

exports.deleteOutsideIdxWaterLevelIdx = async () => {
  let query = `
  DELETE FROM
    fl_outside_water_level
  WHERE
    outside_idx = $1
  AND
    water_level_idx = $2;
  `;

  return query;
}

exports.getOutsideWaterLevel = async () => {

  let query = `
  SELECT
    water_level.idx AS water_level_idx
    , water_level.water_level_name
    , water_level.water_level_location
    , water_level.use_status
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location
  FROM (
    (SELECT * FROM fl_water_level) water_level
    JOIN
    (SELECT * FROM fl_outside_water_level WHERE outside_idx = $1) outside_water_level
    ON
      water_level.idx = outside_water_level.water_level_idx
    JOIN
    (SELECT * FROM fl_outside) outside
    ON
      outside_water_level.outside_idx = outside.idx
  );
  `;

  return query;
}

exports.updateWaterlevelPosition = async () => {

  let query = `
  UPDATE fl_water_level
  SET 
    top_location = $2,
    left_location = $3
  WHERE idx = $1
  RETURNING *; 
  `;

  return query;
}

exports.getTargetWaterlevelLog = async () => {
  let query = `
  SELECT water_level_value, created_at
  FROM fl_water_level_log
  WHERE water_level_idx = $1
  ORDER BY created_at DESC
  LIMIT 20
  `
  return query;
}

exports.getAllWaterlevelLog = async () => {
  const query = `
    WITH RecentLogs AS (
      SELECT 
        water_level_idx, 
        water_level_value, 
        created_at,
        ROW_NUMBER() OVER (PARTITION BY water_level_idx ORDER BY created_at DESC) AS rn
      FROM fl_water_level_log
    )
    SELECT 
      l.water_level_idx, 
      l.water_level_value, 
      l.created_at, 
      w.water_level_name,
      json_agg(
        json_build_object(
          'water_level_value', l2.water_level_value,
          'created_at', l2.created_at
        ) ORDER BY l2.created_at DESC
      ) FILTER (WHERE l2.rn <= 10) AS recent_logs
    FROM RecentLogs l
    JOIN fl_water_level w ON l.water_level_idx = w.idx
    LEFT JOIN RecentLogs l2 ON l2.water_level_idx = l.water_level_idx AND l2.rn <= 10
    WHERE l.rn = 1
    GROUP BY l.water_level_idx, l.water_level_value, l.created_at, w.water_level_name
    ORDER BY l.water_level_idx
  `;
  return query;
};

exports.addWaterLevelAutoControl = async () => {
  let query = `
    INSERT INTO fl_water_level_auto_control (
      water_level_idx, outside_idx, auto_control_enabled, control_mode
    ) VALUES (
      $1, $2, $3, $4
    ) ON CONFLICT (water_level_idx, outside_idx) 
    DO UPDATE SET 
      auto_control_enabled = EXCLUDED.auto_control_enabled,
      control_mode = EXCLUDED.control_mode,
      updated_at = NOW()
    RETURNING idx;
  `;
  return query;
};

exports.deleteWaterLevelAutoControl = async () => {
  let query = `
    DELETE FROM fl_water_level_auto_control 
    WHERE water_level_idx = $1;
  `;
  return query;
};

exports.getWaterLevelAutoControl = async () => {
  let query = `
    SELECT 
      wlac.idx,
      wlac.water_level_idx,
      wlac.outside_idx,
      wlac.auto_control_enabled,
      wlac.control_mode,
      wl.water_level_name,
      wl.water_level_location,
      o.outside_name,
      o.location,
      o.crossing_gate_ip,
      o.crossing_gate_status,
      s.speaker_ip,
      s.speaker_id,
      s.speaker_password
    FROM fl_water_level_auto_control wlac
    JOIN fl_water_level wl ON wlac.water_level_idx = wl.idx
    JOIN fl_outside o ON wlac.outside_idx = o.idx
    LEFT JOIN fl_speaker s ON o.idx = s.outside_idx
    WHERE wlac.auto_control_enabled = true
    ORDER BY wlac.water_level_idx, wlac.outside_idx;
  `;
  return query;
};

exports.createWaterLevelGroup = async () => {
  let query = `
    INSERT INTO fl_water_level_group (group_name, threshold_mode)
    VALUES ($1, $2)
    RETURNING idx;
  `;
  return query;
};

exports.updateWaterLevelGroup = async () => {
  let query = `
    UPDATE fl_water_level_group 
    SET group_name = $1, threshold_mode = $2, updated_at = NOW()
    WHERE idx = $3
    RETURNING idx;
  `;
  return query;
};

exports.deleteWaterLevelGroup = async () => {
  let query = `
    DELETE FROM fl_water_level_group 
    WHERE idx = $1;
  `;
  return query;
};

exports.getWaterLevelGroups = async () => {
  let query = `
    SELECT 
      wlg.idx,
      wlg.group_name,
      wlg.threshold_mode,
      wlg.created_at,
      COUNT(wlgm.water_level_idx) as water_level_count
    FROM fl_water_level_group wlg
    LEFT JOIN fl_water_level_group_mapping wlgm ON wlg.idx = wlgm.group_idx
    GROUP BY wlg.idx, wlg.group_name, wlg.threshold_mode, wlg.created_at
    ORDER BY wlg.created_at DESC;
  `;
  return query;
};

exports.getWaterLevelGroupDetail = async () => {
  let query = `
    SELECT 
      wlg.idx,
      wlg.group_name,
      wlg.threshold_mode,
      wlg.created_at,
      json_agg(
        json_build_object(
          'idx', wl.idx,
          'water_level_name', wl.water_level_name,
          'water_level_ip', wl.water_level_ip,
          'water_level_location', wl.water_level_location,
          'water_level_model', wl.water_level_model,
          'threshold', wl.threshold,
          'water_level_role', wlgm.water_level_role
        ) ORDER BY wlgm.water_level_role, wl.idx
      ) as waterLevels
    FROM fl_water_level_group wlg
    LEFT JOIN fl_water_level_group_mapping wlgm ON wlg.idx = wlgm.group_idx
    LEFT JOIN fl_water_level wl ON wlgm.water_level_idx = wl.idx
    WHERE wlg.idx = $1
    GROUP BY wlg.idx, wlg.group_name, wlg.threshold_mode, wlg.created_at;
  `;
  return query;
};

exports.addWaterLevelGroupMapping = async () => {
  let query = `
    INSERT INTO fl_water_level_group_mapping (group_idx, water_level_idx, water_level_role)
    VALUES ($1, $2, $3)
    ON CONFLICT (group_idx, water_level_idx) 
    DO UPDATE SET 
      water_level_role = EXCLUDED.water_level_role
    RETURNING group_idx, water_level_idx;
  `;
  return query;
};

exports.deleteWaterLevelGroupMapping = async () => {
  let query = `
    DELETE FROM fl_water_level_group_mapping 
    WHERE group_idx = $1;
  `;
  return query;
};

exports.getAvailableWaterLevels = async () => {
  let query = `
    SELECT 
      wl.idx,
      wl.water_level_name,
      wl.water_level_location,
      wl.water_level_ip,
      wl.water_level_model,
      wl.threshold
    FROM fl_water_level wl
    WHERE wl.use_status = true
    AND wl.idx NOT IN (
      SELECT DISTINCT wlgm.water_level_idx 
      FROM fl_water_level_group_mapping wlgm
      WHERE wlgm.water_level_idx IS NOT NULL
    )
    ORDER BY wl.water_level_name;
  `;
  return query;
};