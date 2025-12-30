exports.getEventTypeInfo = async (serviceType) => {
  let tableName = 'ob_event_type';

  if (serviceType === 'parking') {
    tableName = 'pm_event_type';
  }

  let query = `
  SELECT
    ${tableName}.id AS event_type_id
    ,${tableName}.event_type
    ,${tableName}.service_type
    ,${tableName}.use_warning_board
    ,${tableName}.use_popup
    ,${tableName}.use_event_type
    ,${tableName}.severity_id
    ,ob_severity.severity
    ,ob_severity.severity_color
    ${serviceType !== 'parking' ? `, ${tableName}.use_sop, ${tableName}.sop_idx` : ''}
  FROM
    ${tableName}
  JOIN
    ob_severity
  ON
    ${tableName}.severity_id = ob_severity.id
  WHERE 
    ${tableName}.id = $1;
  `;

  return query;
}

exports.getEventTypeList = async () => {
  
  let query = `
  SELECT
    ob_event_type.id AS event_type_id
    , ob_event_type.event_type
    , ob_event_type.service_type
    , ob_event_type.use_warning_board
    , ob_event_type.use_popup
    , ob_event_type.use_sop
    , ob_event_type.use_event_type
    , ob_event_type.severity_id
    , ob_event_type.sop_idx
    , ob_severity.severity
    , ob_severity.severity_color
    , ob_event_type.sop_idx
  FROM
    ob_event_type
  JOIN
    ob_severity
  ON
    ob_event_type.severity_id = ob_severity.id
  ORDER BY 
    ob_event_type.id ASC;
  `;

  return query;
}

exports.modifyEventTypes = async () => {
  
  let query = `
  UPDATE ob_event_type
  SET
    severity_id = $2
    , use_warning_board = $3
    , use_popup = $4
    , use_event_type = $5
    , use_sop = $6
    , sop_idx = $7
    , updated_at = NOW()
  WHERE
    id = $1;
  `;

  return query;
}
