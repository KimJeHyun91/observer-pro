const policyRepository = require('../repositories/policy.repository');
const { initializeDefaults } = require('../seeds/policy.seed');
const POLICY_CONFIG_KEYS = require('../../constants/policy-config.keys');

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
        if (data.config) {
            this._validateConfigKeys(data.type, data.config);
        }
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
        const policy = await this.policyRepository.findById(id);

        // =========================================================
        // [1] 시스템 정책(isSystem=true) 처리 (특수 로직)
        // =========================================================
        if (policy.isSystem) {
            // 블랙리스트 선택(Switching) 로직
            const isSwitchingSelection = 
                policy.type === 'BLACKLIST' && 
                data.config && 
                data.config.isSelected === true;

            if (isSwitchingSelection) {
                return await this.policyRepository.updateBlacklistSelection(policy.siteId, id);
            }

            // 그 외 모든 수정 시도는 차단
            const error = new Error('시스템 기본 정책은 수정할 수 없습니다. (활성화 설정만 가능)');
            error.status = 403;
            throw error;
        }

        // =========================================================
        // [2] 일반 정책(isSystem=false) 처리 (공통 유효성 검사)
        // =========================================================
        
        // 2-1. 'isSelected'는 일반 수정 로직으로 변경 불가능 (시스템 전용 플래그)
        if (data.config && data.config.isSelected !== undefined) {
            const error = new Error('isSelected 속성은 시스템 정책(블랙리스트) 활성화 시에만 사용됩니다.');
            error.status = 400;
            throw error;
        }

        // 2-2. 타입별 허용 키 검사 (Whitelist Check)
        // 이제 BLACKLIST 타입도 여기서 검사 가능합니다 (단, isSystem: false인 경우만 도달)
        if (data.config) {
            this._validateConfigKeys(policy.type, data.config);
        }

        // 3. 일반 수정 수행
        return await this.policyRepository.update(id, data);
    }

    /**
     * 삭제 (Delete)
     * @param {string} id - UUID
     */
    async delete(id) {
        // 1. 조회
        const policy = await this.policyRepository.findById(id);

        // 2. 시스템 정책 보호
        if (policy.isSystem) {
            const error = new Error('시스템 기본 정책은 삭제할 수 없습니다.');
            error.status = 403;
            throw error;
        }

        return await this.policyRepository.delete(id);
    }

    /**
     * 사이트 정책 초기화 (Reset Defaults)
     * - 경고: 해당 사이트의 모든 기존 정책이 삭제되고 초기값으로 설정됩니다.
     * @param {string} siteId
     * @param {Object} [client] - 트랜잭션 클라이언트
     */
    async initializeDefaults(siteId, client) {
        // 1. 생성할 기본 데이터 목록 가져오기
        const defaultPolicies = initializeDefaults(siteId);

        // 2. 리포지토리의 초기화 메서드 호출 (삭제 + 생성 트랜잭션)
        const createdPolicies = await this.policyRepository.resetAndInitialize(siteId, defaultPolicies, client);

        return {
            message: '정책이 초기화되었습니다.',
            siteId: siteId,
            deletedPrevPolicies: true,
            createdCount: createdPolicies.length,
            createdPolicies: createdPolicies
        };
    }

    // =========================================================
    // [Private Helper] Config 키 검증 함수
    // =========================================================
    _validateConfigKeys(type, inputConfig) {
        // 1. 해당 타입의 허용 키 목록 가져오기
        const allowedKeys = POLICY_CONFIG_KEYS[type];

        if (!allowedKeys) {
            // 혹시 정의되지 않은 타입이 들어올 경우 (안전장치)
            const error = new Error(`지원하지 않는 정책 타입입니다: ${type}`);
            error.status = 400;
            throw error;
        }

        // 2. 입력된 키들을 하나씩 검사
        const inputKeys = Object.keys(inputConfig);
        const invalidKeys = inputKeys.filter(key => !allowedKeys.includes(key));

        // 3. 허용되지 않은 키가 하나라도 있으면 에러 발생
        if (invalidKeys.length > 0) {
            const error = new Error(
                `해당 정책 타입(${type})에 허용되지 않는 속성이 포함되어 있습니다: [${invalidKeys.join(', ')}]`
            );
            error.status = 400;
            throw error;
        }
    }
    
}

module.exports = PolicyService;