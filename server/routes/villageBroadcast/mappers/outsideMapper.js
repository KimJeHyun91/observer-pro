exports.addOutside = async () => {
  
  let query = `
  INSERT INTO vb_outside (
    outside_name
    , location
    , left_location
    , top_location
    , service_type
  ) VALUES (
    $1, $2, $3, $4, $5
  ) RETURNING idx;
  `;

  return query;
}


exports. updateCameraIdQuery  = async () => {
  let query = `
    UPDATE vb_outside
    SET camera_id = $1
    WHERE idx = $2;  
  `;

  return query;
};



// exports.getOutsideInfo = async () => {

//   let query = `
//   SELECT  
//     outside.idx AS outside_idx
//     , outside.outside_name
//     , outside.location AS outside_location
//     , outside.left_location AS outside_left_location
//     , outside.top_location AS outside_top_location
//     , outside.camera_id AS outside_camera_id
//     , speaker.idx AS speaker_idx
//     , speaker.speaker_name
//     , speaker.speaker_ip
//     , speaker.speaker_msg
//     , speaker.speaker_status
//     , speaker.linked_status AS speaker_linked_status
//     , camera.idx AS camera_idx
//     , camera.camera_id
//     , camera.vms_name
//     , camera.main_service_name
//     , camera.camera_name
//     , camera.camera_ip
//     , camera.camera_angle
//     , camera.linked_status AS camera_linked_status
//     , guardianlite.guardianlite_ip
//     , guardianlite.guardianlite_name
//     , guardianlite.status AS guardianlite_status
//     , guardianlite.user_id
//     , guardianlite.user_pw
//     , guardianlite.ch1
//     , guardianlite.ch2
//     , guardianlite.ch3
//     , guardianlite.ch4
//     , guardianlite.ch5
//     , guardianlite.ch6
//     , guardianlite.ch7
//     , guardianlite.ch8
//     , guardianlite.temper
//     , guardianlite.ch1_label
//     , guardianlite.ch2_label
//     , guardianlite.ch3_label
//     , guardianlite.ch4_label
//     , guardianlite.ch5_label
//     , guardianlite.ch6_label
//     , guardianlite.ch7_label
//     , guardianlite.ch8_label
//     , array_agg(groups.group_name) AS group_names
//   FROM (
//     (SELECT * FROM vb_outside) outside
//     LEFT JOIN
//     (SELECT * FROM vb_speaker) speaker
//     ON
//       outside.idx = speaker.outside_idx
//     LEFT JOIN
//     (SELECT * FROM ob_camera WHERE main_service_name = 'broadcast') camera
//     ON
//       outside.idx = camera.outside_idx
//     LEFT JOIN
//     (SELECT * FROM vb_guardianlite) guardianlite
//     ON
//       outside.idx = guardianlite.outside_idx
//    LEFT JOIN
//     vb_group_outside group_outside ON outside.idx = group_outside.outside_idx
//    LEFT JOIN
//     vb_group groups ON group_outside.group_idx = groups.idx
   
//   )
//   WHERE
//     outside.idx = $1
    
//   GROUP BY
//     outside.idx, outside.outside_name, outside.location, outside.left_location, outside.top_location, outside_camera_id,
//     speaker.idx, speaker.speaker_name, speaker.speaker_ip, speaker.speaker_msg, speaker.speaker_status,
//     speaker.linked_status, camera.idx, camera.camera_id, camera.vms_name, camera.main_service_name,
//     camera.camera_name, camera.camera_ip, camera.camera_angle, camera.linked_status,
//     guardianlite.guardianlite_ip, guardianlite.guardianlite_name, guardianlite.status,
//     guardianlite.user_id, guardianlite.user_pw, guardianlite.ch1, guardianlite.ch2, guardianlite.ch3,
//     guardianlite.ch4, guardianlite.ch5, guardianlite.ch6, guardianlite.ch7, guardianlite.ch8,
//     guardianlite.temper, guardianlite.ch1_label, guardianlite.ch2_label, guardianlite.ch3_label,
//     guardianlite.ch4_label, guardianlite.ch5_label, guardianlite.ch6_label, guardianlite.ch7_label,
//     guardianlite.ch8_label;

//   `;

//   return query;
// }


