exports.addGuardianlite = async () => {
  
  let query = `INSERT INTO ob_guardianlite (
      outside_idx
      , inside_idx
      , dimension_type
      , top_location
      , left_location
      , guardianlite_ip
      , guardianlite_name
      , ch1_label
      , ch2_label
      , ch3_label
      , ch4_label
      , ch5_label
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    ) RETURNING guardianlite_ip;`;
  return query;
};

exports.getGuardianliteInfo = async () => {
  
  let query = `
  SELECT * FROM
    ob_guardianlite
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
};

exports.modifyGuardianliteLocation = async () => {
  return `
    UPDATE ob_guardianlite
    SET top_location = $2, left_location = $3, updated_at = NOW()
    WHERE guardianlite_ip = $1;
  `;
};

exports.modifyGuardianlite = async () => {
  return `
    UPDATE ob_guardianlite
    SET 
      guardianlite_ip = $2, 
      guardianlite_name = $3,
      ch1_label = $4,
      ch2_label = $5,
      ch3_label = $6,
      ch4_label = $7,
      ch5_label = $8,
      updated_at = NOW()
    WHERE guardianlite_ip = $1
    RETURNING 
      guardianlite_ip,
      guardianlite_name,
      ch1,
      ch2,
      ch3,
      ch4,
      ch5,
      ch1_label,
      ch2_label,
      ch3_label,
      ch4_label,
      ch5_label,
      temper,
      status
  `;
};

exports.getGuardianliteList = async ({ inside_idx = null, outside_idx = null, dimension_type = null }) => {
  let query;
  if(inside_idx && dimension_type === '2d'){
    query = `
    SELECT 
      G.*, inside_name, outside_name, outside_map_image_url, inside_map_image_url
    FROM
      ob_guardianlite G
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          G.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          G.outside_idx = outside.idx
    WHERE inside_idx=$1
    ORDER BY
      guardianlite_ip ASC;
    `;
  } else if(outside_idx && dimension_type === '2d') {
    query = `
    SELECT 
      G.*, inside_name, outside_name, outside_map_image_url, inside_map_image_url 
    FROM
      ob_guardianlite G
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          G.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              idx, outside_name, map_image_url AS outside_map_image_url
            FROM 
              ob_outside
          ) outside
        ON
          G.outside_idx = outside.idx
    WHERE outside_idx=$1
    ORDER BY
      guardianlite_ip ASC;
    `;
  } else if(outside_idx == null && inside_idx == null && dimension_type === '2d') {
    query = `
    SELECT 
      *
    FROM
      ob_guardianlite
    WHERE
      outside_idx is null
    ORDER BY
      guardianlite_ip ASC;
    `;
  } else if(dimension_type === '3d' && inside_idx) {
    query = `
    SELECT 
      G.*, inside_name, model.name as outside_name, inside_map_image_url 
    FROM
      ob_guardianlite G
        LEFT OUTER JOIN
          (
            SELECT
              idx, inside_name, map_image_url AS inside_map_image_url
            FROM 
              ob_inside
          ) inside
        ON
          G.inside_idx = inside.idx
        LEFT OUTER JOIN
          (
            SELECT
              id, name
            FROM 
              three_d_models
          ) model
        ON
          G.outside_idx = model.id
    WHERE inside_idx=$1
    ORDER BY
      guardianlite_ip ASC;
    `;
  } else {
    query = `
        SELECT 
          G.*, inside_name, model.name as model_name, inside_map_image_url 
        FROM
          ob_guardianlite G
            LEFT OUTER JOIN
              (
                SELECT
                  idx, inside_name, map_image_url AS inside_map_image_url
                FROM 
                  ob_inside
              ) inside
            ON
              G.inside_idx = inside.idx
            LEFT OUTER JOIN
              (
                SELECT
                  id, name
                FROM 
                  three_d_models
              ) model
            ON
              G.outside_idx = model.id
            LEFT OUTER JOIN
              (
                SELECT
                  idx, outside_name, map_image_url AS outside_map_image_url
                FROM 
                  ob_outside
              ) outside
            ON
              G.outside_idx = outside.idx
        ORDER BY
          guardianlite_ip ASC;
        `;
  }

  return query;
};

exports.modifyGuardianliteChannel = async () => {
  
  let query = `
  UPDATE 
    ob_guardianlite
  SET
    ch1 = $2
    , ch2 = $3
    , ch3 = $4
    , ch4 = $5
    , ch5 = $6
    , ch6 = $7
    , ch7 = $8
    , ch8 = $9
    , temper = $10
    , updated_at = NOW()
  WHERE
    guardianlite_ip = $1
  RETURNING 
    guardianlite_ip,
    guardianlite_name,
    ch1,
    ch2,
    ch3,
    ch4,
    ch5,
    ch1_label,
    ch2_label,
    ch3_label,
    ch4_label,
    ch5_label,
    temper,
    status
  `;

  return query;
};

exports.modifyGuardianliteChannelLabel = async () => {
  
  let query = `
  UPDATE 
    fl_guardianlite
  SET
    ch1_label = $2
    , ch2_label = $3
    , ch3_label = $4
    , ch4_label = $5
    , ch5_label = $6
    , ch6_label = $7
    , ch7_label = $8
    , ch8_label = $9
    , updated_at = NOW()
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
};

exports.modifyGuardianliteStatus = async () => {
  
  let query = `
  UPDATE 
    ob_guardianlite
  SET
    status = true
    , updated_at = NOW()
  WHERE
    guardianlite_ip = $1
  AND
    status != true;
  `;

  return query;
};

exports.modifyOutsideGuardianlite = async () => {
  
  let query = `
  UPDATE 
    fl_guardianlite
  SET
    outside_idx = $2
    , updated_at = NOW()
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
};

exports.deleteGuardianlite = async () => {
  
  let query = `
  DELETE FROM
    ob_guardianlite
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
};

exports.addGuardianliteEvent = () => {
  return `
    INSERT INTO event_log (
    event_name
    , description
    , location
    , event_type_id
    , main_service_name
    , event_occurrence_time
    , severity_id
    , outside_idx
    , inside_idx
    , dimension_type
    , device_type
    , device_name
    , device_ip
  ) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5,
    TO_CHAR(NOW(), 'YYYYMMDD') || 'T' || TO_CHAR(NOW(), 'HH24MISS'), 
    $6, 
    $7, 
    $8,
    $9, 
    $10, 
    $11,
    $12
  );
  `;
};