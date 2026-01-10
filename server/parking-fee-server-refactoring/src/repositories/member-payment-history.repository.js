const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Member Payment History Repository
 * - pf_member_payment_histories 테이블에 대한 직접적인 CRUD 및 쿼리 수행
 * - CamelCase <-> SnakeCase 변환 및 JSONB 필드 처리 포함
 */
class MemberPaymentHistoryRepository {

    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_member_payment_histories (
                member_id, member_name, member_code, member_phone, car_number,
                policy_id, policy_name, policy_code,
                amount, payment_method, payment_status, note,
                start_date, end_date, paid_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const values = [
            data.memberId,
            data.memberName, 
            data.memberCode || null, 
            data.memberPhone || null, 
            data.carNumber, 
            
            data.policyId,
            data.policyName, 
            data.policyCode || null, 

            data.amount,
            data.paymentMethod || 'CASH',
            data.paymentStatus || 'SUCCESS',
            data.note || null,
            data.startDate,
            data.endDate,
            data.paidAt || new Date()
        ];

        const { rows } = await pool.query(query, values);
        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 다목적 목록 조회 (Find All)
     * - 검색: 텍스트 컬럼은 ILIKE(부분일치), 숫자형은 범위(_min, _max) 및 일치 검색
     * - 날짜 검색: createdAt, updatedAt 범위 검색 지원
     * - 정렬 및 페이징 적용
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT h.* FROM pf_member_payment_histories h`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 정확 일치 컬럼
        const exactColumns = ['member_id', 'policy_id', 'payment_method', 'payment_status'];
        // 부분 일치(TEXT) 컬럼
        const textColumns = ['note'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색 (결제일 paid_at)
            if (key === 'paidAtStart') {
                whereClauses.push(`h.paid_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'paidAtEnd') {
                whereClauses.push(`h.paid_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 등록 기간 검색 (start_date, end_date)
            if (key === 'startDate') { // 해당 날짜 이후 시작
                whereClauses.push(`h.start_date >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'endDate') { // 해당 날짜 이전 종료
                whereClauses.push(`h.end_date <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 3. 금액 범위 검색
            if (key === 'amountMin') {
                whereClauses.push(`h.amount >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'amountMax') {
                whereClauses.push(`h.amount <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 4. 일반 컬럼 검색
            const dbCol = humps.decamelize(key);

            // SQL Injection 방지
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            if (exactColumns.includes(dbCol)) {
                whereClauses.push(`h.${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            } else if (textColumns.includes(dbCol)) {
                whereClauses.push(`h.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
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

        query += ` ORDER BY h.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_member_payment_histories h
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const list = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: list,
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
        const query = `SELECT * FROM pf_member_payment_histories WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);

        if (!rows.length) {
            const notFoundError = new Error('해당하는 데이터를 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        // DB snake_case -> JS camelCase 자동 변환
        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 수정 (Update)
     * - 수정 가능한 컬럼 제한 (결제 금액, 기간, 메모 등)
     * - 스냅샷 정보(이름 등)는 원칙적으로 수정하지 않는 것이 좋음
     */
    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id];
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            
            // [수정] 수정 금지 컬럼 정의 (PK, FK, 생성일, 스냅샷 정보 등)
            // 만약 관리자가 오타 수정을 위해 이름 변경을 허용하려면 여기에서 제외
            const immutableColumns = ['id', 'created_at'];            
            if (immutableColumns.includes(dbCol)) return;
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return; // 안전장치

            setClauses.push(`${dbCol} = $${valIndex}`);
            values.push(data[key]);
            valIndex++;
        });

        if (setClauses.length === 0) return null;

        const query = `
            UPDATE pf_member_payment_histories 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            const notFoundError = new Error('수정할 결제 내역을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 회원의 가장 최근(미래) 결제 이력 조회
     * - 자동 연장 시작일을 계산하기 위해 필요합니다.
     * - 종료일(end_date) 기준 내림차순 정렬하여 1개만 가져옵니다.
     */
    async findLatestByMemberId(memberId) {
        const query = `
            SELECT * FROM pf_member_payment_histories
            WHERE member_id = $1
                AND payment_status = 'SUCCESS'
            ORDER BY end_date DESC
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [memberId]);
        return rows.length ? humps.camelizeKeys(rows[0]) : null;
    }

    /**
     * 기간 중복 확인
     * - 특정 회원의 결제 내역 중, 요청한 기간(Start ~ End)과 겹치는 기록이 있는지 확인
     * - 겹치는 데이터가 존재하면 true 반환
     */
    async existsOverlapping(memberId, startDate, endDate) {
        const query = `
            SELECT 1 FROM pf_member_payment_histories
            WHERE member_id = $1
              AND payment_status = 'SUCCESS' -- 취소/실패된 건은 겹쳐도 상관없음
              AND (
                  (start_date <= $2 AND end_date >= $2) OR -- 기존 기간이 시작일을 포함
                  (start_date <= $3 AND end_date >= $3) OR -- 기존 기간이 종료일을 포함
                  ($2 <= start_date AND $3 >= end_date)    -- 요청 기간이 기존 기간을 포함
              )
            LIMIT 1
        `;
        // $2: newStart, $3: newEnd
        const { rows } = await pool.query(query, [memberId, startDate, endDate]);
        return rows.length > 0;
    }

    /**
     * 여러 회원의 결제 이력 일괄 조회
     * - Service의 findAll에서 N+1 방지를 위해 호출함
     */
    async findAllByMemberIds(memberIds) {
        if (!memberIds || memberIds.length === 0) {
            return [];
        }

        // ANY($1)을 사용하여 한 번의 쿼리로 여러 회원의 데이터를 가져옵니다.
        const query = `
            SELECT * FROM pf_member_payment_histories
            WHERE member_id = ANY($1) 
              AND payment_status = 'SUCCESS'
            ORDER BY end_date DESC
        `;
        
        const { rows } = await pool.query(query, [memberIds]);
        return rows.map(row => humps.camelizeKeys(row));
    }
}

module.exports = MemberPaymentHistoryRepository;