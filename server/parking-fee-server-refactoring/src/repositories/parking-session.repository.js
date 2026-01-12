const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

class ParkingSessionRepository {

    // [상수] 활성 상태 목록 (진행 중인 세션)
    static ACTIVE_STATUSES = ['PENDING', 'PAYMENT_PENDING', 'PRE_SETTLED', 'PENDING_ENTRY', 'PENDING_EXIT'];

    // [보안] 정렬 가능한 컬럼 제한
    static ALLOWED_SORT_COLUMNS = [
        'entry_time', 'exit_time', 'created_at', 'updated_at', 
        'total_fee', 'car_number', 'duration'
    ];

    // [보안] 업데이트 가능한 컬럼 제한 (Whitelist)
    static ALLOWED_UPDATE_COLUMNS = [
        'site_name', 'site_code', 'car_number', 'vehicle_type', 'note',
        'entry_zone_id', 'entry_zone_name', 'entry_time', 'entry_image_url', 'entry_source', 
        'exit_zone_id', 'exit_zone_name', 'exit_lane_id', 'exit_lane_name', 
        'exit_time', 'exit_image_url', 'exit_source', 
        'duration', 'parking_fee', 'total_fee', 'discount_amount', 'discount_fee', 'paid_amount', 'paid_fee', 
        'applied_discounts', 'status', 'pre_settled_at', 'updated_at'
    ];

