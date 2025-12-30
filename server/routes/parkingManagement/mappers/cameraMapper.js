exports.deleteCameraOutside = async () => {
  
  let query = `
  UPDATE 
    pm_camera
  SET
    outside_idx = null
    , inside_idx = null
    , left_location = null
    , top_location = null
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.modifyCameraOutsideAlarmStatus = async () => {
  
  let query = `
  UPDATE pm_camera
  SET
    alarm_status = $2
    , updated_at = NOW()
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.deleteCameraInside = async () => {
  
  let query = `
  UPDATE 
    pm_camera
  SET
    outside_idx = null
    , inside_idx = null
    , left_location = null
    , top_location = null
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    outside_idx = $1
  AND
    inside_idx = $2;
  `;

  return query;
}

exports.modifyCameraInsideAlarmStatus = async () => {
  
  let query = `
  UPDATE pm_camera
  SET
    alarm_status = $3
    , updated_at = NOW()
  WHERE
    inside_idx = $1
  AND
    outside_idx = $2;
  `;

  return query;
}