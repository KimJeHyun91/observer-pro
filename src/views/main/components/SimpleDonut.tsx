import Chart from 'react-apexcharts'
import { EventsDataByAck } from './EventsByAckBuildingDashboard';
import { EventsDataBySOP } from './EventsBySOPDashboard ';
import { EventsDataByImportance } from '@/@types/event';

type Props = {
  colors: string[];
  data: EventsDataByImportance[] | EventsDataByAck[] | EventsDataBySOP[];
  width?: number;
  height?: number;
  labels: string[];
  fontSize?: string;
}

const SimpleDonut = ({ colors, data, width, height, labels, fontSize = '0.6rem' }: Props) => {
  const dataSeries = data.map((dataItem: EventsDataByImportance | EventsDataByAck | EventsDataBySOP) => {
    if ('severity_per_count' in dataItem) {
      return parseInt(dataItem.severity_per_count);
    } else if ('ack_per_count' in dataItem) {
      return parseInt(dataItem.ack_per_count);
    } else if ('false_alarm_group' in dataItem) {
      return parseInt(dataItem.count);
    };
  });
  return (
    <Chart
      width={width}
      options={{
        colors,
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: {
                width: 200,
                height
              },
              legend: {
                position: 'bottom',
              },
            },
          },
        ],
        labels,
        dataLabels: {
          enabled: false,
        },
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '10px'
                },
                total: {
                  show: true,
                  label: "전체",
                  fontSize,
                  fontWeight: 'thin',
                  color: '#647DB7',
                }
              }
            }
          }
        }
      }}
      series={dataSeries}
      height={height}
      type="donut"
    />
  )
}

export default SimpleDonut