    /**
     * 1. [생성] Create Session
     */
    async create(data, client) {
        const db = client || pool;

        const query = `
            INSERT INTO pf_parking_sessions (
                site_id, site_name, site_code,
                entry_zone_id, entry_lane_id, entry_lane_name,
                car_number, vehicle_type,
                entry_time, entry_image_url, entry_source,
                status, note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            data.siteId, 
            data.siteName,
            data.siteCode || null,
            
            data.entryZoneId || null, 
            data.entryLaneId || null, 
            data.entryLaneName || null,
            
            data.carNumber, 
            data.vehicleType || 'NORMAL', // 'MEMBER' 값은 여기서 들어감
            
            data.entryTime || new Date(), 
            data.entryImageUrl || null, 
            data.entrySource || 'SYSTEM',
            
            // isMember, memberId 제거됨
            
            data.status || 'PENDING', 
            data.note || null
        ];

        try {
            const { rows } = await db.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            // FK 에러 등 상세 처리 가능
            throw error;
        }
    }

    /**
     * 2. [조회] 활성 세션 찾기 (중복 입차 체크용)
     * - Service에서 호출하는 이름: findActiveSession
     */
    async findActiveSession(siteId, carNumber) {
        // ANY($3) 문법을 사용하여 여러 상태값을 한 번에 비교
        const query = `
            SELECT * FROM pf_parking_sessions 
            WHERE site_id = $1 
              AND car_number = $2
              AND status = ANY($3)
            ORDER BY entry_time DESC 
            LIMIT 1
        `;
        
        const values = [siteId, carNumber, ParkingSessionRepository.ACTIVE_STATUSES];

        const { rows } = await pool.query(query, values);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 3. [수정] 출차 정보 업데이트 (Update Exit)
     * - Service에서 호출하는 이름: updateExit
     * - 일반 update 메서드를 재사용하되, 메서드 이름을 맞춰줌
     */
    async updateExit(id, data) {
        return await this.update(id, data);
    }

    /**
     * 4. [공통] 일반 업데이트 (Update)
     * - 동적 쿼리 생성
     */
    async update(id, data, client) {
        const db = client || pool;
        
        // 1. Whitelist 필터링
        const keys = Object.keys(data).filter(key => {
            const dbCol = humps.decamelize(key);
            // parkingFee, totalFee 등 용어 혼용을 막기 위해 둘 다 허용하거나 매핑 필요
            // 여기서는 ALLOWED_UPDATE_COLUMNS에 있는 것만 허용
            return ParkingSessionRepository.ALLOWED_UPDATE_COLUMNS.includes(dbCol);
        });

        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id]; // $1
        let valIndex = 2;

        let hasUpdatedAt = false;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            const value = data[key];

            if (dbCol === 'updated_at') hasUpdatedAt = true;

            if (key === 'appliedDiscounts') {
                // JSONB 배열 처리
                setClauses.push(`${dbCol} = $${valIndex}::jsonb`);
                values.push(JSON.stringify(value)); 
            } else {
                setClauses.push(`${dbCol} = $${valIndex}`);
                values.push(value);
            }
            valIndex++;
        });

        if (!hasUpdatedAt) {
            setClauses.push('updated_at = NOW()');
        }

        const query = `
            UPDATE pf_parking_sessions
            SET ${setClauses.join(', ')}
            WHERE id = $1
            RETURNING *
        `;

        try {
            const { rows } = await db.query(query, values);
            return rows[0] ? humps.camelizeKeys(rows[0]) : null;
        } catch (error) {
            // 디버깅을 위해 쿼리와 에러 로그 출력 추천
            console.error('[Repository Update Error]', error.message);
            throw error;
        }
    }

    /**
     * 5. [단일 조회] Find By ID
     */
    async findById(id) {
        const query = `SELECT * FROM pf_parking_sessions WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 6. [목록 조회] Find All
     * - 검색, 필터링, 정렬, 페이징
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM pf_parking_sessions s`;
        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const { startTime, endTime, ...otherFilters } = filters;

        // "기간 내에 입차했거나" OR "기간 내에 출차했거나"
        if (startTime || endTime) {
            const timeConditions = [];
            
            // 시작일 처리
            if (startTime) {
                // (입차 >= 시작일 OR 출차 >= 시작일)
                // $paramIndex 값을 재사용하기 위해 values에 넣고 인덱스 관리 필요
                values.push(startTime);
                timeConditions.push(`(s.entry_time >= $${paramIndex} OR s.exit_time >= $${paramIndex})`);
                paramIndex++;
            }

            // 종료일 처리
            if (endTime) {
                let timeVal = endTime;
                // 날짜만 들어오면 그 날의 끝까지 조회 (YYYY-MM-DD -> YYYY-MM-DD 23:59:59)
                if (/^\d{4}-\d{2}-\d{2}$/.test(endTime)) {
                    timeVal = `${endTime} 23:59:59.999`;
                }
                
                values.push(timeVal);
                timeConditions.push(`(s.entry_time <= $${paramIndex} OR s.exit_time <= $${paramIndex})`);
                paramIndex++;
            }

            // AND로 묶어서 전체 조건에 추가
            if (timeConditions.length > 0) {
                whereClauses.push(`(${timeConditions.join(' AND ')})`);
            }
        }

        // 2. [나머지 필터] 자동 매핑 (carNumber, siteId, status, entrySource, exitSource 등)
        // 검색 허용 컬럼 (LIKE 검색용)
        const textColumns = ['car_number', 'site_name', 'note', 'entry_lane_name', 'exit_lane_name'];

        Object.keys(otherFilters).forEach(key => {
            const value = otherFilters[key];
            if (value === undefined || value === null || value === '') return;

            const dbCol = humps.decamelize(key); // entrySource -> entry_source
            
            // SQL Injection 방지용 컬럼명 검사
            if (!/^[a-z0-9_]+$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                whereClauses.push(`s.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
            } else {
                // ID, Status, Source 등은 정확한 매칭 (=)
                whereClauses.push(`s.${dbCol} = $${paramIndex}`);
                values.push(value);
            }
            paramIndex++;
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬
        let sortBy = humps.decamelize(sortOptions.sortBy || 'entry_time');
        if (!ParkingSessionRepository.ALLOWED_SORT_COLUMNS.includes(sortBy)) sortBy = 'entry_time';
        const sortOrder = (sortOptions.sortOrder === 'ASC') ? 'ASC' : 'DESC';

        query += ` ORDER BY s.${sortBy} ${sortOrder}`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM pf_parking_sessions s
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countRes, rowsRes] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            return {
                rows: rowsRes.rows.map(row => humps.camelizeKeys(row)),
                count: parseInt(countRes.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * [Gate Logic] 특정 차선에서 '진입/진출 대기 중'인 가장 최근 세션 조회
     * - 차단기가 내려갔을 때, 어떤 차에 대한 것인지 찾기 위함
     */
    async findLatestTransitioningSession(laneId) {
        const query = `
            SELECT * FROM pf_parking_sessions
            WHERE (entry_lane_id = $1 OR exit_lane_id = $1)
              AND status IN ('PENDING_ENTRY', 'PENDING_EXIT')
            ORDER BY updated_at DESC
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [laneId]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }
}

module.exports = ParkingSessionRepository;