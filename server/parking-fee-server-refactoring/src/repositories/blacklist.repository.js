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
        carNumber: 'car_number'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';

    const conditions = [];
    const values = [];

    // 1. 필터 조건 생성
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }
    if (filters.carNumber) {
        conditions.push(`car_number ILIKE $${values.length + 1}`);
        values.push(`%${filters.carNumber}%`);
    }
    if (filters.reason) {
        conditions.push(`reason = $${values.length + 1}`);
        values.push(filters.reason);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_blacklists ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = countResult.rows[0].count;

    // 3. 데이터 조회 쿼리
    const query = `
        SELECT id, site_id, car_number, reason, created_at, updated_at FROM pf_blacklists
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
 * - 장비 정보
 */
exports.findById = async (id) => {
    const query = `SELECT * FROM pf_blacklists WHERE id = $1`;

    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
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
        if (error.code === '23505') { 
            const conflictError = new Error('해당 사이트에 이미 등록된 차량 번호입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        if (error.code === '23503') { 
            const notFoundError = new Error('존재하지 않는 사이트 ID입니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
}

/**
 * 수정 (Update)
 */
exports.update = async (id, data, client = null) => {
    if (!data || Object.keys(data).length === 0) return null;

    const dbData = humps.decamelizeKeys(data);

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const ALLOWED_COLUMNS = [
        'site_id',
        'car_number',
        'reason'        
    ];

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
        UPDATE pf_blacklists 
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
            const conflictError = new Error('이미 존재하는 차량번호입니다.');
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
    const query = `DELETE FROM pf_blacklists WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 차량 번호로 블랙리스트 검색
 */
exports.findByCarNumber = async (siteId, carNumber) => {
    const query = `
        SELECT id FROM pf_blacklists 
        WHERE site_id = $1 
        AND car_number = $2
        LIMIT 1
    `;
    const values = [siteId, carNumber];

    const { rows } = await pool.query(query, values);
    return rows[0] ? rows[0] : null;
}
