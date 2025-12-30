exports.setReceiveLprTemp = async () => {

  let query = `
  INSERT INTO 
  pf_receive_lpr_temp (
    lp
    , loop_event_time
    , loop_event_time_person
    , ip
    , port
    , direction
    , location
    , fname
    , folder_name
    , image_url_header
    , outside_ip
    , kind
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
  );
  `;

  return query;
}

exports.getReceiveLprTempCount = async () => {

  let query = `
  SELECT 
    count(*) 
  FROM 
    pf_receive_lpr_temp
  WHERE
    lp = $1;
  `;

  return query;
}

exports.deleteReceiveLprTemp = async () => {

  let query = `
  DELETE FROM
    pf_receive_lpr_temp
  WHERE
    lp = $1;
  `;

  return query;
}

exports.getReceiveLprTempLocation = async () => {

  let query = `
  SELECT * FROM 
    pf_receive_lpr_temp
  WHERE
    ip = $1
  AND 
    port = $2
  AND 
    location = $3;
  `;

  return query;
}

exports.deleteReceiveLprTempLocation = async () => {

  let query = `
  DELETE FROM
    pf_receive_lpr_temp
  WHERE
    ip = $1
  AND 
    port = $2
  AND 
    location = $3;
  `;

  return query;
}
//////////////////////////////////////////////////////////////////
// 입차정보 저장
exports.setReceiveLprInLog = async () => {

  let query = `
  INSERT INTO 
  pf_receive_lpr_log (
    lp
    , lp_type
    , in_time
    , in_time_person
    , in_ip
    , in_port
    , in_direction
    , in_location
    , in_fname
    , in_folder_name
    , in_image_url_header
    , outside_ip
    , contents
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
  ) RETURNING *
  ;
  `;

  return query;
}
// 차량번호 검색
exports.getLpVehicleInfo = async () => {

  let query = `
  SELECT 
    *
  FROM 
    pf_receive_lpr_log
  WHERE
    lp = $1
  ORDER BY
    in_time DESC
  LIMIT 1
  ;
  `;

  return query;
}
// 출차정보 저장(update)
exports.setReceiveLprOutLog = async () => {

  let query = `
  UPDATE
    pf_receive_lpr_log 
  SET
    out_time = $3
    , out_time_person = $4
    , out_ip = $5
    , out_port = $6
    , out_direction = $7
    , out_location = $8
    , out_fname = $9
    , out_folder_name = $10
    , out_image_url_header = $11
    , parking_fee = $12
    , discount_fee = $13
    , contents = $14
    , updated_at = NOW()
  WHERE
    lp = $1
  AND
    in_time = $2
  AND
    out_time IS NULL
  RETURNING *
  ;
  `;

  return query;
}
// 결제정보 저장(update)
exports.setReceiveLprPaymentLog = async () => {

  let query = `
  UPDATE
    pf_receive_lpr_log 
  SET
    parking_fee = $3
    , discount_fee = $4
    , paytype = $5
    , restype = $6
    , cardinfo = $7
    , approvno = $8
    , paydate = $9
    , paytime = $10
    , memberid = $11
    , termid = $12
    , issuer = $13
    , acquirer = $14
    , updated_at = NOW()
  WHERE
    lp = $1
  AND
    in_time = $2
  AND
    cardinfo IS NULL
  RETURNING *
  ;
  `;

  return query;
}
// 기본 날짜 범위 검색
exports.getReceiveLprBasicList = async () => {

  let query = `
  SELECT 
    lpr_log.lp
    , lpr_log.lp_type
    , lpr_log.in_time
    , lpr_log.in_time_person
    , lpr_log.out_time
    , lpr_log.out_time_person
    , CASE
        WHEN lpr_log.in_fname IS NULL THEN ''
        ELSE CONCAT('http://', outside.outside_ip, ':', outside.outside_port, lpr_log.in_image_url_header, lpr_log.in_folder_name, '/', lpr_log.in_fname)
      END AS in_image_url
    , CASE
        WHEN lpr_log.out_fname IS NULL THEN ''
        ELSE CONCAT('http://', outside.outside_ip, ':', outside.outside_port, lpr_log.out_image_url_header, lpr_log.out_folder_name, '/', lpr_log.out_fname)
      END AS out_image_url
    , CASE
        WHEN lpr_log.out_time IS NULL THEN '주차중'
        ELSE '출차'
      END AS parking_status
    , CASE
        WHEN lpr_log.parking_fee IS NULL THEN 0
        ELSE lpr_log.parking_fee
      END AS parking_fee
    , CASE
        WHEN lpr_log.pre_parking_fee IS NULL THEN 0
        ELSE lpr_log.pre_parking_fee
      END AS pre_parking_fee
    , CASE
        WHEN lpr_log.out_time IS NULL THEN 
          CEILING(
            EXTRACT(EPOCH FROM (
                NOW()
                - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
            )) / 60
          )
        ELSE CEILING(EXTRACT(EPOCH FROM (
            to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD HH24:MI:SS') 
            - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
          )) / 60)
      END AS parking_time
  FROM 
    pf_receive_lpr_log AS lpr_log
  JOIN
    pf_outside AS outside
  ON
    lpr_log.outside_ip = outside.outside_ip
  WHERE
    lpr_log.in_time_person >= $1
  AND
    lpr_log.in_time_person <= $2
  AND
    lpr_log.outside_ip = $3
  AND
    lpr_log.lp != 'Not_Recognized'
  ORDER BY
    lpr_log.in_time_person DESC
  ;
  `;

  return query;
}

