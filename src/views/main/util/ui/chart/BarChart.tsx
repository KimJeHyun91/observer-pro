import Chart from 'react-apexcharts'
import { COLORS } from '@/constants/chart.constant'

type Props = {
  categories: string[];
  columnWidth: string;
  tooltipFormatter: string;
  height: number;
  data: ApexAxisChartSeries;
  legend: boolean;
}

export default function BarChart({ height, categories, columnWidth, tooltipFormatter, data, legend }: Props) {
  return (
    <Chart
      options={{
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth,
            borderRadius: 4,
          },
        },
        colors: COLORS,
        dataLabels: {
          enabled: false,
        },
        stroke: {
          show: true,
          width: 2,
          colors: ['transparent'],
        },
        xaxis: {
          categories,
        },
        fill: {
          opacity: 1,
        },
        tooltip: {
          y: {
            formatter: (val) => `${val} ${tooltipFormatter}`,
          },
        },
        legend: {
          show: legend,
        },
      }}
      series={data}
      height={height}
      type="bar"

    />
  );
};