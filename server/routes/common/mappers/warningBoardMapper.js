exports.deleteWarningBoard = async () => {
  
  let query = `
  DELETE FROM
    warning_board;
  `;

  return query;
}

exports.insertWarningBoard = async () => {
  
  let query = `
  INSERT INTO warning_board (
    event_name
    , location
  ) VALUES (
    $1, $2
  );
  `;

  return query;
}

exports.getWarningBoard = async () => {
  
  let query = `
  SELECT 
    *
  FROM 
    warning_board;
  `;

  return query;
}

exports.useWarningBoard = async () => {
  let query = `
  SELECT 
    *
  FROM 
  `;    

  return query;
}