import { useState } from "react";
import Chart from "react-apexcharts";

const MovingCarChart = () => {
    const [mode, setMode] = useState<"day" | "week" | "month">("day");

    const dayLabels = ["24-07-10", "24-07-12", "24-07-14", "24-07-16"];
    const dayIn = [5, 12, 30, 18];
    const dayOut = [1, 4, 8, 5];

    const weekLabels = ["1주", "2주", "3주", "4주"];
    const weekIn = [40, 32, 28, 35];
    const weekOut = [10, 8, 6, 12];

    const monthLabels = ["1월", "2월", "3월", "4월", "5월"];
    const monthIn = [100, 120, 140, 130, 150];
    const monthOut = [40, 60, 55, 45, 70];

    let labels = dayLabels;
    let inData = dayIn;
    let outData = dayOut;

    if (mode === "week") {
        labels = weekLabels;
        inData = weekIn;
        outData = weekOut;
    }
    if (mode === "month") {
        labels = monthLabels;
        inData = monthIn;
        outData = monthOut;
    }

    const series = [
        {
            name: "진입",
            data: inData,
        },
        {
            name: "진출",
            data: outData,
        },
    ];

    const options = {
        chart: {
            type: "bar" as const,
            toolbar: { show: false },
        },
        xaxis: {
            categories: labels,
            labels: { style: { colors: "#ccc" } },
        },
        colors: ["#8BC53F", "#FF7F7F"],
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 3,
            },
        },
        legend: {
            labels: { colors: "#ccc" },
        },
        dataLabels: { enabled: false },
    };

    return (
        <div className="flex flex-col h-full">
            {/* 상단 요약 + 탭 버튼 */}
            <div className="flex justify-between items-start mb-4">
                {/* 진입/진출 Total 표시 */}
                <div className="flex flex-row gap-10">
                    <div>
                        <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#8BC53F] mt-1" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-300">진입</p>
                                <p className="text-xl font-bold text-black dark:text-white">{inData.reduce((a, b) => a + b, 0)}건</p>
                            </div>
                        </div>
                    </div>

                    <div>                        
                        <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#FF7F7F] mt-1" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-300">진출</p>
                                <p className="text-xl font-bold text-black dark:text-white">{outData.reduce((a, b) => a + b, 0)}건</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 탭 버튼 */}
                <div className="flex bg-gray-100 dark:bg-[#3A3A3A] rounded overflow-hidden border dark:border-gray-700">
                    <button
                        className={`px-3 py-1 text-sm ${
                            mode === "day"
                                ? "bg-[#8BC53F] text-white"
                                : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMode("day")}
                    >
                        일 단위
                    </button>

                    <button
                        className={`px-3 py-1 text-sm ${
                            mode === "week"
                                ? "bg-[#8BC53F] text-white"
                                : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMode("week")}
                    >
                        주 단위
                    </button>

                    <button
                        className={`px-3 py-1 text-sm ${
                            mode === "month"
                                ? "bg-[#8BC53F] text-white"
                                : "text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setMode("month")}
                    >
                        월 단위
                    </button>
                </div>
            </div>

            {/* 차트 영역 */}
            <div className="flex-1">
                <Chart type="bar" series={series} options={options} height="100%" />
            </div>
        </div>
    );
};

export default MovingCarChart;
