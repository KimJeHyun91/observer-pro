exports.getInsideList = async () => {

  let query = `
  SELECT * FROM
    pf_inside
  WHERE
    outside_idx = $1
  ORDER BY 
    inside_name ASC;
  `;

  return query;
}

exports.setInsideInfo = async () => {

  let query = `
  INSERT INTO pf_inside (
    outside_idx
    , inside_name
  ) VALUES (
    $1, $2
  ) RETURNING idx;
  `;

  return query;
}

exports.updateInsideInfo = async () => {

  let query = `
  UPDATE 
    pf_inside 
  SET
    inside_name = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteInsideInfo = async () => {

  let query = `
  DELETE FROM
    pf_inside
  WHERE
    idx = $1;
  `;

  return query;
}