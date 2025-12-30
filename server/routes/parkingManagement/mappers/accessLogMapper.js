// vehicle_number 검색해서 차량번호 미리보기, 입/출차 한달전까지 검색
exports.getVehicleNumberSearchPreview = async () => {

  let query = `
  SELECT 
    vehicle_number
  FROM
    pm_access_log 
  WHERE
    vehicle_number LIKE $1
  AND (
			out_at > TO_CHAR((NOW() - INTERVAL '1 MONTHS'), 'YYYYMMDD')
		OR
			in_at > TO_CHAR((NOW() - INTERVAL '1 MONTHS'), 'YYYYMMDD')
	)
  GROUP BY
    vehicle_number
  ORDER BY
    vehicle_number ASC;
  `;

  return query;
}


// vehicle_number 최종 검색
exports.getVehicleNumberSearch = async () => {

  let query = `
  SELECT 
    access_log.idx AS access_log_idx
    , access_log.vehicle_number
    , access_log.in_at
	  , access_log.out_at
    , access_log.vehicle_image
    , area.idx AS area_idx
    , area.area_name
    , parking_type.id AS parking_type_id
    , parking_type.parking_type_name AS parking_type_name
    , outside.idx AS outside_idx
    , outside.outside_name
    , inside.idx AS inside_idx
    , inside.inside_name
  FROM (
    (SELECT * FROM pm_access_log) AS access_log 
    LEFT JOIN
    (SELECT * FROM pm_area) AS area
    ON
      access_log.area_idx = area.idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) AS parking_type
    ON
      area.parking_type_id = parking_type.id
    LEFT JOIN
    (SELECT * FROM pm_outside) AS outside
    ON
      area.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM pm_inside) AS inside
    ON
      area.inside_idx = inside.idx
  )
  WHERE
    access_log.vehicle_number = $1
	AND
    access_log.in_at
  BETWEEN
    $2 AND $3
  ORDER BY
    vehicle_number ASC
    , in_at DESC
    , out_at DESC;
  `;

  return query;
}

// 시간별 출입 그래프
exports.getAccessTimeZone = async () => {
  
  let query = `
  SELECT 
    num.every_hour AS every_hour
    , COALESCE(access_log.use_all, 0) AS use_all
    , COALESCE(access_log.use_general, 0) AS use_general
    , COALESCE(access_log.use_compact, 0) AS use_compact
    , COALESCE(access_log.use_disabled, 0) AS use_disabled
    , COALESCE(access_log.use_electric, 0) AS use_electric
  FROM (
    (SELECT 
      LPAD(GENERATE_SERIES(0, 23)::TEXT, 2, '0') AS every_hour
    ) AS num
    LEFT JOIN 
    (SELECT 
      SUBSTRING(access_log.in_at, 10, 2) AS every_hour
      , COUNT(area.parking_type_id) AS use_all
      , COUNT(CASE WHEN area.parking_type_id = 1 THEN 1 END) AS use_general
      , COUNT(CASE WHEN area.parking_type_id = 2 THEN 1 END) AS use_compact
      , COUNT(CASE WHEN area.parking_type_id = 3 THEN 1 END) AS use_disabled
      , COUNT(CASE WHEN area.parking_type_id = 4 THEN 1 END) AS use_electric
    FROM (
      (SELECT * FROM pm_access_log) AS access_log
      JOIN
      (SELECT * FROM pm_area) AS area
      ON
        access_log.area_idx = area.idx
    )
    WHERE
      access_log.in_at
    BETWEEN
    	$1 AND $2
	  OR
		  access_log.out_at
	  BETWEEN
    	$3 AND $4
    GROUP BY
      every_hour
    ) AS access_log
    ON
      num.every_hour = access_log.every_hour
  )
  ORDER BY 
    num.every_hour ASC;
  `;

  return query;
}

