import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { getDailyRevenue } from '@/services/ParkingFeeService';
import { DailyRevenueItem, parkingFeeOutsideInfo } from '@/@types/parkingFee'
import { ApexOptions } from 'apexcharts';

type Props = {
    selectedParking: parkingFeeOutsideInfo
}

const DailyChart = ({ selectedParking }: Props) => {
    const [data, setData] = useState<DailyRevenueItem[]>([]);

    useEffect(() => {
        const dailyRevenueList = async () => {
            try {
                const res = await getDailyRevenue<DailyRevenueItem>({
                    outside_ip : selectedParking.outside_ip
                });

                if (res.message === 'ok') {
                    setData(res.result);
                }
            } catch (err) {
                console.error('결제 상세 api 조회 실패', err);
            }
        };

        dailyRevenueList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fees = data.map((d) => d.fee);
    const weeklyTotalFee = data.reduce((sum, d) => sum + d.fee, 0);

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
        },

        xaxis: {
            categories: data.map(d => d.weekday),
            labels: { style: { colors: '#ccc' } },
        },

        yaxis: {
            labels: {
                formatter: (val: number) => Math.floor(val).toLocaleString(),
                style: { colors: '#ccc' },
            },
        },

        tooltip: {
            intersect: false,

            custom: ({ dataPointIndex }) => {
                if (dataPointIndex == null || dataPointIndex < 0) return '';

                const item = data[dataPointIndex];

                return `
                    <div style="
                        padding: 8px 10px;
                        background: #3A3A3A;
                        color: #fff;
                        border-radius: 6px;
                        font-size: 12px;
                    ">
                        <div style="margin-bottom: 4px; font-weight: 600;">
                            ${item.weekday} (${item.date})
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
                                수익: ${item.fee.toLocaleString()} 원
                            </span>
                        </div>
                    </div>
                `;
            },
        },

        dataLabels: { enabled: false },
        colors: ['#8BC53F'],
    };

    const series = [
        {
            name: '수익',
            data: fees,
        },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <p className="text-xs text-gray-500 dark:text-gray-300">주간 총합 수익</p>
                <p className="text-xl font-bold text-black dark:text-white">{weeklyTotalFee.toLocaleString()} 원</p>
            </div>

            <div className="flex-1 mt-2">
                <Chart options={options} series={series} type="bar" height="100%" />
            </div>
        </div>
    )    
};

export default DailyChart;
