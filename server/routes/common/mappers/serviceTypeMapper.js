
exports.getServiceTypeList = async () => {
  
  let query = `
  SELECT
    id, service_type, service_type_kr, service_type_image, use_service_type
  FROM 
    ob_service_type 
  ORDER BY 
    id ASC;
  `;

  return query;
}

exports.modifyServiceTypes = async () => {
  
  let query = `
  UPDATE ob_service_type
  SET
    use_service_type = $2
    , updated_at = NOW()
  WHERE
    id = $1
  `;

  return query;
}

exports.getServiceTypeInfo = async () => {
  
  let query = `
  SELECT
    id, service_type, service_type_kr, service_type_image, use_service_type
  FROM 
    ob_service_type 
  WHERE
    service_type = $1;
  `;

  return query;
}