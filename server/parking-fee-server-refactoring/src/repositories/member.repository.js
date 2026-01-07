const { pool } = require('../../../db/postgresqlPool');

/**
 * Member Repository
 * - members 테이블 CRUD
 * - 암호화된 개인정보 처리 (트리플 컬럼 전략 고려 필요)
 * 현재 예시에서는 간단히 텍스트 저장으로 구현하되, 
 * 실제 운영 시에는 pgcrypto 등을 활용한 암호화 로직이 쿼리에 포함되어야 함.
 */
class MemberRepository {
    async create(data) {
        // TODO: owner, phone 등 민감 정보 암호화/해싱/마스킹 처리 로직 필요
        // 여기서는 값을 그대로 저장하는 것으로 예시 작성 (스키마에 맞춤)
        const query = `
            INSERT INTO members (
                site_id, car_number, 
                owner, owner_masked, owner_hash,
                phone, phone_masked, phone_hash,
                group_name, start_date, end_date, note, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;
        
        // 마스킹/해싱 로직 (간단 예시)
        const owner = data.owner || '';
        const ownerMasked = owner.length > 1 ? owner[0] + '*'.repeat(owner.length - 1) : owner;
        const ownerHash = owner; // 실제로는 SHA256 등 적용

        const phone = data.phone || '';
        const phoneMasked = phone.length > 7 ? phone.substring(0, 3) + '-****-' + phone.substring(phone.length - 4) : phone;
        const phoneHash = phone;

        const values = [
            data.site_id, data.car_number,
            owner, ownerMasked, ownerHash,
            phone, phoneMasked, phoneHash,
            data.group_name, data.start_date, data.end_date, data.note,
            true // is_active
        ];
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT * FROM members`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        const textColumns = ['car_number', 'group_name', 'note'];
        // 개인정보 검색은 hash 컬럼이나 masked 컬럼을 활용해야 함
        // 여기서는 단순 필드명 매칭 예시

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value !== undefined && value !== null && value !== '') {
                if (textColumns.includes(key)) {
                    whereClauses.push(`${key} ILIKE $${paramIndex}`);
                    values.push(`%${value}%`);
                } else if (key === 'owner' || key === 'phone') {
                    // 개인정보 검색 시 해시값 비교 등으로 변경 권장
                    // 여기서는 exact match로 가정
                    whereClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                } else if (key === 'start_date' || key === 'end_date') {
                    whereClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                } else {
                    // site_id, is_active 등
                    whereClauses.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        });

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // 정렬
        if (sortOptions.sortBy) {
            const sortOrder = (sortOptions.sortOrder && sortOptions.sortOrder.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
            query += ` ORDER BY ${sortOptions.sortBy} ${sortOrder}`;
        } else {
            query += ` ORDER BY created_at DESC`;
        }

        // 페이징
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) FROM members 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.getClient();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            return {
                rows: rowsResult.rows,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    async findById(id) {
        const query = `SELECT * FROM members WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    /**
     * 유효한 정기권 회원 조회 (차량번호 기준)
     * - 현재 날짜가 시작일과 종료일 사이에 있어야 함
     * - is_active가 true여야 함
     */
    async findValidMember(siteId, carNum) {
        const query = `
            SELECT * FROM members 
            WHERE site_id = $1 
              AND car_number = $2 
              AND is_active = true
              AND start_date <= CURRENT_DATE 
              AND end_date >= CURRENT_DATE
            LIMIT 1
        `;
        const { rows } = await pool.query(query, [siteId, carNum]);
        return rows[0];
    }

    async update(id, data) {
        // 업데이트 시에도 마스킹/해싱 값 동기화 필요
        // 여기서는 단순 필드 업데이트 예시
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
        const values = [id, ...Object.values(data)];

        const query = `
            UPDATE members 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        
        const { rows } = await pool.query(query, values);
        return rows[0];
    }

    async delete(id, isHardDelete) {
        let query;
        if (isHardDelete) {
            query = `DELETE FROM members WHERE id = $1 RETURNING id`;
        } else {
            query = `UPDATE members SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`;
        }
        
        const { rows } = await pool.query(query, [id]);
        return { deletedId: rows[0]?.id, isHardDelete };
    }
}

module.exports = MemberRepository;