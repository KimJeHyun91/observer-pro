const { pool } = require('../../../db/postgresqlPool');

/**
 * Device Event Log Repository
 * - device_event_logs 테이블 CRUD (운영자 로그 포함)
 */
class DeviceEventLogRepository {
    async create(client, data) {
        const query = `
            INSERT INTO device_event_logs (
                site_id, lane_id, 
                device_id, device_name, device_code,
                type, message, raw_data, time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        // 임시 조치: device_id가 없으면 더미 UUID 사용 (스키마상 NOT NULL일 경우)
        const dummyDeviceId = '00000000-0000-0000-0000-000000000000';
        
        const values = [
            data.site_id, data.lane_id,
            data.device_id || dummyDeviceId, 
            data.device_name || 'SYSTEM', 
            data.device_code || 'SYS',
            data.type, data.message, data.raw_data || {}, data.time || new Date()
        ];
        
        const db = client || pool;
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    async findAll(filters, dateRange, sortOptions, limit, offset) {
        let query = `SELECT * FROM device_event_logs`;
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

        // 2. 날짜 필터 (time 기준)
        if (dateRange.start) {
            whereClauses.push(`time >= $${paramIndex}`);
            values.push(dateRange.start);
            paramIndex++;
        }
        if (dateRange.end) {
            whereClauses.push(`time <= $${paramIndex}`);
            values.push(dateRange.end);
            paramIndex++;
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 3. 정렬
        const sortBy = sortOptions.sortBy || 'time';
        const sortOrder = sortOptions.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // 4. 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 5. 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM device_event_logs 
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

module.exports = DeviceEventLogRepository;