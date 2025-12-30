exports.getVmsList = async () => {
  
  let query = `
  SELECT 
    idx, vms_id, vms_pw, vms_ip, vms_port, vms_name, main_service_name
  FROM
    ob_vms
  WHERE
    main_service_name = $1
  ORDER BY
    vms_ip ASC;
  `;

  return query;
}

exports.getVmsIpPortInfo = async () => {
  
  let query = `
  SELECT 
    idx, vms_id, vms_pw, vms_ip, vms_port, vms_name, main_service_name
  FROM
    ob_vms
  WHERE
    vms_ip = $1
  AND
    vms_port = $2
  AND
    main_service_name = $3;
  `;

  return query;
}

exports.getVmsInfo = () => {
  return `
    SELECT 
      idx, vms_id, vms_pw, vms_ip, vms_port, vms_name
    FROM 
      ob_vms
    WHERE
      vms_name = $1
    AND
      main_service_name = $2
  `
}

exports.getAllSameVms = async () => {
  
  let query = `
  SELECT 
    idx, vms_id, vms_pw, vms_ip, vms_port, vms_name, main_service_name
  FROM
    ob_vms
  WHERE
    vms_ip = $1
  AND
    vms_port = $2
  AND
    main_service_name = $3
  AND
    vms_id = $4
  AND
    vms_pw = $5
  `;

  return query;
}

exports.addVms = async () => {
  
  let query = `
  INSERT INTO ob_vms (
    vms_id, vms_pw, vms_ip, vms_port, vms_name, main_service_name
  ) VALUES(
    $1, $2, $3, $4, $5, $6
  )
  RETURNING idx;
  `;

  return query;
}

exports.modifyVms = async () => {
  
  let query = `
  UPDATE ob_vms
  SET
    vms_id = $2
    , vms_pw = $3
    , vms_ip = $4
    , vms_port = $5
    , vms_name = $6
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteVms = async () => {
  
  let query = `
  DELETE FROM
    ob_vms
  WHERE
    vms_name = $1
  AND
    main_service_name = $2;
  `;

  return query;
}