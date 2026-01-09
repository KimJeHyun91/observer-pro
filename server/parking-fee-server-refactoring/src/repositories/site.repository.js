const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Site Repository
 * - pf_sites 테이블에 대한 직접적인 CRUD 및 쿼리 수행
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class SiteRepository {
    
    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_sites (
                name, 
                description, 
                code, 
                manager_name, 
                manager_phone, 
                phone, 
                zip_code, 
                address_base, 
                address_detail, 
                total_capacity, 
                capacity_detail,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        // capacityDetail 내부 키를 스네이크케이스로 변환 (예: evSlow -> ev_slow)
        const capacityDetail = humps.decamelizeKeys(data.capacityDetail || {});
        
        const values = [
            data.name, 
            data.description, 
            data.code,
            data.managerName, 
            data.managerPhone, 
            data.phone,
            data.zipCode, 
            data.addressBase, 
            data.addressDetail,
            data.totalCapacity || 0, 
            capacityDetail,
            data.status
        ];

        try {

            await pool.query('BEGIN');

            const { rows } = await pool.query(query, values);

            const newSiteId = rows[0].id;

            if (data.deviceControllerIdList && data.deviceControllerIdList.length > 0) {
                const updateControllersQuery = `
                    UPDATE pf_device_controllers 
                    SET site_id = $1 
                    WHERE id = ANY($2)
                `;
                await pool.query(updateControllersQuery, [newSiteId, data.deviceControllerIdList]);
            }

            await pool.query('COMMIT');

            // DB 결과(스네이크케이스)를 카멜케이스 객체로 변환하여 반환
            return humps.camelizeKeys(rows[0]);
        } catch (error) {

            await pool.query('ROLLBACK');
            
            // PostgreSQL Unique Violation Code: 23505
            if (error.code === '23505') {
                const conflictError = new Error('이미 존재하는 데이터입니다.');
                conflictError.status = 409; // HTTP Status Code 설정
                throw conflictError;
            }
            // PostgreSQL Foreign Key Violation Code: 23503 (참조 데이터 없음)
            if (error.code === '23503') {
                const notFoundError = new Error('참조하는 데이터가 존재하지 않습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 다목적 목록 조회 (Find All)
     * - 검색: 텍스트 컬럼은 ILIKE(부분일치), 숫자형은 범위(_min, _max) 및 일치 검색
     * - JSONB 검색: capacity_detail 내부 필드에 대한 범위 검색 지원
     * - 날짜 검색: createdAt, updatedAt 범위 검색 지원
     * - 정렬 및 페이징 적용
     */
    async findAll(filters, sortOptions, limit, offset) {

        let query = `SELECT s.* FROM pf_sites s`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 부분 일치 검색을 허용할 텍스트 컬럼 목록 (스네이크케이스 기준)
        const textColumns = [
            'name', 'description', 'code', 
            'manager_name', 'manager_phone', 'phone', 
            'address_base', 'address_detail'
        ];

        // capacity_detail 내부 키 목록 (검색 허용 필드, 스네이크케이스)
        const detailKeys = ['general', 'disabled', 'compact', 'ev_slow', 'ev_fast', 'women'];

        // 동적 WHERE 절 생성
        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색 추가
            if (key === 'createdAtStart') {
                whereClauses.push(`s.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`s.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`s.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`s.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. total_capacity 범위 검색
            if (key === 'totalCapacityMin') {
                whereClauses.push(`s.total_capacity >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
            } else if (key === 'totalCapacityMax') {
                whereClauses.push(`s.total_capacity <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
            // 3. capacityDetail 내부 필드 범위 검색 (예: capacityDetailGeneralMin)
            else if (key.startsWith('capacityDetail')) {
                // 키 파싱: "capacityDetailGeneralMin" -> field="General", suffix="Min"
                let temp = key.replace('capacityDetail', ''); 
                let suffix = temp.endsWith('Min') ? 'Min' : 'Max';
                let fieldCamel = temp.replace(suffix, ''); // "General", "EvSlow"
                
                // humps.decamelize를 사용하여 스네이크케이스로 변환 (EvSlow -> ev_slow)
                const dbField = humps.decamelize(fieldCamel);
                const operator = suffix === 'Min' ? '>=' : '<=';

                if (detailKeys.includes(dbField)) {
                    // JSONB 연산자 사용: (s.capacity_detail->>'ev_slow')::int >= 값
                    whereClauses.push(`(s.capacity_detail->>'${dbField}')::int ${operator} $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            }
            // 4. 일반 필드 처리 (텍스트 ILIKE 또는 정확 일치)
            else {
                // 카멜케이스 키를 스네이크케이스 컬럼명으로 변환 (예: managerName -> manager_name)
                const dbCol = humps.decamelize(key);

                // 유효하지 않은 컬럼명(예: '0', 특수문자 등) 필터링하여 SQL Syntax Error 방지
                if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) {
                    return;
                }

                if (textColumns.includes(dbCol)) {
                    whereClauses.push(`s.${dbCol} ILIKE $${paramIndex}`);
                    values.push(`%${value}%`);
                    paramIndex++;
                } else {
                    // textColumns에 없고 특수 로직이 아닌 경우 정확 일치로 간주 (isActive 등)
                    // 실제 유효한 컬럼인지 확인하는 화이트리스트 검증 로직 추가 권장
                    whereClauses.push(`s.${dbCol} = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                }
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        // 정렬 키를 스네이크케이스로 변환
        const dbSortBy = humps.decamelize(sortBy);
        
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        query += ` ORDER BY s.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 전체 개수 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_sites s 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            // 조회된 모든 행을 CamelCase 객체로 변환
            const pf_sites = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: pf_sites,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find Detail)
     * - Device Controllers, Zones 목록을 포함해서 반환
     */
    async findById(id) {

        const query = `
            SELECT 
                s.*,
                
                -- 1. Zones 정보 가져오기 (1:N)
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'id', z.id,
                                'name', z.name,
                                'code', z.code,
                                'description', z.description,
                            ) ORDER BY z.name ASC
                        ), 
                        '[]'
                    )
                    FROM pf_zones z 
                    WHERE z.site_id = s.id
                ) as zones,

                -- 2. Device Controllers 정보 가져오기 (N:M via mapping table)
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'id', dc.id,
                                'name', dc.name,
                                'type', dc.type,
                                'ipAddress', dc.ip_address,
                                'port', dc.port,
                                'status', dc.status,
                            ) ORDER BY dc.name ASC
                        ), 
                        '[]'
                    )
                    FROM pf_site_device_controllers sdc
                    JOIN pf_device_controllers dc ON dc.id = sdc.device_controller_id
                    WHERE sdc.site_id = s.id
                ) as device_controllers

            FROM pf_sites s
            WHERE s.id = $1
        `;

        const { rows } = await pool.query(query, [id]);

        if (!rows.length) {
            const notFoundError = new Error('해당하는 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        // DB snake_case -> JS camelCase 자동 변환
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 수정 (Update)
     */
    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id];
        let valIndex = 2;

        keys.forEach(key => {
            // 키를 스네이크케이스 컬럼명으로 변환
            const dbCol = humps.decamelize(key);
            
            // 유효하지 않은 컬럼명(숫자로 시작하거나 이상한 문자) 무시
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            let value = data[key];

            // capacityDetail 필드는 내부 키들도 스네이크케이스로 변환해야 함
            if (key === 'capacityDetail') {
                value = humps.decamelizeKeys(value);
            }

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(value);
            valIndex++;
        });

        // 유효한 업데이트 필드가 없으면 바로 리턴
        if (setClauses.length === 0) return null;

        const query = `
            UPDATE pf_sites 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        try {
            const { rows } = await pool.query(query, values);
            
            // 업데이트할 대상이 없는 경우 (ID가 존재하지 않음)
            if (rows.length === 0) {
                const notFoundError = new Error('수정할 데이터를 찾을 수 없습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            // PostgreSQL Unique Violation Code: 23505
            if (error.code === '23505') {
                const conflictError = new Error('이미 존재하는 데이터입니다.');
                conflictError.status = 409; 
                throw conflictError;
            }
            // PostgreSQL Foreign Key Violation Code: 23503 (참조 데이터 없음)
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
        const query = `DELETE FROM pf_sites WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        
        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 트리 조회(Find Tree) 
     */
    async findTree(siteId) {
        const query = `
            SELECT 
                s.*,
                -- 1. 사이트에 소속된 제어기들 (Device Controllers)
                COALESCE(
                    (SELECT jsonb_agg(dc_tree)
                    FROM (
                        SELECT * FROM pf_device_controllers 
                        WHERE site_id = s.id 
                        ORDER BY name ASC
                    ) dc_tree
                    ), '[]'::jsonb
                ) AS device_controllers,
                
                -- 2. 사이트 > 구역(Zones) > 차선(Lanes) > 장비(Devices) 계층 구조
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
            WHERE s.id = $1;
        `;

        const { rows } = await pool.query(query, [siteId]);

        if (rows.length === 0) return null;

        // humps를 통해 snake_case를 camelCase로 일괄 변환
        return humps.camelizeKeys(rows[0]);
    }

}

module.exports = SiteRepository;