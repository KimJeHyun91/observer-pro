import Chart from "react-apexcharts";

const TimeFlowChart = () => {
    const inData =  [2, 1, 3, 10, 18, 15, 20, 25, 30, 22, 10, 5];
    const outData = [1, 0, 1, 5, 12, 10, 15, 20, 28, 25, 14, 7];

    const series = [
        { name: "입차",  data: inData },
        { name: "출차", data: outData },
    ];

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: "line",
            toolbar: { show: false },
        },
        stroke: {
            width: 3,
            curve: "smooth" as const,
        },
        
        colors: ["#8BC53F", "#FF7070"],
        legend: {
            labels: { colors: "#ccc" },
        },
        dataLabels: { enabled: false },
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1">
                <Chart type="line" series={series} options={options} height="100%" />
            </div>
        </div>
    );
};

export default TimeFlowChart;
