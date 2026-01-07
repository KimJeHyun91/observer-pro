const { pool } = require('../../../db/postgresqlPool');

/**
 * Policy Repository
 * - policies 테이블 CRUD
 */
class PolicyRepository {
    /**
     * 정책 생성
     * @param {Object} data - 생성할 정책 데이터
     * * [Config 구조 예시 1: 요금 정책 (FEE)]
     * {
     * "type": "FEE",
     * "basic_time": 30,       // 기본 시간 (분)
     * "basic_fee": 1000,      // 기본 요금 (원)
     * "unit_time": 10,        // 추가 단위 시간 (분)
     * "unit_fee": 500,        // 추가 단위 요금 (원)
     * "grace_time": 10,       // 회차(무료) 인정 시간 (분)
     * "daily_max_fee": 20000  // 일 최대 요금 (원)
     * }
     * * [Config 구조 예시 2: 할인 정책 (DISCOUNT)]
     * {
     * "type": "DISCOUNT",
     * "method": "PERCENT",    // 할인 방식: PERCENT(%), AMOUNT(원), FREE(전액)
     * "value": 50,            // 할인 값: 50(%) 또는 1000(원)
     * "target": "LIGHT_CAR",  // 적용 대상: LIGHT_CAR(경차), DISABLED(장애인), EV(전기차) 등
     * "automatic": true       // LPR 자동 인식 적용 여부
     * }
     */
    async create(data) {
        const query = `
            INSERT INTO policies (
                site_id, name, description, code, 
                config, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            data.site_id, data.name, data.description, data.code,
            data.config || {}, 
            true // is_active
        ];
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM policies`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value !== undefined && value !== null && value !== '') {
                if (textColumns.includes(key)) {
                    whereClauses.push(`${key} ILIKE $${paramIndex}`);
                    values.push(`%${value}%`);
                } else {
                    // site_id, is_active 등
                    whereClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬
        if (sortOptions.sortBy) {
            const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
            query += ` ORDER BY ${sortOptions.sortBy} ${sortOrder}`;
        } else {
            query += ` ORDER BY created_at DESC`;
        }

        // 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM policies 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.getClient();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            return {
                rows: rowsResult.rows,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    async findById(id) {
        const query = `SELECT * FROM policies WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(data)];

        const query = `
            UPDATE policies 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async delete(id, isHardDelete) {
        let query;
        if (isHardDelete) {
            query = `DELETE FROM policies WHERE id = $1 RETURNING id`;
        } else {
            query = `UPDATE policies SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`;
        }
        
        const { rows } = await pool.query(query, [id]);
        return { deletedId: rows[0]?.id, isHardDelete };
    }
}

module.exports = PolicyRepository;