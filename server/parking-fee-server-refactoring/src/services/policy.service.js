// const policyRepository = require('../repositories/policy.repository');
// const { initializeDefaults } = require('../seeds/policy.seed');
// const POLICY_CONFIG_KEYS = require('../../constants/policy-config.keys');
// const FeeService = require('../repositories/policy.repository');
// const logger = require('../../../logger');

// /**
//  * ==============================================================================
//  * Policy Service
//  * ------------------------------------------------------------------------------
//  * 역할:
//  * 1. 주차장 정책(요금, 할인, 정기권 등)의 CRUD 관리
//  * 2. 'FEE' 정책 변경 시 FeeService의 캐시를 무효화/갱신하여 실시간 반영 보장
//  * ==============================================================================
//  */
// class PolicyService {
//     constructor() {
//         this.policyRepository = new policyRepository();
//         this.feeService = new FeeService();
//     }

//     /**
//      * 정책 생성
//      * - [제약] 'FEE' 타입은 사용자가 직접 생성할 수 없음 (사이트 생성 시 자동 시딩됨)
//      */
//     async create(data) {
//         if (data.config) {
//             this._validateConfigKeys(data.type, data.config);
//         }

//         // [중복 생성 방지] 기본 요금 정책(FEE)은 사이트당 유일해야 함
//         if (data.type === 'FEE') {
//             const { count } = await this.policyRepository.findAll(
//                 { siteId: data.siteId, type: 'FEE' },
//                 {}, 
//                 1, 
//                 0   
//             );

//             if (count > 0) {
//                 const error = new Error('해당 사이트에는 이미 기본 요금 정책(FEE)이 존재합니다. 기존 정책을 수정하세요.');
//                 error.status = 409; 
//                 throw error;
//             }
//         }

//         return await this.policyRepository.create(data);
//     }

//     /**
//      * 목록 조회 (Find All)
//      * - 페이징 파라미터 처리
//      * - 정렬 옵션 설정
//      * - 검색 필터 추출
//      * @param {Object} params - 쿼리 파라미터 (page, limit, sortBy, sortOrder, 검색어 등)
//      */
//     async findAll(params) {
//         const page = parseInt(params.page) || 1;
//         const limit = parseInt(params.limit) || 100;
//         const offset = (page - 1) * limit;

//         // 페이징, 정렬 관련 키워드를 제외한 나머지는 모두 검색 필터로 간주
//         const filters = {};
//         const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder'];
//         Object.keys(params).forEach(key => {
//             if (!excludeKeys.includes(key) && params[key] !== undefined) {
//                 filters[key] = params[key];
//             }
//         });

//         const sortOptions = {
//             sortBy: params.sortBy || 'created_at',
//             sortOrder: params.sortOrder || 'DESC'
//         };

//         const { rows, count } = await this.policyRepository.findAll(filters, sortOptions, limit, offset);

//         return {
//             policies: rows,
//             meta: {
//                 totalItems: parseInt(count),
//                 totalPages: Math.ceil(count / limit),
//                 currentPage: page,
//                 itemsPerPage: limit
//             }
//         };
//     }

//     /**
//      * 상세 조회 (Find Detail)
//      * @param {string} id - UUID
//      */
//     async findDetail(id) {
//         const site = await this.policyRepository.findById(id);
//         return site;
//     }

//     /**
//      * 수정 (Update)
//      * - [수정] 기본 요금 정책(FEE)은 시스템 정책이어도 수정 허용
//      */
//     async update(id, data) {
//         const policy = await this.policyRepository.findById(id);

//         // =========================================================
//         // [1] 시스템 정책(isSystem=true) 처리 (특수 로직)
//         // =========================================================
//         if (policy.isSystem) {
//             // A. 블랙리스트: 활성화/비활성화(Switching)만 가능
//             const isSwitchingSelection = 
//                 policy.type === 'BLACKLIST' && 
//                 data.config && 
//                 data.config.isSelected === true;

//             if (isSwitchingSelection) {
//                 return await this.policyRepository.updateBlacklistSelection(policy.siteId, id);
//             }

//             // B. [예외 허용] 기본 요금 정책(FEE)
//             // 초기화 시 생성된 기본 요금 정책은 삭제가 불가능하므로, 내용은 수정할 수 있어야 함.
//             if (policy.type === 'FEE') {
//                 // 통과 -> 아래 일반 수정 로직으로 진행
//             } 
//             else {
//                 // 그 외 시스템 정책(예: 고정된 할인 정책 등)은 수정 차단
//                 const error = new Error('시스템 기본 정책은 수정할 수 없습니다. (활성화 설정만 가능)');
//                 error.status = 403;
//                 throw error;
//             }
//         }

