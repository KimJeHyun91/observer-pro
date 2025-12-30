import Chart from "react-apexcharts";

const CarTypePieChart = () => {
    const options: ApexCharts.ApexOptions = {
        chart: {
            type: "donut" as const,
        },
        labels: ["소형", "중형", "대형", "경차", "전기차"],

        colors: ["#8BC53F", "#4CAF50", "#2E7D32", "#FFB74D", "#03A9F4"],

        legend: {
            position: "bottom",
            labels: {
                colors: "#666",
            },
        },

        stroke: {
            width: 1,
            colors: ["#fff"],
        },

        dataLabels: {
            enabled: true,
            style: { colors: ["#fff"] },
            formatter: (val: number) => `${val.toFixed(1)}%`,
        },

        plotOptions: {
            pie: {
                donut: {
                    size: "65%",
                },
            },
        },

        responsive: [
            {
                breakpoint: 500,
                options: {
                    legend: { position: "bottom" },
                },
            },
        ],
    };

    const series = [30, 25, 20, 15, 10];

    return (
        <Chart
            options={options}
            series={series}
            type="donut"
            height="100%"
        />
    );
};

export default CarTypePieChart;
