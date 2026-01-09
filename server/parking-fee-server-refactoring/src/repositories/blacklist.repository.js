const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Blacklist Repository
 * - pf_blacklists 테이블 CRUD
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class BlacklistRepository {

    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_blacklists (site_id, car_number, reason)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [
            data.siteId,
            data.carNumber,
            data.reason || null
        ];

        try {
            const { rows } = await pool.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique Violation (site_id + car_number)
                const conflictError = new Error('해당 사이트에 이미 등록된 차량 번호입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            if (error.code === '23503') { // FK Violation (site_id)
                const notFoundError = new Error('존재하지 않는 사이트 ID입니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 다목적 목록 조회 (Find All)
     * - 검색: 텍스트 컬럼은 ILIKE(부분일치), 숫자형은 범위(_min, _max) 및 일치 검색
     * - 날짜 검색: createdAt, updatedAt 범위 검색 지원
     * - 정렬 및 페이징 적용
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT b.* FROM pf_blacklists b`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 부분 검색이 가능한 텍스트 컬럼
        const textColumns = ['car_number', 'reason'];
        // 정확히 일치해야 하는 컬럼
        const exactColumns = ['id', 'site_id'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`b.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`b.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`b.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`b.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // 유효성 검사 (SQL Injection 방지)
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`b.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (exactColumns.includes(dbCol)) {
                whereClauses.push(`b.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

        query += ` ORDER BY b.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_blacklists b
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const list = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: list,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find By ID)
     */
    async findById(id) {
        const query = `SELECT * FROM pf_blacklists WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);

        if (!rows[0]) {
            const notFoundError = new Error('해당하는 블랙리스트 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 블랙리스트 차량 여부 확인 (Check Logic)
     * - 특정 사이트 혹은 전역(site_id IS NULL) 블랙리스트 체크
     */
    async checkBlacklist(carNum, siteId) {
        let query = `
            SELECT 1 FROM pf_blacklists 
            WHERE car_number = $1
        `;
        const values = [carNum];

        // siteId가 제공되면 해당 사이트의 블랙리스트 OR 전역 블랙리스트(site_id IS NULL) 확인
        if (siteId) {
            query += ` AND (site_id = $2 OR site_id IS NULL)`;
            values.push(siteId);
        } else {
            // siteId가 없으면 전역 블랙리스트만 체크하거나 전체를 체크하는 정책에 따라 다르지만,
            // 여기서는 단순히 전체에서 차량 번호 존재 여부만 확인 (필요시 로직 수정)
        }

        query += ` LIMIT 1`;

        const { rows } = await pool.query(query, values);
        return rows.length > 0;
    }

    /**
     * 수정 (Update)
     */
    async update(id, data) {
        if (Array.isArray(data)) {
            console.warn('[BlacklistRepository.update] Data received is an Array. Please send an Object.');
            if (data.length > 0 && typeof data[0] === 'object') {
                data = data[0];
            } else {
                return null;
            }
        }

        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id];
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);

            // 유효하지 않은 컬럼명 무시 (스키마 기반)
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) {
                return;
            }
            
            // 변경 불가능한 컬럼(id 등) 제외 로직이 필요하다면 여기에 추가
            if (dbCol === 'id' || dbCol === 'created_at') return;

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) {
            console.warn('[BlacklistRepository.update] No valid fields to update. Returning null.');
            return null;
        }

        const query = `
            UPDATE pf_blacklists 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        try {
            const { rows } = await pool.query(query, values);

            if (rows.length === 0) {
                const notFoundError = new Error('수정할 데이터를 찾을 수 없습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }

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
     * 삭제 (Delete)
     * - 물리적 삭제 (Hard Delete)
     */
    async delete(id) {
        const query = `DELETE FROM pf_blacklists WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = BlacklistRepository;