// 날짜 범위 + 차량번호
exports.getReceiveLprBasicLpList = async () => {

  let query = `
  SELECT 
    lpr_log.lp
    , lpr_log.lp_type
    , lpr_log.in_time
    , lpr_log.in_time_person
    , lpr_log.out_time
    , lpr_log.out_time_person
    , lpr_log.discount_fee
    , CASE
      WHEN lpr_log.in_fname IS NULL THEN ''
      ELSE CONCAT('http://', outside.outside_ip, ':', outside.outside_port, lpr_log.in_image_url_header, lpr_log.in_folder_name, '/', lpr_log.in_fname)
    END AS in_image_url
    , CASE
        WHEN lpr_log.out_fname IS NULL THEN ''
        ELSE CONCAT('http://', outside.outside_ip, ':', outside.outside_port, lpr_log.out_image_url_header, lpr_log.out_folder_name, '/', lpr_log.out_fname)
      END AS out_image_url
    , CASE
        WHEN lpr_log.out_time IS NULL THEN '주차중'
        ELSE '출차'
      END AS parking_status
    , CASE
        WHEN lpr_log.parking_fee IS NULL THEN 0
        ELSE lpr_log.parking_fee
      END AS parking_fee
    , CASE
        WHEN lpr_log.pre_parking_fee IS NULL THEN 0
        ELSE lpr_log.pre_parking_fee
      END AS pre_parking_fee
    , CASE
        WHEN lpr_log.out_time IS NULL THEN 
          CEILING(
            EXTRACT(EPOCH FROM (
                NOW()
                - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
            )) / 60
          )
        ELSE CEILING(EXTRACT(EPOCH FROM (
            to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD HH24:MI:SS') 
            - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
          )) / 60)
      END AS parking_time
  FROM 
    pf_receive_lpr_log AS lpr_log
  JOIN
    pf_outside AS outside
  ON
    lpr_log.outside_ip = outside.outside_ip
  WHERE
    lpr_log.in_time_person >= $1
  AND
    lpr_log.in_time_person <= $2
  AND
    lpr_log.outside_ip = $3
  AND
    lpr_log.lp LIKE $4
  ORDER BY
    lpr_log.in_time_person DESC
  ;
  `;

  return query;
}
// 날짜 범위 + 차량번호 검색
// 사전 정산기 차량번호 검색(4자리)
// 출차기록이 없는 차량 검색
exports.getParkCarSearchList = async () => {

  let query = `
  SELECT 
    *
  FROM 
    pf_receive_lpr_log
  WHERE
    in_time_person >= $1
  AND
    in_time_person <= $2
  AND
    lp LIKE $3
  AND
    lp != 'Not_Recognized'
  AND
    out_time_person IS NULL
  ORDER BY
    lp ASC
  ;
  `;

  return query;
}
// 차량번호, 차량타입 변경
exports.updateReceiveLprLpTypeInfo = async () => {

  let query = `
  UPDATE 
    pf_receive_lpr_log
  SET
    lp = $2
    , lp_type = $3
    , updated_at = NOW()
  WHERE
    in_time = $1
  RETURNING *
  ;
  `;

  return query;
}
// 기본정책 검색
exports.getFeePolicy = async () => {

  let query = `
  SELECT * FROM
    pf_fee_policy
  ORDER BY
    idx ASC
  ;
  `;

  return query;
}
// 감면정책 전체 검색
exports.getReductionPolicyList = async () => {

  let query = `
  SELECT * FROM
    pf_reduction_policy
  ORDER BY
    reduction_name ASC
  ;
  `;

  return query;
}
// 감면정책 검색, 배열로 검색
exports.getReductionPolicySearchList = async () => {

  let query = `
  SELECT * FROM 
    pf_reduction_policy
  WHERE EXISTS (
    SELECT 1
    FROM unnest($1::text[]) keyword
    WHERE reduction_name ILIKE '%' || keyword || '%'
  )
  ORDER BY
    reduction_minute DESC
  ;
  `;

  return query;
}
// 등록차량 검색
exports.getRegVehicleInfo = async () => {

  let query = `
  SELECT * FROM
    pf_reg_vehicle
  WHERE
    lp = $1
  ORDER BY
    updated_at DESC
  LIMIT 1 
  ;
  `;

  return query;
}
// 차량관리, 주차현황, 정산현황
exports.getLpCurrentSituation = async () => {

  let query = `
  SELECT 
    SUM(CASE WHEN lp_type='일반차량' AND lp != 'Not_Recognized' AND in_time IS NOT NULL THEN 1 ELSE 0 END) AS in_general_vehicles
    , SUM(CASE WHEN lp_type='일반차량' AND lp != 'Not_Recognized' AND out_time IS NOT NULL THEN 1 ELSE 0 END) AS out_general_vehicles
    , SUM(CASE WHEN lp_type<>'일반차량' AND lp != 'Not_Recognized' AND in_time IS NOT NULL THEN 1 ELSE 0 END) AS in_reg_vehicles
    , SUM(CASE WHEN lp_type<>'일반차량' AND lp != 'Not_Recognized' AND out_time IS NOT NULL THEN 1 ELSE 0 END) AS out_reg_vehicles
    , SUM(CASE WHEN in_fname IS NULL AND lp != 'Not_Recognized' AND in_time IS NOT NULL THEN 1 ELSE 0 END) AS in_manual_vehicles
    , SUM(CASE WHEN out_fname IS NULL AND lp != 'Not_Recognized' AND out_time IS NOT NULL THEN 1 ELSE 0 END) AS out_manual_vehicles
    , SUM(
        CASE 
          WHEN out_time IS NOT NULL 
          AND parking_fee > 0
          THEN parking_fee 
          ELSE 0 
        END
    ) AS parking_fee
    , SUM(
        CASE 
          WHEN out_time IS NOT NULL 
          AND pre_parking_fee > 0
          THEN pre_parking_fee 
          ELSE 0 
        END
    ) AS pre_parking_fee
    , SUM(
        CASE 
          WHEN out_time IS NOT NULL 
          AND cardinfo IS NULL 
          AND pre_cardinfo IS NULL 
          AND parking_fee > 0
          THEN parking_fee 
          ELSE 0 
        END
    ) AS cash
  FROM 
    pf_receive_lpr_log
  WHERE
    in_time_person >= $1
  AND
    in_time_person <= $2
  AND
    outside_ip = $3
  ;
  `;

  return query;
}
// 차량관리, 해당 차량 총 결제내역
// union 사용함
// 첫번재 테이블은 출차계산
// 두번째 테이블은 사전정산계산
exports.getLpPaymentDetailList = async () => {

  let query = `
  SELECT * FROM (
    SELECT 
      lp
      , in_time
      , out_time
      , issuer
      , lp_type
      , CASE
          WHEN contents IS NULL THEN ''
          ELSE contents
        END AS contents
      , CASE
          WHEN paydate IS NULL THEN TO_CHAR(TO_TIMESTAMP(out_time_person, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD')
          ELSE CONCAT(SUBSTRING(paydate FROM 1 FOR 4), '-', SUBSTRING(paydate FROM 5 FOR 2), '-', SUBSTRING(paydate FROM 7 FOR 2))
        END AS paydate
      , CASE
          WHEN paytime IS NULL THEN TO_CHAR(TO_TIMESTAMP(out_time_person, 'YYYY-MM-DD HH24:MI:SS'), 'HH24:MI:SS')
          ELSE CONCAT(SUBSTRING(paytime FROM 1 FOR 2), ':', SUBSTRING(paytime FROM 3 FOR 2), ':', SUBSTRING(paytime FROM 5 FOR 2))
        END AS paytime
      , CASE
          WHEN parking_fee IS NULL THEN 0
          ELSE parking_fee
        END AS parking_fee
    FROM
      pf_receive_lpr_log
    WHERE
      in_time_person >= $1
    AND
      in_time_person <= $2
    AND
      outside_ip = $3
    AND
      lp = $4
    AND
      parking_fee IS NOT NULL

    UNION ALL

    SELECT 
      lp
      , in_time
      , out_time
      , issuer
      , lp_type
      , CASE
          WHEN contents IS NULL THEN ''
          ELSE contents
        END AS contents
      , CASE
          WHEN pre_paydate IS NULL THEN TO_CHAR(TO_TIMESTAMP(out_time_person, 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD')
          ELSE CONCAT(SUBSTRING(pre_paydate FROM 1 FOR 4), '-', SUBSTRING(pre_paydate FROM 5 FOR 2), '-', SUBSTRING(pre_paydate FROM 7 FOR 2))
        END AS paydate
      , CASE
          WHEN pre_paytime IS NULL THEN TO_CHAR(TO_TIMESTAMP(out_time_person, 'YYYY-MM-DD HH24:MI:SS'), 'HH24:MI:SS')
          ELSE CONCAT(SUBSTRING(pre_paytime FROM 1 FOR 2), ':', SUBSTRING(pre_paytime FROM 3 FOR 2), ':', SUBSTRING(pre_paytime FROM 5 FOR 2))
        END AS paytime
      , CASE
          WHEN pre_parking_fee IS NULL THEN 0
          ELSE pre_parking_fee
        END AS parking_fee
    FROM
      pf_receive_lpr_log
    WHERE
      in_time_person >= $1
    AND
      in_time_person <= $2
    AND
      outside_ip = $3
    AND
      lp = $4
    AND
      pre_parking_fee IS NOT NULL
  )
  ORDER BY
    out_time DESC
  ;
  `;

  return query;
}

