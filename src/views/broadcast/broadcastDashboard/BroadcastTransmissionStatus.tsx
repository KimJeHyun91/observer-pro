import { BroadcastAreaResponse, BroadcastDashboardTransmissionStatusData } from '@/@types/broadcast';
import { Skeleton, Spinner } from '@/components/ui';
import { getBroadcastTransmissionStatus } from '@/services/BroadcastService';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { useBroadcastArea } from '@/utils/hooks/useBroadcast';
import dayjs from 'dayjs';
import { color } from 'framer-motion';
import React, { useEffect, useState } from 'react'
import Chart from "react-apexcharts";
import ApexCharts from "react-apexcharts";
import ReactApexChart from "react-apexcharts";


type BroadcastTransmissionStatusProps = {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  siteId: string[];
};  

const BroadcastTransmissionStatus = ({ dateRange, siteId }: BroadcastTransmissionStatusProps) => {
  const [status, setStatus] = useState<BroadcastDashboardTransmissionStatusData>({
    successRate: 0,
    failureRate: 0,
    totalLogs: 0,
    successCount: 0,
    failureCount: 0
  });
  const [loading, setLoading] = useState(false);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          const res = await getBroadcastTransmissionStatus({
            siteId: siteId[0],
            start: dayjs(dateRange?.startDate).format('YYYY-MM-DD'),
            end: dayjs(dateRange?.endDate).format('YYYY-MM-DD')
          });

          if(res.message === 'ok'){
            setStatus(res.result);
          }
        } catch (error) {
          console.error( error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [dateRange, siteId]);

    const options: ApexCharts.ApexOptions= {
      chart: {
        type: "donut",
      },
      labels: ["방송 성공", "방송 실패"],
      colors: ["#8699c6", "#d76767"], 
      dataLabels: {
        enabled: false,
        formatter: function (val, opts) {
        const label = opts.w.globals.labels[opts.seriesIndex];
        return `${val.toFixed(1)}%`;
        },
        style: {
        fontSize: "25px", 
        fontWeight: 100,
        colors:['black']
        },
      },
      legend: {
        show: true,
        position: "right",
        fontSize: "12px" 
      },
      plotOptions: {
        pie: {
        donut: {
          labels: {
          show: true, 
          name:{
            show:true,
            fontSize:'12px'
          },
          total: {
            show: true,
            label: "전체",
            fontSize: '12px', 
            fontWeight: 'thin',
            color: '#8699c6',
          },
          },
        },
        },
      },
      };
  
      const series = [status.successRate, status.failureRate]; // 성공률, 실패율
 

    return (
    <div className='h-full flex flex-col'>
        <p className='h-[10%] flex items-center bg-white dark:bg-[#262626]  p-2 rounded-lg mb-2 font-bold'>방송 송출 현황</p>
          <div className='flex justify-center mb-2 h-[60%] bg-white dark:bg-[#262626] rounded-lg'>
            {loading ? (
              <div className='w-[80%] h-full flex flex-col justify-center items-around gap-2'>
                {/* <Skeleton className=' h-[10%]' /> */}
                <Skeleton className=' h-[10%]' />
                {/* <Skeleton className=' h-[10%]' /> */}
              </div>
            ) : (
              <div className='custom-pie-chart w-[90%] h-full  pt-2 '>
                <ApexCharts options={options} series={series} type="donut" height={'90%'} width={'95%'} />
              </div>
            )}
          </div>
          <div className='flex flex-1 justify-around gap-2 bg-white dark:bg-[#747070] dark:text-white p-1 rounded-lg '>
            <div className='flex flex-col min-w-[23.5%] items-center justify-center gap-2 bg-[#ebecef] dark:bg-[#262626] rounded-lg p-2'>
              <p className='min-w-[95px] text-center text-[.8rem] font-bold'>전체 방송 건수</p>
              {loading ? (
                <Skeleton className='h-[20px] w-[50px]' />
              ) : (
                <p className='font-bold text-[1rem]'>{status.totalLogs}건</p>
              )}
            </div>
            <div className='flex flex-col min-w-[23.5%] items-center justify-center gap-2 bg-[#ebecef] dark:bg-[#262626]  rounded-lg p-2'>
              <p className='min-w-[55px] text-center text-[.8rem] font-bold'>송출 성공</p>
              {loading ? 
              <Skeleton className='h-[20px] w-[50px]' />
              : <p className='font-bold text-green-600 text-[1rem]'>{status.successCount}건</p>
            }
            </div>
            <div className='flex flex-col min-w-[23.5%] items-center justify-center gap-2 bg-[#ebecef] dark:bg-[#262626]  rounded-lg p-2'>
              <p className='min-w-[55px] text-center text-[.8rem] font-bold'>송출 실패</p>
              {loading ? (
                <Skeleton className='h-[20px] w-[50px]' />
              ) : (
                <p className='font-bold text-red-600 text-[1rem]'>{status.failureCount}건</p>
              )}
            </div>
            <div className='flex flex-col min-w-[23.5%] items-center justify-center gap-2 bg-[#ebecef] dark:bg-[#262626]  rounded-lg p-2'>
              <p className='min-w-[60px] text-center text-[.8rem] font-bold'>송출 성공률</p>
              {loading ? (
                <Skeleton className='h-[20px] w-[50px]' />
              ) : (
                <p className='font-bold text-[1rem]'>{status.successRate}%</p>
              )}
            </div>
          </div> 
    </div>
  )
}

export default BroadcastTransmissionStatus






