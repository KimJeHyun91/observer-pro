const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset, isUsedByLane) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        siteId: 'site_id',
        name: 'name',
        code: 'code'
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
        conditions.push(`name ILIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }
    if (filters.code) {
        conditions.push(`code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }
    if (filters.direction) {
        conditions.push(`direction = $${values.length + 1}`);
        values.push(filters.direction);
    }
    if (filters.type) {
        conditions.push(`type = $${values.length + 1}`);
        values.push(filters.type);
    }

    if (isUsedByLane !== undefined && isUsedByLane !== null) {
        if (isUsedByLane === true) {
            conditions.push(`lane_id IS NOT NULL`);
        } else {
            conditions.push(`lane_id IS NULL`);
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_devices ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = countResult.rows[0].count;

    // 3. 데이터 조회 쿼리
    const query = `
        SELECT id, name, description, code, ip_address, port, type, direction, created_at, updated_at FROM pf_devices
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
    const query = `SELECT * FROM pf_devices WHERE id = $1`;

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
        site_id,
        zone_id,
        lane_id,
        device_controller_id,
        parent_device_id,
        type,
        name,
        description,
        code,
        vendor,
        model_name,
        ip_address,
        port,
        mac_address,
        connection_type,
        serial_number,
        firmware_version,
        direction
    } = dbData;

    const query = `
            INSERT INTO pf_devices (
                site_id,
                zone_id,
                lane_id,
                device_controller_id,
                parent_device_id,
                type,
                name,
                description,
                code,
                vendor,
                model_name,
                ip_address,
                port,
                mac_address,
                connection_type,
                serial_number,
                firmware_version,
                direction,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        
        const values = [
            site_id || null,
            zone_id || null,
            lane_id || null,
            device_controller_id || null,
            parent_device_id || null,
            type || null,
            name,
            description || null,
            code || null,
            vendor || null,
            model_name || null,
            ip_address || null,
            port || null,
            mac_address || null,
            connection_type || null,
            serial_number || null,
            firmware_version || null,
            direction || null,
            'UNKNOWN'
        ];
    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23505') { 
            const conflictError = new Error('이미 존재하는 장비 이름입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        if (error.code === '23503') { 
            const notFoundError = new Error('참조하는 정보가 존재하지 않습니다.');
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

    const ALLOWED_COLUMNS = [
        'site_id',
        'zone_id',
        'lane_id',
        'device_controller_id',
        'parent_device_id',
        'type',
        'name',
        'description',
        'code',
        'vendor',
        'model_name',
        'ip_address',
        'port',
        'mac_address',
        'connection_type',
        'serial_number',
        'firmware_version',
        'direction'
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
        UPDATE pf_devices 
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
            const conflictError = new Error('이미 존재하는 장비 이름입니다.');
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
    const query = `DELETE FROM pf_devices WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 차선에 장비 할당 (Assign Devices to Lane)
 * - 기존 연결 해제 후 새로운 장비 연결
 */
exports.assignToLane = async (laneId, deviceIds, client = null) => {
    const db = client || pool;

    // 1. 해당 차선에 연결된 모든 장비 해제 (초기화)
    await db.query(
        'UPDATE pf_devices SET lane_id = NULL, updated_at = NOW() WHERE lane_id = $1', 
        [laneId]
    );
    // 2. 새로운 장비들 연결
    if (deviceIds && deviceIds.length > 0) {
        await db.query(
            'UPDATE pf_devices SET lane_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])',
            [laneId, deviceIds]
        );
    }
};

/**
 * Upsert (Insert or Update)
 * - 장비 동기화 시 사용
 * - 식별 기준: device_controller_id + name
 */
exports.upsert = async (data, client = null) => {
    const db = client || pool;
    const dbData = humps.decamelizeKeys(data);

    // 1. 기존 장비 조회 (식별자 기준)
    // 보통 동기화 시에는 '제어기 ID'와 '장비 이름'이 고유 키가 됩니다.
    let checkQuery;
    let checkValues;

    if (dbData.device_controller_id) {
        checkQuery = `SELECT id FROM pf_devices WHERE device_controller_id = $1 AND name = $2`;
        checkValues = [dbData.device_controller_id, dbData.name];
    }

    const { rows } = await db.query(checkQuery, checkValues);

    // 2. 분기 처리
    if (rows.length > 0) {
        // 2-1. 존재하면 Update
        const id = rows[0].id;
        return await exports.update(id, data, client);
    } else {
        // 2-2. 없으면 Create
        return await exports.create(data, client);
    }
};

/**
 * IP와 Port로 장비 조회
 * !! 현재 전제: 전체 시스템에서 (IP, Port) 조합은 유일하다. -> 여러 주차장 관리 불가. PLS 서버 장비 고유 식별키 없음. 설계 변경필요 
 */
exports.findByIpAddressAndPort = async (ipAddress, port) => {
    const query = `SELECT * FROM pf_devices WHERE ip_address = $1 AND port = $2`;
    const { rows } = await pool.query(query, [ipAddress, port]);

    if (rows.length === 0) return null;
    return humps.camelizeKeys(rows[0]);
};

/**
 * 다중 ID로 장비 목록 조회 (검증용)
 */
exports.findAllByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];

    const query = `
        SELECT *
        FROM pf_devices 
        WHERE id = ANY($1::uuid[])
    `;
    
    const { rows } = await pool.query(query, [ids]);
    return humps.camelizeKeys(rows);
};