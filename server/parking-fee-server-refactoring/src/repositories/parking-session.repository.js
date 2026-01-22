const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        carNumber: 'car_number',
        siteId: 'site_id'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';
    const dbSortOrder = sortOptions.sortOrder === 'ASC' ? 'ASC' : 'DESC';

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
    // 날짜 범위 (entry_time OR exit_time 기준)
    if (filters.startTime) {
        conditions.push(`(entry_time >= $${values.length + 1} OR exit_time >= $${values.length + 1})`);
        values.push(filters.startTime);
    }
    if (filters.endTime) {
        conditions.push(`(entry_time <= $${values.length + 1} OR exit_time <= $${values.length + 1})`);
        values.push(filters.endTime);
    }
    // 상태 (Array Check)
    if (filters.statuses && filters.statuses.length > 0) {
        conditions.push(`status = ANY($${values.length + 1}::text[])`);
        values.push(filters.statuses);
    }
    // Lane & Source Filters
    if (filters.entryLaneId) {
        conditions.push(`entry_lane_id = $${values.length + 1}`);
        values.push(filters.entryLaneId);
    }
    if (filters.exitLaneId) {
        conditions.push(`exit_lane_id = $${values.length + 1}`);
        values.push(filters.exitLaneId);
    }
    if (filters.entrySource) {
        conditions.push(`entry_source = $${values.length + 1}`);
        values.push(filters.entrySource);
    }
    if (filters.exitSource) {
        conditions.push(`exit_source = $${values.length + 1}`);
        values.push(filters.exitSource);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_parking_sessions ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = countResult.rows[0].count;

    // 3. 데이터 조회 쿼리
    const query = `
        SELECT * FROM pf_parking_sessions
        ${whereClause}
        ORDER BY ${dbSortBy} ${dbSortOrder}
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
 */
exports.findById = async (id) => {
    const query = `
        SELECT * FROM pf_parking_sessions
        WHERE id = $1
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
    
    const { 
        site_id, site_name, site_code,
        // 입차 구역/차선 상세 정보
        entry_zone_id, entry_zone_name, entry_zone_code,
        entry_lane_id, entry_lane_name, entry_lane_code,
        
        car_number, vehicle_type,
        entry_time, entry_image_url, entry_source,
        status, note
    } = dbData;

    const query = `
        INSERT INTO pf_parking_sessions (
            site_id, site_name, site_code,
            
            -- 입차 상세 정보
            entry_zone_id, entry_zone_name, entry_zone_code,
            entry_lane_id, entry_lane_name, entry_lane_code,

            car_number, vehicle_type,
            entry_time, entry_image_url, entry_source,
            status, note,
            created_at, updated_at
        )
        VALUES (
            $1, $2, $3, 
            $4, $5, $6, $7, $8, $9, -- 입차 상세
            $10, $11, 
            $12, $13, $14, 
            $15, $16,
            NOW(), NOW()
        )
        RETURNING *
    `;

    const values = [
        site_id, site_name, site_code,
        entry_zone_id || null, entry_zone_name || null, entry_zone_code || null,
        entry_lane_id || null, entry_lane_name || null, entry_lane_code || null,
        car_number, vehicle_type || 'NORMAL',
        entry_time || new Date(), entry_image_url || null, entry_source || 'SYSTEM',
        status || 'PENDING', note || null
    ];

    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23503') { 
            const notFoundError = new Error('참조하는 사이트, 구역 또는 차선이 존재하지 않습니다.');
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

    // ★ [Whitelist] 업데이트 허용 컬럼 확장 (Name, Code 포함)
    const ALLOWED_COLUMNS = [
        'car_number', 'vehicle_type', 'note',
        'entry_time', 'entry_image_url', 'entry_source',
        // 입차 정보 수정 가능성 열어둠
        'entry_lane_id', 'entry_lane_name', 'entry_lane_code',
        'entry_zone_id', 'entry_zone_name', 'entry_zone_code',
        
        // 출차 정보 (핵심)
        'exit_time', 'exit_image_url', 'exit_source',
        'exit_lane_id', 'exit_lane_name', 'exit_lane_code',
        'exit_zone_id', 'exit_zone_name', 'exit_zone_code',
        
        'total_fee', 'discount_fee', 'paid_fee', 'remaining_fee', 'duration',
        'applied_discounts', 'status'
    ];

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            if (key === 'applied_discounts') {
                updates.push(`${key} = $${paramIndex}::jsonb`);
                values.push(JSON.stringify(dbData[key]));
            } else {
                updates.push(`${key} = $${paramIndex}`);
                values.push(dbData[key]);
            }
            paramIndex++;
        }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE pf_parking_sessions 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING *
    `;

    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        if (rows.length === 0) return null;
        return humps.camelizeKeys(rows[0]);
    } catch (error) {
        if (error.code === '23503') { 
            const notFoundError = new Error('참조하는 사이트, 구역 또는 차선이 존재하지 않습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
};