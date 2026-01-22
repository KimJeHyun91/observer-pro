const dayjs = require('dayjs');
const statisticsRepository = require('../repositories/statistics.repository');

/**
 * 대시보드(Dashboard) 조회
 */
exports.getDashboard = async (siteId, params) => {
    const { baseMonth } = params;

    // =================================================================
    // 1. 날짜 범위 계산 (Date Range Calculation)
    // =================================================================
    const targetMonth = dayjs(baseMonth); 
    const startOfMonth = targetMonth.startOf('month');
    const endOfMonth = targetMonth.endOf('month');

    // (1) 매출 보고용 Ref Date (오늘 vs 말일)
    const today = dayjs(); 
    const refDate = targetMonth.isSame(today, 'month') ? today : endOfMonth;

    const revenueRanges = {
        daily: {
            currentStart: refDate.startOf('day').toISOString(),
            currentEnd: refDate.endOf('day').toISOString(),
            prevStart: refDate.subtract(1, 'day').startOf('day').toISOString()
        },
        weekly: {
            currentStart: refDate.startOf('week').toISOString(),
            currentEnd: refDate.endOf('week').toISOString(),
            prevStart: refDate.subtract(1, 'week').startOf('week').toISOString()
        },
        monthly: {
            currentStart: startOfMonth.toISOString(),
            currentEnd: endOfMonth.toISOString(),
            prevStart: startOfMonth.subtract(1, 'month').startOf('month').toISOString()
        }
    };

    // 6개월 전 시작일 계산 (monthlyUsageChart와 동일하게 맞춤)
    const startOfSixMonths = startOfMonth.subtract(5, 'month').startOf('month');

    // =================================================================
    // 2. 병렬 DB 조회 (Parallel Execution)
    // =================================================================
    const [
        dailyRevenueRows,                               // [Widget 1] 일일 매출 추이
        revDaily, revWeekly, revMonthly,                // [Widget 2] 금주(월) vs 전주(월) 매출 통합 조회
        trafficTrendRows,                               // [Widget 3] 6개월 입출차량 수
        vehicleRatioRows,                               // [Widget 4] 차종 비율
        hourlyFlowRows,                                 // [Widget 5] 시간대별 평균 흐름
        monthlyTrendRows                                // [Widget 6] 6개월 이용 추이
    ] = await Promise.all([
        // 1. 일일 종합 수익 (Line Chart)
        statisticsRepository.findDailyRevenueGraph(siteId, startOfMonth.toISOString(), endOfMonth.toISOString()),
        
        // 2. 종합 수익 보고 (Comparison)
        statisticsRepository.findRevenueComparison(siteId, revenueRanges.daily.prevStart, revenueRanges.daily.currentStart, revenueRanges.daily.currentEnd),
        statisticsRepository.findRevenueComparison(siteId, revenueRanges.weekly.prevStart, revenueRanges.weekly.currentStart, revenueRanges.weekly.currentEnd),
        statisticsRepository.findRevenueComparison(siteId, revenueRanges.monthly.prevStart, revenueRanges.monthly.currentStart, revenueRanges.monthly.currentEnd),
        
        // 3. 유동 차량 (Bar Chart)
        statisticsRepository.findTrafficMonthly(siteId, startOfSixMonths.toISOString(), endOfMonth.toISOString()),
        
        // 4. 차량 종류 비율 (Donut Chart)
        statisticsRepository.findVehicleTypeRatio(siteId, startOfMonth.toISOString(), endOfMonth.toISOString()),
        
        // 5. 시간대별 입출차 흐름 (Spline Chart)
        statisticsRepository.findHourlyTrafficFlow(siteId, startOfMonth.toISOString(), endOfMonth.toISOString()),
        
        // 6. 당월 이용률 추이 (Bar Chart)
        statisticsRepository.findMonthlyUsageTrend(siteId, startOfMonth.subtract(5, 'month').toISOString(), endOfMonth.toISOString())
    ]);

    // =================================================================
    // 3. 데이터 포맷팅 및 반환 (Formatting & Return)
    // =================================================================
    return {
        dailyRevenueChart: formatDailyRevenueChart(dailyRevenueRows),
        revenueReport: {
            daily: formatRevenueReport(revDaily),
            weekly: formatRevenueReport(revWeekly),
            monthly: formatRevenueReport(revMonthly)
        },
        trafficVolumeChart: formatTrafficChart(trafficTrendRows),
        vehicleRatioChart: formatVehicleRatioChart(vehicleRatioRows),
        hourlyFlowChart: formatHourlyFlowChart(hourlyFlowRows),
        monthlyUsageChart: formatMonthlyUsageChart(monthlyTrendRows)
    };
};

