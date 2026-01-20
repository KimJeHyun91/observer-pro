const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        name: 'name',
        code: 'code',
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';
    
    // 1. 동적 WHERE 절 생성 (조건 하나씩 명시)
    const conditions = [];
    const values = [];
    
    // (1) 이름 검색 (Partial Match)
    if (filters.name) {
        conditions.push(`name ILIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }

    // (2) 코드 검색 (Exact Match) - 예시로 추가
    if (filters.code) {
        conditions.push(`code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }

    // (3) 상태 검색 (Exact Match)
    if (filters.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filters.status);
    }    

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_sites ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = parseInt(countResult.rows[0].count, 10);

    // 3. 조회 쿼리
    // LIMIT과 OFFSET은 values 배열의 뒤에 이어 붙입니다.
    const query = `
        SELECT 
            id, 
            name, 
            description, 
            code, 
            status, 
            created_at, 
            updated_at, 
            COALESCE(
                (SELECT jsonb_agg(dc)
                 FROM (
                    SELECT id, name FROM pf_device_controllers 
                    WHERE site_id = s.id
                    ORDER BY name ASC
                 ) dc
                ), '[]'::jsonb
            ) AS device_controllers
        FROM pf_sites s
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
 * 상세 조회 (Find By ID)
 * - 사이트 정보 + 바로 하위(DeviceControllers, Zones)의 요약 정보(id, name)만 포함
 */
exports.findById = async (id) => {
    const query = `
        SELECT 
            s.*,
            -- 1. Device Controllers (ID와 Name만 조회)
            COALESCE(
                (SELECT jsonb_agg(dc)
                 FROM (
                    SELECT id, name FROM pf_device_controllers 
                    WHERE site_id = s.id
                    ORDER BY name ASC
                 ) dc
                ), '[]'::jsonb
            ) AS device_controllers,

            -- 2. Zones (ID와 Name만 조회)
            COALESCE(
                (SELECT jsonb_agg(z)
                 FROM (
                    SELECT id, name FROM pf_zones 
                    WHERE site_id = s.id
                    ORDER BY name ASC
                 ) z
                ), '[]'::jsonb
            ) AS zones
        FROM pf_sites s
        WHERE s.id = $1
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
    const { name, description, code } = dbData;

    const query = `
        INSERT INTO pf_sites (
            name, description, code, created_at
        )
        VALUES ($1, $2, $3, NOW())
        RETURNING id
    `;
    
    const values = [name, description, code];

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
    const ALLOWED_COLUMNS = ['name', 'description', 'code', 'status'];

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
        UPDATE pf_sites 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING id
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
    const query = `DELETE FROM pf_sites WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;
    
    return humps.camelizeKeys(rows[0]);
};

/**
 * 트리 조회 (Find Tree)
 * - 사이트 > 제어기 
 * - 사이트 > 구역 > 차선 > 장비 
 */
exports.findTree = async (siteId) => {
    const query = `
        SELECT 
            s.*,
            -- 1. 사이트(Site)에 소속된 제어기들 (Device Controllers)
            COALESCE(
                (SELECT jsonb_agg(dc_tree)
                FROM (
                    SELECT * FROM pf_device_controllers 
                    WHERE site_id = s.id 
                    ORDER BY name ASC
                ) dc_tree
                ), '[]'::jsonb
            ) AS pf_device_controllers,
            
            -- 2. 사이트(Site) > 구역(Zone) > 차선(Lane) > 장비(Device) 계층 구조
            COALESCE(
                (SELECT jsonb_agg(zone_tree)
                FROM (
                    SELECT 
                        z.*,
                        COALESCE(
                            (SELECT jsonb_agg(lane_tree)
                            FROM (
                                SELECT 
                                    l.*,
                                    COALESCE(
                                        (SELECT jsonb_agg(device_tree)
                                        FROM (
                                            SELECT * FROM pf_devices 
                                            WHERE lane_id = l.id 
                                            ORDER BY name ASC
                                        ) device_tree
                                        ), '[]'::jsonb
                                    ) AS devices
                                FROM pf_lanes l
                                WHERE l.zone_id = z.id 
                                ORDER BY l.name ASC
                            ) lane_tree
                            ), '[]'::jsonb
                        ) AS lanes
                    FROM pf_zones z
                    WHERE z.site_id = s.id
                    ORDER BY z.name ASC
                ) zone_tree
                ), '[]'::jsonb
            ) AS zones
        FROM pf_sites s
        WHERE s.id = $1
    `;

    const { rows } = await pool.query(query, [siteId]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};