//         // =========================================================
//         // [2] 일반 정책(isSystem=false) 및 허용된 시스템 정책 처리
//         // =========================================================
        
//         // 2-1. 'isSelected'는 일반 수정 로직으로 변경 불가능 (시스템 전용 플래그)
//         if (data.config && data.config.isSelected !== undefined) {
//             const error = new Error('isSelected 속성은 시스템 정책(블랙리스트) 활성화 시에만 사용됩니다.');
//             error.status = 400;
//             throw error;
//         }

//         // 2-2. 타입별 허용 키 검사 (Whitelist Check)
//         if (data.config) {
//             this._validateConfigKeys(policy.type, data.config);
//         }

//         // 3. 일반 수정 수행
//         const updatedPolicy = await this.policyRepository.update(id, data);
    
//         // 3. [Cache Invalidation] 요금 정책이 수정되었다면 캐시 갱신
//         if (updatedPolicy.type === 'FEE') {
//             logger.info(`[PolicyService] 요금 정책 수정됨. 캐시 갱신 요청 -> Site: ${updatedPolicy.siteId}`);
//             await this.feeService.reloadCache(updatedPolicy.siteId);
//         }

//         return updatedPolicy;
//     }

//     /**
//      * 삭제 (Delete)
//      * - [수정] 기본 요금 정책(FEE)은 절대 삭제 불가 (사이트당 1개 필수 유지)
//      */
//     async delete(id) {
//         // 1. 조회
//         const policy = await this.policyRepository.findById(id);

//         // 2. 시스템 정책 보호
//         if (policy.isSystem) {
//             const error = new Error('시스템 기본 정책은 삭제할 수 없습니다.');
//             error.status = 403;
//             throw error;
//         }

//         // 3. [보호 로직 추가] 기본 요금 정책(FEE) 삭제 차단
//         // 사이트당 반드시 하나의 요금 정책이 있어야 주차비 계산이 가능하므로 삭제를 막음
//         if (policy.type === 'FEE') {
//             const error = new Error('기본 요금 정책(FEE)은 삭제할 수 없습니다. 내용을 수정하여 사용하세요.');
//             error.status = 403; // Forbidden
//             throw error;
//         }

//         return await this.policyRepository.delete(id);
//     }

//     /**
//      * 사이트 정책 초기화 (Reset Defaults)
//      * - 경고: 해당 사이트의 모든 기존 정책이 삭제되고 초기값으로 설정됩니다.
//      * @param {string} siteId
//      * @param {Object} [client] - 트랜잭션 클라이언트
//      */
//     async initializeDefaults(siteId, client) {
//         // 1. 생성할 기본 데이터 목록 가져오기
//         const defaultPolicies = initializeDefaults(siteId);

//         // 2. 리포지토리의 초기화 메서드 호출 (삭제 + 생성 트랜잭션)
//         const createdPolicies = await this.policyRepository.resetAndInitialize(siteId, defaultPolicies, client);

//         return {
//             message: '정책이 초기화되었습니다.',
//             siteId: siteId,
//             deletedPrevPolicies: true,
//             createdCount: createdPolicies.length,
//             createdPolicies: createdPolicies
//         };
//     }

//     // =========================================================
//     // [Private Helper] Config 키 검증 함수
//     // =========================================================
//     _validateConfigKeys(type, inputConfig) {
//         // 1. 해당 타입의 허용 키 목록 가져오기
//         const allowedKeys = POLICY_CONFIG_KEYS[type];

//         if (!allowedKeys) {
//             // 혹시 정의되지 않은 타입이 들어올 경우 (안전장치)
//             const error = new Error(`지원하지 않는 정책 타입입니다: ${type}`);
//             error.status = 400;
//             throw error;
//         }

//         // 2. 입력된 키들을 하나씩 검사
//         const inputKeys = Object.keys(inputConfig);
//         const invalidKeys = inputKeys.filter(key => !allowedKeys.includes(key));

//         // 3. 허용되지 않은 키가 하나라도 있으면 에러 발생
//         if (invalidKeys.length > 0) {
//             const error = new Error(
//                 `해당 정책 타입(${type})에 허용되지 않는 속성이 포함되어 있습니다: [${invalidKeys.join(', ')}]`
//             );
//             error.status = 400;
//             throw error;
//         }
//     }
    
// }

// module.exports = PolicyService;

const policyRepository = require('../repositories/policy.repository');
const { initializeDefaults } = require('../seeds/policy.seed'); // Seed 함수
const POLICY_CONFIG_KEYS = require('../../constants/policy-config.keys');
const feeService = require('../services/fee.service'); // FeeService 경로 수정 (가정)
const logger = require('../../../logger');

