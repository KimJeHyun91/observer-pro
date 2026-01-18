const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Device Controller Repository
 * - pf_device_controllers 테이블 CRUD
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class DeviceControllerRepository {
    
    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_device_controllers (
                site_id,
                name, 
                description, 
                code,
                type, 
                ip_address, 
                port, 
                status, 
                config
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const values = [
            data.siteId,
            data.name, 
            data.description || null, 
            data.code || null,
            data.type || 'SERVER',
            data.ipAddress || null, 
            data.port || 80, 
            'OFFLINE', // 초기 상태
            data.config || {}
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

        let query = `SELECT dc.* FROM pf_device_controllers dc`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code', 'status'];
        const exactColumns = ['id', 'port'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`dc.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`dc.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`dc.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`dc.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // 유효성 검사
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`dc.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (dbCol === 'ip_address') {
                // IP 주소는 inet 타입일 수 있으므로 text로 캐스팅하여 부분 검색 지원
                whereClauses.push(`dc.ip_address::text ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (exactColumns.includes(dbCol)) {
                whereClauses.push(`dc.${dbCol} = $${paramIndex}`);
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
        
        query += ` ORDER BY dc.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_device_controllers dc 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const deviceControllers = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: deviceControllers,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find Detail)
     * - Devices 목록을 포함하여 반환
     */
    async findById(id) {
        const query = `
            SELECT dc.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', d.id,
                               'name', d.name,
                               'type', d.type,
                               'status', d.status
                           ) ORDER BY d.name ASC
                       ) FILTER (WHERE d.id IS NOT NULL), 
                       '[]'
                   ) as pf_devices
            FROM pf_device_controllers dc
            LEFT JOIN pf_devices d ON dc.id = d.device_controller_id
            WHERE dc.id = $1
            GROUP BY dc.id
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
            console.warn('[DeviceControllerRepository.update] Data received is an Array. Please send an Object.');
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
            if (['id', 'created_at', 'updated_at'].includes(dbCol)) return;

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) {
            console.warn('[DeviceControllerRepository.update] No valid fields to update. Returning null.');
            return null;
        }

        const query = `
            UPDATE pf_device_controllers 
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
        const query = `DELETE FROM pf_device_controllers WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return { 
            deletedId: rows[0]?.id 
        };
    }

    /**
     * Device Controller 삭제 (Hard/Soft)
     */
    async deleteMultiple(deviceControllerIdList) {
        
        const query = 'DELETE FROM pf_device_controllers WHERE id = ANY($1::uuid[]) RETURNING id';
        
        const { rows } = await pool.query(query, [deviceControllerIdList]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return rows;
    }
}

module.exports = DeviceControllerRepository;









// !! 수정 중

/**
 * 사이트에 일괄 할당 (Assign To Site)
 * - 여러 제어기의 site_id를 한 번에 업데이트
 */
exports.assignToSite = async (siteId, controllerIds, client = null) => {
    if (!controllerIds || controllerIds.length === 0) return;

    const query = `
        UPDATE pf_device_controllers
        SET site_id = $1, updated_at = NOW()
        WHERE id = ANY($2::uuid[])
    `;

    const db = client || pool;
    await db.query(query, [siteId, controllerIds]);
};

/**
 * 사이트 연결 관계 수정 (Update Relation)
 * - 특정 제어기를 사이트에 연결(ADD)하거나 해제(REMOVE)
 */
exports.updateSiteRelation = async (siteId, controllerId, action, client = null) => {
    let query = '';
    
    if (action === 'ADD') {
        query = `
            UPDATE pf_device_controllers
            SET site_id = $1, updated_at = NOW()
            WHERE id = $2
        `;
    } else if (action === 'REMOVE') {
        // 안전장치: 현재 해당 사이트에 연결된 녀석만 해제 가능
        query = `
            UPDATE pf_device_controllers
            SET site_id = NULL, updated_at = NOW()
            WHERE id = $2 AND site_id = $1
        `;
    } else {
        return;
    }

    const db = client || pool;
    await db.query(query, [siteId, controllerId]);
};

/**
 * 페이징 없는 전체 조회 (스케줄러 / 내부 로직용)
 */
exports.findAllWithoutPagination = async (filters, sortOptions) => {
    const dbSortBy = humps.decamelize(sortOptions.sortBy || 'id');
    const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    const conditions = [];
    const values = [];

    // 필터 처리 (기존 findAll과 동일하게 필요한 만큼 구현)
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT * FROM pf_device_controllers
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder}
    `;
    
    // 페이징(LIMIT/OFFSET) 없이 실행
    const { rows } = await pool.query(query, values);

    return { 
        rows: humps.camelizeKeys(rows), 
        count: rows.length 
    };
};

/**
 * 여러 ID로 조회 (Validation 용)
 */
exports.findByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];
    
    // ANY($1)을 사용하여 배열 내 ID 검색
    const query = `SELECT * FROM pf_device_controllers WHERE id = ANY($1::uuid[])`;
    const { rows } = await pool.query(query, [ids]);
    
    return humps.camelizeKeys(rows);
};