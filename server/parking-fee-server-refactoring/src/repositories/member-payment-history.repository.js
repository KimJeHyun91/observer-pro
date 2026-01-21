const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 * - Explicit Mapping 방식 적용
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    // 1. 정렬 컬럼 매핑
    const SORT_MAPPING = {
        createdAt: 'h.created_at',
        updatedAt: 'h.updated_at',
        paidAt: 'h.paid_at',
        amount: 'h.amount',
    };

    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'h.created_at';
    const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    const conditions = [];
    const values = [];

    // 2. 필터 조건 (Explicit)
    
    // [정확 일치]
    if (filters.memberId) {
        conditions.push(`h.member_id = $${values.length + 1}`);
        values.push(filters.memberId);
    }
    if (filters.policyId) {
        conditions.push(`h.policy_id = $${values.length + 1}`);
        values.push(filters.policyId);
    }
    if (filters.paymentMethod) {
        conditions.push(`h.payment_method = $${values.length + 1}`);
        values.push(filters.paymentMethod);
    }
    if (filters.status) {
        conditions.push(`h.status = $${values.length + 1}`);
        values.push(filters.status);
    }
    if (filters.amount) {
        conditions.push(`h.amount = $${values.length + 1}`);
        values.push(filters.amount);
    }

    // [부분 일치]
    if (filters.code) {
        conditions.push(`h.code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }

    // [범위 검색 - 날짜]
    if (filters.paidAtStart) {
        conditions.push(`h.paid_at >= $${values.length + 1}`);
        values.push(filters.paidAtStart);
    }
    if (filters.paidAtEnd) {
        conditions.push(`h.paid_at <= $${values.length + 1}`);
        values.push(filters.paidAtEnd);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. 쿼리 실행
    const countQuery = `SELECT COUNT(*) FROM pf_member_payment_histories h ${whereClause}`;
    
    const query = `
        SELECT h.* FROM pf_member_payment_histories h
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const listValues = [...values, limit, offset];

    const [countResult, rowsResult] = await Promise.all([
        pool.query(countQuery, values),
        pool.query(query, listValues)
    ]);

    return {
        rows: rowsResult.rows.map(row => humps.camelizeKeys(row)),
        count: parseInt(countResult.rows[0].count)
    };
};

/**
 * 상세 조회 (Find By ID)
 */
exports.findById = async (id) => {
    const query = `SELECT * FROM pf_member_payment_histories WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? humps.camelizeKeys(rows[0]) : null;
};
/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    const query = `
        INSERT INTO pf_member_payment_histories (
            member_id, member_name, member_code, member_phone, car_number,
            policy_id, policy_name, policy_code,
            amount, payment_method, status, note,
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
        data.status || 'SUCCESS',
        data.note || null,
        data.startDate,
        data.endDate,
        data.paidAt || new Date()
    ];

    try {
        const { rows } = await pool.query(query, values);
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        // Postgres Error Code '23P01': exclusion_violation
        // 테이블에 설정된 no_overlapping_periods 제약조건 위배 시 발생
        if (error.code === '23P01') {
            const conflictError = new Error('해당 기간에 이미 유효한 정기권이 존재하여 등록할 수 없습니다.');
            conflictError.status = 409; // Conflict
            throw conflictError;
        }

        // 그 외 에러는 그대로 상위로 전파
        throw error;
    }
};

/**
 * 수정 (Update)
 * - Whitelist 적용 (상태, 메모, 결제수단 등 제한적 수정)
 */
exports.update = async (id, data, client = null) => {
    if (!data || Object.keys(data).length === 0) return null;

    const dbData = humps.decamelizeKeys(data);
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    const ALLOWED_COLUMNS = [
        'status', 'note'
    ];

    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(dbData[key]);
            paramIndex++;
        }
    });

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);

    if (data.status === 'CANCELED' || data.status === 'CANCELED') {
        updates.push(`canceled_at = NOW()`);
    }

    const query = `
        UPDATE pf_member_payment_histories 
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
    `;

    const db = client || pool;
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
        const notFoundError = new Error('수정할 결제 내역을 찾을 수 없습니다.');
        notFoundError.status = 404;
        throw notFoundError;
    }

    return humps.camelizeKeys(rows[0]);
};

