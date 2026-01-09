const policyRepository = require('../repositories/policy.repository');
const { initializeDefaults } = require('../seeds/policy.seed');

/**
 * Policy Service
 * - 정책 관련 비즈니스 로직을 수행합니다.
 */
class PolicyService {
    constructor() {
        this.policyRepository = new policyRepository();
    }

    /**
     * 생성 (Create)
     * @param {Object} data - 생성할 데이터
     */
    async create(data) {
        return await this.policyRepository.create(data);
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

        const { rows, count } = await this.policyRepository.findAll(filters, sortOptions, limit, offset);

        return {
            policies: rows,
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
        const site = await this.policyRepository.findById(id);
        return site;
    }

    /**
     * 수정 (Update)
     * @param {string} id - UUID
     * @param {Object} data - 수정할 데이터
     */
    async update(id, data) {
        return await this.policyRepository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     */
    async delete(id) {
        return await this.policyRepository.delete(id);
    }

    /**
     * 사이트 정책 초기화 (Reset Defaults)
     * - 경고: 해당 사이트의 모든 기존 정책이 삭제되고 초기값으로 설정됩니다.
     */
    async initializeDefaults(siteId) {
        // 1. 생성할 기본 데이터 목록 가져오기
        const defaultPolicies = initializeDefaults(siteId);

        // 2. 리포지토리의 초기화 메서드 호출 (삭제 + 생성 트랜잭션)
        const createdPolicies = await this.policyRepository.resetAndInitialize(siteId, defaultPolicies);

        return {
            message: '정책이 초기화되었습니다.',
            siteId: siteId,
            deletedPrevPolicies: true,
            createdCount: createdPolicies.length,
            createdPolicies: createdPolicies
        };
    }
    
}

module.exports = PolicyService;