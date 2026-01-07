import Chart from "react-apexcharts";
import { ratioItem, parkingFeeOutsideInfo } from '@/@types/parkingFee';
import { getPieChartItem } from '@/services/ParkingFeeService';
import { useEffect, useState, useMemo } from 'react';
import { ApexOptions } from 'apexcharts';

type Props = {
    selectedParking: parkingFeeOutsideInfo;
};

const CarTypePieChart = ({ selectedParking }: Props) => {
    const [data, setData] = useState<ratioItem[]>([]);

    useEffect(() => {
        const getPieChart = async () => {
            try {
                const res = await getPieChartItem<ratioItem>({
                    outside_ip: selectedParking.outside_ip,
                });

                if (res.message === 'ok') {
                    // setData(res.result);
                    setData([ // 감면정책 적용된 차량 전부
                        {
                            "lp_type": "일반차량",
                            "lp_type_count": 1,
                            "ratio": "60"
                        },
                        {
                            "lp_type": "친환경",
                            "lp_type_count": 13,
                            "ratio": "30"
                        },
                        {
                            "lp_type": "효행",
                            "lp_type_count": 2,
                            "ratio": "10"
                        }
                    ]);
                }
            } catch (err) {
                console.error('차량 유형 비율 api 조회 실패', err);
            }
        };

        getPieChart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const labels = useMemo(
        () => data.map(d => d.lp_type),
        [data]
    );

    const series = useMemo(
        () => data.map(d => Number(d.ratio)),
        [data]
    );

    const totalCount = useMemo(
        () => data.reduce((sum, d) => sum + d.lp_type_count, 0),
        [data]
    );

    const isEmpty = data.length === 0 || totalCount === 0;

    const chartLabels = isEmpty ? ['집계된 차량 없음'] : labels;
    const chartSeries = isEmpty ? [1] : series;

    const options: ApexOptions = {
        chart: {
            type: 'donut',
        },

        labels: chartLabels,

        colors: isEmpty
            ? ['#A3A3A3']
            : ['#8BC53F', '#03A9F4', '#FFB74D', '#4CAF50', '#9575CD'],

        legend: {
            position: 'bottom',
            labels: {
                colors: '#999',
            },
        },

        stroke: {
            width: 1,
            colors: ['#fff'],
        },

        dataLabels: {
            enabled: !isEmpty,
            style: { colors: ['#fff'] },
            formatter: (val: number) => `${val.toFixed(1)}%`,
        },

        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: isEmpty ? '-' : '총 차량',
                            formatter: () =>
                                isEmpty ? '-' : `${totalCount}대`,
                        },
                    },
                },
            },
        },

        tooltip: {
            enabled: !isEmpty,
            custom: ({ seriesIndex, w }) => {
                if (isEmpty ||seriesIndex == null ||!data[seriesIndex]) return '';

                const item = data[seriesIndex];
                const color = w.globals.colors[seriesIndex];

                return `
                    <div style="
                        padding: 8px 10px;
                        background: #3A3A3A;
                        color: #fff;
                        border-radius: 6px;
                        font-size: 12px;
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom:4px;">
                            <span style="
                                width: 8px;
                                height: 8px;
                                border-radius: 50%;
                                background: ${color};
                                display: inline-block;
                            "></span>

                            <span style="font-weight:600;">
                                ${item.lp_type}
                            </span>
                        </div>
             
                        <div>차량 수 : ${item.lp_type_count}대</div>
                        <div>비율 : ${item.ratio}%</div>
                    </div>
                `;
            },
        },

        responsive: [
            {
                breakpoint: 500,
                options: {
                    legend: { position: 'bottom' },
                },
            },
        ],
    };

    return (
        <Chart
            options={options}
            series={chartSeries}
            type="donut"
            height="100%"
        />
    );
};

export default CarTypePieChart;
