exports.getVmsList = async () => {
  
  let query = `
  SELECT 
    idx, vms_id, vms_pw, vms_ip, vms_port, vms_name
  FROM
    fl_vms
  ORDER BY
    vms_ip ASC;
  `;

  return query;
}

exports.getVmsIpPortInfo = async () => {
  
  let query = `
  SELECT 
    idx, vms_id, vms_pw, vms_ip, vms_port, vms_name
  FROM
    fl_vms
  WHERE
    vms_ip = $1
  AND
    vms_port = $2;
  `;

  return query;
}

exports.addVms = async () => {
  
  let query = `
  INSERT INTO fl_vms (
    vms_id, vms_pw, vms_ip, vms_port, vms_name
  ) VALUES(
    $1, $2, $3, $4, $5 
  )
  RETURNING idx;
  `;

  return query;
}

exports.modifyVms = async () => {
  
  let query = `
  UPDATE fl_vms
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
    fl_vms
  WHERE
    vms_name = $1;
  `;

  return query;
}