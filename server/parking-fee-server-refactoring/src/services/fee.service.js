const logger = require('../../../logger');
const PolicyRepository = require('../repositories/policy.repository');

class FeeService {
    constructor() {
        this.policyRepository = new PolicyRepository();
    }

    /**
     * 요금 계산 메인 메서드
     * @param {Object} params
     * @param {Date|string} params.entryTime - 입차 시간
     * @param {Date|string} params.exitTime - 출차 시간 (없으면 현재)
     * @param {string} params.vehicleType - 차량 타입 (NORMAL, MEMBER, COMPACT, ELECTRIC...)
     * @param {string} params.siteId - 사이트 ID
     */
    async calculate({ entryTime, exitTime, vehicleType, siteId }) {
        const start = new Date(entryTime);
        const end = exitTime ? new Date(exitTime) : new Date();

        // 1. 주차 시간 계산 (분 단위)
        const durationMs = Math.max(0, end.getTime() - start.getTime());
        const durationMinutes = Math.floor(durationMs / 60000);

        logger.info(`[Fee] 요금 계산 시작: ${durationMinutes}분 (Type: ${vehicleType})`);

        // 2. 정책 조회 (DB 연동)
        // FEE 타입의 정책 중 현재 사이트에 적용된 것을 가져옴
        const policyConfig = await this._getFeePolicyConfig(siteId);

        // 3. [Case A] 정기권 회원 (무료)
        // vehicleType이 MEMBER면 요금 0원 처리
        if (vehicleType === 'MEMBER') {
            return { 
                totalFee: 0, 
                discountAmount: 0, 
                finalFee: 0, 
                durationMinutes, 
                isGracePeriod: false 
            };
        }

        // 4. [Case B] 회차 시간(Grace Time) 이내 (무료)
        // 예: 10분 이내 회차 무료
        if (policyConfig.graceTimeMinutes && durationMinutes <= policyConfig.graceTimeMinutes) {
            logger.info(`[Fee] 회차 시간 이내 출차 (${durationMinutes}분 <= ${policyConfig.graceTimeMinutes}분)`);
            return { 
                totalFee: 0, 
                discountAmount: 0, 
                finalFee: 0, 
                durationMinutes, 
                isGracePeriod: true 
            };
        }

        // 5. [Case C] 요금 계산 (일자별 반복 로직) 
        // 하루(1440분) 단위로 쪼개서 계산
        const minutesInDay = 1440;
        const days = Math.floor(durationMinutes / minutesInDay);
        const remainingMinutes = durationMinutes % minutesInDay;

        let totalFee = 0;
        const dailyMaxFee = policyConfig.dailyMaxFee || 0; // 일일 최대 요금 (없으면 0)

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

        // 6. 경차/전기차 등 법정 감면 (Optional)
        // 여기서는 '할인 전 총 요금'을 구하는 것이 목적이므로, 
        // 감면 로직은 calculate 호출 후 applyDiscount 단계에서 처리하는 것이 일반적임.
        // 하지만 "기본 요금 자체를 50% 감면" 하는 정책이라면 여기서 처리 가능.
        // if (['COMPACT', 'ELECTRIC'].includes(vehicleType)) { ... }

        // 7. 결과 반환
        return {
            totalFee: totalFee,
            discountAmount: 0, // 여기서는 0, 추후 할인 적용 단계에서 계산
            finalFee: totalFee,
            durationMinutes: durationMinutes,
            isGracePeriod: false
        };
    }

    /**
     * [Helper] 하루(24시간) 이내의 시간 요금 계산
     * - DB 스키마의 config 필드명과 매칭
     */
    _calculateDailyFee(minutes, config) {
        if (minutes <= 0) return 0;

        let fee = 0;
        let calcMin = minutes;

        // 1. 기본 요금 (Base Fee)
        // 예: 최초 30분 3000원
        if (config.baseTimeMinutes > 0) {
            fee += (config.baseFee || 0);
            calcMin -= config.baseTimeMinutes;
        }

        // 2. 추가 요금 (Unit Fee)
        // 예: 이후 10분당 1000원
        if (calcMin > 0 && config.unitTimeMinutes > 0) {
            // 올림 처리 (1분만 초과해도 10분 요금 부과)
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
        // Repository에서 siteId와 type='FEE'로 조회하는 메서드 필요
        // 여기서는 로직 예시를 위해 findOne을 가정
        // 실제로는: const policyEntity = await this.policyRepository.findOne({ siteId, type: 'FEE' });
        
        // 캐싱(Redis or Memory)이 강력히 권장되는 구간입니다.
        // 매번 DB를 조회하지 않도록 주의하세요.

        const policies = await this.policyRepository.findAll({ 
            siteId: siteId, 
            type: 'FEE' 
        }, {}, 1, 0);

        if (policies.rows.length === 0) {
            // 정책이 없으면 기본값(무료 or 에러)
            logger.warn(`[Fee] 요금 정책 미설정 Site: ${siteId}. 기본값(0원) 적용.`);
            return {
                baseTimeMinutes: 0,
                baseFee: 0,
                unitTimeMinutes: 10,
                unitFee: 0,
                graceTimeMinutes: 0,
                dailyMaxFee: 0
            };
        }

        // config JSON 객체 반환 (DB는 SnakeCase지만 Humps에 의해 CamelCase로 변환됨을 가정)
        // DB Config 예시: { "base_time_minutes": 30, "base_fee": 3000 ... }
        // Repository 반환값: { baseTimeMinutes: 30, baseFee: 3000 ... }
        return policies.rows[0].config;
    }
}

module.exports = new FeeService();