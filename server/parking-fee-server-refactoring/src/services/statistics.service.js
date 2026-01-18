// const StatisticsRepository = require('../repositories/statistics.repository');
// const SiteRepository = require('../repositories/site.repository');
// const PolicyRepository = require('../repositories/policy.repository');
// const FeeService = require('./fee.service');

// class StatisticsService {
//     constructor() {
//         // 통계용 리포지토리를 별도로 사용 (추천)
//         this.statisticsRepository = new StatisticsRepository();
        
//         // 보조 리포지토리들
//         this.siteRepository = new SiteRepository();
//         this.policyRepository = new PolicyRepository();
        
//         // 계산 로직
//         this.feeService = FeeService;
//     }

//     /**
//      * 금일(Today) 주차장 현황 요약
//      * @param {string} siteId 
//      */
//     async getTodaySummary(siteId) {
//         // 1. 사이트 정보 조회 (총 주차면수 등)
//         const site = await this.siteRepository.findById(siteId);
//         if (!site) throw new Error('존재하지 않는 사이트 ID입니다.');

//         // 2. 오늘 날짜 범위 설정 (00:00:00 ~ 현재)
//         const now = new Date();
//         const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

//         // 3. [병렬 실행] DB에서 필요한 원시 데이터 조회
//         const [trafficData, revenueData, activeSessions, feeConfig] = await Promise.all([
//             // A. 입/출차 수 (COUNT)
//             this.statisticsRepository.getTrafficCounts(siteId, startOfDay),
            
//             // B. 정산 완료 매출 (SUM)
//             this.statisticsRepository.getSettledRevenue(siteId, startOfDay),
            
//             // C. 현재 주차 중인 차량 목록 (예상 매출 계산용)
//             this.statisticsRepository.getActiveSessions(siteId),

//             // D. 해당 사이트 요금 정책 (계산용)
//             this._getFeeConfig(siteId)
//         ]);

//         // 4. [로직] 회전율 계산 (입차대수 / 총주차면수)
//         const totalSpaces = site.totalSpaces || 1; // 0 나누기 방지
//         const rotationRate = parseFloat((trafficData.entryCount / totalSpaces).toFixed(2));

//         // 5. [로직] 현재 주차 중인 차량들의 '예상 미납 요금' 계산
//         let estimatedUnpaidAmount = 0;
        
//         if (feeConfig) {
//             for (const session of activeSessions) {
//                 // 현재 시간까지의 주차 시간(분)
//                 const entryTime = new Date(session.entryTime);
//                 const duration = Math.floor((now - entryTime) / 1000 / 60);

//                 // 현재 시점 기준 요금 계산
//                 const currentFee = this.feeService.calculateFee(duration, feeConfig);
                
//                 // 예상 미수금 = (현재 총 요금) - (이미 낸 돈) - (이미 받은 할인)
//                 const alreadyPaid = session.paidFee || 0;
//                 const alreadyDiscount = session.discountFee || 0;
                
//                 // *주의: 이미 할인을 많이 받아서 요금이 마이너스인 경우는 0으로 처리
//                 const unpaid = Math.max(0, currentFee - alreadyPaid - alreadyDiscount);
                
//                 estimatedUnpaidAmount += unpaid;
//             }
//         }

//         // 6. 결과 반환
//         return {
//             generatedAt: now,
            
//             todayTraffic: {
//                 entryCount: parseInt(trafficData.entryCount),
//                 exitCount: parseInt(trafficData.exitCount),
//                 rotationRate: rotationRate
//             },

//             todayRevenue: {
//                 totalSettledAmount: parseInt(revenueData.totalPaid),       // 실제 번 돈
//                 totalDiscountAmount: parseInt(revenueData.totalDiscount),  // 할인해 준 돈
                
//                 // [추가] 강제 출차로 인한 확정 손실금 (미수금)
//                 totalLossAmount: parseInt(revenueData.totalLoss),
                
//                 // 현재 주차 중인 차들의 예상 요금 (잠재 수익)
//                 estimatedUnpaidAmount: estimatedUnpaidAmount              
//             }
//         };
//     }

//     // ===========================================================================
//     // [Private Helper]
//     // ===========================================================================
    
//     /**
//      * 사이트의 FEE 정책 설정 가져오기
//      */
//     async _getFeeConfig(siteId) {
//         const { rows } = await this.policyRepository.findAll(
//             { siteId, type: 'FEE' },
//             { sortBy: 'created_at', sortOrder: 'DESC' },
//             1, 0
//         );
//         return rows.length > 0 ? rows[0].config : null;
//     }
// }

// module.exports = StatisticsService;