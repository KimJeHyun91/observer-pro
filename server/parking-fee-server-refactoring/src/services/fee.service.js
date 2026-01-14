const logger = require('../../../logger');
const PolicyRepository = require('../repositories/policy.repository');

/**
 * ==============================================================================
 * Fee Service
 * ------------------------------------------------------------------------------
 * 역할:
 * 1. 주차 시간 기반의 '총 요금(Total Fee)' 계산
 * 2. 할인 정책(퍼센트) 재계산 및 기납부액 차감 후 '최종 결제 금액(Remaining Fee)' 산출
 * 3. 요금 정책 캐싱 (DB 부하 감소)
 * ==============================================================================
 */
class FeeService {

    // [Cache] 모든 인스턴스가 공유하는 정책 메모리 캐시 (Key: siteId, Value: ConfigObj)
    static policyCache = new Map();

    constructor() {
        this.policyRepository = new PolicyRepository();
    }

    /**
     * [Cache Control] 정책 캐시 초기화/갱신
     * - PolicyService에서 'FEE' 정책 수정 시 호출됨
     * @param {string} [siteId] - 갱신할 사이트 ID (없으면 전체 초기화)
     */
    async reloadCache(siteId) {
        try {
            // 특정 사이트만 갱신
            if (siteId) {
                const policies = await this.policyRepository.findAll({ siteId, type: 'FEE' }, {}, 1, 0);
                
                if (policies.rows.length > 0) {
                    FeeService.policyCache.set(siteId, policies.rows[0].config);
                    logger.info(`[FeeService] Cache Updated for Site: ${siteId}`);
                } else {
                    // 정책이 DB에서 사라졌다면 캐시도 제거
                    FeeService.policyCache.delete(siteId);
                    logger.info(`[FeeService] Cache Deleted for Site: ${siteId}`);
                }
            } 
            // 전체 초기화 (서버 시작 시 등 안전장치)
            else {
                FeeService.policyCache.clear();
                logger.info(`[FeeService] All Cache Cleared`);
            }
        } catch (error) {
            logger.error(`[FeeService] Cache Reload Failed: ${error.message}`);
        }
    }

    /**
     * [Step 1] 시간 기반 총 요금 계산
     * - 입차/출차 시간을 기준으로 순수 주차 요금을 계산합니다. (할인 적용 전)
     * - 캐싱된 정책을 우선 사용합니다.
     */
    async calculate({ entryTime, exitTime, preSettledAt, vehicleType, siteId }) {
        const start = new Date(entryTime);
        let end = exitTime ? new Date(exitTime) : new Date();

        // 1. 정책 가져오기
        const policyConfig = await this._getFeePolicyConfig(siteId);

        // 정책값 (없으면 기본값)
        const entryGraceMinutes = policyConfig.graceTimeMinutes;            // 입차 회차 (예: 10분)
        const settlementGraceMinutes = policyConfig.settlementGraceMinutes; // 정산 후 회차 (예: 20분)

        // -------------------------------------------------------------
        // [Logic 1] 입차 후 회차 (Entry Grace Time)
        // -------------------------------------------------------------
        // 실제 흐른 시간 계산
        const realDurationMs = Math.max(0, end.getTime() - start.getTime());
        const realDurationMinutes = Math.floor(realDurationMs / 60000);

        logger.debug(`[Fee] 요금 계산 시간: ${realDurationMinutes}분 (Type: ${vehicleType})`);

        // "입차 후 N분 이내 출차 시 무료"
        if (entryGraceMinutes > 0 && realDurationMinutes <= entryGraceMinutes) {
            return { 
                totalFee: 0, 
                discountAmount: 0, 
                finalFee: 0, 
                durationMinutes: realDurationMinutes, 
                isGracePeriod: true // 입차 회차임
            };
        }

        // 3. [Case A] 정기권 회원 (무료)
        // vehicleType이 MEMBER면 요금 0원 처리
        if (vehicleType === 'MEMBER') {
            return { 
                totalFee: 0, 
                discountAmount: 0, 
                finalFee: 0, 
                durationMinutes: realDurationMinutes, 
                isGracePeriod: false 
            };
        }

        // -------------------------------------------------------------
        // [Logic 2] 정산 후 회차 (Settlement Grace Time)
        // - 정산한 기록이 있고, 그로부터 N분 이내에 나가는 경우
        // -------------------------------------------------------------
        let isSettlementGrace = false;

        if (preSettledAt) {
            const settledTime = new Date(preSettledAt);
            const timeSinceSettlement = end.getTime() - settledTime.getTime();
            const minutesSinceSettlement = Math.floor(timeSinceSettlement / 60000);

            // 정산한 지 N분 안 지났으면? -> 요금 계산 시점을 '정산 시점'으로 고정(Freeze)
            // 즉, 추가 요금이 발생하지 않게 함
            if (minutesSinceSettlement <= settlementGraceMinutes) {
                end = settledTime; 
                isSettlementGrace = true;
            }
            // 시간을 넘겼으면? -> end는 '현재 시간' 그대로 유지 (추가 요금 발생)
        }

        // 재계산된 주차 시간 (정산 회차 적용 시 시간이 줄어들 수 있음)
        const calcDurationMs = Math.max(0, end.getTime() - start.getTime());
        const calcDurationMinutes = Math.floor(calcDurationMs / 60000);

        // 5. [Case C] 요금 계산 (일자별 반복 로직) 
        // 하루(1440분) 단위로 쪼개서 계산
        const minutesInDay = 1440;
        const days = Math.floor(calcDurationMinutes / minutesInDay);
        const remainingMinutes = calcDurationMinutes % minutesInDay;

        let totalFee = 0;
        const dailyMaxFee = policyConfig.dailyMaxFee; // 일일 최대 요금

        // 5-1. 꽉 채운 일수(Days)에 대한 요금
        if (dailyMaxFee > 0) {
            totalFee += (days * dailyMaxFee);
        } else {
            // 일 최대 요금이 없는 경우, 하루치(1440분) 요금을 정직하게 계산해서 곱함
            const fullDayFee = this._calculateDailyFee(minutesInDay, policyConfig);
            totalFee += (days * fullDayFee);
        }

        // 5-2. 남은 자투리 시간(Minutes)에 대한 요금 계산
        let dailyRemainingFee = this._calculateDailyFee(remainingMinutes, policyConfig);
        
        // 5-3. 자투리 시간 요금에도 일 최대 요금 캡(Cap) 적용
        if (dailyMaxFee > 0 && dailyRemainingFee > dailyMaxFee) {
            dailyRemainingFee = dailyMaxFee;
        }

        totalFee += dailyRemainingFee;

        // 7. 결과 반환
        return {
            totalFee: totalFee,  
            discountAmount: 0,   
            finalFee: totalFee,  
            durationMinutes: calcDurationMinutes,
            isGracePeriod: isSettlementGrace
        };
    }

