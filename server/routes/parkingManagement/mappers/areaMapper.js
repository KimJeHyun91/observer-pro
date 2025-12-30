exports.getAreaList = async () => {
  
  let query = `
 SELECT 
    pm.idx
    , pm.area_name
    , pm.outside_idx
    , pm.inside_idx
    , pm.parking_type_id
    , pm.device_idx
    , pm.left_location
    , pm.top_location
    , pm.icon_width
    , pm.icon_height
    , pm.use_area
    , pd.linked_status
  FROM
    pm_area pm , pm_device pd
  WHERE
    pm.outside_idx = $1
  AND
    pm.inside_idx = $2
  AND
    pm.device_idx = pd.idx
  ORDER BY
    pm.area_name ASC;
  `;

  return query;
}

exports.addArea= async () => {
  
  let query = `
  INSERT INTO pm_area (
    area_name
    , outside_idx
    , inside_idx
    , parking_type_id
    , device_idx
    , left_location
    , top_location
    , icon_width
    , icon_height
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
  ) RETURNING idx;
  `;

  return query;
}

exports.getParkingTypeCountUsedArea = async () => {
  
  let query = `
  SELECT
    COUNT(CASE WHEN area.use_area = true THEN 1 END) AS use_all
    , COUNT(CASE WHEN area.parking_type_id = 1 AND area.use_area = true THEN 1 END) AS use_general
    , COUNT(CASE WHEN area.parking_type_id = 2 AND area.use_area = true THEN 1 END) AS use_compact
    , COUNT(CASE WHEN area.parking_type_id = 3 AND area.use_area = true THEN 1 END) AS use_disabled
    , COUNT(CASE WHEN area.parking_type_id = 4 AND area.use_area = true THEN 1 END) AS use_electric
  FROM (
    (SELECT * FROM pm_area) area
    JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  );
  `;

  return query;
}

exports.getParkingTypeCountAreaInfo = async () => {
  
  let query = `
  SELECT
    inside.inside_name
    , COUNT(area.parking_type_id) AS all
	  , COUNT(CASE WHEN area.use_area = true THEN 1 END) AS use_all
    , COUNT(CASE WHEN area.parking_type_id = 1 THEN 1 END) AS general
	  , COUNT(CASE WHEN area.parking_type_id = 1 AND area.use_area = true THEN 1 END) AS use_general
    , COUNT(CASE WHEN area.parking_type_id = 2 THEN 1 END) AS compact
	  , COUNT(CASE WHEN area.parking_type_id = 2 AND area.use_area = true THEN 1 END) AS use_compact
    , COUNT(CASE WHEN area.parking_type_id = 3 THEN 1 END) AS disabled
	  , COUNT(CASE WHEN area.parking_type_id = 3 AND area.use_area = true THEN 1 END) AS use_disabled
    , COUNT(CASE WHEN area.parking_type_id = 4 THEN 1 END) AS electric
	  , COUNT(CASE WHEN area.parking_type_id = 4 AND area.use_area = true THEN 1 END) AS use_electric
  FROM (
    (SELECT * FROM pm_inside) inside
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      inside.idx = area.inside_idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  )
  WHERE
    inside.outside_idx = $1
  AND 
	  inside.idx = $2
  GROUP BY 
    inside_name;
  `;

  return query;
}

exports.getParkingTypeCountAreaList = async () => {
  
  let query = `
  SELECT
    $1 AS outside_idx
    , inside.idx AS inside_idx
    , inside.inside_name
    , COUNT(area.parking_type_id) AS all
	  , COUNT(CASE WHEN area.use_area = true THEN 1 END) AS use_all
    , COUNT(CASE WHEN area.parking_type_id = 1 THEN 1 END) AS general
	  , COUNT(CASE WHEN area.parking_type_id = 1 AND area.use_area = true THEN 1 END) AS use_general
    , COUNT(CASE WHEN area.parking_type_id = 2 THEN 1 END) AS compact
	  , COUNT(CASE WHEN area.parking_type_id = 2 AND area.use_area = true THEN 1 END) AS use_compact
    , COUNT(CASE WHEN area.parking_type_id = 3 THEN 1 END) AS disabled
	  , COUNT(CASE WHEN area.parking_type_id = 3 AND area.use_area = true THEN 1 END) AS use_disabled
    , COUNT(CASE WHEN area.parking_type_id = 4 THEN 1 END) AS electric
	  , COUNT(CASE WHEN area.parking_type_id = 4 AND area.use_area = true THEN 1 END) AS use_electric
    , (CASE 
        WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        ELSE REGEXP_REPLACE(inside_name, '\\D', '', 'g')
      END)::INTEGER AS floor_order
  FROM (
    (SELECT * FROM pm_inside) inside
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      inside.idx = area.inside_idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  )
  WHERE
    inside.outside_idx = $2
  GROUP BY 
    inside.idx, inside_name
  ORDER BY
    floor_order ASC
    , inside_name DESC;
  `;

  return query;
}

