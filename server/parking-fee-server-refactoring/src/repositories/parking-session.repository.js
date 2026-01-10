const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

class ParkingSessionRepository {

    // 허용된 정렬 컬럼 (Whitelist)
    static ALLOWED_SORT_COLUMNS = [
        'entry_time', 'exit_time', 'created_at', 'updated_at', 
        'total_fee', 'car_number', 'duration'
    ];

    // 업데이트 가능한 컬럼 (Whitelist)
    static ALLOWED_UPDATE_COLUMNS = [
        'site_name', 'site_code',
        'entry_zone_id', 'entry_zone_name', 'entry_time', 'entry_image_url',
        'entry_source', 
        'exit_zone_id', 'exit_zone_name', 'exit_lane_id', 'exit_lane_name', 'exit_time', 'exit_image_url',
        'exit_source', 
        'car_number', 'vehicle_type', 'duration',
        'total_fee', 'discount_fee', 'paid_fee', 'applied_discounts',
        'status', 'note', 'pre_settled_at'
    ];

    async create(data, client) {
        const db = client || pool;

        const query = `
            INSERT INTO pf_parking_sessions (
                site_id, site_name, site_code,
                entry_zone_id, entry_zone_name, entry_zone_code,
                entry_lane_id, entry_lane_name, entry_lane_code,
                entry_time, entry_image_url, entry_source,
                car_number, vehicle_type, status, note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const values = [
            data.siteId, data.siteName, data.siteCode || null,
            data.entryZoneId || null, data.entryZoneName || null, data.entryZoneCode || null,
            data.entryLaneId || null, data.entryLaneName || null, data.entryLaneCode || null,
            data.entryTime || new Date(), data.entryImageUrl || null, data.entrySource || 'SYSTEM',
            data.carNumber, data.vehicleType || 'NORMAL',
            data.status || 'PENDING', data.note || null
        ];

        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);
    }

    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT s.* FROM pf_parking_sessions s`;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = [
            'car_number', 'site_name', 'site_code', 
            'entry_zone_name', 'entry_lane_name', 
            'exit_zone_name', 'exit_lane_name', 'note'
        ];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            if (key.endsWith('Start') || key.endsWith('End')) {
                const isStart = key.endsWith('Start');
                const baseField = humps.decamelize(key.replace(isStart ? 'Start' : 'End', ''));
                const operator = isStart ? '>=' : '<=';
                
                let processedValue = value;
                if (!isStart && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    processedValue = `${value} 23:59:59.999`;
                }

                whereClauses.push(`s.${baseField} ${operator} $${paramIndex}`);
                values.push(processedValue);
                paramIndex++;
                return;
            }

            const dbCol = humps.decamelize(key);
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`s.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
            } else {
                whereClauses.push(`s.${dbCol} = $${paramIndex}`);
                values.push(value);
            }
            paramIndex++;
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        let sortBy = humps.decamelize(sortOptions.sortBy || 'entry_time');
        if (!ParkingSessionRepository.ALLOWED_SORT_COLUMNS.includes(sortBy)) {
            sortBy = 'entry_time';
        }
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY s.${sortBy} ${sortOrder}`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*) FROM pf_parking_sessions s 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            return {
                rows: rowsResult.rows.map(row => humps.camelizeKeys(row)),
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    async findById(id) {
        const query = `SELECT * FROM pf_parking_sessions WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    async findActiveSessionByCarNumber(siteId, carNumber, client) {
        const db = client || pool;
        const query = `
            SELECT * FROM pf_parking_sessions
            WHERE site_id = $1 
              AND car_number = $2
              AND status IN ('PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING') 
            ORDER BY entry_time DESC
            LIMIT 1
        `;
        const { rows } = await db.query(query, [siteId, carNumber]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    async update(id, data, client) {
        const db = client || pool;
        
        // Whitelist 기반 필터링 (보안 강화)
        const keys = Object.keys(data).filter(key => {
            const dbCol = humps.decamelize(key);
            return ParkingSessionRepository.ALLOWED_UPDATE_COLUMNS.includes(dbCol);
        });

        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id]; // $1
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            const value = data[key];

            if (key === 'appliedDiscounts') {
                // [핵심 수정] JSONB 컬럼에 배열 저장 시 pg 드라이버의 Array 해석 충돌 방지
                // 배열을 JSON 문자열로 변환하여 전달해야 올바르게 JSONB로 저장됨
                setClauses.push(`"${dbCol}" = $${valIndex}::jsonb`);
                values.push(JSON.stringify(value)); 
            } else {
                setClauses.push(`"${dbCol}" = $${valIndex}`);
                values.push(value);
            }
            valIndex++;
        });

        const query = `
            UPDATE pf_parking_sessions
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await db.query(query, values);
        
        if (rows.length === 0) return null;

        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = ParkingSessionRepository;