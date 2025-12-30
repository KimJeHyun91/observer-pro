exports.getSeverityList = async () => {
  
  let query = `
  SELECT 
    id AS severity_id
    , severity
    , severity_en
    , severity_color
    , classify
    , 0 AS count
  FROM
    fl_severity
  ORDER BY
    id DESC;
  `;

  return query;
}