// 차량번호검색(할인내역, 정산내역)
exports.getLpPaymentDetailInfo = async () => {

  let query = `
  SELECT
    lpr_log.lp
    , lpr_log.lp_type
    , lpr_log.in_time
    , lpr_log.in_time_person
    , lpr_log.out_time
    , lpr_log.out_time_person
    , reduction_policy.idx AS reduction_policy_idx
    , reduction_policy.reduction_name
    , CASE
      WHEN reduction_policy.contents IS NULL THEN ''
      ELSE reduction_policy.contents
    END AS contents
    , CASE
      WHEN lpr_log.parking_fee IS NULL THEN 0
      ELSE lpr_log.parking_fee
    END AS parking_fee
    , CASE
      WHEN lpr_log.pre_parking_fee IS NULL THEN 0
      ELSE lpr_log.pre_parking_fee
    END AS pre_parking_fee
    , CASE
      WHEN lpr_log.discount_fee IS NULL THEN 0
      ELSE lpr_log.discount_fee
    END AS discount_fee
    , CASE
      WHEN lpr_log.out_time IS NULL THEN 
        CEILING(
          EXTRACT(EPOCH FROM (
              NOW()
              - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
          )) / 60
        )
      ELSE CEILING(EXTRACT(EPOCH FROM (
          to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD HH24:MI:SS') 
          - to_timestamp(lpr_log.in_time_person, 'YYYY-MM-DD HH24:MI:SS')
        )) / 60)
    END AS parking_time
  FROM 
    pf_receive_lpr_log AS lpr_log
  LEFT JOIN
    pf_reduction_policy AS reduction_policy
  ON
    lpr_log.lp_type = reduction_policy.reduction_name
  WHERE
    lpr_log.lp = $1
  AND
    lpr_log.in_time = $2
  ;
  `;

  return query;
}

