const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Lane Repository
 * - pf_lanes 테이블 CRUD
 * - 하위 Devices 정보 요약 포함 (JSON Aggregation)
 */
class LaneRepository {
    
    /**
     * 생성
     */
    async create(data) {
        const query = `
            INSERT INTO pf_lanes (
                zone_id, 
                name, 
                type, 
                description, 
                code, 
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const values = [
            data.zoneId, 
            data.name, 
            data.type || 'IN', 
            data.description || null, 
            data.code || null,
            true // is_active 기본값 true
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
            if (error.code === '23503') { // FK Violation (zone_id 없음)
                const notFoundError = new Error('참조하는 구역 데이터가 존재하지 않습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 다목적 목록 조회 (Find All)
     * - 기본 컬럼 검색 및 날짜 범위 검색
     * - 조회 결과에 해당 Lane에 속한 Devices 요약 정보 포함
     */
    async findAll(filters, sortOptions, limit, offset) {
        // Lanes + Devices(요약) 조인
        let query = `
            SELECT l.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', d.id,
                               'name', d.name,
                               'type', d.type,
                               'status', d.status,
                               'isActive', d.is_active
                           ) ORDER BY d.name ASC
                       ) FILTER (WHERE d.id IS NOT NULL), 
                       '[]'
                   ) as pf_devices
            FROM pf_lanes l
            LEFT JOIN pf_devices d ON l.id = d.lane_id
        `;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code'];
        const exactColumns = ['id', 'zone_id', 'type', 'is_active'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`l.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`l.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`l.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`l.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // 유효성 검사
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`l.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (exactColumns.includes(dbCol)) {
                whereClauses.push(`l.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` GROUP BY l.id`;

        // 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        
        query += ` ORDER BY l.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_lanes l 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const pf_lanes = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: pf_lanes,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (상세)
     */
    async findById(id) {
        const query = `
            SELECT l.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', d.id,
                               'name', d.name,
                               'type', d.type,
                               'status', d.status,
                               'isActive', d.is_active
                           ) ORDER BY d.name ASC
                       ) FILTER (WHERE d.id IS NOT NULL), 
                       '[]'
                   ) as pf_devices
            FROM pf_lanes l
            LEFT JOIN pf_devices d ON l.id = d.lane_id
            WHERE l.id = $1
            GROUP BY l.id
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
     * 수정
     */
    async update(id, data) {
        if (Array.isArray(data)) {
            console.warn('[LaneRepository.update] Data received is an Array. Please send an Object.');
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

            // 유효하지 않은 컬럼명 무시
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) {
                console.warn(`[LaneRepository.update] Skipped invalid column key: ${key} -> ${dbCol}`);
                return;
            }

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) {
            console.warn('[LaneRepository.update] No valid fields to update. Returning null.');
            return null;
        }

        const query = `
            UPDATE pf_lanes 
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
     * 삭제 (Hard/Soft)
     */
    async delete(id, isHardDelete) {
        let query;
        if (isHardDelete) {
            query = `DELETE FROM pf_lanes WHERE id = $1 RETURNING id`;
        } else {
            query = `
                UPDATE pf_lanes 
                SET is_active = false, updated_at = NOW() 
                WHERE id = $1 
                RETURNING id
            `;
        }
        
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return { 
            deletedId: rows[0]?.id, 
            isHardDelete 
        };
    }
}

module.exports = LaneRepository;