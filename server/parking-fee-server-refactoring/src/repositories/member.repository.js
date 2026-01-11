const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

class MemberRepository {

    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_members (
                site_id, car_number, 
                name, description, code,
                phone_encrypted, phone_last_digits, phone_hash,
                group_name, note, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            data.siteId,
            data.carNumber,
            data.name,
            data.description || null,
            data.code || null,
            data.phoneEncrypted,
            data.phoneLastDigits,
            data.phoneHash,
            data.groupName || null,
            data.note || null,
            data.isActive !== undefined ? data.isActive : true
        ];

        try {
            const { rows } = await pool.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                const conflictError = new Error('해당 사이트에 이미 등록된 차량 번호입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            if (error.code === '23503') {
                const notFoundError = new Error('참조하는 사이트가 존재하지 않습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 목록 조회 (Find All)
     * - [수정] 여기서는 순수하게 '회원 테이블'만 조회합니다.
     * - 결제 내역 결합은 Service에서 담당합니다.
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM pf_members`;
        
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 부분 일치 검색 필드
        const textColumns = ['name', 'car_number', 'description', 'group_name', 'note', 'code'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            const dbCol = humps.decamelize(key);

            // siteId는 정확 일치
            if (key === 'siteId') {
                whereClauses.push(`site_id = $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 텍스트 검색
            if (textColumns.includes(dbCol)) {
                whereClauses.push(`${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬
        let sortBy = sortOptions.sortBy || 'created_at';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

        query += ` ORDER BY ${dbSortBy} ${sortOrder}`;

        // 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 전체 카운트 조회
        const countQuery = `
            SELECT COUNT(*) FROM pf_members
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

    /**
     * 단일 조회 (ID)
     */
    async findById(id) {
        const query = `SELECT * FROM pf_members WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 차량 번호 조회 (중복 체크용)
     */
    async findByCarNumber(siteId, carNumber) {
        const query = `
            SELECT * FROM pf_members 
            WHERE site_id = $1 AND car_number = $2
        `;
        const { rows } = await pool.query(query, [siteId, carNumber]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 수정 (Update)
     */
    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id];
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            if (['id', 'created_at'].includes(dbCol)) return;

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) return null;

        const query = `
            UPDATE pf_members 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        try {
            const { rows } = await pool.query(query, values);
            if (rows.length === 0) {
                const notFoundError = new Error('수정할 회원을 찾을 수 없습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            if (error.code === '23505') {
                const conflictError = new Error('이미 존재하는 차량 번호입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            throw error;
        }
    }

    /**
     * 삭제 (Delete)
     */
    async delete(id) {
        const query = `DELETE FROM pf_members WHERE id = $1 RETURNING id`;
        const { rows } = await pool.query(query, [id]);
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 회원을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = MemberRepository;