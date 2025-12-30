exports.selectTest01 = async () => {
  
  let query = `
  SELECT
    user_id, user_role, enable
  FROM
    users
  WEHRE
    user_id = $1;
  `;

  return query;
}

exports.selectTest02 = async () => {
  
  let query = `
  SELECT * FROM
    users
  WEHRE
    user_id = $1;
  `;

  return query;
}

exports.insertTest = async () => {
  
  let query = `
  INSERT INTO users (
    user_id, user_pw, salt, user_role, enable
  ) VALUES (
    $1, $2, $3, $4, $5
  );
  `;

  return query;
}