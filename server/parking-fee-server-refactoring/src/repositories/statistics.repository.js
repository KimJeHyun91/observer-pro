const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

// 1. 일별 통계 (기존과 동일)
const findDailyStats = async (siteId, startDate, endDate) => {
    const query = `
        WITH date_series AS (
            SELECT generate_series($2::timestamptz, $3::timestamptz, '1 day') AS day_date
        ),
        entry_stats AS (
            SELECT date_trunc('day', entry_time) as d, COUNT(*) as cnt
            FROM pf_parking_sessions
            WHERE site_id = $1 AND entry_time BETWEEN $2 AND $3
            GROUP BY 1
        ),
        exit_stats AS (
            SELECT date_trunc('day', exit_time) as d, COUNT(*) as cnt, COALESCE(SUM(paid_fee), 0) as revenue
            FROM pf_parking_sessions
            WHERE site_id = $1 AND exit_time BETWEEN $2 AND $3 AND status IN ('COMPLETED', 'FORCE_COMPLETED')
            GROUP BY 1
        )
        SELECT 
            to_char(ds.day_date, 'DD') as day_label,
            COALESCE(es.cnt, 0) as entry_count,
            COALESCE(xs.cnt, 0) as exit_count,
            COALESCE(xs.revenue, 0) as daily_revenue
        FROM date_series ds
        LEFT JOIN entry_stats es ON ds.day_date = es.d
        LEFT JOIN exit_stats xs ON ds.day_date = xs.d
        ORDER BY ds.day_date
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// 2. 전월 매출용 (기존과 동일)
const findDailyRevenueOnly = async (siteId, startDate, endDate) => {
    const query = `
        SELECT COALESCE(SUM(paid_fee), 0) as daily_revenue
        FROM pf_parking_sessions
        WHERE site_id = $1 
          AND exit_time BETWEEN $2 AND $3
          AND status IN ('COMPLETED', 'FORCE_COMPLETED')
    `;
    // *주의: Group By 없이 전체 합만 필요하다면 위처럼, 일별 데이터가 필요하다면 기존 로직 유지
    // 대시보드 "전월 종합 수익" 숫자 하나만 필요하므로 단순화했습니다.
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    // rows[0]가 없거나 null일 수 있음 처리
    return [{ dailyRevenue: rows[0]?.daily_revenue || 0 }]; 
};
// 만약 "지난달 그래프"도 그려야 한다면 generate_series 쿼리 사용

// 3. 차종 비율 (기존과 동일)
const findVehicleRatios = async (siteId, startDate, endDate) => {
    const query = `
        SELECT vehicle_type as name, COUNT(*) as value
        FROM pf_parking_sessions
        WHERE site_id = $1 AND entry_time BETWEEN $2 AND $3
        GROUP BY vehicle_type
        ORDER BY value DESC
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

/**
 * [NEW] 4. 시간대별(0~23시) 입출차 흐름
 * - 해당 기간 동안의 0시~23시 통계를 합산하여 평균적인 시간대 흐름을 보여줍니다.
 */
const findHourlyStats = async (siteId, startDate, endDate) => {
    const query = `
        WITH hours AS (
            SELECT generate_series(0, 23) as h
        ),
        entry_stats AS (
            SELECT EXTRACT(HOUR FROM entry_time) as hour_val, COUNT(*) as cnt
            FROM pf_parking_sessions
            WHERE site_id = $1 AND entry_time BETWEEN $2 AND $3
            GROUP BY 1
        ),
        exit_stats AS (
            SELECT EXTRACT(HOUR FROM exit_time) as hour_val, COUNT(*) as cnt
            FROM pf_parking_sessions
            WHERE site_id = $1 AND exit_time BETWEEN $2 AND $3
            GROUP BY 1
        )
        SELECT 
            h as hour,
            COALESCE(es.cnt, 0) as entry_count,
            COALESCE(xs.cnt, 0) as exit_count
        FROM hours
        LEFT JOIN entry_stats es ON hours.h = es.hour_val
        LEFT JOIN exit_stats xs ON hours.h = xs.hour_val
        ORDER BY h
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

// 5. 6개월 추이 (입출차 합계 포함으로 수정)
const findMonthlyTrends = async (siteId, startDate, endDate) => {
    const query = `
        SELECT 
            to_char(exit_time, 'YY-MM') as month_label,
            COUNT(*) as total_count, -- 입출차 합계 혹은 출차 건수
            COALESCE(SUM(paid_fee), 0) as revenue
        FROM pf_parking_sessions
        WHERE site_id = $1 
          AND exit_time BETWEEN $2 AND $3
          AND status IN ('COMPLETED', 'FORCE_COMPLETED')
        GROUP BY 1
        ORDER BY 1
    `;
    const { rows } = await pool.query(query, [siteId, startDate, endDate]);
    return humps.camelizeKeys(rows);
};

module.exports = {
    findDailyStats,
    findDailyRevenueOnly,
    findVehicleRatios,
    findHourlyStats,
    findMonthlyTrends
};