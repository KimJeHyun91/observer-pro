/**
 * Fee Service
 * - 주차 요금 계산 및 할인 적용 로직을 전담하는 도메인 서비스
 * - DB 의존성을 최소화하고, 순수 계산 로직 위주로 구현함
 */
class FeeService {
    
    /**
     * 기본 요금 계산 (FEE 정책 적용)
     * @param {number} durationMinutes - 주차 시간 (분)
     * @param {Object} feeConfig - 요금 정책 설정 (baseTimeMinutes, baseFee, ...)
     * @returns {number} 계산된 요금 (원)
     */
    calculateFee(durationMinutes, feeConfig) {
        if (!feeConfig || durationMinutes <= 0) return 0;

        // 1. 회차 유예 시간 (Grace Time) 체크
        // 주차 시간이 유예 시간 이내라면 요금 0원
        if (durationMinutes <= (feeConfig.graceTimeMinutes || 0)) {
            return 0;
        }

        // 2. 일일 최대 요금(Daily Max) 로직 적용
        // 24시간(1440분)을 초과하는 장기 주차에 대한 처리
        const MINUTES_IN_DAY = 1440;
        const dailyMaxFee = feeConfig.dailyMaxFee || 0;

        // 2-1. 일일 최대 요금 설정이 없는 경우 -> 단순 누적 계산
        if (dailyMaxFee <= 0) {
            return this._calculateCycleFee(durationMinutes, feeConfig);
        }

        // 2-2. 일일 최대 요금 설정이 있는 경우
        const days = Math.floor(durationMinutes / MINUTES_IN_DAY);
        const remainingMinutes = durationMinutes % MINUTES_IN_DAY;

        // (1) 꽉 찬 일자(Day)에 대한 요금 = 일수 * 일일최대요금
        const daysFee = days * dailyMaxFee;

        // (2) 남은 자투리 시간(Minute)에 대한 요금 계산
        let remainingFee = this._calculateCycleFee(remainingMinutes, feeConfig);

        // 자투리 요금도 일일 최대 요금을 넘을 수 없음 (Cap 적용)
        if (remainingFee > dailyMaxFee) {
            remainingFee = dailyMaxFee;
        }

        return daysFee + remainingFee;
    }

    /**
     * [내부 함수] 1일(24시간) 이내의 단일 주기 요금 계산
     * @param {number} minutes - 분
     * @param {Object} config - 설정
     */
    _calculateCycleFee(minutes, config) {
        if (minutes <= 0) return 0;

        const baseTime = config.baseTimeMinutes || 0;
        const baseFee = config.baseFee || 0;
        const unitTime = config.unitTimeMinutes || 1; // 0으로 나누기 방지
        const unitFee = config.unitFee || 0;

        // 1. 기본 시간 이내인 경우 -> 기본 요금만 부과
        if (minutes <= baseTime) {
            return baseFee;
        }

        // 2. 기본 시간 초과인 경우 -> 기본 요금 + 추가 요금
        const exceededTime = minutes - baseTime;
        
        // 올림(Ceil) 처리: 1분이라도 넘어가면 1단위 부과 (예: 10분 단위인데 11분이면 2단위)
        const units = Math.ceil(exceededTime / unitTime);
        
        return baseFee + (units * unitFee);
    }

    /**
     * 할인 금액 계산
     * - 정책 타입에 따라 할인될 '금액'을 계산하여 반환
     * - FREE_TIME(무료시간)의 경우, 요금을 0원으로 만들거나 별도 로직이 필요하므로
     * 여기서는 '금액 할인' 위주로 처리하고 시간 할인은 별도 메서드로 제공
     * * @param {number} currentTotalFee - 현재 총 요금
     * @param {Object} discountConfig - 할인 정책 설정 (type, value)
     * @returns {number} 할인될 금액 (원)
     */
    calculateDiscountAmount(currentTotalFee, discountConfig) {
        if (!discountConfig) return 0;

        const { discountType, discountValue } = discountConfig;
        let discountAmount = 0;

        switch (discountType) {
            case 'PERCENT':
                // 정률 할인: 전체 요금의 N% (소수점 절사)
                discountAmount = Math.floor(currentTotalFee * (discountValue / 100));
                break;

            case 'FIXED_AMOUNT':
                // 정액 할인: N원 할인
                discountAmount = discountValue;
                break;

            case 'FREE_TIME':
                // 시간 할인: 여기서는 금액으로 환산할 수 없으므로 0원 리턴
                // (시간 할인은 calculateAdjustedDuration을 사용해야 함)
                discountAmount = 0;
                break;

            default:
                discountAmount = 0;
        }

        // 할인액은 전체 요금을 초과할 수 없음 (마이너스 요금 방지)
        if (discountAmount > currentTotalFee) {
            discountAmount = currentTotalFee;
        }

        return discountAmount;
    }

    /**
     * 시간 할인(FREE_TIME) 적용 후 주차 시간 계산
     * - 무료 주차 시간이 적용된 후의 '과금 대상 시간'을 반환
     * * @param {number} originalDuration - 원래 주차 시간
     * @param {Object} discountConfig - 할인 정책 설정
     * @returns {number} 조정된 주차 시간 (분)
     */
    calculateAdjustedDuration(originalDuration, discountConfig) {
        if (!discountConfig || discountConfig.discountType !== 'FREE_TIME') {
            return originalDuration;
        }

        // 무료 시간(분) 차감
        const adjusted = originalDuration - discountConfig.discountValue;
        
        return adjusted < 0 ? 0 : adjusted;
    }
}

module.exports = FeeService;