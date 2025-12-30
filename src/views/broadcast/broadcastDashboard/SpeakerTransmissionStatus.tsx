
import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { BiBorderRadius } from 'react-icons/bi';
import { getBroadcastTransmissionStatus } from '@/services/BroadcastService';
import dayjs from 'dayjs';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { useBroadcastArea, useBroadcastSpeakerList } from '@/utils/hooks/useBroadcast';
import { BroadcastAreaResponse } from '@/@types/broadcast';

type SpeakerTransmissionStatusProps = {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  siteId: string[];
};  

const SpeakerTransmissionStatus = ({ dateRange, siteId }: SpeakerTransmissionStatusProps) => {
  const [status, setStatus] = useState<{
    totalLogs: number,
    successCount: number,
    failureCount: number
  }>({
    totalLogs: 0,
    successCount: 0,
    failureCount: 0
  });
  const {speakerList ,mutate: getSpeaker} = useBroadcastSpeakerList()

  useEffect(() => {
    getSpeaker()
  }, [speakerList])

  useEffect(() => {

    const fetchData = async () => {
      const res = await getBroadcastTransmissionStatus({
        siteId: siteId[0],
        start: dayjs(dateRange?.startDate).format('YYYY-MM-DD'),
        end: dayjs(dateRange?.endDate).format('YYYY-MM-DD')
      });

      if (res.message === 'ok') {
        setStatus(res.result);
      }

    };

    fetchData();

  }, [dateRange, siteId]);

  const chartData = {
    categories: speakerList?.result.map(speaker => speaker.speaker_name) || ["스피커"], 
    series: [
      {
        name: "전체",
        data: speakerList?.result.map(speaker => speaker.speaker_status === 'ON' ? status.totalLogs : 0) || [status.totalLogs]
      },
      {
        name: "성공",
        data: speakerList?.result.map(speaker => speaker.speaker_status === 'ON' ? status.successCount : 0) || [status.successCount]
      },
      {
        name: "실패", 
        data: speakerList?.result.map(speaker => speaker.speaker_status === 'ON' ? status.failureCount : 0) || [status.failureCount]
      }
    ]
  };

  const options = {
    chart: {
      type: "bar",
      stacked: false, 
      toolbar:{
        show: false
      }
    },
    plotOptions: {
      bar: {
        horizontal: false, 
        columnWidth: "30%", // 바 너비 설정
        borderRadius: 2
      }
    },
    dataLabels: {
      enabled: true 
    },
    xaxis: {
      categories: chartData.categories, 
    },
    colors: ["#616a79", "#8699c6", "#d76767"], 
    legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
            colors: '#666'
        },
        fontFamily: 'monaco'
    },
    tooltip: {
        enabled: false
    }
  };

  return (
    <div className='h-full w-full flex flex-col'>
      <p className="h-[10%] bg-white dark:bg-[#262626] p-2 rounded-lg mb-2 font-bold flex items-center">스피커 송출 현황</p>
      <div className='flex flex-1 w-full'>
        <div className='min-h-[95%] w-full bg-white dark:bg-[#262626] rounded-lg'>
         <Chart options={options} series={chartData.series} type="bar" height="95%" width="100%" />
        </div>
        </div>
    </div>
  )
}

export default SpeakerTransmissionStatus




