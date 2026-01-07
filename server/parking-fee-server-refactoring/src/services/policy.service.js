const PolicyRepository = require('../repositories/policy.repository');

/**
 * Policy Service
 * - 요금/할인 정책 관련 비즈니스 로직 수행
 */
class PolicyService {
    constructor() {
        this.repository = new PolicyRepository();
    }

    /**
     * 신규 정책 생성
     */
    async create(data) {
        // TODO: config 내부 구조 검증 로직 추가 가능 (요금 정책인지 할인 정책인지에 따라)
        return await this.repository.create(data);
    }

    /**
     * 정책 목록 조회
     */
    async findAll(params) {
        const page = parseInt(params.page) || 1;
        const limit = parseInt(params.limit) || 10;
        const offset = (page - 1) * limit;

        const filters = {};
        const excludeKeys = ['page', 'limit', 'sortBy', 'sortOrder', 'deleteMethod'];
        Object.keys(params).forEach(key => {
            if (!excludeKeys.includes(key) && params[key] !== undefined) {
                filters[key] = params[key];
            }
        });

        const sortOptions = {
            sortBy: params.sortBy || 'created_at',
            sortOrder: params.sortOrder || 'DESC'
        };

        const { rows, count } = await this.repository.findAll(filters, sortOptions, limit, offset);

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
     * 정책 상세 조회
     */
    async findDetail(id) {
        const data = await this.repository.findById(id);
        if (!data) {
            throw new Error('Policy not found');
        }
        return data;
    }

    /**
     * 정책 정보 수정
     */
    async update(id, data) {
        await this.findDetail(id);
        return await this.repository.update(id, data);
    }

    /**
     * 정책 삭제
     */
    async delete(id, isHardDelete = false) {
        await this.findDetail(id);
        return await this.repository.delete(id, isHardDelete);
    }

    // =================================================================
    // 비즈니스 로직 (ParkingProcessService 등에서 사용)
    // =================================================================

    /**
     * [조회] 사이트 설정(Config) 조회
     * - 해당 사이트에 적용된 정책을 기반으로 설정을 반환 (없으면 기본값)
     */
    async getSiteConfig(siteId) {
        // TODO: siteId로 활성화된 정책을 조회하여 병합하는 로직 필요
        // 현재는 Mocking하여 기본 설정 반환
        return {
            blacklist_behavior: 'BLOCK',
            operation_mode: 'NORMAL',
            unrecognized_behavior: 'MANUAL_CONFIRM',
            re_entry_limit_minutes: 0
        };
    }

    /**
     * [계산] 주차 요금 계산
     */
    async calculateFee(siteId, inTime, outTime) {
        // TODO: siteId에 맞는 요금 정책(Fee Policy)을 DB에서 조회하여 계산 로직 수행
        // const feePolicy = await this.repository.findActiveFeePolicy(siteId);
        
        // [임시 로직] 10분당 1000원
        const durationMin = Math.ceil((outTime - inTime) / (1000 * 60));
        return Math.ceil(durationMin / 10) * 1000;
    }

    /**
     * [계산] 할인 적용
     */
    async applyDiscounts(siteId, totalFee, parkingRecord) {
        // TODO: 적용된 할인 목록(applied_discounts)을 순회하며 차감
        return totalFee; // 임시: 할인 없음
    }

    /**
     * [조회] 사전 정산 유예 시간 조회
     */
    async getPreSettlementGraceMinutes(siteId) {
        return 20; // 기본값 20분
    }

    /**
     * [등록] 할인 적용 (수동/바코드)
     */
    async registerDiscount(client, sessionId, discountCode) {
        // TODO: discountCode 유효성 검증 및 session에 할인 정보 추가
        return true;
    }

    /**
     * [초기화] 할인 리셋
     */
    async resetDiscounts(client, sessionId) {
        // TODO: session의 applied_discounts 초기화
        return true;
    }
}

module.exports = PolicyService;