// 일일 종합 수익
exports.getDailyRevenue = async () => {

  let query = `
  SELECT
    to_char(c_date.date, 'YYYY-MM-DD') AS date
    , c_date.weekday
    , SUM(COALESCE(lpr_log.parking_fee, 0) + COALESCE(lpr_log.pre_parking_fee, 0)) AS fee
  FROM (
    SELECT
      current_date - 1 - s.day AS date
      , CASE EXTRACT(DOW FROM current_date - s.day)
		    WHEN 0 THEN '일'
		    WHEN 1 THEN '월'
		    WHEN 2 THEN '화'
		    WHEN 3 THEN '수'
		    WHEN 4 THEN '목'
		    WHEN 5 THEN '금'
		    WHEN 6 THEN '토'
		  END AS weekday
    FROM 
      generate_series(0, 6) AS s(day)
  ) AS c_date
  LEFT JOIN
    pf_receive_lpr_log AS lpr_log
  ON 
    to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD HH24:MI:SS') >= c_date.date
  AND 
    to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD HH24:MI:SS') <=  c_date.date + interval '1 day'
  AND
    lpr_log.lp != 'Not_Recognized'
  AND
    outside_ip = $1
  GROUP BY
    c_date.date
    , c_date.weekday
  ORDER BY 
    c_date.date ASC
  ;
  `;

  return query;
}

