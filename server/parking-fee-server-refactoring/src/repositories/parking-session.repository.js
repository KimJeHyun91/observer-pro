const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Parking Session Repository
 * - 주차 세션(입출차 이력) 테이블 접근
 * - CamelCase <-> SnakeCase 변환 처리
 */
class ParkingSessionRepository {

    /**
     * 주차 세션 생성 (입차 시)
     * - 입차 시점에는 출차 정보나 요금 정보가 없을 수 있으므로 nullable 처리
     * - siteName은 Service에서 채워서 넘어옴
     */
    async create(data, client) {
        const db = client || pool;

        const query = `
            INSERT INTO pf_parking_sessions (
                site_id, site_name, site_code,
                entry_zone_id, entry_zone_name, entry_zone_code,
                entry_lane_id, entry_lane_name, entry_lane_code,
                entry_time, entry_image_url,
                car_number, vehicle_type, status, note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const values = [
            data.siteId,
            data.siteName,       // Service에서 조회하여 필수 입력됨
            data.siteCode || null,
            
            data.entryZoneId || null,
            data.entryZoneName || null,
            data.entryZoneCode || null,
            
            data.entryLaneId || null,
            data.entryLaneName || null,
            data.entryLaneCode || null,
            
            data.entryTime || new Date(), // 없으면 현재 시간
            data.entryImageUrl || null,
            
            data.carNumber,
            data.vehicleType || 'NORMAL',
            data.status || 'PENDING',
            data.note || null
        ];

        try {
            const { rows } = await db.query(query, values);
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 주차 세션 목록 조회 (모든 컬럼 검색 지원)
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT s.* FROM pf_parking_sessions s`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 1. 부분 일치(ILIKE)를 적용할 텍스트 컬럼 정의
        const textColumns = [
            'car_number', 'site_name', 'site_code', 
            'entry_zone_name', 'entry_lane_name', 
            'exit_zone_name', 'exit_lane_name', 'note'
        ];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 2. 날짜 범위 검색 처리 (createdAt, entryTime, exitTime 등)
            // - End 시각이 날짜(YYYY-MM-DD)만 올 경우 23:59:59로 보정
            if (key.endsWith('Start') || key.endsWith('End')) {
                const isStart = key.endsWith('Start');
                const baseField = humps.decamelize(key.replace(isStart ? 'Start' : 'End', ''));
                const operator = isStart ? '>=' : '<=';
                
                let processedValue = value;
                if (!isStart && value.length === 10) { // '2026-01-10' -> '2026-01-10 23:59:59'
                    processedValue = `${value} 23:59:59.999`;
                }

                whereClauses.push(`s.${baseField} ${operator} $${paramIndex}`);
                values.push(processedValue);
                paramIndex++;
                return;
            }

            // 3. 일반 필드 처리 (텍스트 ILIKE 또는 정확 일치)
            const dbCol = humps.decamelize(key);

            // SQL Injection 방지용 검증
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (textColumns.includes(dbCol)) {
                // 부분 일치 검색
                whereClauses.push(`s.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else {
                // UUID, 상태(status), 차량타입(vehicleType) 등 정확 일치 검색
                whereClauses.push(`s.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 4. 정렬 적용
        let sortBy = sortOptions.sortBy || 'createdAt';
        const dbSortBy = humps.decamelize(sortBy);
        const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY s.${dbSortBy} ${sortOrder}`;

        // 5. 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*) FROM pf_parking_sessions s 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            return {
                rows: rowsResult.rows.map(row => humps.camelizeKeys(row)),
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find By ID)
     */
    async findById(id) {
        const query = `SELECT * FROM pf_parking_sessions WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 현재 주차 중인 차량 조회 (Find Active Session)
     * - 입차는 했으나 아직 정산/출차가 완료되지 않은 세션
     * - 'FORCE_COMPLETED', 'CANCELLED', 'COMPLETED' 등 종료 상태는 제외
     */
    async findActiveSessionByCarNumber(siteId, carNumber) {
        const query = `
            SELECT * FROM pf_parking_sessions
            WHERE site_id = $1 
              AND car_number = $2
              AND status IN ('PENDING', 'PRE_SETTLED', 'PAYMENT_PENDING') 
            ORDER BY entry_time DESC
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [siteId, carNumber]);
        return rows[0] ? humps.camelizeKeys(rows[0]) : null;
    }

    async update(id, data, client) {
        const db = client || pool;
        
        // 1. 유효한 필드 추출 (수정 불가능한 필드 제외)
        const keys = Object.keys(data).filter(key => {
            const dbCol = humps.decamelize(key);
            // 비정상적인 키(숫자만 있거나 등) 필터링
            return !['id', 'site_id', 'created_at'].includes(dbCol) && /^[a-zA-Z]/.test(key);
        });

        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id]; // $1
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            const value = data[key];

            if (value !== undefined) {
                // 컬럼명을 안전하게 큰따옴표로 감싸서 예약어/숫자 이슈 방지
                if (key === 'appliedDiscounts') {
                    setClauses.push(`"${dbCol}" = $${valIndex}::jsonb`);
                } else {
                    setClauses.push(`"${dbCol}" = $${valIndex}`);
                }
                values.push(value);
                valIndex++;
            }
        });

        if (setClauses.length === 0) return null;

        const query = `
            UPDATE pf_parking_sessions
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        // [디버깅] 실제 생성된 쿼리를 로그로 확인합니다.
        console.log('[DEBUG] SQL Query:', query);
        console.log('[DEBUG] Values:', JSON.stringify(values));

        try {
            const { rows } = await db.query(query, values);
            
            if (rows.length === 0) {
                const error = new Error('수정할 주차 세션을 찾을 수 없습니다.');
                error.status = 404;
                throw error;
            }

            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            console.error('SQL Error Detail:', error.message);
            console.error('Failed Query:', query);
            throw error;
        }
    }
}

module.exports = ParkingSessionRepository;