const { pool } = require('../../../db/postgresqlPool');
const humps = require('humps');

/**
 * Policy Repository
 * - pf_policies 테이블에 대한 직접적인 CRUD 및 쿼리 수행
 * - 정책 설정(config) JSONB 필드의 CamelCase <-> SnakeCase 자동 변환 처리
 */
class PolicyRepository {

    /**
     * 생성 (Create)
     */
    async create(data) {
        const query = `
            INSERT INTO pf_policies (
                site_id,
                type,
                name,
                description,
                code,
                config,
                is_system
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        // config 내부 키를 스네이크케이스로 변환 (예: baseTimeMinutes -> base_time_minutes)
        const config = humps.decamelizeKeys(data.config || {});

        const values = [
            data.siteId,
            data.type,
            data.name,
            data.description,
            data.code,
            config,
            data.isSystem || false
        ];

        try {
            const { rows } = await pool.query(query, values);

            // DB 결과(스네이크케이스)를 카멜케이스 객체로 변환하여 반환
            return humps.camelizeKeys(rows[0]);

        } catch (error) {
            // PostgreSQL Unique Violation Code: 23505 (site_id + name 중복)
            if (error.code === '23505') {
                const conflictError = new Error('해당 사이트에 이미 존재하는 정책 이름입니다.');
                conflictError.status = 409;
                throw conflictError;
            }
            // PostgreSQL Foreign Key Violation Code: 23503 (site_id 없음)
            if (error.code === '23503') {
                const notFoundError = new Error('존재하지 않는 사이트 ID입니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }
            throw error;
        }
    }

    /**
     * 다목적 목록 조회 (Find All)
     * - 검색: 텍스트 컬럼 ILIKE(부분일치), 기타 컬럼 정확 일치
     * - 날짜 검색: createdAt, updatedAt 범위 검색 지원
     * - 정렬 및 페이징 적용
     */
    async findAll(filters, sortOptions, limit, offset) {
        let query = `SELECT p.* FROM pf_policies p`;

        const whereClauses = [];
        const values = [];
        let paramIndex = 1;

        // 부분 일치 검색을 허용할 텍스트 컬럼 목록 (스네이크케이스 기준)
        const textColumns = ['name', 'description', 'code'];

        Object.keys(filters).forEach(key => {
            const value = filters[key];
            if (value === undefined || value === null || value === '') return;

            // 1. 날짜 범위 검색
            if (key === 'createdAtStart') {
                whereClauses.push(`p.created_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'createdAtEnd') {
                whereClauses.push(`p.created_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtStart') {
                whereClauses.push(`p.updated_at >= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }
            if (key === 'updatedAtEnd') {
                whereClauses.push(`p.updated_at <= $${paramIndex}`);
                values.push(value);
                paramIndex++;
                return;
            }

            // 2. 일반 필드 처리 (텍스트 ILIKE 또는 정확 일치)
            const dbCol = humps.decamelize(key);

            // SQL Injection 방지를 위한 컬럼명 검증 (알파벳 소문자로 시작)
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;

            // config 필드나 존재하지 않는 컬럼 검색 방지 (필요 시 화이트리스트 적용 권장)
            // 여기서는 textColumns에 포함되면 ILIKE, 아니면 = 로 처리
            if (textColumns.includes(dbCol)) {
                whereClauses.push(`p.${dbCol} ILIKE $${paramIndex}`);
                values.push(`%${value}%`);
                paramIndex++;
            } else {
                // siteId, type, id 등은 정확 일치 검색
                // 단, config 컬럼 자체에 대한 직접 검색은 일반적으로 하지 않으므로 제외하고 싶다면 조건 추가 가능
                // 여기서는 filters에 'config'라는 키가 직접 들어오지 않는다고 가정하거나, 들어오면 문자열 일치로 처리됨
                whereClauses.push(`p.${dbCol} = $${paramIndex}`);
                values.push(value);
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
        
        query += ` ORDER BY p.${dbSortBy} ${sortOrder}`;

        // 페이징 적용
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        // 전체 카운트 쿼리
        const countQuery = `
            SELECT COUNT(*) 
            FROM pf_policies p 
            ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}
        `;

        const client = await pool.connect();
        try {
            const [countResult, rowsResult] = await Promise.all([
                client.query(countQuery, values.slice(0, values.length - 2)),
                client.query(query, values)
            ]);

            const policies = rowsResult.rows.map(row => humps.camelizeKeys(row));

            return {
                rows: policies,
                count: parseInt(countResult.rows[0].count)
            };
        } finally {
            client.release();
        }
    }

    /**
     * 단일 조회 (Find By Id)
     */
    async findById(id) {
        const query = `SELECT * FROM pf_policies WHERE id = $1`;
        const { rows } = await pool.query(query, [id]);

        if (!rows.length) {
            const notFoundError = new Error('해당하는 정책을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 수정 (Update) - JSONB Merge 적용
     */
    async update(id, data) {
        const keys = Object.keys(data);
        if (keys.length === 0) return null;

        const setClauses = [];
        const values = [id];
        let valIndex = 2;

        keys.forEach(key => {
            const dbCol = humps.decamelize(key);
            
            if (!/^[a-z][a-z0-9_]*$/.test(dbCol)) return;
            if (['id', 'created_at', 'site_id', 'type', 'is_system'].includes(dbCol)) return;

            let value = data[key];
            
            if (key === 'config') {
                // Config 필드 처리
                value = humps.decamelizeKeys(value);
                
                // ★ 핵심 수정: 기존 config 값과 병합(Merge)하도록 쿼리 작성
                // PostgreSQL의 '||' 연산자는 jsonb 데이터를 병합합니다.
                setClauses.push(`config = config || $${valIndex}::jsonb`);
            } else {
                // 일반 필드 처리
                setClauses.push(`${dbCol} = $${valIndex}`);
            }

            values.push(value);
            valIndex++;
        });

        if (setClauses.length === 0) return null;

        const query = `
            UPDATE pf_policies
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            const notFoundError = new Error('수정할 정책을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 삭제 (Delete)
     */
    async delete(id) {
        const query = `DELETE FROM pf_policies WHERE id = $1 RETURNING id`;
        
        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            const notFoundError = new Error('삭제할 정책을 찾을 수 없습니다.');
            notFoundError.status = 404;
            throw notFoundError;
        }

        return humps.camelizeKeys(rows[0]);
    }

    /**
     * 초기화 및 재설정 (Reset and Initialize)
     * - Transaction을 사용하여 원자성 보장
     * 1. 해당 site_id의 모든 정책 삭제
     * 2. 전달받은 기본 정책 목록 일괄 생성
     */
    async resetAndInitialize(siteId, policyList, externalClient) {

        const client = externalClient || await pool.connect();
        const shouldRelease = !externalClient;

        try {
            // 외부 클라이언트가 없을 때만 트랜잭션 시작
            if (!externalClient) await client.query('BEGIN');

            // 1. 기존 정책 전체 삭제
            const deleteQuery = `DELETE FROM pf_policies WHERE site_id = $1`;
            await client.query(deleteQuery, [siteId]);

            let createdPolicies = [];

            // 3. 생성할 정책이 있다면 Bulk Insert 수행
            if (policyList && policyList.length > 0) {
                
                // 데이터 전처리 (config 스네이크케이스 변환)
                const processedList = policyList.map(data => ({
                    site_id: data.siteId,
                    type: data.type,
                    name: data.name,
                    description: data.description,
                    code: data.code,
                    config: humps.decamelizeKeys(data.config || {}),
                    is_system: data.isSystem || false
                }));

                const values = [];
                const placeholders = processedList.map((_, index) => {
                    const offset = index * 7; 
                    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
                });

                processedList.forEach(p => {
                    values.push(p.site_id, p.type, p.name, p.description, p.code, p.config, p.is_system);
                });

                // 삭제 후 생성이므로 ON CONFLICT가 필요 없음 (무조건 생성)
                const insertQuery = `
                    INSERT INTO pf_policies (
                        site_id, type, name, description, code, config, is_system
                    )
                    VALUES ${placeholders.join(', ')}
                    RETURNING *
                `;

                const { rows } = await client.query(insertQuery, values);
                createdPolicies = rows.map(row => humps.camelizeKeys(row));
            }

            // 외부 클라이언트가 없을 때만 커밋
            if (!externalClient) await client.query('COMMIT');

            return createdPolicies;

        } catch (error) {
            // 5. 에러 발생 시 롤백 (삭제 취소, 생성 취소)
            if (!externalClient) await client.query('ROLLBACK');
            throw error;
        } finally {
            // 6. 커넥션 반환
            if (shouldRelease) client.release();
        }
    }

    /**
     * 블랙리스트 활성화 (트랜잭션 Update)
     * - Service가 "이 정책을 선택해!"라고 할 때만 호출됩니다.
     */
    async updateBlacklistSelection(siteId, targetPolicyId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. 해당 사이트의 모든 블랙리스트 비활성화
            const resetQuery = `
                UPDATE pf_policies
                SET config = jsonb_set(config, '{is_selected}', 'false'::jsonb),
                    updated_at = NOW()
                WHERE site_id = $1 AND type = 'BLACKLIST'
            `;
            await client.query(resetQuery, [siteId]);

            // 2. 타겟 정책 활성화
            const activeQuery = `
                UPDATE pf_policies
                SET config = jsonb_set(config, '{is_selected}', 'true'::jsonb),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            const { rows } = await client.query(activeQuery, [targetPolicyId]);

            if (rows.length === 0) {
                const notFoundError = new Error('삭제할 정책을 찾을 수 없습니다.');
                notFoundError.status = 404;
                throw notFoundError;
            }

            await client.query('COMMIT');
            return humps.camelizeKeys(rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

}

module.exports = PolicyRepository;