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
        isSystem: true,
        config: {
          baseTimeMinutes: 30,
          baseFee: 1000,
          unitTimeMinutes: 10,
          unitFee: 500,
          graceTimeMinutes: 10,
          dailyMaxFee: 20000
        }
      },

      // ==========================================
      // [2] 할인 정책 (DISCOUNT)
      // ==========================================
      // ==========================================
      // [2-1] 복합/퍼센트 할인 그룹 (장애인, 유공자 등)
      // - 기본적으로 % 할인을 적용하며, 무료 시간은 설명에 기재
      // ==========================================
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '장애인 할인',
        description: '등록장애인 및 동반 차량 (180분 무료 후 50% 할인)',
        code: 'DSC_DISABLED',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '고엽제후유의증',
        description: '고엽제 후유의증 환자 비사업용 차량 (180분 무료 후 50% 할인)',
        code: 'DSC_DEFOLIANT',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '5.18 민주유공자',
        description: '5·18민주화운동 부상자 및 동반 차량 (180분 무료 후 50% 할인)',
        code: 'DSC_518_MERIT',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '친환경 자동차',
        description: '환경친화적 자동차 (120분 무료 후 50% 할인)',
        code: 'DSC_ECO_FRIENDLY',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL' // 자동 인식 가능 시 AUTO로 변경
        }
      },

      // ==========================================
      // [2-2] 일반 퍼센트 할인 그룹
      // ==========================================
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '승용차 요일제',
        description: '요일제 태그 부착 및 운휴일 준수 차량 (20%)',
        code: 'DSC_WEEKLY_NO_DRIVING',
        config: {
          discountType: 'PERCENT',
          discountValue: 20,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '경차 할인',
        description: '경형 자동차 (50%)',
        code: 'DSC_COMPACT_CAR',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL' // LPR에서 차종 구분 가능 시
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '저공해 차량',
        description: '저공해 표시 스티커 부착 차량 (50%)',
        code: 'DSC_LOW_EMISSION',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '장기기증자',
        description: '장기기증자 및 등록자 (50%)',
        code: 'DSC_ORGAN_DONOR',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '우수 자원봉사자',
        description: '종합자원봉사센터 인증 운전 차량 (50%)',
        code: 'DSC_VOLUNTEER',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '병역명문가',
        description: '예우대상자 또는 가족 운전 차량 (50%)',
        code: 'DSC_MILITARY_FAMILY',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '효행자',
        description: '부양자(세대주) 운전 차량 (50%)',
        code: 'DSC_FILIAL_PIETY',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '의사상자',
        description: '의사자 유족 또는 의상자 및 가족 탑승 (50%)',
        code: 'DSC_RIGHTEOUS_PERSON',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '시민대상 수상자',
        description: '구리시 시민대상 수상자 소유 차량 (50%)',
        code: 'DSC_CITIZEN_AWARD',
        config: {
          discountType: 'PERCENT',
          discountValue: 50,
          discountMethod: 'MANUAL'
        }
      },

      // ==========================================
      // [2-3] 100% 감면 (무료) 그룹
      // ==========================================
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '긴급차량',
        description: '긴급 자동차 (면제)',
        code: 'DSC_EMERGENCY',
        config: {
          discountType: 'PERCENT',
          discountValue: 100,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '공무수행',
        description: '공무수행 중인 차량 (면제)',
        code: 'DSC_OFFICIAL_DUTY',
        config: {
          discountType: 'PERCENT',
          discountValue: 100,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '유공 납세자',
        description: '유공납세증 부착 차량 (1년간 면제)',
        code: 'DSC_TAX_MERIT',
        config: {
          discountType: 'PERCENT',
          discountValue: 100,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '상시 무료',
        description: '무료 개방 등 상시 무료 적용 (면제)',
        code: 'DSC_ALWAYS_FREE',
        config: {
          discountType: 'PERCENT',
          discountValue: 100,
          discountMethod: 'AUTO'
        }
      },

      // ==========================================
      // [2-4] 정액 할인 (금액 차감)
      // ==========================================
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '선거 투표 확인',
        description: '투표확인증 제출 차량 (2,000원 할인)',
        code: 'DSC_VOTING_CERT',
        config: {
          discountType: 'FIXED_AMOUNT',
          discountValue: 2000,
          discountMethod: 'MANUAL'
        }
      },

      // ==========================================
      // [2-5] 시간 할인 (FREE_TIME)
      // ==========================================
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '국가유공자 (노외)',
        description: '(노외주차장) 국가유공자 증서 소지 (48시간/2880분 무료)',
        code: 'DSC_NAT_MERIT_OFFSTREET',
        config: {
          discountType: 'FREE_TIME',
          discountValue: 2880,
          discountMethod: 'MANUAL'
        }
      },
      {
        siteId: siteId,
        type: 'DISCOUNT',
        name: '다자녀 (노외)',
        description: '(노외주차장) 다자녀 증명자료 제시 (48시간/2880분 무료)',
        code: 'DSC_MULTI_CHILD_OFFSTREET',
        config: {
          discountType: 'FREE_TIME',
          discountValue: 2880,
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