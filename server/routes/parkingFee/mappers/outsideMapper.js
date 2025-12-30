exports.getOutsideList = async () => {

  let query = `
  SELECT * FROM 
    pf_outside
  ORDER BY
    outside_name ASC;
  `;

  return query;
}

exports.getOutsideInfo = async () => {

  let query = `
  SELECT * FROM 
    pf_outside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getOutsideIpInfo = async () => {

  let query = `
  SELECT * FROM 
    pf_outside
  WHERE
    outside_ip = $1;
  `;

  return query;
}

exports.setOutsideInfo = async () => {

  let query = `
  INSERT INTO pf_outside (
    outside_name
    , outside_ip
    , outside_port
  ) VALUES (
    $1, $2, $3
  ) RETURNING idx;
  `;

  return query;
}

exports.updateOutsideInfo = async () => {

  let query = `
  UPDATE 
    pf_outside 
  SET
    outside_name = $2
    , outside_ip = $3
    , outside_port = $4
    , status = $5
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.updateOutsideInfo_notStatus = async () => {

  let query = `
  UPDATE 
    pf_outside 
  SET
    outside_name = $2
    , outside_ip = $3
    , outside_port = $4
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteOutsideInfo = async () => {

  let query = `
  DELETE FROM
    pf_outside
  WHERE
    idx = $1;
  `;

  return query;
}