exports.getOutsideInfo = async () => {
  let query = `
  SELECT  
    outside.idx AS outside_idx,
    outside.site_id,
    outside.site_transmitter_id,
    outside.outside_name,
    outside.location,
    outside.left_location,
    outside.top_location,
    outside.map_image_url,
    outside.service_type,
    outside.camera_id,
    outside.alarm_status,
    outside.created_at,
    outside.updated_at,
    speaker.idx AS speaker_idx,
    speaker.speaker_name,
    speaker.speaker_ip,
    speaker.speaker_msg,
    speaker.speaker_status,
    speaker.speaker_location,
    speaker.speaker_left_location,
    speaker.speaker_top_location,
    speaker.linked_status,
    speaker.use_status,
    speaker.alarm_status AS speaker_alarm_status,
    camera.idx AS camera_idx,
    camera.camera_id,
    camera.vms_name,
    camera.main_service_name,
    camera.camera_name,
    camera.camera_ip,
    camera.camera_angle,
    camera.left_location AS camera_left_location,
    camera.top_location AS camera_top_location,
    camera.use_status AS camera_use_status,
    camera.service_type AS camera_service_type,
    camera.camera_vendor,
    camera.camera_model,
    camera.access_point,
    camera.linked_status AS camera_linked_status,
    camera.alarm_status AS camera_alarm_status,
    camera.created_at AS camera_created_at,
    camera.updated_at AS camera_updated_at
  FROM vb_outside AS outside
  LEFT JOIN vb_speaker AS speaker
  ON outside.idx = speaker.outside_idx
  LEFT JOIN ob_camera AS camera
  ON outside.camera_id = camera.camera_id AND camera.main_service_name = 'broadcast'
  WHERE outside.idx = $1;
  `;

  return query;
};

exports.getOutsideList = async () => {

  let query = `
  SELECT  
    outside.idx AS outside_idx
    , outside.site_id AS outside_site_id
    , outside.site_transmitter_id AS outside_site_transmitter_id
    , outside.outside_name
    , outside.location AS outside_location
    , outside.left_location AS outside_left_location
    , outside.top_location AS outside_top_location
    , speaker.idx AS speaker_idx
    , speaker.speaker_name
    , speaker.speaker_ip
    , speaker.speaker_msg
    , speaker.speaker_status
    , speaker.speaker_location
    , speaker.speaker_left_location
    , speaker.speaker_top_location
    , speaker.linked_status AS speaker_linked_status
    , camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.main_service_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.linked_status AS camera_linked_status
    , guardianlite.guardianlite_ip
    , guardianlite.guardianlite_name
    , guardianlite.status AS guardianlite_status
    , guardianlite.user_id
    , guardianlite.user_pw
    , guardianlite.ch1
    , guardianlite.ch2
    , guardianlite.ch3
    , guardianlite.ch4
    , guardianlite.ch5
    , guardianlite.ch6
    , guardianlite.ch7
    , guardianlite.ch8
    , guardianlite.temper
    , guardianlite.ch1_label
    , guardianlite.ch2_label
    , guardianlite.ch3_label
    , guardianlite.ch4_label
    , guardianlite.ch5_label
    , guardianlite.ch6_label
    , guardianlite.ch7_label
    , guardianlite.ch8_label
  FROM (
    (SELECT * FROM vb_outside) outside
    LEFT JOIN
    (SELECT * FROM vb_speaker) speaker
    ON
      outside.idx = speaker.outside_idx
    LEFT JOIN
    (SELECT * FROM ob_camera WHERE main_service_name = 'broadcast') camera
    ON
      outside.camera_id = camera.camera_id
    LEFT JOIN
    (SELECT * FROM vb_guardianlite) guardianlite
    ON
      outside.idx = guardianlite.outside_idx
  )
  ORDER BY
    outside.outside_name ASC;
  `;

  return query;
}

exports.deleteOutside = async () => {
  
  let query = `
  DELETE FROM
    vb_outside
  WHERE
    idx = $1;
  `;

  return query;
}

exports.getUnLinkDeviceList = async () => {
  
  let query = `
  SELECT * FROM (
    (
      SELECT 
        COALESCE(speaker.speaker_name, '스피커') AS name
        , COALESCE(outside.outside_name, '') AS location
        , speaker.speaker_ip AS ipAddress
        , '스피커' AS device_type
      FROM
        vb_speaker AS speaker 
      LEFT JOIN
        vb_outside AS outside
      ON
        speaker.outside_idx = outside.idx
      WHERE 
        speaker.linked_status = false
    )
    UNION
    (
      SELECT 
        COALESCE(camera.camera_name, '카메라') AS name
        , COALESCE(outside.location, '') AS location
        , camera.camera_ip AS ipAddress
        , '카메라' AS device_type
      FROM
        ob_camera AS camera 
      LEFT JOIN
        vb_outside AS outside
      ON
        camera.outside_idx = outside.idx
      WHERE 
        camera.linked_status = false
      AND
		    camera.main_service_name = 'broadcast'
    )
  )
  ORDER BY
    name ASC;
  `;

  return query;
}