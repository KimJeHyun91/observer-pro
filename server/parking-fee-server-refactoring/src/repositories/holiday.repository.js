const { pool } = require('../../../db/postgresqlPool');

/**
 * Holiday Repository
 * - holidays 테이블 CRUD
 */
class HolidayRepository {
    async create(data) {
        const query = `
            INSERT INTO holidays (
                site_id, name, description, code, 
                date, is_recurring, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            data.site_id, data.name, data.description, data.code,
            data.date, data.is_recurring || false, 
            true // is_active
        ];
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM holidays`;

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
                } else if (key === 'date') {
                    // 날짜 검색 (정확 일치)
                    whereClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                } else {
                    // site_id, is_recurring, is_active 등
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
            query += ` ORDER BY date ASC`;
        }

        // 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM holidays 
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
        const query = `SELECT * FROM holidays WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(data)];

        const query = `
            UPDATE holidays 
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
            query = `DELETE FROM holidays WHERE id = $1 RETURNING id`;
        } else {
            query = `UPDATE holidays SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`;
        }
        
        const { rows } = await pool.query(query, [id]);
        return { deletedId: rows[0]?.id, isHardDelete };
    }
}

module.exports = HolidayRepository;