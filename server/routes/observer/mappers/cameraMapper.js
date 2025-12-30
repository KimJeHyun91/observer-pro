
exports.getUnUseCameraList = async () => {
  
  let query = `
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.main_service_name
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
    , camera.three_d_model_id
    , camera.inside_idx
    , camera.water_level_idx
  FROM
    ob_camera AS camera
  JOIN
    ob_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    camera.use_status = false
  AND
    camera.main_service_name = $1
  AND
    vms.main_service_name = $2
  ORDER BY
    camera.camera_name ASC;
  `;

  return query;
};

exports.deleteOutsidePrevCamera = async () => {
  return `
    DELETE FROM camera_outside_mapping
    WHERE outside_idx = $1;
  `;
};

exports.updateOutsideCamera = async () => {
  return `
    INSERT INTO camera_outside_mapping (camera_id, vms_name, main_service_name, outside_idx)
    SELECT camera_id, vms_name, main_service_name, $2
    FROM ob_camera
    WHERE camera_ip = $1
    AND main_service_name = 'inundation'
    ON CONFLICT DO NOTHING;
  `;
};

exports.updateOutsideCameraById = async () => {
  return `
    INSERT INTO camera_outside_mapping (camera_id, vms_name, main_service_name, outside_idx)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT DO NOTHING;
  `;
};

exports.getCameraIdVmsInfo = async () => {
  
  let query = `
  SELECT 
    camera.idx AS camera_idx
      , camera.camera_id
      , camera.vms_name
      , camera.main_service_name
      , camera.camera_name
      , camera.camera_ip
      , camera.camera_angle
      , camera.left_location
      , camera.top_location
      , camera.use_status
      , camera.service_type
      , camera.access_point   
      , camera.main_service_name
      , vms.vms_id
      , vms.vms_pw
      , vms.vms_ip
      , vms.vms_port
      , camera.outside_idx
      , camera.inside_idx
      , camera.dimension_type
      , camera.water_level_idx
  FROM (
    (SELECT 
      vms_id
      , vms_pw
      , vms_ip
      , vms_port
      , MAX(vms_name) AS vms_name
     FROM 
      ob_vms 
    GROUP BY 
      vms_id, vms_pw, vms_ip, vms_port
    ) vms
    JOIN
    (SELECT * FROM ob_camera) camera
    ON
      vms.vms_name = camera.vms_name
  )
  WHERE
    camera.camera_id = $1
  AND
    camera.vms_name = $2
  AND
    main_service_name = $3
  `;

  return query;
}

exports.getCameraIdVmsMainServiceInfo = async () => {
  
  let query = `
  SELECT 
    camera.idx AS camera_idx
      , camera.camera_id
      , camera.vms_name
      , camera.main_service_name
      , camera.camera_name
      , camera.camera_ip
      , camera.camera_angle
      , camera.left_location
      , camera.top_location
      , camera.use_status
      , camera.service_type
      , camera.access_point   
      , camera.main_service_name
      , vms.vms_id
      , vms.vms_pw
      , vms.vms_ip
      , vms.vms_port
      , camera.outside_idx
      , camera.inside_idx
      , camera.water_level_idx
  FROM (
    (SELECT 
      vms_id
      , vms_pw
      , vms_ip
      , vms_port
      , MAX(vms_name) AS vms_name
     FROM 
      ob_vms 
    GROUP BY 
      vms_id, vms_pw, vms_ip, vms_port
    ) vms
    JOIN
    (SELECT * FROM ob_camera) camera
    ON
      vms.vms_name = camera.vms_name
  )
  WHERE
    camera.camera_id = $1
  AND
    camera.vms_name = $2
  AND
    camera.main_service_name = $3;
  `;

  return query;
}

exports.modifyCamera = async () => {

  let query = `
  UPDATE ob_camera
  SET
    camera_angle = $2
    , outside_idx = $3
    , inside_idx = $4
    , dimension_type = $5
    , water_level_idx = $6
    , left_location = $7
    , top_location = $8
    , use_status = $11
    , camera_type = $12
    , updated_at = NOW()
  WHERE
    camera_id = $1
  AND
    vms_name = $9
  AND 
    main_service_name = $10
  `;

  return query;
}

exports. modifyCameraForInundation = async () => {
  return `
    INSERT INTO camera_outside_mapping (camera_id, vms_name, main_service_name, outside_idx)
    SELECT camera_id, vms_name, main_service_name, $2
    FROM ob_camera
    WHERE camera_ip = $1
    AND main_service_name = 'inundation'
    ON CONFLICT DO NOTHING;
  `;
};

exports.modifyCameraForInundation = async () => {
  return `
  UPDATE ob_camera
  SET
    camera_angle = $2
    , outside_idx = $3
    , inside_idx = $4
    , water_level_idx = $5
    , left_location = $6
    , top_location = $7
    , use_status = $10
    , updated_at = NOW()
  WHERE
    camera_id = $1
  AND
    vms_name = $8
  AND 
    main_service_name = $9
  `;
}

