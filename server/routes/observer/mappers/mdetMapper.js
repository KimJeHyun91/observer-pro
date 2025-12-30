exports.createMDET = () => {
  
  const query = `INSERT INTO ob_device (
    device_id
    , device_name
    , device_ip
    , device_type
    , outside_idx
    , inside_idx
    , top_location
    , left_location
    , device_location
    , service_type
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
  ) RETURNING idx;`;
  return query;
};


exports.getMDETS = () => {
  const query = `
    SELECT 
    * 
    FROM 
    ob_device 
    WHERE 
    device_type=$1
  `;
  return query;
};