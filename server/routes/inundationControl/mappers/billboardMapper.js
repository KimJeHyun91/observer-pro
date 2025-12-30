exports.addBillboard = async () => {
  
  let query = `
  INSERT INTO fl_billboard (
    outside_idx
    , billboard_ip
    , billboard_name
    , billboard_status
    , billboard_port
    , billboard_controller_model
  ) VALUES (
    $1, $2, $3, $4, $5, $6
  ) RETURNING idx;
  `;

  return query;
}

exports.getBillboardIpInfo = async () => {
  
  let query = `
  SELECT 
    idx AS billboard_idx
    , outside_idx
    , billboard_name
    , billboard_ip
    , billboard_msg
    , billboard_color
    , billboard_status
    , linked_status
    , alarm_status
  FROM
    fl_billboard
  WHERE
    billboard_ip = $1;
  `;

  return query;
}

exports.addBillboardMacro = async () => {
  
  let query = `
  INSERT INTO fl_billboard_macro (
    billboard_msg
    , billboard_color
  ) VALUES (
    $1, $2
  ) RETURNING idx;
  `;

  return query;
}

exports.modifyBillboardMacro = async () => {
  
  let query = `
  UPDATE fl_billboard_macro
  SET
    billboard_msg = $2
    , billboard_color = $3
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getBillboardMacroList = async () => {
  
  let query = `
  SELECT
    idx AS billboard_idx
    , billboard_msg
    , billboard_color
  FROM
    fl_billboard_macro
  ORDER BY
    billboard_msg ASC;
  `;

  return query;
}

exports.deleteBillboardMacro = async () => {
  
  let query = `
  DELETE FROM
    fl_billboard_macro
  WHERE
    idx = ANY($1);
  `;

  return query;
}

exports.getBillboardList = async () => {
  
  let query = `
  SELECT
    idx AS billboard_idx
    , outside_idx
    , billboard_name
    , billboard_ip
    , billboard_msg
    , billboard_color
    , billboard_status
    , linked_status
    , alarm_status
  FROM
    fl_billboard
  ORDER BY
    billboard_name ASC;
  `;

  return query;
}

exports.updateOutsideBillboard = async () => {
  return `
    UPDATE fl_billboard
    SET billboard_ip = $1,
    billboard_port = $3,
    billboard_controller_model = $4
    WHERE outside_idx = $2;
  `;
};

exports.modifyLinkedStatusBillboard = async () => {
  
  let query = `
  UPDATE fl_billboard
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteOutsideBillboard = async () => {
  
  let query = `
  DELETE FROM 
    fl_billboard
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.deleteBillboard = async () => {
  
  let query = `
  DELETE FROM
    fl_billboard
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getOutsideBillboard = async () => {
  
  let query = `
  SELECT
    idx AS billboard_idx
    , outside_idx
    , billboard_name
    , billboard_ip
    , billboard_msg
    , billboard_color
    , billboard_status
    , linked_status
    , alarm_status
  FROM
    fl_billboard
  WHERE
    outside_idx = $1
  ORDER BY
    billboard_name ASC;
  `;

  return query;
}