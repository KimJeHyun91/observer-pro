exports.getInSideInfo = async () => {
  
  let query = `
  SELECT
     outside.idx AS outside_idx
    , outside.outside_name
    , outside.left_location AS outside_left_location
    , outside.top_location AS outside_top_location
    , outside.service_type AS outside_service_type
    , outside.alarm_status AS outside_alarm_status
    , inside.inside_name
    , inside.map_image_url AS inside_map_image_url
    , inside.alarm_status AS inside_alarm_status
  FROM (
    (SELECT * FROM pm_inside) inside 
    JOIN
    (SELECT * FROM pm_outside) outside
    ON
      inside.outside_idx = outside.idx
  )
  WHERE 
    inside.idx = $1;
  `;

  return query;
}

// 지하, 지상 (B2, B1, 1F, 2F...)순서로 출력
exports.getInSideList = async () => {
  
  let query = `
  SELECT 
    idx, inside_name, outside_idx, map_image_url, alarm_status
    , (CASE 
        WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        ELSE REGEXP_REPLACE(inside_name, '\\D', '', 'g')
      END)::INTEGER AS floor_order
  FROM
    pm_inside
  WHERE
    outside_idx = $1
  ORDER BY
    floor_order ASC
    , inside_name DESC;
  `;

  return query;
}

exports.addInSide = async () => {
  
  let query = `
  INSERT INTO pm_inside (
    inside_name, outside_idx, map_image_url
  ) VALUES (
    $1, $2, $3
  ) RETURNING idx;
  `;

  return query;
}

exports.deleteInSide = async () => {
  
  let query = `
  DELETE FROM
    pm_inside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyInsideOutsideAlarmStatus = async () => {
  
  let query = `
  UPDATE pm_inside
  SET
    alarm_status = $2
    , updated_at = NOW()
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.modifyInSide = async () => {
  
  let query = `
  UPDATE pm_inside
  SET
    inside_name = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyInsideAlarmStatus = async () => {
  
  let query = `
  UPDATE pm_inside
  SET
    alarm_status = $3
    , updated_at = NOW()
  WHERE
    idx = $1
  AND
    outside_idx = $2;
  `;

  return query;
}

exports.modifyMapImageInSide = async () => {
  
  let query = `
  UPDATE pm_inside
  SET
    map_image_url = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}