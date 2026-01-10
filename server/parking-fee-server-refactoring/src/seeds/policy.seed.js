/**
 * 특정 사이트 ID를 기반으로 기본 정책 데이터 배열을 생성하는 함수
 * @param {string} siteId 
 * @returns {Array} 정책 생성 데이터 객체 배열
 */
module.exports = {
  initializeDefaults: (siteId) => {
    return [
      // ==========================================
      // [1] 요금 정책 (FEE)
      // ==========================================
      {
        siteId: siteId,
        type: 'FEE',
        name: '표준 시간제 요금',
        description: '회차 10분, 기본 30분 1000원, 10분당 500원, 일 최대 2만원',
        code: 'FEE_STD_001',
        config: {
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
        description: '기본 요금 없이 입차 즉시 일 최대 요금 부과 (선불권 등)',
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
      {
        siteId: siteId,
        type: 'FEE',
        name: '무료 요금 (0원)',
        description: '요금 0원 적용 (관리자/공무차량 등)',
        code: 'FEE_FREE_001',
        config: {
          baseTimeMinutes: 0,
          baseFee: 0,
          unitTimeMinutes: 0,
          unitFee: 0,
          graceTimeMinutes: 0,
          dailyMaxFee: 0
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
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '장애인/유공자 할인',
        description: '장애인 및 국가유공자 80% 할인 (수동 확인)',
        code: 'DSC_DISABLED_80',
        config: {
          discountType: 'PERCENT',
          discountValue: 80,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '상가 방문 1시간 무료',
        description: '웹 할인 등록 또는 바코드 스캔 시 1시간 시간 공제',
        code: 'DSC_VISIT_1H',
        config: {
          discountType: 'FREE_TIME',
          discountValue: 60, // 60분
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '2,000원 할인 쿠폰',
        description: '키오스크 투입용 종이 할인권 (금액 차감)',
        code: 'DSC_CPN_2000',
        config: {
          discountType: 'FIXED_AMOUNT',
          discountValue: 2000, // 2000원
          discountMethod: 'MANUAL'
        }
      },

      // ==========================================
      // [3] 회원(정기권) 정책 (MEMBERSHIP)
      // ==========================================
      {
        siteId: siteId,
        type: 'MEMBERSHIP',
        name: '월 정기권 (일반)',
        description: '일반 차량 월 정기 주차 (30일, 150,000원)',
        code: 'MEM_MONTHLY_STD',
        config: {
          membershipFee: 150000,
          membershipValidityDays: 30
        }
      },
      {
        siteId: siteId,
        type: 'MEMBERSHIP',
        name: '입주민 전용 (무료)',
        description: '입주민 등록 차량 (무료, 1년 갱신)',
        code: 'MEM_RESIDENT_FREE',
        config: {
          membershipFee: 0,
          membershipValidityDays: 365
        }
      },
      {
        siteId: siteId,
        type: 'MEMBERSHIP',
        name: '상가 직원 월 정기권',
        description: '입점 업체 직원 할인 정기권 (30일, 50,000원)',
        code: 'MEM_STAFF_DC',
        config: {
          membershipFee: 50000,
          membershipValidityDays: 30
        }
      },

      // ==========================================
      // [4] 블랙리스트 정책 (BLACKLIST)
      // ==========================================
      {
        siteId: siteId,
        type: 'BLACKLIST',
        name: '입차 절대 금지',
        description: '악성 체납 차량 등 입차 시 차단기 미개방',
        code: 'BLK_BLOCK_ENTRY',
        isSystem: true,
        config: {
            blacklistAction: 'BLOCK',
            isSelected: false
        }
      },
      {
        siteId: siteId,
        type: 'BLACKLIST',
        name: '주의 요망 (입차 허용)',
        description: '요주의 차량이나 VIP 등 알림만 발생하고 입차는 허용',
        code: 'BLK_WARN_ONLY',
        isSystem: true,
        config: {
            blacklistAction: 'WARN',
            isSelected: false
        }
      },

      // ==========================================
      // [5] 휴일/특수일 정책 (HOLIDAY)
      // ==========================================
      {
        siteId: siteId,
        type: 'HOLIDAY',
        name: '주말/공휴일 요금 적용',
        description: '[설정 필요] 공휴일 그룹과 적용할 요금 정책을 연결하세요.',
        code: 'HOL_WEEKEND_APPLY',
        config: {
            // 실제 운영 시에는 pf_holidays 테이블의 ID와 pf_policies(FEE)의 ID를 연결해야 함
            // 초기화 시점에는 ID를 알 수 없으므로 null 혹은 프론트엔드에서 설정 유도
            holidayId: null, 
            holidayFeePolicyId: null 
        }
      }
    ];
  }
};