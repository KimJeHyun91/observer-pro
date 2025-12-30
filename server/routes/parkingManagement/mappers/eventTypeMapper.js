exports.getEventTypeList = async () => {
  
  let query = `
  SELECT
    event_type.id AS event_type_id
    , event_type.event_type
    , event_type.service_type
    , event_type.use_warning_board
    , event_type.use_popup
    , event_type.use_event_type
    , severity.id AS severity_id
    , severity.severity
    , severity.severity_color
  FROM (
    (SELECT * FROM pm_event_type) event_type
    LEFT JOIN
    (SELECT * FROM ob_severity) severity
    ON
      event_type.severity_id = severity.id
  );
  `;

  return query;
}

exports.getEventLogList = async () => {
  
  let query = `
  SELECT 
    e.*,                
    d.idx AS pmDevice_idx, 
    d.device_ip,
    d.device_no16
  FROM
    event_log e
  LEFT JOIN 
    pm_device d ON d.idx = e.device_idx
  WHERE 
    e.main_service_name LIKE 'parking'
  ORDER BY 
    TO_TIMESTAMP(LEFT(e.event_occurrence_time, 15), 'YYYYMMDD"T"HH24MISS') DESC;
  `;
  return query;
}

exports.modifyEventType = async () => {
  
  let query = `
  UPDATE pm_event_type
  SET
    severity_id = $2
    , use_warning_board = $3
    , use_popup = $4
    , use_event_type = $5
    , updated_at = NOW()
  WHERE
    id = $1;
  `;

  return query;
}

exports.getEventType = async () => {
  let query = `
    SELECT 
      * 
    FROM 
      pm_event_type
    WHERE 
      id = $1;
  `;

  return query;
}