// =========================================================
// [Local Helper] Config 키 검증 함수 (Private)
// =========================================================
const validateConfigKeys = (type, inputConfig) => {
    const allowedKeys = POLICY_CONFIG_KEYS[type];

    if (!allowedKeys) {
        const error = new Error(`지원하지 않는 정책 타입입니다: ${type}`);
        error.status = 400;
        throw error;
    }

    const inputKeys = Object.keys(inputConfig);
    const invalidKeys = inputKeys.filter(key => !allowedKeys.includes(key));

    if (invalidKeys.length > 0) {
        const error = new Error(
            `해당 정책 타입(${type})에 허용되지 않는 속성이 포함되어 있습니다: [${invalidKeys.join(', ')}]`
        );
        error.status = 400;
        throw error;
    }
};

/**
 * 정책 생성
 */
exports.create = async (data) => {
    if (data.config) {
        validateConfigKeys(data.type, data.config);
    }

    // [중복 생성 방지] FEE 정책은 사이트당 유일
    if (data.type === 'FEE') {
        const { count } = await policyRepository.findAll(
            { siteId: data.siteId, type: 'FEE' },
            {}, 1, 0
        );

        if (count > 0) {
            const error = new Error('해당 사이트에는 이미 기본 요금 정책(FEE)이 존재합니다. 기존 정책을 수정하세요.');
            error.status = 409;
            throw error;
        }
    }

    return await policyRepository.create(data);
};

/**
 * 목록 조회
 */
exports.findAll = async (params) => {
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 100;
    const offset = (page - 1) * limit;

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

    const { rows, count } = await policyRepository.findAll(filters, sortOptions, limit, offset);

    return {
        policies: rows,
        meta: {
            totalItems: parseInt(count),
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            itemsPerPage: limit
        }
    };
};

/**
 * 상세 조회
 */
exports.findDetail = async (id) => {
    return await policyRepository.findById(id);
};

/**
 * 수정
 */
exports.update = async (id, data) => {
    const policy = await policyRepository.findById(id);

    // 1. 시스템 정책 처리
    if (policy.isSystem) {
        // A. 블랙리스트 활성화 처리
        const isSwitchingSelection = 
            policy.type === 'BLACKLIST' && 
            data.config && 
            data.config.isSelected === true;

        if (isSwitchingSelection) {
            return await policyRepository.updateBlacklistSelection(policy.siteId, id);
        }

        // B. FEE 정책 외 시스템 정책 수정 차단
        if (policy.type !== 'FEE') {
            const error = new Error('시스템 기본 정책은 수정할 수 없습니다. (활성화 설정만 가능)');
            error.status = 403;
            throw error;
        }
    }

    // 2. 일반 정책 처리
    if (data.config && data.config.isSelected !== undefined) {
        const error = new Error('isSelected 속성은 시스템 정책(블랙리스트) 활성화 시에만 사용됩니다.');
        error.status = 400;
        throw error;
    }

    if (data.config) {
        validateConfigKeys(policy.type, data.config);
    }

    // 3. 수정 및 캐시 갱신
    const updatedPolicy = await policyRepository.update(id, data);

    if (updatedPolicy.type === 'FEE') {
        logger.info(`[PolicyService] 요금 정책 수정됨. 캐시 갱신 요청 -> Site: ${updatedPolicy.siteId}`);
        await feeService.reloadCache(updatedPolicy.siteId);
    }

    return updatedPolicy;
};

/**
 * 삭제
 */
exports.delete = async (id) => {
    const policy = await policyRepository.findById(id);

    if (policy.isSystem) {
        const error = new Error('시스템 기본 정책은 삭제할 수 없습니다.');
        error.status = 403;
        throw error;
    }

    if (policy.type === 'FEE') {
        const error = new Error('기본 요금 정책(FEE)은 삭제할 수 없습니다. 내용을 수정하여 사용하세요.');
        error.status = 403;
        throw error;
    }

    return await policyRepository.delete(id);
};

/**
 * 초기화 (Reset Defaults)
 */
exports.initializeDefaults = async (siteId, client) => {
    const defaultPolicies = initializeDefaults(siteId);

    const createdPolicies = await policyRepository.resetAndInitialize(siteId, defaultPolicies, client);

    return {
        message: '정책이 초기화되었습니다.',
        siteId: siteId,
        deletedPrevPolicies: true,
        createdCount: createdPolicies.length,
        createdPolicies: createdPolicies
    };
};