// exports.updateOutsideCameraByIdx = async () => {
//   return `
//   UPDATE ob_camera
//   SET outside_idx_for_camera = 
//       CASE
//           WHEN outside_idx_for_camera IS NULL THEN ARRAY[$2]
//           WHEN NOT ($2 = ANY(outside_idx_for_camera)) THEN outside_idx_for_camera || $2
//           ELSE outside_idx_for_camera
//       END
//   WHERE idx = $1;
//   `;
// }

exports.deleteCameraLocation = async () => {

  let query = `
  UPDATE ob_camera
  SET
    camera_angle = $2
    , outside_idx = $3
    , inside_idx = $4
    , water_level_idx = $5
    , left_location = $6
    , top_location = $7
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    main_service_name = $1
  AND
    vms_name = $2
  AND
    camera_id = $3
  `;

  return query;
}

exports.modifyCameraAlarmStatus = async () => {
  
  let query = `
  UPDATE ob_camera
  SET
    alarm_status = true
    , updated_at = NOW()
  WHERE
    main_service_name = $1
  AND
    vms_name = $2
  AND
    camera_id = $3
  `;

  return query;
}

exports.getVmsNameCameraList = async () => {
  let query = `
  
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.main_service_name   
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
    , camera.inside_idx
    , camera.water_level_idx
    , camera.linked_status
  FROM
    ob_camera AS camera
  JOIN
    ob_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    vms.vms_name = $1
  AND
    vms.main_service_name = $2
  AND
    camera.main_service_name = $3;
  `;

  return query;
}

exports.deleteVmsNameCameraList = async () => {

  let query = `
  DELETE FROM
    ob_camera
  WHERE
    vms_name = $1
  AND
    main_service_name = $2;
  `;

  return query;
}

exports.deleteInundationVmsNameCameraList = async () => {
  return [
    `
    DELETE FROM camera_outside_mapping cm
    USING ob_camera oc
    WHERE cm.vms_name = oc.vms_name
      AND cm.main_service_name = oc.main_service_name
      AND oc.vms_name = $1
      AND oc.main_service_name = $2;
    `,
    `
    DELETE FROM ob_camera
    WHERE vms_name = $1
      AND main_service_name = $2;
    `
  ];
};

exports.getAllCameraList = async () => {
  
  let query = `
  SELECT  
    idx AS camera_idx
    , camera_id
    , vms_name
    , main_service_name
    , camera_name
    , camera_ip
    , camera_angle
    , outside_idx
    , inside_idx
    , water_level_idx
    , left_location
    , top_location
    , use_status
    , service_type
    , access_point   
    , linked_status
    , alarm_status
    , camera_type
  FROM
    ob_camera
  WHERE
    main_service_name = $1
  ORDER BY
    camera_name ASC;
  `;

  return query;
}

exports.getOriginCameraList = async () => {
  
  let query = `
  SELECT  
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.main_service_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.outside_idx
    , camera.inside_idx
    , camera.dimension_type
    , outside.outside_name
    , inside.inside_name
    , inside.inside_map_image_url
    , camera.water_level_idx
    , camera.left_location
    , camera.top_location
    , camera.use_status
    , camera.service_type
    , camera.camera_type
    , camera.access_point   
    , camera.linked_status
    , camera.alarm_status
  FROM
    ob_camera camera
      LEFT OUTER JOIN
        (
          SELECT
            idx, inside_name, map_image_url AS inside_map_image_url
          FROM 
            ob_inside
        ) inside
      ON
        camera.inside_idx = inside.idx
      LEFT OUTER JOIN
        (
          SELECT
            idx, outside_name, map_image_url AS outside_map_image_url
          FROM 
            ob_outside
        ) outside
      ON
        camera.outside_idx = outside.idx
      LEFT OUTER JOIN
        (
          SELECT
            id, name as model_name
          FROM 
            three_d_models
        ) model
      ON
        camera.outside_idx = model.id
  WHERE
    camera.main_service_name = $1
  ORDER BY
    camera.idx ASC;
  `;

  return query;
}

exports.modifyLinkedStatusCamera = async () => {
  
  let query = `
  UPDATE ob_camera
  SET
    linked_status = $2
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
    , camera.main_service_name
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
    , camera.inside_idx
    , camera.water_level_idx
  FROM
    ob_camera AS camera
  JOIN
    ob_vms AS vms
  ON 
    camera.vms_name = vms.vms_name
  WHERE
    vms.vms_name = $1
  AND
    vms.main_service_name = $2
  AND
    camera.main_service_name = $3;
  `;

  return query;
}

exports.updateCameraLinkWithWaterlevel = async () => {

  let query = `
  UPDATE ob_camera
  SET
    water_level_idx = $4
    , updated_at = NOW()
  WHERE
    camera_id = $1
  AND
    vms_name = $2
  AND
    main_service_name = $3;
  `;

  return query;
}

