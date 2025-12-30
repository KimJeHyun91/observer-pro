exports.getGuardianliteInfo = async () => {
  
  let query = `
  SELECT * FROM
    vb_guardianlite
  WHERE
    guardianlite_ip = $1;
  `;

  return query;
}

exports.addGuardianlite = async () => {
  
  let query = `
  INSERT INTO vb_guardianlite (
    guardianlite_ip
    , guardianlite_name
    , outside_idx
  ) VALUES (
    $1, $2, $3
  ) RETURNING guardianlite_ip;
  `;

  return query;
}

exports.modifyOutsideGuardianlite = async () => {
  
  let query = `
  UPDATE
    vb_guardianlite
  SET
    outside_idx = $2
    , updated_at = NOW()
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.modifyGuardianliteChannel = async () => {
  
  let query = `
  UPDATE 
    vb_guardianlite
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
    vb_guardianlite
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
    vb_guardianlite
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