    /**
     * [Step 2] 최종 결제 정보 계산
     * - 현재의 TotalFee를 기준으로 퍼센트(%) 할인을 재계산합니다.
     * - 경차, 전기차 등의 기본 감면도 appliedDiscounts에 포함되어 있다고 가정합니다.
     * * @param {Object} params
     * @param {number} params.totalFee - 현재 기준 총 주차 요금
     * @param {Array} params.appliedDiscounts - 기존 적용된 할인 목록 (기본 감면 포함)
     * @param {number} params.paidFee - 기납부 요금
     */
    calculateFinalPayment({ totalFee, appliedDiscounts = [], paidFee = 0 }) {
        
        let totalDiscount = 0;

        // 1. 모든 할인 목록 순회 및 재계산
        const recalculatedDiscounts = appliedDiscounts.map(d => {
            let amount = d.amount || 0;

            // [핵심] POLICY 타입이면서 PERCENT인 경우 (경차 할인, 퍼센트 쿠폰 등)
            // 시간이 지나 요금이 늘어났으면 할인 금액도 늘어나야 함 -> 재계산
            if (d.type === 'POLICY' && d.discountType === 'PERCENT') {
                amount = Math.floor(totalFee * (d.value / 100));
            }

            // (FIXED_AMOUNT나 MANUAL 할인은 금액 고정이므로 그대로 유지)

            totalDiscount += amount;
            
            // 갱신된 금액을 담은 객체 반환
            return { ...d, amount };
        });

        // 2. 잔여 요금 계산 (총요금 - 총할인 - 기납부액)
        // 음수 방지 (0원 미만이면 0원)
        const remainingFee = Math.max(0, totalFee - totalDiscount - paidFee);

        return {
            totalDiscount,          // 최종 총 할인액
            recalculatedDiscounts,  // 갱신된 할인 목록 (DB 업데이트용)
            remainingFee            // 고객이 내야 할 최종 돈
        };
    }



    // =================================================================
    // Helper Methods
    // =================================================================

    /**
     * [Helper] 하루(24시간) 이내의 시간 요금 계산
     */
    _calculateDailyFee(minutes, config) {
        if (minutes <= 0) return 0;

        let fee = 0;
        let calcMin = minutes;

        // 1. 기본 요금 (Base Fee)
        if (config.baseTimeMinutes > 0) {
            fee += (config.baseFee || 0);
            calcMin -= config.baseTimeMinutes;
        }

        // 2. 추가 요금 (Unit Fee)
        if (calcMin > 0 && config.unitTimeMinutes > 0) {
            // 올림 처리 (1분이라도 넘으면 1단위 부과)
            const units = Math.ceil(calcMin / config.unitTimeMinutes);
            fee += (units * (config.unitFee || 0));
        }

        return fee;
    }

    /**
     * [Private] 정책 조회
     * - Repository를 통해 DB에서 'FEE' 타입 정책을 조회
     */
    async _getFeePolicyConfig(siteId) {
        // 1. 캐시 확인 (메모리 히트)
        if (FeeService.policyCache.has(siteId)) {
            return FeeService.policyCache.get(siteId);
        }

        // 2. 캐시 미스 -> DB 조회
        logger.debug(`[FeeService] Cache Miss: ${siteId}. Fetching from DB...`);

        const policies = await this.policyRepository.findAll({ 
            siteId: siteId, 
            type: 'FEE' 
        }, {}, 1, 0);

        // [변경] 정책 데이터 유효성 검사 (하드코딩 제거)
        if (!policies.rows || policies.rows.length === 0) {
            // 심각한 설정 오류이므로 에러를 던져서 상위(ProcessService)에서 Catch하도록 함
            // -> 운영자에게 "요금 정책 설정 필요" 알림이 가도록 유도
            const errorMsg = `[FeeService] Critical: 요금 정책이 설정되지 않았습니다. (SiteId: ${siteId})`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        const config = policies.rows[0].config;

        // [추가 방어 로직] config 객체 자체가 비어있는지 체크
        if (!config) {
            const errorMsg = `[FeeService] Critical: 요금 정책 데이터(config)가 비어있습니다. (SiteId: ${siteId})`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        // 3. 캐시에 저장 (다음번엔 DB 조회 안 함)
        FeeService.policyCache.set(siteId, config);

        return config;
    }
}

module.exports = FeeService;