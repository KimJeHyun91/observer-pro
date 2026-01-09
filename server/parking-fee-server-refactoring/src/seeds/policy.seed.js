/**
 * 특정 사이트 ID를 기반으로 기본 정책 데이터 배열을 생성하는 함수
 * @param {string} siteId 
 * @returns {Array} 정책 생성 데이터 객체 배열
 */
module.exports = {
  initializeDefaults : (siteId) => {
    return [
        // ==========================================
        // [1] 요금 정책 (FEE)
        // ==========================================
        {
            siteId: siteId,
            type: 'FEE',
            name: '표준 시간제 요금',
            description: '회차 10분, 기본 30분 1000원, 10분당 500원',
            code: 'FEE_STD_001',
            config: { // Repository에서 변환하므로 객체 그대로 전달
                baseTimeMinutes: 30,
                baseFee: 1000,
                unitTimeMinutes: 10,
                unitFee: 500,
                graceTimeMinutes: 10,
                dailyMaxFee: 20000
            }
        },
        {
            siteId: siteId,
            type: 'FEE',
            name: '일 최대 요금 전용',
            description: '기본 요금 없이 바로 일 최대 요금 적용',
            code: 'FEE_DAILY_001',
            config: {
                baseTimeMinutes: 0,
                baseFee: 0,
                unitTimeMinutes: 60,
                unitFee: 15000,
                graceTimeMinutes: 20,
                dailyMaxFee: 15000
            }
        },
        // ==========================================
        // [2] 할인 정책 (DISCOUNT)
        // ==========================================
        {
            siteId: siteId,
            type: 'DISCOUNT',
            name: '환경친화적 자동차 할인',
            description: '전기차 및 경차 50% 자동 할인',
            code: 'DSC_EV_50',
            config: {
                discountType: 'PERCENT',
                discountValue: 50,
                discountMethod: 'AUTO'
            }
        },
        {
            siteId: siteId,
            type: 'DISCOUNT',
            name: '상가 방문 1시간 할인',
            description: '웹 할인 등록 또는 바코드 스캔 시 1시간 무료',
            code: 'DSC_VISIT_1H',
            config: {
                discountType: 'FREE_TIME',
                discountValue: 60,
                discountMethod: 'MANUAL'
            }
        },
        {
            siteId: siteId,
            type: 'DISCOUNT',
            name: '2,000원 할인 쿠폰',
            description: '키오스크 투입용 종이 할인권',
            code: 'DSC_CPN_2000',
            config: {
                discountType: 'FIXED_AMOUNT',
                discountValue: 2000,
                discountMethod: 'MANUAL'
            }
        }
    ];
  }
}
