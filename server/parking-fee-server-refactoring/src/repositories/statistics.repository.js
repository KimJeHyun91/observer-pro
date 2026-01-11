const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

class StatisticsRepository {

    /**
     * 오늘 입차/출차 수 집계 (COUNT)
     * - entry_time, exit_time 기준
     */
    async getTrafficCounts(siteId, startOfDay) {
        const query = `
            SELECT
                COUNT(CASE WHEN entry_time >= $2 THEN 1 END) as entry_count,
                COUNT(CASE WHEN exit_time >= $2 THEN 1 END) as exit_count
            FROM pf_parking_sessions
            WHERE site_id = $1
        `;
        // *참고: 만약 '오늘 입차한 차량'만 보는게 아니라 
        // '과거에 입차했어도 오늘 출차한 차량'도 출차 카운트에 넣으려면 위 쿼리가 맞음.
        
        const { rows } = await pool.query(query, [siteId, startOfDay]);
        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 오늘 확정 매출 및 손실(미수금) 집계
     */
    async getSettledRevenue(siteId, startOfDay) {
        // 1. total_paid: 실제 결제된 금액
        // 2. total_discount: 할인된 금액
        // 3. total_loss: 강제 출차(FORCE_COMPLETED)로 인한 미납 차액 (총요금 - 할인 - 결제)
        
        const query = `
            SELECT
                COALESCE(SUM(paid_fee), 0) as total_paid,
                COALESCE(SUM(discount_fee), 0) as total_discount,
                COALESCE(SUM(
                    CASE 
                        WHEN status = 'FORCE_COMPLETED' THEN (total_fee - discount_fee - paid_fee)
                        ELSE 0 
                    END
                ), 0) as total_loss
            FROM pf_parking_sessions
            WHERE site_id = $1 
              AND exit_time >= $2
              AND status IN ('COMPLETED', 'FORCE_COMPLETED')
        `;
        
        const { rows } = await pool.query(query, [siteId, startOfDay]);
        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 현재 주차 중인 차량 목록 조회 (Raw Data)
     * - 예상 매출 계산을 위해 필요한 최소한의 필드만 조회
     */
    async getActiveSessions(siteId) {
        const query = `
            SELECT entry_time, paid_fee, discount_fee
            FROM pf_parking_sessions
            WHERE site_id = $1
              AND status IN ('PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING')
        `;
        
        const { rows } = await pool.query(query, [siteId]);
        return humps.camelizeKeys(rows);
    }
}

module.exports = StatisticsRepository;