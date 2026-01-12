const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Lane Repository
 * - pf_lanes 테이블 CRUD
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class LaneRepository {
    
    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_lanes (
                zone_id, 
                name, 
                type, 
                description, 
                code
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const values = [
            data.zoneId, 
            data.name, 
            data.type || 'IN', 
            data.description || null, 
            data.code || null
        ];

        try {
            await pool.query('BEGIN'); 

            const { rows } = await pool.query(query, values);
            const newLaneId = rows[0].id;

            await pool.query('UPDATE pf_devices SET lane_id = NULL WHERE lane_id = $1', [newLaneId]);

            const deviceIds = [];
            if (data.inIntegratedGate?.id) deviceIds.push(data.inIntegratedGate.id);
            if (data.outIntegratedGate?.id) deviceIds.push(data.outIntegratedGate.id);

            if (deviceIds.length > 0) {
                const updateDevicesQuery = `
                    UPDATE pf_devices 
                    SET lane_id = $1 
                    WHERE id = ANY($2)
                `;
                await pool.query(updateDevicesQuery, [newLaneId, deviceIds]);
            }

            await pool.query('COMMIT'); 

            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            if (error.code === '23505') { // Unique Violation
                const conflictError = new Error('이미 존재하는 데이터입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            if (error.code === '23503') { // FK Violation (zone_id 없음)
                const notFoundError = new Error('참조하는 구역 데이터가 존재하지 않습니다.');
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

        // 옵저버 요청에 맞춘 반환 형식 (deivces 정보 동시 반환)
        let query = `
            SELECT l.*, 
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', d.id,
                            'name', d.name,
                            'type', d.type,
                            'status', d.status,
                            'ipAddress', d.ip_address,
                            'port', d.port,
                            'direction', d.direction,
                            'location', d.location
                        ) ORDER BY d.name ASC
                    ) FILTER (WHERE d.id IS NOT NULL), 
                    '[]'
                ) as devices
            FROM pf_lanes l
            LEFT JOIN pf_devices d ON l.id = d.lane_id
        `;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['name', 'description', 'code'];
        const exactColumns = ['id', 'zone_id', 'type'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`l.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`l.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`l.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`l.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // 유효성 검사
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`l.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else if (exactColumns.includes(dbCol)) {
                whereClauses.push(`l.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 옵저버 요청에 맞춘 반환 형식
        query += ` GROUP BY l.id`;

        // 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
        
        query += ` ORDER BY l.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_lanes l 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const pf_lanes = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: pf_lanes,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find Detail)
     * - Devices 목록을 포함하여 반환
     */
    async findById(id) {
        const query = `
            SELECT l.*, 
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', d.id,
                               'name', d.name,
                               'type', d.type,
                               'status', d.status,
                               
                               -- [추가됨] 장비 제어를 위한 필수 정보
                               'location', d.location, 
                               'device_controller_id', d.device_controller_id
                           ) ORDER BY d.name ASC
                       ) FILTER (WHERE d.id IS NOT NULL), 
                       '[]'
                   ) as pf_devices
            FROM pf_lanes l
            LEFT JOIN pf_devices d ON l.id = d.lane_id
            WHERE l.id = $1
            GROUP BY l.id
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
     * 수정 (Update)
     */
    async update(id, data) {
        // 1. 필요한 필드만 추출 (객체 분해 할당 사용)
        const { inIntegratedGate, outIntegratedGate, ...laneData } = data;
        
        const keys = Object.keys(laneData);
        if (keys.length === 0 && !inIntegratedGate && !outIntegratedGate) return null;

        const client = await pool.connect(); // 안전한 트랜잭션을 위해 클라이언트 직접 사용 권장

        try {
            await client.query('BEGIN');

            let updatedLane;
            if (keys.length > 0) {
                const setClauses = keys.map((key, i) => `${humps.decamelize(key)} = $${i + 2}`);
                const values = [id, ...Object.values(laneData)];
                
                const query = `
                    UPDATE pf_lanes 
                    SET ${setClauses.join(', ')}, updated_at = NOW()
                    WHERE id = $1
                    RETURNING *
                `;
                const { rows } = await client.query(query, values);
                updatedLane = rows[0];
            } else {
                // 차선 정보 수정 없이 장치 연결만 변경할 경우
                const { rows } = await client.query('SELECT * FROM pf_lanes WHERE id = $1', [id]);
                updatedLane = rows[0];
            }

            if (!updatedLane) {
                throw new Error('해당 데이터를 찾을 수 없습니다.');
            }

            // 2. 장치 연결 업데이트 로직
            // 기존에 이 차선(id)을 참조하던 모든 장치 초기화
            await client.query('UPDATE pf_devices SET lane_id = NULL WHERE lane_id = $1', [id]);

            const deviceIds = [];
            if (inIntegratedGate?.id) deviceIds.push(inIntegratedGate.id);
            if (outIntegratedGate?.id) deviceIds.push(outIntegratedGate.id);

            if (deviceIds.length > 0) {
                await client.query(
                    'UPDATE pf_devices SET lane_id = $1 WHERE id = ANY($2)',
                    [id, deviceIds]
                );
            }

            await client.query('COMMIT');
            return humps.camelizeKeys(updatedLane);

        } catch (error) {
            await client.query('ROLLBACK'); // 에러 시 반드시 롤백
            
            // 에러 상태 코드 처리
            if (error.code === '23505') error.status = 409;
            if (error.code === '23503') error.status = 404;
            
            throw error;
        } finally {
            client.release(); // 커넥션 반환
        }
    }

    /**
     * 삭제 (Delete)
     */
    async delete(id) {
        const query = `DELETE FROM pf_lanes WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        
        return humps.camelizeKeys(rows[0]);
    }
}

module.exports = LaneRepository;