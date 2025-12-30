exports.deleteCameraId = async (vmsCameraList) => {
  let query = `
  UPDATE ob_device
  SET
    camera_id = null
    , updated_at = NOW()
  WHERE
    camera_id IN (${vmsCameraList})
  `;

  return query;
}

exports.modifyDeviceAlarmStatusEvent = async () => {
  
  let query = `
  UPDATE ob_device 
  SET 
    alarm_status = true
    , updated_at = NOW()
  FROM (
    SELECT 
      DISTINCT(device_idx)
    FROM event_log
    WHERE 
      is_acknowledge = FALSE
    AND
      device_idx = $1
    ) AS findDevice 
  WHERE 
    ob_device.idx = findDevice.device_idx 
  AND 
    ob_device.alarm_status = false
  `;

  return query;
};


exports.removeDeviceLocationInBuilding = async () => {
  return `
    UPDATE 
      ob_device
    SET
      outside_idx = null
    ,  inside_idx = null
    , top_location = null
    , left_location = null
    WHERE
      outside_idx = $1
    AND
      device_type = $2
  `;
};

exports.removeDeviceLocationInFloor = async () => {
  return `
    UPDATE 
      ob_device
    SET
      outside_idx = null
    ,  inside_idx = null
    , top_location = null
    , left_location = null
    WHERE
      inside_idx = $1
    AND
      device_type = $2
  `;
};
