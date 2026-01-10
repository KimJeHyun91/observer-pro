const SiteRepository = require('../repositories/site.repository');
const PolicyService = require('./policy.service');
const { pool } = require('../../../db/postgresqlPool');

/**
 * Site Service
 * - 주차장 사이트 관련 비즈니스 로직을 수행합니다.
 */
class SiteService {
    constructor() {
        this.siteRepository = new SiteRepository();
        this.policyService = new PolicyService(); 
    }

    /**
     * 생성 (Create)
     * - 트랜잭션을 적용하여 사이트 생성과 정책 초기화를 묶습니다.
     */
    async create(data) {
        const client = await pool.connect(); // 1. 연결 획득

        try {
            await client.query('BEGIN'); // 2. 트랜잭션 시작

            // 3. 사이트 생성 (client 전달)
            const site = await this.siteRepository.create(data, client);

            // 4. 정책 초기화 (client 전달)
            await this.policyService.initializeDefaults(site.id, client);

            await client.query('COMMIT'); // 5. 모두 성공 시 커밋
            return site;

        } catch (error) {
            await client.query('ROLLBACK'); // 6. 실패 시 롤백
            throw error;
        } finally {
            client.release(); // 7. 연결 반납
        }
    }

    /**
     * 목록 조회 (Find All)
     * - 페이징 파라미터 처리
     * - 정렬 옵션 설정
     * - 검색 필터 추출
     * @param {Object} params - 쿼리 파라미터 (page, limit, sortBy, sortOrder, 검색어 등)
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 100;
        const offset = (page - 1) * limit;

        // 페이징, 정렬 관련 키워드를 제외한 나머지는 모두 검색 필터로 간주
        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.siteRepository.findAll(filters, sortOptions, limit, offset);

        return {
            sites: rows,
            meta: {
                totalItems: parseInt(count),
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        };
    }

    /**
     * 상세 조회 (Find Detail)
     * @param {string} id - UUID
     */
    async findDetail(id) {
        const site = await this.siteRepository.findById(id);
        return site;
    }

    /**
     * 수정 (Update)
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data) {
        return await this.siteRepository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     */
    async delete(id) {
        return await this.siteRepository.delete(id);
    }

    /**
     * 트리 조회 (Find Tree)
     * @param {string} id - UUID
     */
    async findTree(id) {
        const site = await this.siteRepository.findTree(id);
        if (!site) {
            throw new Error('Site not found');
        }
        return site;
    }
    
}

module.exports = SiteService;