/**
 * 요약(Summary) 조회
 */
exports.getStatisticsByRange = async (siteId, data) => {
    const { startTime, endTime } = data;

    // 1. DB 조회 (입력받은 시간 그대로 전달)
    const stats = await statisticsRepository.findSummaryByRange(siteId, startTime, endTime);

    // 2. 포맷팅
    const entryCount = parseInt(stats.entryCount || 0);
    const exitCount = parseInt(stats.exitCount || 0);

    return {      
        periodTraffic: {
            entryCount: entryCount,
            exitCount: exitCount,
            avgDuration: parseInt(stats.avgDuration || 0),
            maxDuration: parseInt(stats.maxDuration || 0)
        },
        
        periodRevenue: {
            totalSettledAmount: parseInt(stats.totalSettledAmount || 0),
            totalDiscountAmount: parseInt(stats.totalDiscountAmount || 0),
            totalLossAmount: parseInt(stats.totalLossAmount || 0),
            estimatedUnpaidAmount: parseInt(stats.estimatedUnpaidAmount || 0)
        }
    };
};

// =========================================================================
//  Helper Functions
// =========================================================================

/**
 * [Widget 1] 일일 종합 수익 (Line Chart)
 * - labels: ["1일", "2일", ...]
 * - data: [1000, 2000, ...]
 * - total: 기간 내 총합
 */
const formatDailyRevenueChart = (rows) => {
    return {
        total: rows.reduce((acc, cur) => acc + parseInt(cur.dailyRevenue || 0), 0),
        labels: rows.map(r => `${parseInt(r.dayLabel)}일`),
        data: rows.map(r => parseInt(r.dailyRevenue || 0))
    };
};

/**
 * [Widget 2] 종합 수익 보고 (Summary)
 */
const formatRevenueReport = (data) => {
    const current = parseInt(data.currentRevenue || 0);
    const prev = parseInt(data.prevRevenue || 0);
    return { current, prev, diff: current - prev };
};

/**
 * [Widget 3] 유동 차량 포맷터
 * - labels: ["12월", "01월", ... "05월"]
 * - entry: [100, 120, ...]
 * - exit: [90, 110, ...]
 */
const formatTrafficChart = (rows) => {
    return {
        labels: rows.map(r => r.label), 
        entry: rows.map(r => parseInt(r.entryCount || 0)),
        exit: rows.map(r => parseInt(r.exitCount || 0))
    };
};

/**
 * [Widget 4] 차량 종류 비율 (Donut Chart)
 * - DB의 영어 코드를 프론트엔드용 한글 이름으로 매핑
 */
const formatVehicleRatioChart = (rows) => {
    const TYPE_MAP = {
        NORMAL: '일반차량',
        COMPACT: '경차',
        ELECTRIC: '전기차',
        MEMBER: '정기권',
        UNKNOWN: '기타'
    };

    return rows.map(r => ({
        name: TYPE_MAP[r.name] || r.name || '기타',
        value: parseInt(r.value || 0)
    }));
};

/**
 * [Widget 5] 시간대별 입출차 흐름 (Spline Chart)
 * - labels: ["0시", "1시", ... "23시"]
 */
const formatHourlyFlowChart = (rows) => {
    return {
        labels: rows.map(r => `${parseInt(r.hour)}시`),
        entry: rows.map(r => parseInt(r.entryCount || 0)),
        exit: rows.map(r => parseInt(r.exitCount || 0))
    };
};

/**
 * [Widget 6] 당월(6개월) 이용률 추이 (Bar Chart)
 * - ApexCharts Series 포맷 준수
 */
const formatMonthlyUsageChart = (rows) => {
    return {
        labels: rows.map(r => r.monthLabel), // "24-12", "25-01" ...
        series: [
            {
                name: "종합 차량",
                data: rows.map(r => parseInt(r.totalCount || 0))
            }
        ]
    };
};