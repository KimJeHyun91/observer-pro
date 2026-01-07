const { pool } = require('../../../db/postgresqlPool');

/**
 * Settlement Log Repository
 * - settlement_logs 테이블 조회 (Create는 보통 결제 서비스에서 처리)
 */
class SettlementLogRepository {
    async findAll(filters, dateRange, sortOptions, limit, offset) {
        let query = `SELECT * FROM settlement_logs`;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 1. 일반 필터
        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value !== undefined && value !== null && value !== '') {
                whereClauses.push(`${key}::text ILIKE $${paramIndex}`); 
                values.push(`%${value}%`);
                paramIndex++;
            }
        });

        // 2. 날짜 필터 (settlement_time 기준)
        if (dateRange.start) {
            whereClauses.push(`settlement_time >= $${paramIndex}`);
            values.push(dateRange.start);
            paramIndex++;
        }
        if (dateRange.end) {
            whereClauses.push(`settlement_time <= $${paramIndex}`);
            values.push(dateRange.end);
            paramIndex++;
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 3. 정렬
        const sortBy = sortOptions.sortBy || 'settlement_time';
        const sortOrder = sortOptions.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // 4. 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 5. 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM settlement_logs 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.getClient();
        try {
            const [countResult, rowsResult] = await Promise.all([
                pool.query(countQuery, values.slice(0, values.length - 2)),
                pool.query(query, values)
            ]);

            return {
                rows: rowsResult.rows,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }
}

module.exports = SettlementLogRepository;