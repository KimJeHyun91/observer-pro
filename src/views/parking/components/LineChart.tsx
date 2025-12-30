import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface LineChartProps {
  series: { name: string; data: number[] }[];
  categories: string[];
  height?: number | string;
  colors?: string[];
}

const LineChart = ({
    series,
    categories,
    height = '100%',
    colors = ['#2F343D', '#1F40D6', '#2CCCE4', '#E9B707', '#099B3F'],
  }: LineChartProps) => {
    if (!series || series.length === 0) {
      return <div className="flex justify-center items-center h-full">차트 데이터가 없습니다.</div>;
    }
  
    const options: ApexOptions = {
      chart: {
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      colors,
      stroke: { curve: 'smooth' },
      xaxis: { type: 'category', categories },
      tooltip: {
        x: {
          formatter: (val: number) => `출입 시간: ${categories[val-1] + ':00' || val-1 + ':00'}`,
        },
      },
      legend: { position: 'top', horizontalAlign: 'center' },
    };
  
    return <Chart options={options} series={series} type="line" height={height} />;
  };

export default LineChart;