const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

/**
 * 목록 조회 (Find All)
 */
exports.findAll = async (filters, sortOptions, limit, offset) => {
    const SORT_MAPPING = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        siteId: 'site_id',
        name: 'name',
        code: 'code',
        date: 'date'
    };
    const dbSortBy = SORT_MAPPING[sortOptions.sortBy] || 'created_at';

    const conditions = [];
    const values = [];

    // 1. 필터 조건 생성
    // [일치]
    if (filters.siteId) {
        conditions.push(`site_id = $${values.length + 1}`);
        values.push(filters.siteId);
    }
    if (filters.date) {
        conditions.push(`date = $${values.length + 1}`);
        values.push(filters.date);
    }
    if (filters.isRecurring) {
        conditions.push(`isRecurring = $${values.length + 1}`);
        values.push(filters.isRecurring);
    }

    // [부분 일치]
    if (filters.name) {
        conditions.push(`name ILIKE $${values.length + 1}`);
        values.push(`%${filters.name}%`);
    }
    if (filters.code) {
        conditions.push(`code ILIKE $${values.length + 1}`);
        values.push(`%${filters.code}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 2. 카운트 쿼리
    const countQuery = `SELECT COUNT(*) FROM pf_holidays ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const count = countResult.rows[0].count;

    // 3. 데이터 조회 쿼리
    const query = `
        SELECT id, site_id, name, description, code, date, is_recurring, created_at, updated_at FROM pf_holidays
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
 */
exports.findById = async (id) => {
    const query = `SELECT * FROM pf_holidays WHERE id = $1`;

    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 생성 (Create)
 */
exports.create = async (data) => {
    // ---------------------------------------------------------
    // 1. [논리적 중복 사전 검사]
    // ---------------------------------------------------------
    // 해당 사이트에, 입력하려는 날짜(월-일)와 같은 날짜를 가진 모든 휴일을 조회
    const checkQuery = `
        SELECT id, name, date, is_recurring
        FROM pf_holidays
        WHERE site_id = $1
          AND TO_CHAR(date, 'MM-DD') = TO_CHAR($2::date, 'MM-DD')
    `;

    const checkResult = await pool.query(checkQuery, [data.siteId, data.date]);
    const existingHolidays = checkResult.rows;

    if (existingHolidays.length > 0) {
        // CASE A: 새로 넣으려는게 '매년 반복(isRecurring: true)'인 경우
        // -> 기존에 같은 월/일에 뭐라도 하나 있으면 등록 불가 (충돌)
        if (data.isRecurring) {
            const conflict = existingHolidays[0]; // 대표로 하나만 가져옴
            const typeText = conflict.is_recurring ? '매년 반복' : '특정 날짜';
            
            const error = new Error(
                `해당 날짜(${dayjs(data.date).format('MM-DD')})에는 이미 등록된 휴일이 있습니다. ` +
                `("${conflict.name}" - ${typeText})\n` +
                `기존 휴일을 삭제한 후 '매년 반복'으로 등록해주세요.`
            );
            error.status = 409;
            throw error;
        }

        // CASE B: 새로 넣으려는게 '단발성(isRecurring: false)'인 경우
        // -> 기존 것들 중에 '매년 반복'인 녀석이 있으면 등록 불가 (충돌)
        const recurringConflict = existingHolidays.find(h => h.is_recurring);
        if (recurringConflict) {
            const error = new Error(
                `해당 날짜(${dayjs(data.date).format('MM-DD')})는 이미 매년 반복되는 휴일로 설정되어 있습니다. ` +
                `("${recurringConflict.name}")`
            );
            error.status = 409;
            throw error;
        }
        
        // 참고: 단발성 vs 단발성끼리는 (2025-01-01, 2026-01-01) 서로 연도가 다르면 공존 가능.
        // 이 부분은 DB의 UNIQUE(site_id, date) 제약조건이 알아서 연도까지 비교해서 막아주므로 여기서 체크 안 해도 됨.
    }

    const query = `
        INSERT INTO pf_holidays (site_id, name, description, code, date, is_recurring)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const values = [
        data.siteId,
        data.name,
        data.description || null,
        data.code || null,
        data.date,
        data.isRecurring
    ];

    try {
        const { rows } = await pool.query(query, values);
        return humps.camelizeKeys(rows[0]);
    } catch (error) {
        if (error.code === '23505') { 
            const conflictError = new Error('해당 사이트에 이미 등록된 이름 또는 날짜 입니다.');
            conflictError.status = 409;
            throw conflictError;
        }
        if (error.code === '23503') { 
            const notFoundError = new Error('존재하지 않는 사이트 ID입니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
}

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
        'name',
        'description',
        'code',
        'date',
        'is_recurring'        
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
        UPDATE pf_holidays 
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
            const conflictError = new Error('이미 존재하는 이름 또는 날짜 입니다.');
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
    const query = `DELETE FROM pf_holidays WHERE id = $1 RETURNING id`;
    
    const db = client || pool;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) return null;

    return humps.camelizeKeys(rows[0]);
};

/**
 * 특정 날짜가 휴일인지 확인하는 메서드 (차량 입차/출차 시 호출)
 */
exports.isHoliday = async (siteId, checkDate) => {

    const query = `
        SELECT id 
        FROM pf_holidays 
        WHERE site_id = $1
          AND (
            -- 1. 단발성 휴일: 날짜(년-월-일)가 정확히 일치하고, 반복이 아님
            (date = $2::date AND is_recurring = false)
            OR
            -- 2. 매년 반복 휴일: 월-일(MM-DD)만 일치하고, 반복 설정됨
            (TO_CHAR(date, 'MM-DD') = TO_CHAR($2::date, 'MM-DD') AND is_recurring = true)
          )
        LIMIT 1
    `;
    
    const { rows } = await pool.query(query, [siteId, checkDate]);
    return rows.length > 0; // true면 휴일
};