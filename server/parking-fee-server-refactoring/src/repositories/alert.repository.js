const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions = {}, limit = 20, offset = 0) => {
    // 1. 정렬 매핑
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';
    const dbSortOrder = sortOptions.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const conditions = [];
    const values = [];

    // 2. 필터 조건 생성
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }

    if (filters.type) {
        conditions.push(`type = $${values.length + 1}`);
        values.push(filters.type);
    }

    if (filters.severity) {
        conditions.push(`severity = $${values.length + 1}`);
        values.push(filters.severity);
    }

    if (filters.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(filters.status);
    }

    if (filters.parkingSessionId) {
        conditions.push(`parking_session_id = $${values.length + 1}`);
        values.push(filters.parkingSessionId);
    }
    
    if (filters.carNumber) {
        conditions.push(`car_number ILIKE $${values.length + 1}`);
        values.push(`%${filters.carNumber}%`);
    }

    // 날짜 범위 (created_at 기준)
    if (filters.startTime) {
        conditions.push(`created_at >= $${values.length + 1}`);
        values.push(filters.startTime);
    }
    if (filters.endTime) {
        conditions.push(`created_at <= $${values.length + 1}`);
        values.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_alerts ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = parseInt(countResult.rows[0].count, 10);

    // 4. 데이터 조회 쿼리
    const query = `
        SELECT * FROM pf_alerts
        ${whereClause}
        ORDER BY ${dbSortBy} ${dbSortOrder}
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
 */
exports.findById = async (id) => {
    const query = `SELECT * FROM pf_alerts WHERE id = $1`;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    const dbData = humps.decamelizeKeys(data);

    const {
        site_id, site_name, site_code,
        type, severity, status,
        title, message,
        device_id, parking_session_id, car_number,
        metadata
    } = dbData;

    const query = `
        INSERT INTO pf_alerts (
            site_id, site_name, site_code,
            type, severity, status,
            title, message,
            device_id, parking_session_id, car_number,
            metadata,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3,
            $4, $5, $6,
            $7, $8,
            $9, $10, $11,
            $12,
            NOW(), NOW()
        )
        RETURNING *
    `;

    const values = [
        site_id, site_name, site_code,
        type, severity, status || 'NEW',
        title, message,
        device_id || null, parking_session_id || null, car_number || null,
        metadata || {},
    ];

    const { rows } = await pool.query(query, values);
    return humps.camelizeKeys(rows[0]);
};

/**
 * 수정 (Update)
 */
exports.update = async (id, data) => {
    if (!data || Object.keys(data).length === 0) return null;

    const dbData = humps.decamelizeKeys(data);

    // 업데이트 허용 컬럼 (Whitelist)
    const ALLOWED_COLUMNS = [
        'status', 
        'note', 
        'operator_id', 
        'operator_name', 
        'resolved_at'
    ];

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(dbData[key]);
            paramIndex++;
        }
    });

    if (updates.length === 0) return null;

    updates.push('updated_at = NOW()');

    const query = `
        UPDATE pf_alerts
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
    `;

    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? humps.camelizeKeys(rows[0]) : null;
};