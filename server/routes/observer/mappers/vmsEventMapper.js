/**
 * 파라미터에 따라 다르게 접근해야 되는 쿼리 모음. 
 * vmsEvent 에서만 사용함.
 * 각 서비스 event 테이블 컬럼명 통일 시킴.
 */
exports.addVmsEvent = async () => {
  
  let query = `
  INSERT INTO event_log (
    event_name
    , description
    , location
    , event_type_id
    , main_service_name
    , event_occurrence_time
    , severity_id
    , sop_idx
    , outside_idx
    , inside_idx
    , water_level_idx
    , device_idx
    , device_type
    , device_name
    , device_ip
    , camera_id
    , dimension_type
  ) VALUES (
    $1, 
    $2, 
    $3, 
    $4, 
    $5, 
    $6, 
    $7, 
    $8, 
    $9, 
    $10, 
    $11, 
    $12, 
    $13, 
    $14, 
    $15,
    $16,
    $17
  ) RETURNING idx;
  `;

  return query;
};

exports.addVmsEventLost = async () => {
  let query = `
  INSERT INTO event_log (
    event_name
    , description
    , event_type_id
    , main_service_name
    , event_occurrence_time
    , severity_id
    , sop_idx
    , device_type
    , device_name
    , device_ip
  ) VALUES (
    $1, 
    $1, 
    $2, 
    $3, 
    $4, 
    $5, 
    $6, 
    $7, 
    $8, 
    $9
  ) RETURNING idx;
  `;

  return query;
}

exports.getOutSideInfo = async (mainServicePrefix) => {
  
  let query = `
  SELECT 
    idx, outside_name
  FROM 
    ${mainServicePrefix}_outside 
  WHERE 
    idx = $1;
  `;

  return query;
}

exports.getThreedModel = async () => {
  
  let query = `
  SELECT 
    name
  FROM 
    three_d_models
  WHERE 
    id = $1;
  `;

  return query;
}

exports.getInSideInfo = async (mainServicePrefix) => {
  
  let query = `
  SELECT  
    idx, inside_name, map_image_url
  FROM 
    ${mainServicePrefix}_inside 
  WHERE 
    idx = $1;
  `;

  return query;
};

exports.detectVehicleNumber = () => {
  let query = `
    INSERT INTO anpr_vehicle_num(vehicle_num, event_camera_id, recog_datetime)
      VALUES($1, $2, $3)`;
  return query;
};