exports.getParkingTypeList = async () => {
  
  let query = `
  SELECT 
    id
    , parking_type_name
    , parking_type_image
    , parking_type_color
  FROM
    pm_parking_type
  ORDER BY
    id ASC;
  `;

  return query;
}