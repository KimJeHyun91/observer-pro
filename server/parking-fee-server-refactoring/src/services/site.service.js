const SiteRepository = require('../repositories/site.repository');

/**
 * Site Service
 * - 주차장 사이트 관련 비즈니스 로직을 수행합니다.
 * - Repository를 호출하여 데이터베이스 작업을 처리합니다.
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

        // Repository 조회
        const { rows, count } = await this.siteRepository.findAll(filters, sortOptions, limit, offset);

        // 결과 포맷팅 (데이터 + 메타데이터)
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
        if (!site) {
            throw new Error('Site not found');
        }
        return site;
    }

    /**
     * 수정 (Update)
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data) {
        // 존재 여부 확인
        await this.findDetail(id);
        
        // Repository에는 허용된 필드만 포함된 data가 전달되어야 안전함 (Validator에서 1차 필터링됨)
        return await this.siteRepository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     * @param {boolean} isHardDelete - 완전 삭제 여부
     */
    async delete(id, isHardDelete) {
        // 존재 여부 확인
        await this.findDetail(id);
        console.log(isHardDelete);
        return await this.siteRepository.delete(id, isHardDelete);
    }
    
}

module.exports = SiteService;