exports.getOutSideInfo = async () => {
  
  let query = `
  SELECT 
    idx, outside_name, left_location, top_location, top_location, map_image_url, service_type, alarm_status
  FROM 
    ob_outside 
  WHERE 
    idx = $1;
  `;

  return query;
}

exports.getOutSideList = async () => {
  
  let query = `
  SELECT 
    idx, outside_name, left_location, top_location, top_location, map_image_url, service_type, alarm_status
  FROM 
    ob_outside 
  ORDER BY 
    outside_name ASC;
  `;

  return query;
}

exports.addOutSide = async () => {
  
  let query = `
  INSERT INTO ob_outside (
    outside_name, left_location, top_location, service_type
  ) VALUES (
    $1, $2, $3, $4
  ) RETURNING idx;
  `;

  return query;
}

exports.deleteOutSide = async () => {
  
  let query = `
  DELETE FROM
    ob_outside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyOutSide = async (mapImageURL) => {
  let query;
  if(!mapImageURL){
    query = `
      UPDATE ob_outside
      SET
        outside_name = $2
        , left_location = $3
        , top_location = $4
        , service_type = $5
        , updated_at = NOW()
      WHERE
        idx = $1;
      `;
  } else {
    query = `
    UPDATE ob_outside
    SET
      map_image_url = $2
      , updated_at = NOW()
    WHERE
      idx = $1;
    `;
  }
  return query;
}

exports.modifyOutSideAlarmStatus = async () => {
  
  let query = `
  UPDATE ob_outside
  SET
    alarm_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getGlbModelsBuilding = async () => {
  let query = `
    SELECT 
      * 
    FROM 
      three_d_models 
    WHERE 
      service_type = $1
    AND
      model_type != 'floor'
    ORDER BY
      is_use DESC,
      name ASC;
  `;

  return query;
}