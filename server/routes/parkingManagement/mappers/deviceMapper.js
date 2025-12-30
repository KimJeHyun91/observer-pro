exports.getUnUseDeviceList = async () => {
  
  let query = `
  SELECT 
    device.idx AS device_idx
    , device.user_id
    , device.user_pw
    , device.device_ip
    , device.device_port
    , device.device_no16
    , device.device_no10
    , device.device_type
    , device.device_location
    , device.linked_status AS device_linked_status
  FROM 
    pm_device AS device
  WHERE 
    use_status = false;
  `;

  return query;
}

exports.updateUseDevice= async () => {
  let query = `
  UPDATE 
    pm_device
  SET 
    use_status = TRUE
    , updated_at = NOW()
  WHERE
    idx = $1
  `;

  return query;
}

exports.getDevice= async () => {
  let query = `
  SELECT 
    *
  FROM 
    pm_device
  WHERE
    idx = $1
  `;

  return query;
}

exports.getDeviceInList = async () => {
  let query = `
  SELECT 
    pd.idx
  FROM 
    pm_area pa JOIN 
    pm_device pd
    ON pa.device_idx = pd.idx
  WHERE 
    pa.outside_idx = $1 AND pa.inside_idx = $2;
  `;
  return query;
}

exports.getDeviceIn = async () => {
  let query = `
    SELECT 
      device_idx 
    FROM 
      pm_area 
    WHERE 
      idx = $1
  `;
  return query;
}

exports.deleteOutsideInsideDeviceLocation= async () => {
  let query = `
  UPDATE 
    pm_device
  SET 
    use_status = FALSE
    , updated_at = NOW()
  WHERE 
    idx = ANY($1::int[]);
  `;
  return query;
}

exports.getDeviceIpList = async () => {
  
  let query = `
  SELECT 
    idx
    , user_id
    , user_pw
    , device_ip
    , device_port
    , device_no16
    , device_no10
  FROM 
    pm_device
  ORDER BY
    device_ip;
  `;

  return query;
}

exports.modifyLinkedStatusDevice = async () => {
  
  let query = `
  UPDATE 
    pm_device
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.addDevice = async () => {
  
  let query = `
  INSERT INTO pm_device (
    user_id
    , user_pw
    , device_ip
    , device_port
    , device_no16
    , device_no10
  ) VALUES (
    $1, $2, $3, $4, $5, $6 
  ) RETURNING idx;
  `;

  return query;
}

exports.getDeviceNo16Info = async () => {
  
  let query = `
  SELECT 
    d.idx,
    d.user_id,
    d.user_pw,
    d.device_ip,
    d.device_port,
    d.device_no16,
    d.device_no10,
    a.outside_idx
  FROM 
    pm_device d
  LEFT JOIN 
    pm_area a
  ON 
    d.idx = a.device_idx
  WHERE
    d.device_no16 ILIKE $1;
  `;

  return query;
}

exports.getIsAreaDevice = async () => {
  
  let query = `
  SELECT 
    *
  FROM 
    pm_area
  WHERE
    device_idx = $1;
  `;

  return query;
}

exports.deleteIsAreaDevice = async () => {
  
  let query = `
  DELETE 
  FROM 
    pm_area 
  WHERE 
    device_idx = $1
  `;

  return query;
}

exports.deleteDevice = async () => {
  
  let query = `
  DELETE 
  FROM 
    pm_device 
  WHERE 
    idx = $1
  `;

  return query;
}

exports.modifyDevice = async () => {
  
  let query = `
  UPDATE 
    pm_device
  SET 
    use_status = FALSE
    , user_id = $1
    , user_pw = $2
    , device_ip = $3
    , device_port = $4
    , device_no16 = $5
    , updated_at = NOW()
  WHERE
    device_no16 = $6
  `;

  return query;
}

exports.updateAreaStatus = async () => {
  let query = `
  UPDATE 
    pm_area
  SET 
    use_area = $1
    , updated_at = NOW()
  WHERE
    device_idx = $2
    AND use_area IS DISTINCT FROM $1
  ;`;

  return query;
}

exports.getDeviceOutList = async () => {
  let query = `
  SELECT 
    pd.idx
  FROM 
    pm_area pa JOIN 
    pm_device pd
    ON pa.device_idx = pd.idx
  WHERE 
    pa.outside_idx = $1
  `;
  return query;
}

exports.getDeviceLinkedStatus = async () => {
  let query = `
  SELECT 
    linked_status
  FROM 
    pm_device
  WHERE 
    idx = $1;
  `;

  return query;
}

exports.getDeviceCheck = async () => {
  let query = `
      SELECT 
        pm.*, 
        pa.area_name, 
        PI.inside_name,
        po.outside_name
      FROM 
        pm_device pm 
      LEFT JOIN 
        pm_area pa ON pm.idx = pa.device_idx
      LEFT JOIN 
        pm_inside pi ON pa.inside_idx = pi.idx
      LEFT JOIN 
        pm_outside po ON pi.outside_idx = po.idx
      WHERE 
        pm.idx = $1;
  `;

  return query;
}

exports.modifyDeviceAlarm = async () => {
  let query = `
  UPDATE 
    pm_device
  SET 
    is_alarm_send = $1
  WHERE
    idx = $2
  `;
  return query;
}