/**
 * 회원의 가장 최근(미래) 유효 결제 이력 조회
 * - 연장 로직 계산용
 */
exports.findLatestByMemberId = async (memberId) => {
    const query = `
        SELECT * FROM pf_member_payment_histories
        WHERE member_id = $1
            AND status = 'SUCCESS'
        ORDER BY end_date DESC
        LIMIT 1
    `;
    const { rows } = await pool.query(query, [memberId]);
    return rows.length ? humps.camelizeKeys(rows[0]) : null;
};

/**
 * 기간 중복 확인 및 겹치는 데이터 조회
 * - 반환값: 겹치는 기록이 없으면 null, 있으면 해당 기록 객체(end_date 포함)
 */
exports.findOverlappingHistory = async (memberId, startDate, endDate) => {
    const query = `
        SELECT start_date, end_date 
        FROM pf_member_payment_histories
        WHERE member_id = $1
          AND status = 'SUCCESS'
          AND start_date <= $3  -- 요청 종료일보다 이전에 시작하고
          AND end_date >= $2    -- 요청 시작일보다 이후에 끝나는 (즉, 겹치는)
        LIMIT 1
    `;
    
    const { rows } = await pool.query(query, [memberId, startDate, endDate]);
    return rows.length > 0 ? humps.camelizeKeys(rows[0]) : null;
};

/**
 * [동기화용] 현재 시점에서 가장 유효한 멤버십 조회
 * - pf_members 테이블에 캐싱할 상태를 결정하기 위해 사용
 * - 우선순위:
 * 1. ACTIVE: 현재 날짜가 기간 내에 포함됨
 * 2. UPCOMING: 미래에 시작함 (가장 가까운 미래)
 * 3. EXPIRED: 과거에 끝남 (가장 최근 과거)
 */
exports.findEffectiveHistory = async (memberId) => {
    const query = `
        SELECT start_date, end_date, amount, payment_method, paid_at
        FROM pf_member_payment_histories
        WHERE member_id = $1 AND status = 'SUCCESS'
        ORDER BY 
            -- 1. 상태 우선순위 정렬
            CASE 
                WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 0 -- Active
                WHEN start_date > CURRENT_DATE THEN 1                -- Upcoming
                ELSE 2                                               -- Expired
            END ASC,
            
            -- 2. Upcoming(미래)일 경우: 시작일이 빠른 순서(ASC)가 우선
            CASE 
                WHEN start_date > CURRENT_DATE THEN start_date 
                ELSE NULL 
            END ASC,

            -- 3. Active나 Expired일 경우: 종료일이 늦은 순서(DESC)가 우선
            end_date DESC
        LIMIT 1
    `;
    const { rows } = await pool.query(query, [memberId]);
    return rows.length > 0 ? humps.camelizeKeys(rows[0]) : null;
};

/**
 * 다수 회원 이력 일괄 조회 (N+1 방지용)
 */
exports.findAllByMemberIds = async (memberIds) => {
    if (!memberIds || memberIds.length === 0) return [];

    const query = `
        SELECT * FROM pf_member_payment_histories
        WHERE member_id = ANY($1) 
            AND status = 'SUCCESS'
        ORDER BY end_date DESC
    `;
    
    const { rows } = await pool.query(query, [memberIds]);
    return rows.map(row => humps.camelizeKeys(row));
};

/**
 * [LPR용] 유효한 정기권 조회
 */
exports.findValidMembership = async (carNumber) => {
    const query = `
        SELECT * FROM pf_member_payment_histories
        WHERE car_number = $1
            AND start_date <= CURRENT_DATE
            AND end_date >= CURRENT_DATE
            AND status = 'SUCCESS'
        ORDER BY end_date DESC
        LIMIT 1
    `;
    
    const { rows } = await pool.query(query, [carNumber]);
    return rows[0] ? humps.camelizeKeys(rows[0]) : null;
};