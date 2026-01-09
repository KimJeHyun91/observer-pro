const SiteRepository = require('../repositories/site.repository');

/**
 * Site Service
 * - 주차장 사이트 관련 비즈니스 로직을 수행합니다.
 */
class SiteService {
    constructor() {
        this.siteRepository = new SiteRepository();
    }

    /**
     * 생성 (Create)
     * @param {Object} data - 생성할 데이터
     */
    async create(data) {
        return await this.siteRepository.create(data);
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
        const limit = parseInt(params.limit) || 10;
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