// 출차 시간대별 정보
exports.getOutTimeZone = async () => {
  
  let query = `
  SELECT 
    num.every_hour AS every_hour
    , COALESCE(access_log.use_all, 0) AS use_all
    , COALESCE(access_log.use_general, 0) AS use_general
    , COALESCE(access_log.use_compact, 0) AS use_compact
    , COALESCE(access_log.use_disabled, 0) AS use_disabled
    , COALESCE(access_log.use_electric, 0) AS use_electric
  FROM (
    (SELECT 
      LPAD(GENERATE_SERIES(0, 23)::TEXT, 2, '0') AS every_hour
    ) AS num
    LEFT JOIN 
    (SELECT 
      SUBSTRING(access_log.out_at, 10, 2) AS every_hour
      , COUNT(area.parking_type_id) AS use_all
      , COUNT(CASE WHEN area.parking_type_id = 1 THEN 1 END) AS use_general
      , COUNT(CASE WHEN area.parking_type_id = 2 THEN 1 END) AS use_compact
      , COUNT(CASE WHEN area.parking_type_id = 3 THEN 1 END) AS use_disabled
      , COUNT(CASE WHEN area.parking_type_id = 4 THEN 1 END) AS use_electric
    FROM (
      (SELECT * FROM pm_access_log) AS access_log
      JOIN
      (SELECT * FROM pm_area) AS area
      ON
        access_log.area_idx = area.idx
    )
    WHERE
      access_log.out_at
    BETWEEN
      $1
    AND
      $2
    GROUP BY
      every_hour
    ) AS access_log
    ON
      num.every_hour = access_log.every_hour
  )
  ORDER BY 
    num.every_hour ASC;
  `;

  return query;
}

exports.getAccessLogList = async () => {

  let query = `
  SELECT 
    access_log.idx AS access_log_idx
    , access_log.vehicle_number
    , access_log.in_at
    , access_log.out_at
    , access_log.vehicle_image
    , area.idx AS area_idx
    , area.area_name
    , area.use_area
    , area.left_location AS area_left_location
    , area.top_location AS area_top_location
    , outside.idx AS outside_idx
    , outside.outside_name
    , inside.idx AS inside_idx
    , inside.inside_name
    , parking_type.id AS parking_type_id
    , parking_type.parking_type_name
  FROM (
    (SELECT
      *
      , CASE 
        WHEN COALESCE(in_at, '0') > COALESCE(out_at, '0') THEN in_at
        WHEN COALESCE(in_at, '0') < COALESCE(out_at, '0') THEN out_at
      END AS latest_at
    FROM 
      pm_access_log
    WHERE
      in_at
      BETWEEN $1 AND $2
	  OR
	 	  out_at
		  BETWEEN $3 AND $4
    ) access_log
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      access_log.area_idx = area.idx
    LEFT JOIN
    (SELECT * FROM pm_outside) outside
    ON
      area.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM pm_inside) inside
    ON
      area.inside_idx = inside.idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  )
  ORDER BY 
    access_log.latest_at DESC;
  `;

  return query;
}

exports.getOutSideAccessLogList = async () => {

  let query = `
  SELECT 
    access_log.idx AS access_log_idx
    , access_log.vehicle_number
    , access_log.in_at
    , access_log.out_at
    , access_log.vehicle_image
    , area.idx AS area_idx
    , area.area_name
    , area.use_area
    , area.left_location AS area_left_location
    , area.top_location AS area_top_location
    , outside.idx AS outside_idx
    , outside.outside_name
    , inside.idx AS inside_idx
    , inside.inside_name
    , parking_type.id AS parking_type_id
    , parking_type.parking_type_name
  FROM (
    (SELECT
      *
      , CASE 
        WHEN COALESCE(in_at, '0') > COALESCE(out_at, '0') THEN in_at
        WHEN COALESCE(in_at, '0') < COALESCE(out_at, '0') THEN out_at
      END AS latest_at
    FROM 
      pm_access_log
    WHERE
      in_at
      BETWEEN $1 AND $2
	  OR
	 	  out_at
		  BETWEEN $3 AND $4
    ) access_log
    LEFT JOIN
    (SELECT * FROM pm_area) area
    ON
      access_log.area_idx = area.idx
    LEFT JOIN
    (SELECT * FROM pm_outside) outside
    ON
      area.outside_idx = outside.idx
    LEFT JOIN
    (SELECT * FROM pm_inside) inside
    ON
      area.inside_idx = inside.idx
    LEFT JOIN
    (SELECT * FROM pm_parking_type) parking_type
    ON
      area.parking_type_id = parking_type.id
  )
  WHERE
    outside.idx = $5
  ORDER BY 
    access_log.latest_at DESC;
  `;

  return query;
}