import Chart from "react-apexcharts";
import { parkingFeeOutsideInfo } from '@/@types/parkingFee';

type Props = {
    selectedParking: parkingFeeOutsideInfo
}

const MonthUseChart = ({ selectedParking }: Props) => {
    console.log(selectedParking);
    const labels = ["23-08", "23-10", "23-12", "24-02", "24-04", "24-06"];

    const totalCars = [5, 3, 8, 10, 29, 5];
    const normalCars = [1, 3, 5, 5, 2, 1];
    const otherCars = [4, 0, 3, 5, 27, 4];

    const sumTotal = totalCars.reduce((a, b) => a + b, 0);
    const sumNormal = normalCars.reduce((a, b) => a + b, 0);
    const sumOther = otherCars.reduce((a, b) => a + b, 0);

    const series = [
        { name: "종합 차량", data: totalCars },
        { name: "일반 차량", data: normalCars },
        { name: "기타 차량", data: otherCars },
    ];

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
        },
        xaxis: {
            categories: labels,
            labels: { style: { colors: "#ccc" } },
        },
        colors: ["#8BC53F", "#4CAF50", "#66CCFF"],
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 3,
                columnWidth: "45%",
            },
        },
        legend: {
            itemMargin: { horizontal: 10 },
            labels: { colors: "#ccc" },
        },
        dataLabels: { enabled: false },
    };

    return (
        <div className="flex flex-col h-full">
            {/* 상단 통계 영역 */}
            <div className="flex justify-between items-start mb-4 text-sm">
                {/* 왼쪽 - 종합 차량 */}
                <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8BC53F] mt-1" />
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">종합 차량</p>
                        <p className="text-xl font-bold text-black dark:text-white">{sumTotal || "0"}대</p>
                    </div>
                </div>

                {/* 오른쪽 - 일반/기타 차량 */}
                <div className="flex gap-10">
                    <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4CAF50] mt-1" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-300">일반 차량</p>
                            <p className="text-xl font-bold text-black dark:text-white">{sumNormal || "0"}대</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#66CCFF] mt-1" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-300">기타 차량</p>
                            <p className="text-xl font-bold text-black dark:text-white">{sumOther || "0"}대</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 차트 */}
            <div className="flex-1">
                <Chart type="bar" options={options} series={series} height="100%" />
            </div>
        </div>
    );
};

export default MonthUseChart;
