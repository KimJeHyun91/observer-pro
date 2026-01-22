const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

// =================================================================
// 1. [Widget 1] 일일 종합 수익 (Line Chart)
// =================================================================
exports.findDailyRevenueGraph = async (siteId, startDate, endDate) => {
    const query = `
        SELECT 
            -- [Check] 한국 시간으로 변환하여 날짜 밀림 방지
            to_char(ds.day_date AT TIME ZONE 'Asia/Seoul', 'DD') as day_label,
            COALESCE(SUM(ps.paid_fee), 0) as daily_revenue
        FROM generate_series($2::timestamptz, $3::timestamptz, '1 day') AS ds(day_date)
        LEFT JOIN pf_parking_sessions ps 
            ON ps.site_id = $1 
            -- [Check] 한국 시간 기준으로 JOIN
            AND date_trunc('day', ps.exit_time AT TIME ZONE 'Asia/Seoul') = date_trunc('day', ds.day_date AT TIME ZONE 'Asia/Seoul')
            AND ps.status IN ('COMPLETED', 'FORCE_COMPLETED')
        GROUP BY ds.day_date
        ORDER BY ds.day_date
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// =================================================================
// 2. [Widget 2] 종합 수익 보고 (범용 비교 함수)
// =================================================================
exports.findRevenueComparison = async (siteId, prevStart, currentStart, currentEnd) => {
    const query = `
        SELECT 
            COALESCE(SUM(CASE 
                WHEN exit_time >= $3::timestamptz AND exit_time <= $4::timestamptz 
                THEN paid_fee ELSE 0 
            END), 0) as current_revenue,
            
            COALESCE(SUM(CASE 
                WHEN exit_time >= $2::timestamptz AND exit_time < $3::timestamptz 
                THEN paid_fee ELSE 0 
            END), 0) as prev_revenue
        FROM pf_parking_sessions
        WHERE site_id = $1 
          AND exit_time >= $2::timestamptz 
          AND exit_time <= $4::timestamptz
          AND status IN ('COMPLETED', 'FORCE_COMPLETED')
    `;
    const { rows } = await pool.query(query, [siteId, prevStart, currentStart, currentEnd]);
    return humps.camelizeKeys(rows[0]);
};

// =================================================================
// 3. [Widget 3] 유동 차량 (Bar Chart - Entry vs Exit)
// =================================================================
exports.findTrafficMonthly = async (siteId, yearStartDate, yearEndDate) => {
    const query = `
        WITH month_series AS (
            -- [핵심 수정] 입력된 날짜를 한국 시간으로 변환 후, '월 초(1일)'로 고정하여 시리즈 생성
            SELECT generate_series(
                date_trunc('month', $2::timestamptz AT TIME ZONE 'Asia/Seoul'), 
                date_trunc('month', $3::timestamptz AT TIME ZONE 'Asia/Seoul'), 
                '1 month'::interval
            ) AS month_date
        )
        SELECT 
            -- month_date는 이미 한국 시간(timestamp without time zone)입니다.
            to_char(ms.month_date, 'MM') || '월' as label,
            
            (
                SELECT COUNT(*) 
                FROM pf_parking_sessions 
                WHERE site_id = $1 
                  -- 입차 시간도 한국 시간 월초로 잘라서 비교 (=)
                  AND date_trunc('month', entry_time AT TIME ZONE 'Asia/Seoul') = ms.month_date
            ) as entry_count,
            
            (
                SELECT COUNT(*) 
                FROM pf_parking_sessions 
                WHERE site_id = $1 
                  AND date_trunc('month', exit_time AT TIME ZONE 'Asia/Seoul') = ms.month_date
                  AND status IN ('COMPLETED', 'FORCE_COMPLETED')
            ) as exit_count
            
        FROM month_series ms
        ORDER BY ms.month_date
    `;
    const { rows } = await pool.query(query, [siteId, yearStartDate, yearEndDate]);
    return humps.camelizeKeys(rows);
};

// =================================================================
// 4. [Widget 4] 차량 종류 비율 (Donut Chart)
// =================================================================
exports.findVehicleTypeRatio = async (siteId, startDate, endDate) => {
    const query = `
        SELECT 
            vehicle_type as name, 
            COUNT(*) as value
        FROM pf_parking_sessions
        WHERE site_id = $1 
          AND entry_time >= $2::timestamptz 
          AND entry_time <= $3::timestamptz
        GROUP BY vehicle_type
        ORDER BY value DESC
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// =================================================================
// 5. [Widget 5] 시간대별 입출차 흐름 (Spline Chart)
// =================================================================
exports.findHourlyTrafficFlow = async (siteId, startDate, endDate) => {
    const query = `
        WITH hours AS (
            SELECT generate_series(0, 23) as h
        )
        SELECT 
            h as hour,
            (
                SELECT COUNT(*) 
                FROM pf_parking_sessions 
                WHERE site_id = $1 
                  AND entry_time >= $2::timestamptz 
                  AND entry_time <= $3::timestamptz
                  -- [Check] UTC 시간을 KST로 변환 후 시간(Hour) 추출 (09시->09시 유지)
                  AND EXTRACT(HOUR FROM entry_time AT TIME ZONE 'Asia/Seoul')::int = h
            ) as entry_count,
            (
                SELECT COUNT(*) 
                FROM pf_parking_sessions 
                WHERE site_id = $1 
                  AND exit_time >= $2::timestamptz 
                  AND exit_time <= $3::timestamptz
                  AND EXTRACT(HOUR FROM exit_time AT TIME ZONE 'Asia/Seoul')::int = h
            ) as exit_count
        FROM hours
        ORDER BY h
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// =================================================================
// 6. [Widget 6] 당월(6개월) 이용률 추이 (Bar Chart)
// =================================================================
exports.findMonthlyUsageTrend = async (siteId, startDate, endDate) => {
    const query = `
        SELECT 
            -- [Check] 월 단위 집계 시에도 타임존 변환 필수 (월말/월초 데이터 보호)
            to_char(entry_time AT TIME ZONE 'Asia/Seoul', 'YY-MM') as month_label,
            COUNT(*) as total_count
        FROM pf_parking_sessions
        WHERE site_id = $1 
          AND entry_time >= $2::timestamptz 
          AND entry_time <= $3::timestamptz
        GROUP BY 1
        ORDER BY 1
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// =================================================================
// 기간별 통계 요약 조회 (Range Statistics)
// =================================================================
exports.findSummaryByRange = async (siteId, startTime, endTime) => {
    // 통계에 포함할 유효한 완료 상태 목록 정의
    // COMPLETED: 정상 출차
    // FORCE_COMPLETED: 관리자 강제 출차 (미수 or 정상)
    // RUNAWAY: 도주 (미수 발생)
    const validStatuses = "'COMPLETED', 'FORCE_COMPLETED', 'RUNAWAY'";

    const query = `
        SELECT 
            -- 1. Traffic (입차/출차)
            -- 입차는 모든 차량 포함 (도주 차량도 입차는 했으므로)
            -- 단, CANCELED(오인식)는 허수이므로 제외하는 것이 정확함
            COUNT(CASE 
                WHEN entry_time >= $2::timestamptz AND entry_time <= $3::timestamptz 
                     AND status != 'CANCELED' -- 취소된 건은 입차 통계에서도 제외
                THEN 1 
            END) as entry_count,

            COUNT(CASE 
                WHEN exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                     AND status IN (${validStatuses})
                THEN 1 
            END) as exit_count,

            -- 평균 주차 시간
            COALESCE(ROUND(AVG(CASE 
                WHEN status IN (${validStatuses}) 
                     AND exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                THEN duration ELSE NULL 
            END)), 0) as avg_duration,

            -- 최장 주차 시간
            COALESCE(MAX(CASE 
                WHEN status IN (${validStatuses}) 
                     AND exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                THEN duration ELSE 0 
            END), 0) as max_duration,
            
            -- 2. Revenue (실 매출)
            -- 도주 차량은 paid_fee가 0일 테니 합산해도 문제없음
            COALESCE(SUM(CASE 
                WHEN status IN (${validStatuses}) 
                     AND exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                THEN paid_fee ELSE 0 
            END), 0) as total_settled_amount,

            -- 3. Discount (할인 금액)
            COALESCE(SUM(CASE 
                WHEN status IN (${validStatuses}) 
                     AND exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                THEN discount_fee ELSE 0 
            END), 0) as total_discount_amount,

            -- 4. Loss (미지불/손실 금액) 
            -- ★ RUNAWAY가 여기서 가장 중요합니다 (remaining_fee가 높을 것임)
            COALESCE(SUM(CASE 
                WHEN status IN (${validStatuses}) 
                     AND exit_time >= $2::timestamptz AND exit_time <= $3::timestamptz 
                THEN remaining_fee ELSE 0 
            END), 0) as total_loss_amount,

            -- 5. Estimated Unpaid (현재 주차 중인 차량)
            -- PENDING 상태는 그대로 유지
            COALESCE(SUM(CASE 
                WHEN status = 'PENDING' 
                THEN total_fee ELSE 0 
            END), 0) as estimated_unpaid_amount

        FROM pf_parking_sessions
        WHERE site_id = $1
    `;
    
    const { rows } = await pool.query(query, [siteId, startTime, endTime]);
    return humps.camelizeKeys(rows[0]);
};