// 종합 수익 보고
exports.getTotalRevenue = async () => {

  let query = `
  SELECT 
    a.seq
    , to_char(a.week_start, 'YYYY-MM-DD') AS week_start
    , to_char(a.week_end, 'YYYY-MM-DD') AS week_end
    , a.week_parking_fee
    
    , to_char(b.month_start, 'YYYY-MM-DD') AS month_start
    , to_char(b.month_end, 'YYYY-MM-DD') AS month_end
    , b.month_parking_fee
  FROM (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY week_start) AS seq
      , t_week.week_start
      , t_week.week_end
      , SUM(COALESCE(lpr_log.parking_fee, 0) + COALESCE(lpr_log.pre_parking_fee, 0)) AS week_parking_fee
    FROM (
      SELECT 
        week_start
        , (week_start + 6) AS week_end
      FROM (
        SELECT
        generate_series(
          date_trunc('week', current_date) - interval '5 weeks',
          date_trunc('week', current_date),
          interval '1 week'
        )::date AS week_start
      ) 
    ) AS t_week
    LEFT JOIN
      pf_receive_lpr_log AS lpr_log
    ON 
      to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD') >= t_week.week_start
    AND 
      to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD') <= t_week.week_end
    AND
      lpr_log.lp != 'Not_Recognized'
    AND
      outside_ip = $1
    GROUP BY
      t_week.week_start
      , t_week.week_end
    ORDER BY 
        t_week.week_start ASC
  ) a
  JOIN (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY month_start) AS seq
      , t_month.month_start
      , t_month.month_end
      , SUM(COALESCE(lpr_log.parking_fee, 0) + COALESCE(lpr_log.pre_parking_fee, 0)) AS month_parking_fee
    FROM (
        SELECT 
          month_start
          , (month_start + interval '1 month - 1 day')::date AS month_end
        FROM (
          SELECT
          generate_series(
            date_trunc('month', current_date) - interval '5 months',
            date_trunc('month', current_date),
            interval '1 month'
          )::date AS month_start
        ) 
    ) AS t_month
    LEFT JOIN
      pf_receive_lpr_log AS lpr_log
    ON 
      to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD') >= t_month.month_start
    AND 
      to_timestamp(lpr_log.out_time_person, 'YYYY-MM-DD') <= t_month.month_end
    AND
      lpr_log.lp != 'Not_Recognized'
    AND
      outside_ip = $1
    GROUP BY
      t_month.month_start
      , t_month.month_end
    ORDER BY 
      t_month.month_start ASC
  ) b
  ON a.seq = b.seq
  ;
  `;

  return query;
}

