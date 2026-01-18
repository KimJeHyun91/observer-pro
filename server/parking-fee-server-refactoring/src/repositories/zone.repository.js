const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 * - Explicit Mapping 방식 (명시적 조건 처리)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        name: 'name',
        code: 'code',
        status: 'status'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';

    const conditions = [];
    const values = [];

    // 1. 필터 조건 생성
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }
    if (filters.name) {
        conditions.push(`name LIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }
    if (filters.code) {
        conditions.push(`code = $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_zones ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = countResult.rows[0].count;

    // 3. 데이터 조회 쿼리
    const query = `
        SELECT id, site_id, name, description, code, created_at, updated_at FROM pf_zones
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOptions.sortOrder}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    const listValues = [...values, limit, offset];
    const { rows } = await pool.query(query, listValues);

    return { 
        rows: humps.camelizeKeys(rows), 
        count: parseInt(count) 
    };
};

/**
 * 상세 조회 (Find By ID)
 * - 구역 정보 + 바로 하위(lanes)의 요약 정보(id, name)만 포함
 */
exports.findById = async (id) => {
    const query = `
        SELECT z.*,
               COALESCE(
                   (SELECT json_agg(
                        json_build_object(
                            'id', l.id, 
                            'name', l.name
                        ) ORDER BY l.name ASC
                   )
                   FROM pf_lanes l
                   WHERE l.zone_id = z.id
                   ), '[]'::json
               ) as lanes
        FROM pf_zones z
        WHERE z.id = $1
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
    const { site_id, name, description, code } = dbData;

    const query = `
        INSERT INTO pf_zones (
            site_id, name, description, code, created_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
    `;

    const values = [site_id, name, description || null, code || null];
    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23505') { 
            const conflictError = new Error('이미 존재하는 구역 이름입니다.');
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

    const ALLOWED_COLUMNS = ['name', 'description', 'code'];

    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(dbData[key]);
            paramIndex++;
        }
    });

    if (updates.length === 0) return null; // 업데이트 할 필드가 없음

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE pf_zones 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING id
    `;

    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);

        if (rows.length === 0) return null;
        
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23505') {
            const conflictError = new Error('이미 존재하는 구역 이름입니다.');
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
    const query = `DELETE FROM pf_zones WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};