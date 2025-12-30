exports.getMainService = async () => {

  let query = `
  SELECT 
    id, main_service_name, main_service_name_kr, main_service_url, sub_name, map_image_url, use_service 
  FROM 
    main_service
  WHERE
    use_service = true
  ORDER BY 
    id ASC;
  `;

  return query;
}

exports.getMainServiceInfo = async () => {

  let query = `
  SELECT 
    id, main_service_name, main_service_url, sub_name, map_image_url, use_service 
  FROM 
    main_service
  WHERE
    id = $1
  AND
    use_service = true;
  `;

  return query;
}

exports.insertLogQuery = async () => {
  let query = `
  INSERT INTO operation_log (
    user_id, log_type, log_description, req_ip
  ) VALUES (
    $1, $2, $3, $4
  );
  `;
  return query;
}

exports.getSeverityList = async () => {

  let query = `
  SELECT 
    id, severity, severity_color
  FROM 
    ob_severity
  ORDER BY 
    id ASC;
  `;

  return query;
}

// exports.createArea = async () => {
//   let query = `
//   INSERT INTO fl_outside (
//     outside_name, location, camera, crossing_gate, speaker, billboard, guardianlite, waterlevel_gauge, left_location, top_location, service_type
//   ) VALUES (
//     $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
//   );
//   `;

//   return query;
// }


// exports.getArea = async () => {
//   let query = `
//   SELECT * FROM fl_outside
//   `;

//   return query;
// }

exports.createSOP = async () => {

  let query = `
  INSERT INTO sop (
    sop_name
  ) VALUES (
    $1
  ) RETURNING idx
  `;
  return query;
}

exports.createSOPStage = async () => {

  let query = `
  INSERT INTO sop_stage (
    sop_idx,
    sop_stage,
    sop_stage_name,
    sop_stage_description
  ) VALUES (
    $1,
    $2,
    $3,
    $4
  )
  RETURNING sop_idx 
  `;

  return query;
};

exports.getSOPList = async (idx) => {

  let query;
  if (idx) {
    query = `
  SELECT
	  s.idx,
	  sop_name,
	  MAX(sop_stage) AS COUNT
  FROM
	  sop s
  LEFT JOIN
	  sop_stage sg
  ON s.idx=sg.sop_idx
  WHERE s.idx = $1
  GROUP BY s.idx
  ORDER BY idx ASC
  `;
  } else {
    query = `
  SELECT
	  s.idx,
	  sop_name,
	  MAX(sop_stage) AS COUNT
  FROM
	  sop s
  LEFT JOIN
	  sop_stage sg
  ON s.idx=sg.sop_idx
  GROUP BY s.idx
  ORDER BY idx ASC
  `;
  }

  return query;
};

exports.getSOPStageList = async () => {
  let query = `
  SELECT idx, sop_stage, sop_stage_name, sop_stage_description FROM sop_stage WHERE sop_idx=$1 ORDER BY idx ASC
  `;
  return query;
};

exports.removeSOP = async () => {
  let query = `
  DELETE FROM sop WHERE idx=$1
  `;
  return query;
};

exports.removeSOPStage = async (idx) => {
  let query;
  if (idx) {
    query = `
    DELETE FROM sop_stage 
    WHERE idx=$1
    RETURNING sop_idx
    `;
  } else {
    query = `
    DELETE FROM sop_stage 
    WHERE 
    sop_idx=$1 AND sop_stage=$2
    RETURNING sop_idx
    `;
  }
  return query;
}

exports.modifySOP = async () => {
  let query = `
  UPDATE sop SET sop_name=$2, updated_at=NOW() WHERE idx=$1
  `;
  return query;
};

exports.modifySOPStage = async () => {
  let query = `
  UPDATE 
    sop_stage 
  SET 
    sop_stage_name=$2, 
    sop_stage_description=$3, 
    updated_at=NOW() 
  WHERE idx=$1
    RETURNING sop_idx
  `;
  return query;
};

exports.createFalseAlarm = async () => {

  let query = `
  INSERT INTO false_alarm (
    type
  ) VALUES (
    $1
  )
  RETURNING idx
  `;
  return query;
};

exports.modifyFalseAlarm = async () => {
  let query = `
  UPDATE false_alarm SET type=$2, updated_at=NOW() WHERE idx=$1 RETURNING idx
  `;
  return query;
};

exports.removeFalseAlarm = async () => {
  let query = `
  DELETE FROM false_alarm WHERE idx=$1 RETURNING $1
  `;
  return query;
};

exports.getFalseAlarmList = () => {
  let query = `
  SELECT * FROM false_alarm ORDER BY idx ASC
  `;
  return query;
};

exports.getFalseAlarm = () => {
  return 'SELECT idx, type FROM false_alarm WHERE idx=$1';
}

exports.eventLogList = async () => {
  let query = `
    SELECT 
      e.* 
    FROM 
      event_log e
    WHERE 
      EXISTS (
          SELECT 1 FROM pm_event_type pm 
          WHERE e.main_service_name = 'parking' 
          AND e.event_type_id = pm.id 
          AND pm.use_event_type = TRUE
      )
      OR EXISTS (
          SELECT 1 FROM ob_event_type ob 
          WHERE e.main_service_name = 'origin' 
          AND e.event_type_id = ob.id 
          AND ob.use_event_type = TRUE
      )
      OR EXISTS (
          SELECT 1 FROM vb_event_type vb 
          WHERE e.main_service_name = 'broadcast' 
          AND e.event_type_id = vb.id 
          AND vb.use_event_type = TRUE
      )
      OR EXISTS (
          SELECT 1 FROM fl_event_type fl 
          WHERE e.main_service_name = 'inundation' 
          AND e.event_type_id = fl.id 
          AND fl.use_event_type = TRUE
      )
      OR EXISTS (
          SELECT 1 FROM tm_event_type tm 
          WHERE e.main_service_name = 'tunnel' 
          AND e.event_type_id = tm.id 
          AND tm.use_event_type = TRUE
      )
    ORDER BY 
      e.idx DESC;
  `;

  return query;
}

exports.eventLogCheck = async () => {
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
      );
  `;
  return query;
};

exports.updateSetting = () => {
  let query = `
    UPDATE
      main_setting
    SET
      setting_value = $1,
      updated_at = NOW()
    WHERE
      setting_name = $2
    AND
      setting_value != $1
  `;
  return query;
};