exports.deleteOutsideCameraLocation = async () => {

  let query = `
  UPDATE ob_camera
  SET
    camera_angle = $3
    , outside_idx = $4
    , inside_idx = $5
    , water_level_idx = $6
    , left_location = $7
    , top_location = $8
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    outside_idx = $1
  AND
    main_service_name = $2;
  `;

  return query;
}

exports.modifyOutsideCameraAlarmStatus = async () => {
  
  let query = `
  UPDATE ob_camera
  SET
    alarm_status = $3
    , updated_at = NOW()
  WHERE
    outside_idx = $1
  AND
    main_service_name = $2;
  `;

  return query;
}

exports.deleteOutsideInsideCameraLocation = async () => {

  let query = `
  UPDATE ob_camera
  SET
    camera_angle = $4
    , outside_idx = $5
    , inside_idx = $6
    , water_level_idx = $7
    , left_location = $8
    , top_location = $9
    , use_status = false
    , alarm_status = false
    , updated_at = NOW()
  WHERE
    outside_idx = $1
  AND
    inside_idx = $2
  AND
    main_service_name = $3;
  `;

  return query;
}

exports.modifyOutsideInsideCameraAlarmStatus = async () => {
  
  let query = `
  UPDATE ob_camera
  SET
    alarm_status = $4
    , updated_at = NOW()
  WHERE
    outside_idx = $1
  AND
    inside_idx = $2
  AND
    main_service_name = $3;
  `;

  return query;
}

exports.getOutsideCamera = async () => {
  
  let query = `
  SELECT
    camera.idx AS camera_idx
    , camera.camera_id
    , camera.vms_name
    , camera.main_service_name
    , camera.camera_name
    , camera.camera_ip
    , camera.camera_angle
    , camera.left_location
    , camera.top_location
    , camera.use_status
    , camera.service_type
    , camera.access_point
    , camera.linked_status
    , vms.idx AS vms_idx
    , vms.vms_id
    , vms.vms_pw
    , vms.vms_ip
    , vms.vms_port
    , camera.outside_idx
    , camera.inside_idx
    , camera.water_level_idx
  FROM (
    (SELECT * FROM ob_vms WHERE main_service_name = $2) vms
    JOIN
    (SELECT * FROM 
      ob_camera 
    WHERE 
      main_service_name = $3
    AND 
      outside_idx = $1
    ) camera
    ON
      vms.vms_name = camera.vms_name
  );
  `;

  return query;
}

exports.deleteOutsideCamera = async () => {
  return `
    UPDATE ob_camera
    SET
      outside_idx = null
      , updated_at = NOW()
    WHERE
      camera_ip = $2
    AND
      main_service_name = $1;
  `
};

exports.removeCameraLocationInBuilding = async () => {
  return `
    UPDATE 
      ob_camera
    SET
      outside_idx = null
    ,  inside_idx = null
    , top_location = null
    , left_location = null
    WHERE
      outside_idx = $1
    AND
      main_service_name = $2
  `;
};

exports.removeCameraLocationInFloor = async () => {
  return `
    UPDATE 
      ob_camera
    SET
      outside_idx = null
    ,  inside_idx = null
    , top_location = null
    , left_location = null
    WHERE
      inside_idx = $1
    AND
      main_service_name = $2
  `;
};

exports.addCamera = () => {
  return `
    INSERT INTO ob_camera (
      camera_id
      , vms_name
      , main_service_name
      , camera_name
      , camera_ip
      , service_type
      , access_point
    ) VALUES (
      $1
      , $2
      , $3
      , $4
      , $5
      , $6
      , $7
    )
  `;
};

exports.removeCamera = (idxs) => {
  return `
    DELETE FROM ob_camera WHERE idx IN (${idxs})
  `;
};

exports.updateCamera = () => {
  return `
    UPDATE ob_camera 
    SET 
      camera_name=$2
      , camera_ip=$3
      , access_point=$4
    WHERE
      idx=$1
  `;
};

exports.getIndependentCameraList = () => {
  return `
    SELECT
      idx,
      camera_name,
      camera_ip,
      service_type,
      access_point
    FROM
      ob_camera 
    WHERE
      main_service_name=$1
    AND
      service_type=$2
  `;
};

exports.getIndependentCameraDetail = () => {
  return `
    SELECT
      idx,
      camera_name,
      camera_ip,
      service_type,
      access_point
    FROM
      ob_camera 
    WHERE
      main_service_name=$1
    AND
      service_type=$2
    AND
      camera_id=$3
  `;
};

exports.findCameraAccessPointByPK = () => {
  return `
    SELECT
      access_point
    FROM
      ob_camera 
    WHERE
      main_service_name=$1
    AND
      vms_name=$2
    AND
      camera_id=$3
  `;
};