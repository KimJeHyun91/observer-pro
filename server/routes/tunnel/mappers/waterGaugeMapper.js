
exports.addWaterLevel = () => {

  let query = `
  INSERT INTO tm_water_level (
    water_level_ip
    , water_level_port
    , water_level_name
    , water_level_location
    , water_level_id
    , water_level_pw
    , communication_type
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7
  ) RETURNING idx;
  `;

  return query;
}

exports.modifyWaterLevel = () => {

  return `
      UPDATE tm_water_level
      SET
        water_level_ip = $2,
        water_level_port = $3,
        water_level_name = $4,
        water_level_location = $5,
        water_level_id = $6,
        water_level_pw = $7,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING *;
  `;
};

exports.modifyWaterLevelControlInIp = () => {
  return `
      UPDATE tm_water_level w
        SET water_level_ip = $1,
            water_level_location = $3,
            updated_at = NOW()
        FROM tm_mapping_tunnel_water_level mw
        JOIN tm_outside o ON mw.outside_idx = o.idx
        WHERE w.idx = mw.water_level_idx
          AND o.idx = $2
          AND w.communication_type = 'control_in';
  `;
};

exports.removeWaterLevel = () => {
  return `
    DELETE FROM tm_water_level
    WHERE idx IN 
  `;
};

exports.getWaterLevelList = () => {
  return `
    SELECT 
      wl.idx,
      wl.communication_type AS communication,
      wl.water_level_name AS name,
      wl.water_level_location AS location,
      wl.water_level_ip AS ip,
      wl.water_level_port AS port,
      wl.water_level_id AS id,
      wl.water_level_pw AS password,
      wl.curr_water_level,
      wl.threshold,
      wl.linked_status,

      -- 연결된 outside 정보들을 JSON 배열로 반환
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'idx', os.idx,
            'outside_name', os.outside_name,
            'location', os.location,
            'top_location', os.top_location,
            'left_location', os.left_location,
            'automatic', os.automatic
          )
        ) FILTER (WHERE os.idx IS NOT NULL),
        '[]'
      ) AS outside_info

    FROM tm_water_level wl
    LEFT JOIN tm_mapping_tunnel_water_level mtwl
      ON wl.idx = mtwl.water_level_idx
    LEFT JOIN tm_outside os
      ON mtwl.outside_idx = os.idx
    GROUP BY wl.idx
    ORDER BY wl.idx DESC;
  `;
};


exports.addwaterLevelMapping = () => {
  return `
    INSERT INTO tm_mapping_tunnel_water_level (
      outside_idx,
      water_level_idx,
      top_location,
      left_location
    ) VALUES (
      $1, $2, $3, $4
    )
    RETURNING *;
  `;
}

exports.removeWaterLevelMapping = () => {
  return `
    DELETE FROM tm_mapping_tunnel_water_level
    WHERE outside_idx = $1 AND water_level_idx = $2;
  `;
};

exports.modifyWaterLevelPosition = () => {

  return `
      UPDATE tm_mapping_tunnel_water_level
      SET
        top_location = $3,
        left_location = $4,
        updated_at = NOW()
      WHERE outside_idx = $1 AND water_level_idx = $2
      RETURNING *;
  `;
};

exports.modifyWaterLevelThreshold = () => {

  return `
      UPDATE tm_water_level
      SET
        threshold = $2,
        updated_at = NOW()
      WHERE idx = $1
      RETURNING *;
  `;
};

exports.getwaterLevelMappingList = () => {
  return `
        SELECT 
      m.outside_idx AS outside_idx,
      w.idx AS idx,
      communication_type AS communication,
      w.water_level_name,
      w.water_level_location,
      w.water_level_ip,
      w.curr_water_level,
      w.threshold,
      w.linked_status,
      w.use_status,
      m.top_location AS top_location,
      m.left_location AS left_location,
      m.created_at,
      m.updated_at
    FROM tm_mapping_tunnel_water_level AS m
    JOIN tm_water_level AS w
      ON m.water_level_idx = w.idx
    WHERE m.outside_idx = $1;
  `;
};

exports.addWaterLevelControlIn = () => {

  let query = `
  INSERT INTO tm_water_level (
    water_level_ip
    , water_level_name
    , water_level_location
    , communication_type
    ,use_status
    ,threshold
  ) VALUES (
    $1, $2, $3, $4,true,15
  ) RETURNING idx;
  `;

  return query;
}

exports.getwaterLevelMappingOutsideList = () => {
  return `
  SELECT o.*
  FROM tm_mapping_tunnel_water_level m
  JOIN tm_outside o ON m.outside_idx = o.idx
  WHERE m.water_level_idx = $1;
  `;
};


exports.getWaterLevelLog = () => {
  return `
  SELECT
    l.water_level AS water_level,
    l.created_at AS created_at,
    w.threshold AS threshold
  FROM
    tm_water_level_log AS l
    JOIN tm_mapping_tunnel_water_level AS m
      ON l.water_level_idx = m.water_level_idx
    JOIN tm_water_level AS w
      ON w.idx = m.water_level_idx
  WHERE
    m.outside_idx = $1
    AND w.communication_type = 'control_in'
  ORDER BY
    l.created_at DESC
  LIMIT 7;
  `;
};

exports.getWaterLevelControlIn = () => {
  return `
  SELECT
    w.*
  FROM
    tm_mapping_tunnel_water_level AS m
    JOIN tm_water_level AS w ON m.water_level_idx = w.idx
  WHERE
    m.outside_idx = $1
    AND w.communication_type = 'control_in';
  `;
};








