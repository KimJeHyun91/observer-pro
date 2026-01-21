const dayjs = require('dayjs');
const statisticsRepository = require('../repositories/statistics.repository');

/**
 * 대시보드용 전체 데이터 조합
 */
exports.getDashboardData = async (params) => {
    const { siteId, year, month } = params;

    // 1. 날짜 범위 계산
    const { current, prev, sixMonths } = calculateRanges(year, month);

    // 2. 병렬 DB 조회
    // - dailyStats: 일별 매출/입출차 (상단 차트들용)
    // - prevRevenue: 전월 매출 (비교용)
    // - vehicleRatio: 차종 비율 (좌측 하단)
    // - hourlyStats: 시간대별 흐름 (중앙 하단) *NEW*
    // - monthlyTrends: 6개월 추이 (우측 하단)
    const [dailyStats, prevDailyRevenue, vehicleRatio, hourlyStats, monthlyTrends] = await Promise.all([
        statisticsRepository.findDailyStats(siteId, current.start, current.end),
        statisticsRepository.findDailyRevenueOnly(siteId, prev.start, prev.end),
        statisticsRepository.findVehicleRatios(siteId, current.start, current.end),
        statisticsRepository.findHourlyStats(siteId, current.start, current.end), // 새로 추가됨
        statisticsRepository.findMonthlyTrends(siteId, sixMonths.start, current.end)
    ]);

    // 3. UI 위젯별 데이터 가공 (Formatting)
    return formatForWidgets({
        year, month,
        dailyStats,
        prevDailyRevenue,
        vehicleRatio,
        hourlyStats,
        monthlyTrends
    });
};

// =========================================================================
//  Helper Functions
// =========================================================================

const calculateRanges = (year, month) => {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const startOfMonth = dayjs(`${yearMonth}-01`).startOf('month');
    const endOfMonth = startOfMonth.endOf('month');

    return {
        current: { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() },
        prev: {
            start: startOfMonth.subtract(1, 'month').startOf('month').toISOString(),
            end: startOfMonth.subtract(1, 'month').endOf('month').toISOString()
        },
        sixMonths: { start: startOfMonth.subtract(5, 'month').startOf('month').toISOString() }
    };
};

const formatForWidgets = ({ dailyStats, prevDailyRevenue, vehicleRatio, hourlyStats, monthlyTrends }) => {
    // 공통 라벨 (일자)
    const dayLabels = dailyStats.map(row => `${parseInt(row.dayLabel)}일`);

    // [Widget 1] 좌측 상단: 일일 종합 수익 (Line Chart)
    const dailyRevenueData = dailyStats.map(r => parseInt(r.dailyRevenue));
    const totalCurrentRevenue = dailyRevenueData.reduce((a, b) => a + b, 0);

    // [Widget 2] 중앙 상단: 종합 수익 보고 (Comparison)
    const totalPrevRevenue = prevDailyRevenue.reduce((sum, r) => sum + parseInt(r.dailyRevenue), 0);
    
    // [Widget 3] 우측 상단: 유동 차량 (Bar Chart - Entry vs Exit)
    const trafficVolume = {
        labels: dayLabels,
        entry: dailyStats.map(r => parseInt(r.entryCount)),
        exit: dailyStats.map(r => parseInt(r.exitCount))
    };

    // [Widget 4] 좌측 하단: 차량 종류 비율 (Donut Chart)
    // 한글 매핑
    const typeMap = { NORMAL: '일반차량', COMPACT: '경차', ELECTRIC: '전기차', MEMBER: '정기권', UNKNOWN: '기타' };
    const vehicleRatioFormatted = vehicleRatio.map(r => ({
        name: typeMap[r.name] || r.name,
        value: parseInt(r.value)
    }));

    // [Widget 5] 중앙 하단: 시간대별 입출차 흐름 (Spline Chart - 0시~23시)
    // DB에서 비어있는 시간대는 0으로 채워져서 옴
    const hourlyFlow = {
        labels: hourlyStats.map(r => `${parseInt(r.hour)}시`),
        entry: hourlyStats.map(r => parseInt(r.entryCount)),
        exit: hourlyStats.map(r => parseInt(r.exitCount))
    };

    // [Widget 6] 우측 하단: 당월 이용률/추이 (Bar Chart - 6개월)
    const monthlyUsage = {
        labels: monthlyTrends.map(r => r.monthLabel), // "24-05", "24-06"
        series: [
            { name: "종합 차량", data: monthlyTrends.map(r => parseInt(r.totalCount)) },
            // 필요하다면 일반/기타 등으로 더 나눌 수 있음 (쿼리 수정 필요)
        ]
    };

    return {
        dailyRevenueChart: {
            total: totalCurrentRevenue,
            labels: dayLabels,
            data: dailyRevenueData
        },
        revenueReport: {
            currentMonthTotal: totalCurrentRevenue,
            prevMonthTotal: totalPrevRevenue,
            diff: totalCurrentRevenue - totalPrevRevenue
        },
        trafficVolumeChart: trafficVolume,
        vehicleRatioChart: vehicleRatioFormatted,
        hourlyFlowChart: hourlyFlow,
        monthlyUsageChart: monthlyUsage
    };
};