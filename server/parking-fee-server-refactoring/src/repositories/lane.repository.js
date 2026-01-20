const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    // 1. 정렬 옵션 매핑 (SQL Injection 방지)
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        name: 'name',
        code: 'code',
        siteId: 'site_id',
        zoneId: 'zone_id'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';
    const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    const conditions = [];
    const values = [];

    // 2. 필터 조건 생성
    if (filters.zoneId) {
        conditions.push(`l.zone_id = $${values.length + 1}`);
        values.push(filters.zoneId);
    }
    if (filters.name) {
        conditions.push(`l.name ILIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }
    if (filters.type) {
        conditions.push(`l.type = $${values.length + 1}`);
        values.push(filters.type);
    }
    if (filters.code) {
        conditions.push(`l.code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_lanes l ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = parseInt(countResult.rows[0].count, 10);

    // 4. 데이터 조회 쿼리 (장비 정보 Aggregation 포함)
    const query = `
        SELECT
            id,
            zone_id,
            name,
            description,
            code,
            created_at,
            updated_at, 
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', d.id,
                        'name', d.name,
                        'description', d.description,
                        'code', d.code,
                        'ipAddress', d.ip_address,
                        'port', d.port,
                        'type', d.type,
                        'direction', d.direction
                    ) ORDER BY d.name ASC
                )
                FROM pf_devices d
                WHERE d.lane_id = l.id
                ), '[]'::json
            ) as devices
        FROM pf_lanes l
        ${whereClause}
        ORDER BY l.${dbSortBy} ${sortOrder}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const listValues = [...values, limit, offset];
    const { rows } = await pool.query(query, listValues);

    return { 
        rows: humps.camelizeKeys(rows), 
        count 
    };
};

/**
 * 상세 조회 (Find By ID)
 * - 특정 차선 정보와 연결된 장비 목록 반환
 */
exports.findById = async (id) => {
    const query = `
        SELECT l.*, 
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', d.id,
                        'name', d.name
                    ) ORDER BY d.name ASC
                )
                FROM pf_devices d
                WHERE d.lane_id = l.id
                ), '[]'::json
            ) as devices
        FROM pf_lanes l
        WHERE l.id = $1
    `;
    
    const { rows } = await pool.query(query, [id]);
    
    // 데이터가 없으면 null 반환 (Service가 404 처리)
    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 생성 (Create)
 */
exports.create = async (data, client = null) => {
    const dbData = humps.decamelizeKeys(data);
    const { zone_id, name, type, description, code } = dbData;

    const query = `
        INSERT INTO pf_lanes (
            zone_id, name, type, description, code, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
    `;
    
    // type 기본값 'IN', 나머지는 null 처리
    const values = [
        zone_id, 
        name, 
        type || 'IN', 
        description || null, 
        code || null
    ];
    
    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        // Unique Violation (이름 중복)
        if (error.code === '23505') { 
            const conflictError = new Error('이미 존재하는 차선 이름입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        // FK Violation (구역 없음)
        if (error.code === '23503') { 
            const notFoundError = new Error('참조하는 구역(Zone)이 존재하지 않습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data, client = null) => {
    const dbData = humps.decamelizeKeys(data);
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    // 수정 가능한 컬럼 목록 (Allowlist)
    const ALLOWED_COLUMNS = ['name', 'description', 'code', 'type'];

    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(dbData[key]);
            paramIndex++;
        }
    });

    if (updates.length === 0) return null; 

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE pf_lanes 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING *
    `;

    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        
        // 대상 ID가 없으면 null 반환
        if (rows.length === 0) return null;

        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23505') {
            const conflictError = new Error('이미 존재하는 차선 이름입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        if (error.code === '23503') {
            const notFoundError = new Error('참조하는 구역(Zone)이 존재하지 않습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id, client = null) => {
    const query = `DELETE FROM pf_lanes WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    // 대상 ID가 없으면 null 반환
    if (rows.length === 0) return null;
    
    return humps.camelizeKeys(rows[0]);
};