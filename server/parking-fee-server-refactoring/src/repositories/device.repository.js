const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Device Repository
 * - pf_devices 테이블 CRUD
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class DeviceRepository {
    
    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_devices (
                site_id, zone_id, lane_id, device_controller_id, parent_device_id,
                type, name, description, code,
                vendor, model_name, ip_address, port, mac_address, connection_type,
                serial_number, firmware_version, location, direction, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *
        `;
        
        const values = [
            data.siteId, 
            data.zoneId || null, 
            data.laneId || null, 
            data.deviceControllerId || null, 
            data.parentDeviceId || null,
            data.type, 
            data.name, 
            data.description || null, 
            data.code || null,
            data.vendor || null, 
            data.modelName || null, 
            data.ipAddress || null, 
            data.port || null, 
            data.macAddress || null, 
            data.connectionType || null,
            data.serialNumber || null, 
            data.firmwareVersion || null, 
            data.location,
            data.direction, 
            data.status || 'UNKNOWN'
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
            if (error.code === '23503') { // FK Violation
                const notFoundError = new Error('참조하는 상위 데이터(사이트, 구역, 차로 등)가 존재하지 않습니다.');
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
        let query = `SELECT d.* FROM pf_devices d`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code', 'vendor', 'model_name', 'status', 'connection_type', 'serial_number', 'firmware_version'];
        const exactColumns = ['id', 'site_id', 'zone_id', 'lane_id', 'device_controller_id', 'parent_device_id', 'type', 'port', 'direction'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // =========================================================
            // [추가] isUsedByLane 필터 처리 로직
            // =========================================================
            if (key === 'isUsedByLane') {
                if (value === true) {
                    // true: 차선에 할당된 장비만 (lane_id가 있는 것)
                    whereClauses.push(`d.lane_id IS NOT NULL`);
                } else {
                    // false: 차선에 할당되지 않은 장비만 (lane_id가 없는 것)
                    whereClauses.push(`d.lane_id IS NULL`);
                }
                return; // 처리가 끝났으므로 루프의 다음 키로 넘어감
            }

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`d.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`d.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`d.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`d.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // 유효성 검사
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`d.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (dbCol === 'ip_address' || dbCol === 'mac_address') {
                // IP, MAC 주소는 text로 캐스팅하여 부분 검색 지원
                whereClauses.push(`d.${dbCol}::text ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (exactColumns.includes(dbCol)) {
                whereClauses.push(`d.${dbCol} = $${paramIndex}`);
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
        
        query += ` ORDER BY d.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_devices d
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const pf_devices = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: pf_devices,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find Detail)
     */
    async findById(id) {
        const query = `SELECT * FROM pf_devices WHERE id = $1`;
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
            console.warn('[DeviceRepository.update] Data received is an Array. Please send an Object.');
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
            if (['id', 'created_at'].includes(dbCol)) return;
            
            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) {
            console.warn('[DeviceRepository.update] No valid fields to update. Returning null.');
            return null;
        }

        const query = `
            UPDATE pf_devices 
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
        const query = `DELETE FROM pf_devices WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return rows[0];
    }

    async findOneByLocation(locationName) {
        if (!locationName) return null;

        const query = `
            SELECT 
                d.id as device_id, 
                d.ip_address as device_ip, 
                d.port as device_port, 
                d.direction as direction,
                
                l.id as lane_id,
                
                z.id as zone_id,
                
                s.id as site_id,
                
                dc.id as device_controller_id,
                dc.ip_address as device_controller_ip_address,
                dc.port as device_controller_port
                
            FROM pf_devices d
            LEFT JOIN pf_lanes l ON d.lane_id = l.id
            LEFT JOIN pf_zones z ON l.zone_id = z.id
            LEFT JOIN pf_sites s ON z.site_id = s.id
            LEFT JOIN pf_device_controllers dc ON d.device_controller_id = dc.id
            WHERE d.location LIKE '%' || $1 || '%' 
                AND d.type = 'INTEGRATED_GATE'
            LIMIT 1
        `;

        const client = await pool.connect();
        try {
            const result = await client.query(query, [locationName]);
            
            if (result.rows.length > 0) {
                // Repository가 DB Raw 데이터를 객체로 변환해서 반환
                return humps.camelizeKeys(result.rows[0]);
            }
            return null;
        } finally {
            client.release();
        }
    }

    /**
     * IP, PORT로 device 조회
     */
    async findDeviceByIpAndPort(deviceIp, devicePort) {
        const query = `SELECT * FROM pf_devices WHERE ip_address = $1 AND port = $2`;
        const {rows} = await pool.query(query, [deviceIp, devicePort]);

        if (!rows[0]) {
            const notFoundError = new Error('해당하는 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = DeviceRepository;







/**
 * [이동됨] 차선에 장비 할당 (Assign Devices to Lane)
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