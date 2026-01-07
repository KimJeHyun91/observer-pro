const { pool } = require('../../../db/postgresqlPool');

/**
 * Blacklist Repository
 * - blacklists 테이블 CRUD
 */
class BlacklistRepository {
    async create(data) {
        const query = `
            INSERT INTO blacklists (site_id, car_number, reason, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [
            data.site_id, data.car_number, data.reason,
            true // is_active
        ];
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM blacklists`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['car_number', 'reason'];

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
            SELECT COUNT(*) FROM blacklists 
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
        const query = `SELECT * FROM blacklists WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    /**
     * 블랙리스트 차량인지 확인
     * @param {string} carNum - 차량 번호
     * @param {string} siteId - (선택) 사이트 ID
     * @returns {Promise<boolean>} 블랙리스트 여부
     */
    async checkBlacklist(carNum, siteId) {
        let query = `
            SELECT 1 FROM blacklists 
            WHERE car_number = $1 AND is_active = true
        `;
        const values = [carNum];

        // 특정 사이트에만 적용된 블랙리스트인지, 아니면 전역 블랙리스트인지 구분 정책 필요
        // 여기서는 site_id가 주어지면 해당 사이트 OR 전역(site_id IS NULL)인 경우 체크
        if (siteId) {
            query += ` AND (site_id = $2 OR site_id IS NULL)`;
            values.push(siteId);
        } else {
            // siteId가 없으면 전역 블랙리스트만 체크하거나, 전체 체크
            // 여기서는 전체 체크
        }
        
        query += ` LIMIT 1`;

        const { rows } = await pool.query(query, values);
        return rows.length > 0;
    }

    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(data)];

        const query = `
            UPDATE blacklists 
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
            query = `DELETE FROM blacklists WHERE id = $1 RETURNING id`;
        } else {
            query = `UPDATE blacklists SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`;
        }
        
        const { rows } = await pool.query(query, [id]);
        return { deletedId: rows[0]?.id, isHardDelete };
    }
}

module.exports = BlacklistRepository;