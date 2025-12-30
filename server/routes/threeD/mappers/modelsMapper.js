exports.insertModelsFile = async () => {
  let query = `
    INSERT INTO three_d_models (
      name,
      filename,
      service_type,
      model_type
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *;
  `;
  
  return query;
};

exports.insertDevicesFile = async () => {
  let query = `
    INSERT INTO three_d_devices (
      name
      , filename
      , type
      , description
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *;
  `;

  return query;
}

exports.getGlbModels = async () => {
  let query = `
    SELECT 
      * 
    FROM 
      three_d_models 
    WHERE 
      service_type = $1
    ORDER BY
      is_use DESC,
      name ASC;
  `;

  return query;
}

exports.getGlbModelsBuilding = async () => {
  let query = `
    SELECT 
      * 
    FROM 
      three_d_models 
    WHERE 
      service_type = $1
    AND
      model_type != 'floor'
    ORDER BY
      is_use DESC,
      name ASC;
  `;

  return query;
}

exports.saveDefaultModel = async () => {
  let query = `
    UPDATE 
      three_d_models
    SET 
      is_use = CASE
        WHEN id = $1 THEN true
        ELSE false
      END,
      camera_pos_x = CASE WHEN id = $1 THEN $3 ELSE camera_pos_x END,
      camera_pos_y = CASE WHEN id = $1 THEN $4 ELSE camera_pos_y END,
      camera_pos_z = CASE WHEN id = $1 THEN $5 ELSE camera_pos_z END,
      camera_target_x = CASE WHEN id = $1 THEN $6 ELSE camera_target_x END,
      camera_target_y = CASE WHEN id = $1 THEN $7 ELSE camera_target_y END,
      camera_target_z = CASE WHEN id = $1 THEN $8 ELSE camera_target_z END,
      camera_zoom = CASE WHEN id = $1 THEN $9 ELSE camera_zoom END
    WHERE 
      service_type = $2;
  `;
  return query;
}

exports.deleteModel = async () => {
  let query = `
    DELETE FROM 
      three_d_models
    WHERE 
      id = $1 AND 
      service_type = $2
  `;

  return query;
}

exports.savePositionModel = async () => {
  let query = `
    UPDATE 
      three_d_models
    SET 
      camera_pos_x = $3,
      camera_pos_y = $4,
      camera_pos_z = $5,
      camera_target_x = $6,
      camera_target_y = $7,
      camera_target_z = $8,
      camera_zoom = $9
    WHERE 
      id = $1 AND 
      service_type = $2;
  `;
  return query;
}

exports.threedDeviceList = async () => {
  let query = `
    SELECT 
      * 
    FROM 
      three_d_devices 
    WHERE 
      id > 0
    ORDER BY
      name asc
  `;
  return query;
}

exports.addDeviceMapping = async () => {
  let query = `
    INSERT INTO three_d_device_mapping (
      model_id,
      device_id,
      position_x,
      position_y,
      position_z,
      rotation_x,
      rotation_y,
      rotation_z,
      scale,
      linked_model_id,
      mapping_name,
      group_name
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11, $12
    )
    RETURNING *;
  `;
  return query;
}

exports.getDeviceMappings = async () => {
  let query = `
    SELECT 
      dm.*, 
      d.name,
      d.filename,
      d.type,
      d.description,
      i.map_image_url
    FROM 
    ((three_d_device_mapping dm
    JOIN three_d_devices d ON dm.device_id = d.id)
    LEFT JOIN three_d_models m ON dm.model_id = m.id)
    LEFT JOIN
      ob_inside i
      ON dm.id = i.idx
    WHERE 
      dm.model_id = $1 AND 
      m.service_type = $2
  `;
  return query;
}

exports.getAllDeviceMappings = async () => {
  let query = `
    SELECT 
      dm.*, 
      d.name,
      d.filename,
      d.type,
      d.description
    FROM 
    ((three_d_device_mapping dm
    JOIN three_d_devices d ON dm.device_id = d.id)
    JOIN three_d_models m ON dm.model_id = m.id)
    JOIN
      ob_inside i
      ON dm.id = i.idx
    WHERE 
      m.service_type = $1
  `;
  return query;
}

exports.deleteDeviceMapping = async () => {
  let query = `
    DELETE FROM 
      three_d_device_mapping
    WHERE 
      id = $1
  `;
  return query;
}