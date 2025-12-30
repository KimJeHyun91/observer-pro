import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { getTotalRevenue } from '@/services/ParkingFeeService';
import { TotalRevenueItem } from '@/@types/parkingFee';

type Mode = 'week' | 'month';

const TotalChart = () => {
    const [mode, setMode] = useState<Mode>('week');
    const [data, setData] = useState<TotalRevenueItem[]>([]);

    useEffect(() => {
        const totalRevenue = async () => {
            const res = await getTotalRevenue<TotalRevenueItem>();
            
            if (res.message === 'ok') {
                setData(res.result);
            }
        };

        totalRevenue();
    }, []);

    const isWeek = mode === 'week';

    // 차트 데이터 가공
    const chartData = data.map(d =>
        isWeek ? d.week_parking_fee : d.month_parking_fee
    );

    const categories = data.map(d =>
        isWeek
            ? `${d.seq}주`
            : d.month_start.slice(0, 7)
    );

    // 상단 요약 계산
    const total =
        data.length > 0
            ? isWeek
            ? data[data.length - 1].week_parking_fee
            : data[data.length - 1].month_parking_fee
            : 0;

    const lastTotal =
        data.length > 1
            ? isWeek
            ? data[data.length - 2].week_parking_fee
            : data[data.length - 2].month_parking_fee
            : 0;

    // const diffRate =
    //     lastTotal === 0
    //         ? '-'
    //         : (((total - lastTotal) / lastTotal) * 100).toFixed(1) + '%';

    // 차트 옵션
    const options: ApexOptions = {
        chart: {
            type: 'line',
            toolbar: { show: false },
        },

        stroke: {
            curve: 'smooth',
            width: 3,
        },

        xaxis: {
            categories,
            labels: { style: { colors: '#ccc' } },
        },

        yaxis: {
            labels: {
                formatter: (val: number) => Math.floor(val).toLocaleString(),
                style: { colors: '#ccc' },
            },
        },

        tooltip: {
            shared: true,
            intersect: false,

            custom: ({ dataPointIndex }) => {
                if (dataPointIndex == null || dataPointIndex < 0) return '';
                const item = data[dataPointIndex];
                const title = isWeek ? `${item.seq} 주` : item.month_start.slice(0, 7);
                const value = isWeek ? item.week_parking_fee : item.month_parking_fee;

                return `
                        <div style="
                            padding: 8px 10px;
                            background: #3A3A3A;
                            color: #fff;
                            border-radius: 6px;
                            font-size: 12px;
                        ">
                            <div style="margin-bottom: 4px; font-weight: 600;">
                                ${title}
                            </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="
                                width: 8px;
                                height: 8px;
                                border-radius: 50%;
                                background: #8BC53F;
                                display: inline-block;
                            "></span>
                            <span>
                                종합 수익: ${value.toLocaleString()} 원
                            </span>
                        </div>
                    </div>
                `;
            },
        },

        dataLabels: { enabled: false },
        colors: ['#8BC53F'],
    };

    const chartRenderData = chartData.map(v =>
        v === 0 ? 0.0001 : v
    );

    const series = [
        {
            name: isWeek ? '주간 종합 수익' : '월간 종합 수익',
            data: chartRenderData,
        },
    ];
        
    return (
        <div className="flex flex-col h-full">
            {/* 상단 */}
            <div className="flex justify-between items-start mb-4">
                {/* 요약 데이터 영역*/}
                <div className="flex flex-row gap-12">
                    {/* 금주 종합 수익 */}
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                            {isWeek ? "금주 종합 수익" : "이번달 종합 수익"}
                        </p>
                        <p className="text-xl font-bold text-black dark:text-white">
                            {total.toLocaleString()} 원
                        </p>
                    </div>

                    {/* 지난주 종합 수익 */}
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                            {isWeek ? "지난주 종합 수익" : "지난달 종합 수익"}
                        </p>
                        <p className="text-xl font-bold text-black dark:text-white">
                            {lastTotal.toLocaleString()} 원
                        </p>
                    </div>

                    {/* 수익률 */}
                    {/* <div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">수익률</p>
                        <p className="text-xl font-bold text-black dark:text-white">
                            {diffRate}
                        </p>
                    </div> */}
                </div>

                {/* 탭 버튼 */}
                <div className="flex bg-gray-100 dark:bg-[#3A3A3A] rounded overflow-hidden border dark:border-gray-700">
                    <button
                        className={`px-3 py-1 text-sm ${
                            isWeek ? "bg-[#8BC53F] text-white" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMode("week")}
                    >
                        주 단위
                    </button>

                    <button
                        className={`px-3 py-1 text-sm ${
                            !isWeek ? "bg-[#8BC53F] text-white" : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMode("month")}
                    >
                        월 단위
                    </button>
                </div>
            </div>

            {/* 차트 */}
            <div className="flex-1">
                <Chart options={options} series={series} type="line" height="100%" />
            </div>
        </div>
    );
};

export default TotalChart;
