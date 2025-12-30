exports.addGroup = async () => {
  
  let query = `
  INSERT INTO vb_group (
    group_name
  ) VALUES (
    $1
  ) RETURNING idx;
  `;

  return query;
}

exports.addGroupOutside = async () => {
  
  let query = `
  INSERT INTO vb_group_outside (
    group_idx
    , outside_idx
  ) VALUES (
    $1, $2
  );
  `;

  return query;
}

exports.deleteGroup = async () => {
  
  let query = `
  DELETE FROM
    vb_group
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getGroupIdxOutsideList = async () => {
  
  let query = `
  SELECT 
    group_idx
    , outside_idx
  FROM
    vb_group_outside
  WHERE
    group_idx = $1;
  `;

  return query;
}

exports.deleteGroupOutside = async () => {
  
  let query = `
  DELETE FROM
    vb_group_outside
  WHERE
    group_idx = $1
  AND
    outside_idx = $2;
  `;

  return query;
}

exports.getGroupOutsideInfo = async () => {
  
  let query = `
  SELECT
    vb_group.idx AS group_idx
    , vb_group.group_name
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
    , outside.service_type AS outside_service_type
  FROM (
    (SELECT * FROM vb_group WHERE idx = $1) vb_group
    LEFT JOIN
    (SELECT * FROM vb_group_outside) group_outside
    ON
      vb_group.idx = group_outside.group_idx
    LEFT JOIN
    (SELECT * FROM vb_outside) outside
    ON
      group_outside.outside_idx = outside.idx
  );
  `;

  return query;
}

exports.getGroupOutsideList = async () => {
  
  let query = `
  SELECT
    vb_group.idx AS group_idx
    , vb_group.group_name
    , COUNT(outside.idx) AS outside_count
  FROM (
    (SELECT * FROM vb_group) vb_group
    LEFT JOIN
    (SELECT * FROM vb_group_outside) group_outside
    ON
      vb_group.idx = group_outside.group_idx
    LEFT JOIN
    (SELECT * FROM vb_outside) outside
    ON
      group_outside.outside_idx = outside.idx
  )
  GROUP BY
  	vb_group.idx
	  , vb_group.group_name
	ORDER BY
	  vb_group.group_name ASC;
  `;

  return query;
}

exports.modifyGroupName = async () => {
  
  let query = `
  UPDATE
    vb_group 
  SET
    group_name = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}