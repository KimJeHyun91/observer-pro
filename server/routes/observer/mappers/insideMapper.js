exports.getInSideInfo = async () => {
  
  let query = `
  SELECT  
    idx, inside_name, outside_idx, map_image_url, three_d_model_id, alarm_status
  FROM 
    ob_inside 
  WHERE 
    idx = $1;
  `;

  return query;
}

// 지하, 지상 (B2, B1, 1F, 2F...)순서로 출력
exports.getInSideList = async (data) => {
  let query;
  if(data?.outside_idx){
    query = `
    SELECT 
      inside.idx, inside_name, outside_idx, outside_name, map_image_url, three_d_model_id, alarm_status
      , (CASE 
          WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          ELSE NULLIF(REGEXP_REPLACE(inside_name, '\\D', '', 'g'), '')
        END)::INTEGER AS floor_order
    FROM
      ob_inside
      inside
      LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          inside.outside_idx = outside.idx
    WHERE
      outside_idx = $1
    ORDER BY
      floor_order ASC
      , inside_name DESC;
    `;
  } else if(data?.three_d_model_id){
    query = `
    SELECT 
      inside.idx, inside_name, outside_name, three_d_model_id, inside.map_image_url, alarm_status
      , (CASE 
          WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          ELSE NULLIF(REGEXP_REPLACE(inside_name, '\\D', '', 'g'), '')
        END)::INTEGER AS floor_order
    FROM
      ob_inside
      inside
      LEFT OUTER JOIN
          (
            SELECT
              id, name as outside_name
            FROM 
              three_d_models
          ) three_d_model
        ON
          inside.three_d_model_id = three_d_model.id
    WHERE
      three_d_model_id = $1
    ORDER BY
      floor_order ASC
      , inside_name DESC;
    `;
  } else {
    query = `
    SELECT 
      inside.idx, inside_name, outside_idx, map_image_url, three_d_model_id, alarm_status
      , (CASE 
          WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
          ELSE NULLIF(REGEXP_REPLACE(inside_name, '\\D', '', 'g'), '')
        END)::INTEGER AS floor_order
    FROM
      ob_inside
      inside
      LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          inside.outside_idx = outside.idx
    ORDER BY
      floor_order ASC
      , inside_name DESC;
    `;
  }
  return query;
}

exports.addInSide = async () => {
  
  let query = `
  INSERT INTO ob_inside (
    inside_name, outside_idx, map_image_url
  ) VALUES (
    $1, $2, $3
  ) RETURNING idx;
  `;

  return query;
}

exports.deleteInSideByIdx = async () => {
  
  let query = `
  DELETE FROM
    ob_inside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteInSideBy3DModelId = async () => {
  
  let query = `
  DELETE FROM
    ob_inside
  WHERE
    three_d_model_id = $1
  RETURNING idx;
  `;

  return query;
}

exports.modifyInSide = async (mapImageURL) => {
  
  let query;
  if(!mapImageURL) {
    query = `
      UPDATE ob_inside
      SET
        inside_name = $2
        , updated_at = NOW()
      WHERE
        idx = $1;
      `;
  } else {
    query = `
    UPDATE ob_inside
    SET
      map_image_url = $2
      , updated_at = NOW()
    WHERE
      idx = $1;
    `;
  }
  return query;
}

exports.modifyInSideAlarmStatus = async () => {
  
  let query = `
  UPDATE ob_inside
  SET
    alarm_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}