// 차량종류 비율
exports.getDailyLpTypeRatio = async () => {

  let query = `
  SELECT 
    DISTINCT(lp_type) AS lp_type
    , COUNT(*) AS lp_type_count
    , ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS ratio
  FROM 
    pf_receive_lpr_log
  WHERE
    out_time_person >= $1
  AND
    out_time_person <= $2
  AND
    lp != 'Not_Recognized'
  AND
    outside_ip = $3
  GROUP BY
    lp_type
  ;
  `;

  return query;
}

// 시간대별 입출차 흐름
exports.getDailyTimeFlow = async () => {

  let query = `
  SELECT
    series AS hour
    , COALESCE(hour_in_count, 0) AS hour_in_count
    , COALESCE(hour_out_count, 0) AS hour_out_count
  FROM (
    SELECT generate_series(0, 23) AS series
  ) AS hour
  LEFT JOIN (
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour_in_lpr_log
      , COUNT(*) AS hour_in_count
    FROM 
      pf_receive_lpr_log AS in_lpr_log
    WHERE 
      in_time_person >= $1
    AND 
      in_time_person <= $2
    AND
      lp != 'Not_Recognized'
    AND
      outside_ip = $3
    GROUP BY 
      hour_in_lpr_log
  )
  ON
    series = hour_in_lpr_log
  LEFT JOIN (
    SELECT
      EXTRACT(HOUR FROM created_at) AS hour_out_lpr_log
      , COUNT(*) AS hour_out_count
    FROM 
      pf_receive_lpr_log AS out_lpr_log
    WHERE 
      out_time_person >= $1
    AND 
      out_time_person <= $2
    AND
      lp != 'Not_Recognized'
    AND
      outside_ip = $3
    GROUP BY 
      hour_out_lpr_log
  )
  ON
    series = hour_out_lpr_log
  ORDER BY 
    hour
  ;
  `;

  return query;
}

// 유동차량: 일 단위
exports.getDailyFloatingVehicle = async () => {

  let query = `
  SELECT
    a.seq
    , to_char(a.date_series, 'YYYY-MM-DD') AS date_series
    , a.in_date_count
    , b.out_date_count
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY date_series) AS seq
      , a_date.date_series
      , count(in_date_count) AS in_date_count
    FROM (
      SELECT 
        date_series
      FROM (
        SELECT
        generate_series(
          CURRENT_DATE - $1::integer,
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date_series
      ) 
    ) AS a_date
    LEFT JOIN (
      SELECT
        TO_CHAR(in_time_person::timestamp, 'YYYY-MM-DD') AS in_time_person
        , count(in_time_person) AS in_date_count
      FROM
        pf_receive_lpr_log 
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        in_time_person
    ) AS in_date_lpr_log
    ON
      to_timestamp(in_date_lpr_log.in_time_person, 'YYYY-MM-DD') = a_date.date_series
    GROUP BY 
      a_date.date_series
    ORDER BY
      a_date.date_series
  ) a
  JOIN (
    SELECT
      ROW_NUMBER() OVER (ORDER BY date_series) AS seq
      , b_date.date_series
      , count(out_date_count) AS out_date_count
    FROM (
      SELECT 
        date_series
      FROM (
        SELECT
        generate_series(
          CURRENT_DATE - $1::integer,
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date_series
      ) 
    ) AS b_date
    LEFT JOIN (
      SELECT
        TO_CHAR(out_time_person::timestamp, 'YYYY-MM-DD') AS out_time_person
        , count(out_time_person) AS out_date_count
      FROM
        pf_receive_lpr_log AS out_date_lpr_log
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        out_time_person
    )
    ON
      to_timestamp(out_time_person, 'YYYY-MM-DD') = b_date.date_series
    GROUP BY 
      b_date.date_series
    ORDER BY
      b_date.date_series
  ) b
  ON
    a.seq = b.seq
  ;
  `;

  return query;
}

