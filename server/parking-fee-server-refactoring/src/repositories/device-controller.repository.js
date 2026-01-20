const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        siteId: 'site_id',
        name: 'name',
        code: 'code'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';
    
    // 1. 동적 WHERE 절 생성 (조건 하나씩 명시)
    const conditions = [];
    const values = [];

    // (1) 주차장 ID 검색 (Exact Match)
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(`%${filters.siteId}%`);
    }

    // (2) 종류 검색 (Exact Match)
    if (filters.type) {
        conditions.push(`type = $${values.length + 1}`);
        values.push(filters.type);
    }
    
    // (3) 이름 검색 (Partial Match)
    if (filters.name) {
        conditions.push(`name ILIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }

    // (4) 코드 검색 (Exact Match) - 예시로 추가
    if (filters.code) {
        conditions.push(`code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }

    // (5) IP 주소 검색 (Partial Match)
    if (filters.ipAddress) {
        conditions.push(`ip_address ILIKE $${values.length + 1}`);
        values.push(`%${filters.ipAddress}%`);
    }  

    // (5) PORT 검색 (Partial Match)
    if (filters.port) {
        conditions.push(`port ILIKE $${values.length + 1}`);
        values.push(`%${filters.port}%`);
    } 

    // (6) 상태 검색 (Exact Match)
    if (filters.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filters.status);
    }    

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_device_controllers ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = parseInt(countResult.rows[0].count, 10);

    // 3. 조회 쿼리
    // LIMIT과 OFFSET은 values 배열의 뒤에 이어 붙입니다.
    const query = `
        SELECT id, site_id, name, description, code, type, ip_address, port, status, config, created_at, updated_at FROM pf_device_controllers
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOptions.sortOrder}
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
 * 단일 조회 (Find Detail)
 */
exports.findById = async (id) => {
    const query = `
        SELECT dc.*, 
               COALESCE(
                   json_agg(
                       json_build_object(
                           'id', d.id,
                           'name', d.name
                       ) ORDER BY d.name ASC
                   ) FILTER (WHERE d.id IS NOT NULL), 
                   '[]'
               ) AS devices
        FROM pf_device_controllers dc
        LEFT JOIN pf_devices d ON dc.id = d.device_controller_id
        WHERE dc.id = $1
        GROUP BY dc.id
    `;

    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 생성 (Create)
 */
exports.create = async (data, client = null) => {
    const dbData = humps.decamelizeKeys(data);
    const { site_id, name, description, code, type, ip_address, port, config } = dbData;

    const query = `
        INSERT INTO pf_device_controllers (
            site_id, name, description, code, type, 
            ip_address, port, status, config
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `;
    
    const values = [
        site_id,
        name,
        description || null,
        code || null,
        type || 'SERVER',
        ip_address,
        port,
        'OFFLINE',
        config || {}
    ];

    const db = client || pool;
    try {
        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        // Unique Violation (이름 중복)
        if (error.code === '23505') {
            const conflictError = new Error('이미 존재하는 사이트 이름입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        throw error;
    }
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data, client = null) => {
    if (!data || Object.keys(data).length === 0) return null;

    const dbData = humps.decamelizeKeys(data);

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    // 수정 가능한 컬럼 목록 (Allowlist)
    const ALLOWED_COLUMNS = ['siteId', 'type', 'name', 'description', 'code', 'ipAddress', 'port', 'status', 'config'];

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
        UPDATE pf_device_controllers 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING *
    `;

    const db = client || pool;
    try {
        const { rows } = await db.query(query, values);
        
        // 대상이 없으면 null 반환
        if (rows.length === 0) return null;
        
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        // Unique Violation (이름 중복 등)
        if (error.code === '23505') {
            const conflictError = new Error('이미 존재하는 사이트 이름입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        throw error;
    }
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id, client = null) => {
    const query = `DELETE FROM pf_device_controllers WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;
    
    return humps.camelizeKeys(rows[0]);
};

/**
 * 다중 삭제 (Delete Multiple)
 */
exports.multipleDelete = async (ids, client = null) => {
    if (!ids || ids.length === 0) return [];

    const query = 'DELETE FROM pf_device_controllers WHERE id = ANY($1::uuid[]) RETURNING id';
    
    const db = client || pool;
    const { rows } = await db.query(query, [ids]);
    
    if (rows.length === 0) return [];
    
    return humps.camelizeKeys(rows);
};

/**
 * 사이트에 일괄 할당 (Assign To Site)
 */
exports.assignToSite = async (siteId, deviceControllerIds, client = null) => {
    if (!deviceControllerIds || deviceControllerIds.length === 0) return;

    const query = `
        UPDATE pf_device_controllers
        SET site_id = $1, updated_at = NOW()
        WHERE id = ANY($2::uuid[])
    `;

    const db = client || pool;
    await db.query(query, [siteId, deviceControllerIds]);
};

/**
 * 사이트 연결 관계 토글 (Toggle Relation)
 * - 해당 사이트에 이미 연결되어 있으면 -> 해제 (NULL)
 * - 연결되어 있지 않거나 다른 사이트면 -> 연결 (siteId)
 * - 반환값: 변경된 후의 site_id
 */
exports.toggleSiteRelation = async (siteId, deviceControllerId, client = null) => {
    const query = `
        UPDATE pf_device_controllers
        SET 
            site_id = CASE 
                WHEN site_id = $1 THEN NULL  -- 이미 내 사이트면 해제
                ELSE $1                      -- 아니면 내 사이트로 등록
            END,
            updated_at = NOW()
        WHERE id = $2
        RETURNING site_id
    `;

    const db = client || pool;
    const { rows } = await db.query(query, [siteId, deviceControllerId]);
    
    // 업데이트된 행의 정보를 반환 (없으면 null)
    return rows[0]; 
};

/**
 * 페이징 없는 전체 조회 (스케줄러 / 내부 로직용)
 */
exports.findAllWithoutPagination = async (filters = {}, sortOptions = {}) => {
    const dbSortBy = humps.decamelize(sortOptions.sortBy || 'id');
    const sortOrder = (sortOptions.sortOrder?.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    const conditions = [];
    const values = [];

    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }
    // 필요한 다른 필터 추가 가능
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
        SELECT * FROM pf_device_controllers
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder}
    `;
    
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
    
    const query = `SELECT * FROM pf_device_controllers WHERE id = ANY($1::uuid[])`;
    const { rows } = await pool.query(query, [ids]);
    
    return humps.camelizeKeys(rows);
};