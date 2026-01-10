const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Zone Repository
 * - pf_zones 테이블에 대한 CRUD
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class ZoneRepository {

    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_zones (
                site_id, 
                name, 
                description, 
                code
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [
            data.siteId,
            data.name,
            data.description || null,
            data.code || null
        ];

        try {
            const { rows } = await pool.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique Violation
                const conflictError = new Error('이미 존재하는 데이터입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            if (error.code === '23503') { // FK Violation (site_id 없음)
                const notFoundError = new Error('참조하는 사이트 데이터가 존재하지 않습니다.');
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

        let query = `SELECT z.* FROM pf_zones z`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 1. 일반 Zone 컬럼 필터 (스네이크케이스 기준)
        const zoneTextColumns = ['name', 'description', 'code'];
        const zoneExactColumns = ['id', 'site_id'];
        
        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 날짜 범위 검색 추가
            if (key === 'createdAtStart') {
                whereClauses.push(`z.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`z.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`z.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`z.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            const dbCol = humps.decamelize(key);

            // 유효성 검사
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (zoneTextColumns.includes(dbCol)) {
                whereClauses.push(`z.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (zoneExactColumns.includes(dbCol)) {
                whereClauses.push(`z.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 집계를 위한 GROUP BY 추가
        query += ` GROUP BY z.id`;

        // 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        
        // 정렬 컬럼 안전성 체크 (alias z 붙이기)
        query += ` ORDER BY z.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리 (JOIN 없이 pf_zones 테이블만 카운트하여 성능 최적화)
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_zones z 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const pfZones = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: pfZones,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find Detail)
     * - Lanes 목록을 포함하여 반환
     */
    async findById(id) {
        const query = `
            SELECT z.*,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', l.id, 
                               'name', l.name, 
                               'type', l.type
                           ) ORDER BY l.name
                       ) FILTER (WHERE l.id IS NOT NULL), 
                       '[]'
                   ) as pf_lanes
            FROM pf_zones z
            LEFT JOIN pf_lanes l ON z.id = l.zone_id
            WHERE z.id = $1 
            GROUP BY z.id
        `;

        const { rows } = await pool.query(query, [id]);

        if (!rows[0]) {
            const notFoundError = new Error('해당하는 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 수정 (Update)
     */
    async update(id, data) {
        if (Array.isArray(data)) {
            console.warn('[ZoneRepository.update] Data received is an Array. Please send an Object.');
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

            // 수정 불가능한 컬럼 제외 (id, created_at 등은 정책에 따라 결정)
            if (['id', 'created_at'].includes(dbCol)) return;

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) {
            console.warn('[ZoneRepository.update] No valid fields to update. Returning null.');
            return null;
        }

        const query = `
            UPDATE pf_zones 
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
                const conflictError = new Error('이미 존재하는 데이터입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            if (error.code === '23503') {
                const notFoundError = new Error('참조하는 데이터가 존재하지 않습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 삭제 (Delete)
     */
    async delete(id) {
        const query = `DELETE FROM pf_zones WHERE id = $1 RETURNING id`;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = ZoneRepository;