// 유동차량: 주 단위
exports.getWeeksFloatingVehicle = async () => {

  let query = `
  SELECT
    a.seq
    , to_char(a.week_start, 'YYYY-MM-DD') AS week_start
    , to_char(a.week_end, 'YYYY-MM-DD') AS week_end
    , a.in_week_count
    , b.out_week_count
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY week_start) AS seq
      , a_week.week_start
      , a_week.week_end
      , count(in_week_count) AS in_week_count
    FROM (
      SELECT 
        week_start
        , (week_start + 6) AS week_end
      FROM (
        SELECT
        generate_series(
          date_trunc('week', current_date) - ($1 * interval '1 weeks'),
          date_trunc('week', current_date),
          interval '1 week'
        )::date AS week_start
      ) 
    ) AS a_week
    LEFT JOIN (
      SELECT
        TO_CHAR(in_time_person::timestamp, 'YYYY-MM-DD') AS in_time_person
        , count(in_time_person) AS in_week_count
      FROM
        pf_receive_lpr_log 
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        in_time_person
    ) AS in_week_lpr_log
    ON
      to_timestamp(in_week_lpr_log.in_time_person, 'YYYY-MM-DD') >= a_week.week_start
    AND
      to_timestamp(in_week_lpr_log.in_time_person, 'YYYY-MM-DD') <= a_week.week_end
    GROUP BY 
      a_week.week_start
      , a_week.week_end
    ORDER BY
      a_week.week_start
  ) a
  JOIN (
    SELECT
      ROW_NUMBER() OVER (ORDER BY week_start) AS seq
      , b_week.week_start
      , b_week.week_end
      , count(out_week_count) AS out_week_count
    FROM (
      SELECT 
        week_start
        , (week_start + 6) AS week_end
      FROM (
        SELECT
        generate_series(
          date_trunc('week', current_date) - ($1 * interval '1 weeks'),
          date_trunc('week', current_date),
          interval '1 week'
        )::date AS week_start
      ) 
    ) AS b_week
    LEFT JOIN (
      SELECT
        TO_CHAR(out_time_person::timestamp, 'YYYY-MM-DD') AS out_time_person
        , count(out_time_person) AS out_week_count
      FROM
        pf_receive_lpr_log
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        out_time_person
    ) AS out_week_lpr_log
    ON
      to_timestamp(out_week_lpr_log.out_time_person, 'YYYY-MM-DD') >= b_week.week_start
    AND
      to_timestamp(out_week_lpr_log.out_time_person, 'YYYY-MM-DD') <= b_week.week_end
    GROUP BY 
      b_week.week_start
      , b_week.week_end
    ORDER BY
      b_week.week_start
  ) b
  ON
    a.seq = b.seq
  ;
  `;

  return query;
}

