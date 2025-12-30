
exports.getUnUseCameraList = async () => {
  
  let query = `
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.left_location
    , camera.top_location
    , camera.use_status
    , camera.service_type
    , camera.access_point   
    , vms.idx AS vms_idx
    , vms.vms_id
    , vms.vms_pw
    , vms.vms_ip
    , vms.vms_port
    , camera.outside_idx
  FROM
    fl_camera AS camera
  JOIN
    fl_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    camera.use_status = false
  ORDER BY
    camera.camera_name ASC;
  `;

  return query;
}

exports.updateCameraLinkWithWaterlevel = async () => {

  let query = `
  UPDATE fl_camera
  SET
    water_level_idx = $2
    , updated_at = NOW()
  WHERE
    camera_ip = $1
  `;

  return query;
}

exports.getCameraIdVmsInfo = async () => {
  
  let query = `
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.left_location
    , camera.top_location
    , camera.use_status
    , camera.service_type
    , camera.access_point   
    , vms.idx AS vms_idx
    , vms.vms_id
    , vms.vms_pw
    , vms.vms_ip
    , vms.vms_port
    , camera.outside_idx
  FROM
    fl_camera AS camera
  JOIN
    fl_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    camera.camera_id = $1
  AND
    camera.vms_name = $2;
  `;

  return query;
}

exports.modifyCamera = async () => {

  let query = `
  UPDATE fl_camera
  SET
    camera_angle = $2
    , outside_idx = $3
    , left_location = $4
    , top_location = $5
    , use_status = true
    , updated_at = NOW()
  WHERE
    idx = $1
  `;

  return query;
}

exports.deleteCameraLocation = async () => {

  let query = `
  UPDATE fl_camera
  SET
    camera_angle = $2
    , outside_idx = $3
    , left_location = $4
    , top_location = $5
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyCameraAlarmStatus = async () => {
  
  let query = `
  UPDATE fl_camera
  SET
    alarm_status = true
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getVmsNameCameraList = async () => {
  
  let query = `
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.left_location
    , camera.top_location
    , camera.use_status
    , camera.service_type
    , camera.access_point   
    , vms.idx AS vms_idx
    , vms.vms_id
    , vms.vms_pw
    , vms.vms_ip
    , vms.vms_port
    , camera.outside_idx
  FROM
    fl_camera AS camera
  JOIN
    fl_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    vms.vms_name = $1;
  `;

  return query;
}

exports.getAllCameraList = async () => {
  
  let query = `
  SELECT  
    idx AS camera_idx
    , camera_id
    , vms_name
    , camera_name
    , camera_ip
    , camera_angle
    , outside_idx
    , left_location
    , top_location
    , use_status
    , service_type
    , access_point   
    , linked_status   
  FROM
    fl_camera
  ORDER BY
    camera_name ASC;
  `;

  return query;
}

exports.modifyLinkedStatusCamera = async () => {
  
  let query = `
  UPDATE fl_camera
  SET
    linked_status = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteVmsNameCameraList = async () => {

  let query = `
  DELETE FROM
    fl_camera
  WHERE
    vms_name = $1;
  `;

  return query;
}