exports.modifyAreaInfo = async () => {
  
  let query = `
  UPDATE
    pm_area
  SET
    area_name = $2
    , parking_type_id = $3
    , device_idx = $4
    , left_location = $5
    , top_location = $6
    , icon_width = $7
    , icon_height = $8
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.modifyUseAreaInfo = async () => {
  
  let query = `
  UPDATE
    pm_area
  SET
    use_area = $2
    , updated_at = NOW()
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteAreaInfo = async () => {
  
  let query = `
  DELETE FROM
    pm_area
  WHERE
    idx = $1;
  `;

  return query;
}

exports.deleteAreaOutside = async () => {
  
  let query = `
  DELETE FROM
    pm_area
  WHERE
    outside_idx = $1;
  `;

  return query;
}

exports.deleteAreaInside = async () => {
  
  let query = `
  DELETE FROM
    pm_area
  WHERE
    outside_idx = $1
  AND
    inside_idx = $2;
  `;

  return query;
}

exports.getAreaInfo = async () => {
  
  let query = `
  SELECT 
    area.idx AS area_idx
    , area.use_area
    , device.idx AS device_idx
    , device.user_id
    , device.user_pw
    , device.device_ip
    , device.device_port
    , device.device_no16
    , device.device_type
    , device.device_location
    , device.service_type AS device_service_type
    , device.use_status AS device_use_status
    , device.linked_status AS device_linked_status
    , parking_type.id AS parking_type_id
    , parking_type.parking_type_name
    , parking_type.parking_type_image
    , parking_type.parking_type_color
  FROM (
    (SELECT * FROM pm_area) area
    LEFT JOIN
    (SELECT * FROM pm_device) device
    ON
      area.device_idx = device.idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  )
  WHERE
    area.idx = $1;
  `;

  return query;
}

exports.getParkingTypeSumAreaList = async () => {
  
  let query = `
  SELECT
    inside.inside_name
    , COALESCE((SELECT outside_name FROM pm_outside WHERE idx = $1), '') AS outside_name
    , COUNT(area.parking_type_id) AS all
	  , SUM(CASE WHEN area.use_area = true THEN 1 ELSE 0 END) AS use_all
    , (CASE 
        WHEN (inside_name LIKE 'B%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        WHEN (inside_name LIKE '지하%') THEN CONCAT('-', REGEXP_REPLACE(inside_name, '\\D', '', 'g'))
        ELSE REGEXP_REPLACE(inside_name, '\\D', '', 'g')
      END)::INTEGER AS floor_order
  FROM (
    (SELECT * FROM pm_inside) inside
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      inside.idx = area.inside_idx
  )
  WHERE
    inside.outside_idx = $1
  GROUP BY 
    inside_name, floor_order
  ORDER BY
    floor_order ASC
    , inside_name DESC;
  `;

  return query;
}

exports.getBuildingList = async () => {
  
  let query = `
  SELECT 
      o.idx AS outside_idx,
      o.outside_name,
      i.idx AS inside_idx,
      i.inside_name
  FROM 
      pm_outside o
  LEFT JOIN 
      pm_inside i ON o.idx = i.outside_idx
  ORDER BY 
      o.idx, i.idx;
  `;

  return query;
}

exports.getCameraList = () => `
  SELECT 
    *
  FROM 
    ob_camera
  WHERE 
    main_service_name = 'parking';
`;

exports.getSensorList = () => `
  SELECT 
    a.*,
    d.linked_status AS status
  FROM 
    pm_area a
  LEFT JOIN 
    pm_device d ON a.device_idx = d.idx;
`;