// 유동차량: 월 단위
exports.getMonthsFloatingVehicle = async () => {

  let query = `
  SELECT
    a.seq
    , to_char(a.month_start, 'YYYY-MM-DD') AS month_start
    , to_char(a.month_end, 'YYYY-MM-DD') AS month_end
    , a.in_month_count
    , b.out_month_count
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY month_start) AS seq
      , a_month.month_start
      , a_month.month_end
      , count(in_month_count) AS in_month_count
    FROM (
      SELECT 
        month_start
        , (month_start + interval '1 month - 1 day')::date AS month_end
      FROM (
        SELECT
        generate_series(
          date_trunc('month', current_date) - ($1 * interval '1 months'),
          date_trunc('month', current_date),
          interval '1 month'
        )::date AS month_start
      ) 
    ) AS a_month
    LEFT JOIN (
      SELECT
        TO_CHAR(in_time_person::timestamp, 'YYYY-MM-DD') AS in_time_person
        , count(in_time_person) AS in_month_count
      FROM
        pf_receive_lpr_log 
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        in_time_person
    ) AS in_month_lpr_log
    ON
      to_timestamp(in_month_lpr_log.in_time_person, 'YYYY-MM-DD') >= a_month.month_start
    AND
      to_timestamp(in_month_lpr_log.in_time_person, 'YYYY-MM-DD') <= a_month.month_end
    GROUP BY 
      a_month.month_start
      , a_month.month_end
    ORDER BY
      a_month.month_start
  ) a
  JOIN (
    SELECT
      ROW_NUMBER() OVER (ORDER BY month_start) AS seq
      , b_month.month_start
      , b_month.month_end
      , count(out_month_count) AS out_month_count
    FROM (
      SELECT 
        month_start
        , (month_start + interval '1 month - 1 day')::date AS month_end
      FROM (
        SELECT
        generate_series(
          date_trunc('month', current_date) - ($1 * interval '1 months'),
          date_trunc('month', current_date),
          interval '1 month'
        )::date AS month_start
      ) 
    ) AS b_month
    LEFT JOIN (
      SELECT
        TO_CHAR(out_time_person::timestamp, 'YYYY-MM-DD') AS out_time_person
        , count(out_time_person) AS out_month_count
      FROM
        pf_receive_lpr_log 
      WHERE 
        lp != 'Not_Recognized'
      AND
        outside_ip = $2
      GROUP BY 
        out_time_person
    ) AS out_month_lpr_log
    ON
      to_timestamp(out_month_lpr_log.out_time_person, 'YYYY-MM-DD') >= b_month.month_start
    AND
      to_timestamp(out_month_lpr_log.out_time_person, 'YYYY-MM-DD') <= b_month.month_end
    GROUP BY 
      b_month.month_start
      , b_month.month_end
    ORDER BY
      b_month.month_start
  ) b
  ON
    a.seq = b.seq
  ;
  `;

  return query;
}

// 당월 이용률
exports.getCurrentMonthUsageRate = async () => {

  let query = `
  SELECT
    ROW_NUMBER() OVER (ORDER BY month_start) AS seq
    , to_char(month_start, 'YYYY-MM-DD') AS month_start
    , to_char(month_end, 'YYYY-MM-DD') AS month_end
    , CASE 
      WHEN SUM(general_vehicles) > 0
      THEN SUM(general_vehicles) 
      ELSE 0
    END AS general_vehicles
    , CASE 
      WHEN SUM(registered_vehicles) > 0
      THEN SUM(registered_vehicles) 
      ELSE 0
    END AS registered_vehicles
    , CASE 
      WHEN SUM(general_vehicles) + SUM(registered_vehicles) > 0
      THEN SUM(general_vehicles) + SUM(registered_vehicles)
      ELSE 0
    END AS total_vehicles
  FROM (
    SELECT 
      month_start
      , (month_start + interval '1 month - 1 day')::date AS month_end
    FROM (
      SELECT
      generate_series(
        date_trunc('month', current_date) - ($1 * interval '1 months'),
        date_trunc('month', current_date),
        interval '1 month'
      )::date AS month_start
    ) 
  )
  LEFT JOIN (
    SELECT
      out_time_person
      , CASE 
        WHEN lp_type='일반차량' 
        AND lp != 'Not_Recognized' 
        AND out_time IS NOT NULL 
        THEN 1 
        ELSE 0 
      END AS general_vehicles
      , CASE 
        WHEN lp_type<>'일반차량' 
        AND lp != 'Not_Recognized' 
        AND out_time IS NOT NULL 
        THEN 1 
        ELSE 0 
      END AS registered_vehicles
    FROM
      pf_receive_lpr_log 
    WHERE 
      lp != 'Not_Recognized'
    AND
      outside_ip = $2
    GROUP BY 
      out_time_person
      , general_vehicles
      , registered_vehicles
  ) AS out_month_lpr_log
  ON
    to_timestamp(out_month_lpr_log.out_time_person, 'YYYY-MM-DD') >= month_start
  AND
    to_timestamp(out_month_lpr_log.out_time_person, 'YYYY-MM-DD') <= month_end
  GROUP BY
    month_start
    , month_end
  ORDER BY
    month_start
  ;
  `;

  return query;
}