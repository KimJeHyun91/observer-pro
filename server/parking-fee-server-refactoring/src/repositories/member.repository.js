const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    // 1. 정렬 컬럼 매핑 (API 필드명 -> DB 컬럼명)
    const SORT_MAPPING = {
        createdAt: 'm.created_at',
        updatedAt: 'm.updated_at',
        siteId: 'm.site_id',
        carNumber: 'm.car_number'
    };

    // 정렬 기준 설정 (기본값: m.created_at)
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'm.created_at';
    const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    // 2. 필터 조건 생성 (Explicit)

    // [정확 일치]
    if (filters.siteId) {
        conditions.push(`m.site_id = $${paramIndex++}`);
        values.push(filters.siteId);
    }
    if (filters.phoneHash) {
        conditions.push(`m.phone_hash = $${paramIndex++}`);
        values.push(filters.phoneHash);
    }

    // [부분 일치 (ILIKE)]
    if (filters.carNumber) {
        conditions.push(`m.car_number ILIKE $${paramIndex++}`);
        values.push(`%${filters.carNumber}%`);
    }
    if (filters.name) {
        conditions.push(`m.name ILIKE $${paramIndex++}`);
        values.push(`%${filters.name}%`);
    }
    if (filters.code) {
        conditions.push(`m.code ILIKE $${paramIndex++}`);
        values.push(`%${filters.code}%`);
    }
    if (filters.groupName) {
        conditions.push(`m.group_name ILIKE $${paramIndex++}`);
        values.push(`%${filters.groupName}%`);
    }
    if (filters.phoneLastDigits) {
        conditions.push(`m.phone_last_digits ILIKE $${paramIndex++}`);
        values.push(`%${filters.phoneLastDigits}%`);
    }

    // [상태 검색] - 캐시된 날짜 컬럼 활용 (JOIN 불필요)
    if (filters.status) {
        if (filters.status === 'ACTIVE') {
            conditions.push(`m.membership_end_date >= CURRENT_DATE AND m.membership_start_date <= CURRENT_DATE`);
        } else if (filters.status === 'UPCOMING') {
            conditions.push(`m.membership_start_date > CURRENT_DATE`);
        } else if (filters.status === 'EXPIRED') {
            conditions.push(`(m.membership_end_date < CURRENT_DATE OR m.membership_end_date IS NULL)`);
        } else if (filters.status === 'EXPIRING') {
            // 7일 이내 만료
            conditions.push(`(m.membership_end_date >= CURRENT_DATE AND m.membership_end_date <= CURRENT_DATE + INTERVAL '7 days')`);
        }
    }

    // WHERE 절 조립
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 3. 쿼리 실행 (JOIN 제거됨)
    const countQuery = `
        SELECT COUNT(*) FROM pf_members m ${whereClause}
    `;

    const query = `
        SELECT m.* FROM pf_members m
        ${whereClause}
        ORDER BY ${dbSortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // 파라미터 배열 완성
    values.push(limit, offset);

    const [countResult, rowsResult] = await Promise.all([
        pool.query(countQuery, values.slice(0, values.length - 2)),
        pool.query(query, values)
    ]);

    return {
        rows: rowsResult.rows.map(row => humps.camelizeKeys(row)),
        count: parseInt(countResult.rows[0].count)
    };
};

/**
 * 단일 조회 (ID)
 */
exports.findById = async (id) => {
    const query = `SELECT * FROM pf_members WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? humps.camelizeKeys(rows[0]) : null;
};

/**
 * 회원 생성 (Create)
 */
exports.create = async (data) => {
    const query = `
        INSERT INTO pf_members (
            site_id, car_number, 
            name, description, code,
            phone_encrypted, phone_last_digits, phone_hash,
            group_name, note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;

    const values = [
        data.siteId,
        data.carNumber,
        data.name,
        data.description || null,
        data.code || null,
        data.phoneEncrypted,
        data.phoneLastDigits,
        data.phoneHash,
        data.groupName || null,
        data.note || null
    ];

    try {
        const { rows } = await pool.query(query, values);
        return humps.camelizeKeys(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            const conflictError = new Error('해당 사이트에 이미 등록된 차량 번호입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        if (error.code === '23503') {
            const notFoundError = new Error('참조하는 주차장이 존재하지 않습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
};

/**
 * 차량 번호 조회 (중복 체크 및 LPR 연동용)
 */
exports.findByCarNumber = async (siteId, carNumber) => {
    const query = `
        SELECT * FROM pf_members 
        WHERE site_id = $1 AND car_number = $2
    `;
    const { rows } = await pool.query(query, [siteId, carNumber]);
    return rows[0] ? humps.camelizeKeys(rows[0]) : null;
};

/**
 * 수정 (Update)
 * - Whitelist 방식을 적용하여 허용된 컬럼만 수정 가능
 * - 트랜잭션 처리를 위한 client 파라미터 지원
 */
exports.update = async (id, data, client = null) => {
    // 1. 데이터 검증
    if (!data || Object.keys(data).length === 0) return null;

    // 2. JS(camelCase) -> DB(snake_case) 변환
    const dbData = humps.decamelizeKeys(data);

    const updates = [];
    const values = [id];
    let paramIndex = 2; // $1은 id에 할당됨

    // 3. 수정 가능한 컬럼 정의 (Whitelist)
    const ALLOWED_COLUMNS = [
        'site_id',
        'car_number',
        'name',
        'description',
        'code',
        'phone_encrypted',
        'phone_last_digits',
        'phone_hash',
        'group_name',
        'note'
    ];

    // 4. 쿼리 생성 (허용된 컬럼만 필터링)
    Object.keys(dbData).forEach(key => {
        if (ALLOWED_COLUMNS.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(dbData[key]);
            paramIndex++;
        }
    });

    // 수정할 필드가 없으면 종료
    if (updates.length === 0) return null; 

    // updated_at 자동 갱신 추가
    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE pf_members 
        SET ${updates.join(', ')} 
        WHERE id = $1 
        RETURNING *
    `;

    // 5. 실행 (트랜잭션 클라이언트가 있으면 사용, 없으면 pool 사용)
    const db = client || pool;

    try {
        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            const notFoundError = new Error('수정할 회원을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        
        return humps.camelizeKeys(rows[0]);

    } catch (error) {
        if (error.code === '23505') {
            const conflictError = new Error('이미 존재하는 차량 번호입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        throw error;
    }
};

/**
 * 삭제 (Delete)
 */
exports.delete = async (id) => {
    const query = `DELETE FROM pf_members WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) return null;
    return humps.camelizeKeys(rows[0]);
};

/**
 * [시스템용] 멤버십 캐시 정보 업데이트 (핵심)
 * - Service에서 계산된 최신 상태를 pf_members에 반영
 */
exports.updateMembershipCache = async (id, data) => {
    const query = `
        UPDATE pf_members
        SET 
            membership_status = $2,
            membership_start_date = $3,
            membership_end_date = $4,
            membership_paid_fee = $5,
            membership_paid_method = $6,
            updated_at = NOW()
        WHERE id = $1
    `;
    await pool.query(query, [
        id, 
        data.membershipStatus, 
        data.membershipStartDate, 
        data.membershipEndDate,
        data.membershipPaidFee,
        data.membershipPaidMethod
    ]);
};