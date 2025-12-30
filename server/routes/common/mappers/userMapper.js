exports.getUserInfo = async () => {
  
  let query = `
  SELECT * FROM 
    users 
  WHERE 
    id = $1;
  `;

  return query;
}

exports.getUserList = async () => {
  
  let query = `
  SELECT * FROM 
    users 
  ORDER BY 
    id ASC;
  `;

  return query;
}

exports.updateChangePassword = async () => {
  
  let query = `
  UPDATE users 
  SET 
    password = $1
    , salt = $2
    , updated_at = NOW()
  WHERE 
    id = $3;
  `;

  return query;
}

exports.updateExceptPassword = async () => {
  
  let query = `
  UPDATE users 
  SET 
    user_name = $1
    , enable = $2
    , updated_at = NOW()
  WHERE 
    id = $3
  `;

  return query;
}

exports.insertUserInfo = async () => {
  
  let query = `
  INSERT INTO users (
    id, password, salt, user_name, user_role, enable
  ) VALUES (
    $1, $2, $3, $4, $5, $6
  );
  `;

  return query;
}

exports.deleteUserInfo = async () => {
  
  let query = `
  DELETE FROM
    users
  WHERE
    id = $1;
  `;

  return query;
}

exports.updateUserInfo = async () => {
  
  let query = `
  UPDATE users 
  SET 
    password = $1
    , salt = $2
    , user_name = $3
    , enable = $4
    , updated_at = NOW()
  WHERE 
    id = $5
  `;

  return query;
}
