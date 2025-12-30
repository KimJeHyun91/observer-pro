exports.addGuardianlite = async () => {
  let query = `
    INSERT INTO fl_guardianlite (
      outside_idx,
      guardianlite_ip
    ) VALUES (
      $1, $2
    ) RETURNING guardianlite_ip, user_id, user_pw;
  `;
  return query;
};

exports.getGuardianliteInfo = async () => {
  
  let query = `
  SELECT * FROM
    fl_guardianlite
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
}
// 개소(차단기) 삭제할 때 사용함
exports.deleteOutsideGuardianlite = async () => {
  let query = `
    DELETE FROM
      fl_guardianlite
    WHERE
      outside_idx = $1;
  `;

  return query;
}

exports.updateOutsideGuardianlite = async () => {
  return `
    UPDATE fl_guardianlite
    SET guardianlite_ip = $1
    WHERE outside_idx = $2;
  `;
};

exports.getGuardianliteList = async () => {
  
  let query = `
  SELECT * FROM
    fl_guardianlite
  ORDER BY
    guardianlite_ip ASC;
  `;

  return query;
}

exports.modifyGuardianliteChannel = async () => {
  
  let query = `
  UPDATE 
    fl_guardianlite
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
    guardianlite_ip = $1;
  `;

  return query;
}

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
}

exports.modifyGuardianliteStatus = async () => {
  
  let query = `
  UPDATE 
    fl_guardianlite
  SET
    status = false
    , updated_at = NOW()
  WHERE
    guardianlite_ip = $1
  AND
    status != false;
  `;

  return query;
}

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
}

exports.deleteGuardianlite = async () => {
  
  let query = `
  DELETE FROM
    fl_guardianlite
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
}

exports.getOutsideGuardianlite = async () => {
  
  let query = `
  SELECT * FROM
    fl_guardianlite
  WHERE
    outside_idx = $1;
  `;

  return query;
}