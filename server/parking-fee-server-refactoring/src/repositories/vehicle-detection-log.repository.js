const { pool } = require('../../../db/postgresqlPool');

/**
 * Vehicle Detection Log Repository
 * - vehicle_detection_logs 테이블 CRUD
 */
class VehicleDetectionLogRepository {
    async create(client, data) {
        const query = `
            INSERT INTO vehicle_detection_logs (
                site_id, lane_id, direction, status, event_time, payload
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            data.site_id, data.lane_id, data.direction, data.status, 
            data.eventTime || new Date(), data.payload || {}
        ];
        
        const db = client || pool;
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    async findAll(filters, dateRange, sortOptions, limit, offset) {
        let query = `SELECT * FROM vehicle_detection_logs`;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 1. 일반 필터
        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value !== undefined && value !== null && value !== '') {
                // 문자열은 ILIKE, 그 외는 = 
                whereClauses.push(`${key}::text ILIKE $${paramIndex}`); 
                values.push(`%${value}%`);
                paramIndex++;
            }
        });

        // 2. 날짜 필터 (event_time 기준)
        if (dateRange.start) {
            whereClauses.push(`event_time >= $${paramIndex}`);
            values.push(dateRange.start);
            paramIndex++;
        }
        if (dateRange.end) {
            whereClauses.push(`event_time <= $${paramIndex}`);
            values.push(dateRange.end);
            paramIndex++;
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 3. 정렬
        const sortBy = sortOptions.sortBy || 'event_time';
        const sortOrder = sortOptions.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // 4. 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 5. 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM vehicle_detection_logs 
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

module.exports = VehicleDetectionLogRepository;