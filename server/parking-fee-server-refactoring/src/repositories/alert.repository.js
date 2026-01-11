const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

class AlertRepository {

    /**
     * 알림 생성 (Create)
     * @param {Object} data
     */
    async create(data) {
        const query = `
            INSERT INTO pf_alerts (
                site_id, type, message, metadata, is_read
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const values = [
            data.siteId,
            data.type,
            data.message,
            data.metadata || {}, // JSONB
            false // is_read 기본값
        ];

        try {
            const { rows } = await pool.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 알림 목록 조회 (Find All)
     * - 필터: siteId, type, isRead, 날짜 범위
     * - 페이징 & 정렬 지원
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM pf_alerts`;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 1. 필터링
        if (filters.siteId) {
            whereClauses.push(`site_id = $${paramIndex++}`);
            values.push(filters.siteId);
        }
        if (filters.type) {
            whereClauses.push(`type = $${paramIndex++}`);
            values.push(filters.type);
        }
        if (filters.isRead !== undefined) {
            whereClauses.push(`is_read = $${paramIndex++}`);
            values.push(filters.isRead);
        }
        
        // [수정] 날짜/시간 범위 검색 (startTime ~ endTime)
        // created_at 컬럼은 TIMESTAMPTZ 타입이므로 시/분/초 비교가 정확히 동작합니다.
        if (filters.startTime) {
            whereClauses.push(`created_at >= $${paramIndex++}`);
            values.push(filters.startTime);
        }
        if (filters.endTime) {
            whereClauses.push(`created_at <= $${paramIndex++}`);
            values.push(filters.endTime);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬
        const sortBy = sortOptions.sortBy ? humps.decamelize(sortOptions.sortBy) : 'created_at';
        const sortOrder = sortOptions.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // 페이징
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(limit, offset);

        // 실행
        const countQuery = `
            SELECT COUNT(*) FROM pf_alerts
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [rowsResult, countResult] = await Promise.all([
                client.query(query, values),
                client.query(countQuery, values.slice(0, values.length - 2))
            ]);

            return {
                rows: rowsResult.rows.map(row => humps.camelizeKeys(row)),
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 알림 읽음 처리 (Update)
     * - 사용자가 알림을 클릭하거나 확인했을 때 호출
     */
    async markAsRead(id) {
        const query = `
            UPDATE pf_alerts
            SET is_read = true
            WHERE id = $1
            RETURNING *
        `;
        const { rows } = await pool.query(query, [id]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }
}

module.exports = AlertRepository;