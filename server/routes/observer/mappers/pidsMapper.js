exports.createPIDS = async () => {
  
  let query = `
    INSERT INTO 
      ob_device (
        device_id,
        device_name,
        device_ip,
        device_type,
        device_location,
        outside_idx,
        inside_idx
      )
      VALUES (
        $1,
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )`;
  return query;
}

exports.getPIDS = async () => {
  return `SELECT 
    idx, 
    pids_id, 
    pids_ip, 
    pids_name, 
    pids_location, 
    linked_status,
    alarm_status, 
    camera_id, 
    line_x1, 
    line_x2, 
    line_y1, 
    line_y2
    FROM ob_pids`;
};

exports.getPIDSRoot = async () => {
  return `SELECT
    idx,
    device_ip,
    device_name,
    device_location
    FROM ob_device
    WHERE device_type = 'pids'
  `;
};

exports.createPIDSZone = async () => {
  return `
    INSERT INTO
      ob_pids (
        pids_id,
        pids_ip,
        pids_name,
        pids_type,
        pids_location,
        outside_idx,
        inside_idx
      )
      VALUES 
      ($1 || '-zone1', $2, 'zone1', $3, $4, $5, $6),
      ($1 || '-zone2', $2, 'zone2', $3, $4, $5, $6),
      ($1 || '-zone3', $2, 'zone3', $3, $4, $5, $6),
      ($1 || '-zone4', $2, 'zone4', $3, $4, $5, $6),
      ($1 || '-zone5', $2, 'zone5', $3, $4, $5, $6),
      ($1 || '-zone6', $2, 'zone6', $3, $4, $5, $6)
  `
}

exports.updatePIDSZoneLocation = async (cameraId) => {
  
  let query;
  if(cameraId !== undefined){
    query = `
      UPDATE 
        ob_pids
      SET
        camera_id=$2,
        updated_at=NOW()
      WHERE
        idx=$1
    `
  } else {
    query = `
      UPDATE 
        ob_pids
      SET
        line_x1=$2,
        line_x2=$3,
        line_y1=$4,
        line_y2=$5,
        updated_at=NOW()
      WHERE
        idx=$1
    `
  };
  return query;
};

exports.removePIDS = async () => {
  return `
    DELETE FROM ob_device WHERE idx=$1
  `
};

exports.updatePIDSRoot = async () => {
  
  const query = `
    UPDATE 
      ob_device
    SET
      device_name=$2,
      device_ip=$3,
      device_location=$4,
      updated_at=NOW()
    WHERE
      idx=$1
    
  `;
  return query;
};

exports.updatePIDSZone = () => {
  const query = `
    UPDATE
      ob_pids
    SET
      alarm_status=$1
      , updated_at=NOW()
    WHERE
      pids_id=$2
    RETURNING
      idx
      , pids_id
      , pids_ip
      , pids_type
      , pids_location
      , outside_idx
      , inside_idx
      , camera_id
      , line_x1
      , line_x2
      , line_y1
      , line_y2
  `;
  return query;
};

exports.addPIDSEvent = () => {
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
    , device_idx
    , device_type
    , device_name
    , device_ip
    , camera_id
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
    $12, 
    $13,
    $14
  ) RETURNING idx, event_occurrence_time;
  `;

  return query;
};