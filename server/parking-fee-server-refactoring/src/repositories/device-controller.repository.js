const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Device Controller Repository
 * - pf_device_controllers 테이블 CRUD
 * - 하위 Devices 정보 요약 포함 (JSON Aggregation)
 */
class DeviceControllerRepository {
    
    /**
     * 장치 제어기 생성
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
                config, 
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            data.config || {}, 
            true // is_active
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
     * - 기본 컬럼 및 날짜 범위 검색
     * - IP 주소 텍스트 검색 지원
     * - 조회 결과에 해당 Controller에 연결된 Devices 요약 정보 포함
     */
    async findAll(filters, sortOptions, limit, offset) {
        // DeviceControllers + Devices(요약) 조인
        let query = `
            SELECT dc.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', d.id,
                               'name', d.name,
                               'type', d.type,
                               'status', d.status,
                               'isActive', d.is_active
                           ) ORDER BY d.name ASC
                       ) FILTER (WHERE d.id IS NOT NULL), 
                       '[]'
                   ) as pf_devices
            FROM pf_device_controllers dc
            LEFT JOIN pf_devices d ON dc.id = d.device_controller_id
        `;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code', 'status'];
        const exactColumns = ['id', 'site_id', 'port', 'is_active'];

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

        query += ` GROUP BY dc.id`;

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
     * 단일 조회 (상세)
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
                               'status', d.status,
                               'isActive', d.is_active
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
     * Device Controller 수정
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

            // 유효하지 않은 컬럼명 무시
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) {
                console.warn(`[DeviceControllerRepository.update] Skipped invalid column key: ${key} -> ${dbCol}`);
                return;
            }

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
     * Device Controller 삭제 (Hard/Soft)
     */
    async delete(id, isHardDelete) {
        let query;
        if (isHardDelete) {
            query = `DELETE FROM pf_device_controllers WHERE id = $1 RETURNING id`;
        } else {
            query = `
                UPDATE pf_device_controllers 
                SET is_active = false, updated_at = NOW() 
                WHERE id = $1 
                RETURNING id
            `;
        }
        
        const { rows } = await pool.query(query, [id]);
        
        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return { 
            deletedId: rows[0]?.id, 
            isHardDelete 
        };
    }
}

module.exports = DeviceControllerRepository;