exports.getOutSideInfo = async () => {
  
  let query = `
  SELECT 
      idx
      , outside_name
      , left_location
      , top_location
      , top_location
      , map_image_url
      , service_type
      , alarm_status
  FROM 
    pm_outside 
  WHERE 
    idx = $1;
  `;

  return query;
}

exports.getOutSideList = async () => {
  
  let query = `
  SELECT 
    idx
    , outside_name
    , left_location
    , top_location
    , top_location
    , map_image_url
    , service_type
    , alarm_status
  FROM 
    pm_outside 
  ORDER BY 
    outside_name ASC;
  `;

  return query;
}

exports.addOutSide = async () => {
  
  let query = `
  INSERT INTO pm_outside (
    outside_name
    , left_location
    , top_location
    , map_image_url
    , service_type
  ) VALUES (
    $1, $2, $3, $4, $5
  ) RETURNING idx;
  `;

  return query;
}

exports.deleteOutSide = async () => {
  
  let query = `
  DELETE FROM
    pm_outside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyOutSide = async () => {
  
  let query = `
  UPDATE pm_outside
  SET
    outside_name = $2
    , left_location = $3
    , top_location = $4
    , map_image_url = $5
    , service_type = $6
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyOutSideAlarmStatus = async () => {
  
  let query = `
  UPDATE pm_outside
  SET
    alarm_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getOutsideInsideList = async () => {
  
  let query = `
  SELECT 
    outside.idx AS outside_idx
    , outside.outside_name
    , outside.alarm_status
    , inside.idx AS inside_idx
    , inside.inside_name
    , inside.alarm_status
    , ROW_NUMBER() OVER(PARTITION BY outside.idx ORDER BY inside.floor_order ASC, inside.inside_name DESC) AS step
  FROM (
    (SELECT * FROM pm_outside) outside
    LEFT JOIN
    (SELECT 
        idx, inside_name, outside_idx, map_image_url, alarm_status
        , (CASE 
            WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
            WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
            ELSE REGEXP_REPLACE(inside_name, '\\D', '', 'g')
          END)::INTEGER AS floor_order
      FROM
        pm_inside
    ) inside
    ON
      outside.idx = inside.outside_idx
  )
  ORDER BY
    outside.outside_name ASC
    , step ASC;
  `;

  return query;
}

exports.modifyMapImageOutSide = async () => {
  
  let query = `
  UPDATE pm_outside
  SET
    map_image_url = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}