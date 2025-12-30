exports.getDeviceList = async () => {
  
  let query = `
  SELECT
    device.idx AS device_idx
    , device.device_id
    , device.device_name
    , device.device_ip
    , device.device_type
    , device.device_location
    , device.left_location AS device_left_location
    , device.linked_status AS device_top_location
    , device.camera_idx
    , device.service_type AS device_service_type
    , device.linked_status AS device_linked_status
    , outside.idx AS outside_idx
    , outside.outside_name
    , outside.location AS outside_location
  FROM (
    (SELECT * FROM vb_device) device
    LEFT JOIN
    (SELECT * FROM vb_outside) outside
    ON
      device.outside_idx = outside.idx
  );
  `;

  return query;
}

exports.modifyLinkedStatusDevice = async () => {
  
  let query = `
  UPDATE vb_device
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}