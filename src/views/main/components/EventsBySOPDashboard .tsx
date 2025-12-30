import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import SimpleDonut from './SimpleDonut';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEventsBySOP } from '@/utils/hooks/main/useEventsBySOP';
import Loading from '@/components/shared/Loading';

let colors = ['#DC676B', '#58B850'];
let labels = ['오탐', '정탐'];

type Props = {
  startDate: string;
  endDate: string;
};

export type EventsDataBySOP = {
  false_alarm_group: 'NULL' | 'NOT NULL';
  count: string;
}

export default function EventsBySOPDashboard({ startDate, endDate }: Props) {
  const { socketService } = useSocketConnection();
  const { eventsBySOP, mutate, isLoading, error } = useEventsBySOP({ startDate, endDate });
  const eventsBySOPData = eventsBySOP?.result?.length === 0 ? [
    {
      false_alarm_group: 'NULL',
      count: '0'
    },
    {
      false_alarm_group: 'NOT NULL',
      count: '0'
    }
  ] : eventsBySOP?.result;
  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventsSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList?.update != null) {
        mutate();
      }
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);
  const totalEventCount = eventsBySOPData && Array.isArray(eventsBySOPData) && eventsBySOPData.reduce((prev, dataItem) => prev + parseInt(dataItem.count), 0);
  const truePositiveCount = eventsBySOPData && Array.isArray(eventsBySOPData) && eventsBySOPData.filter((event) => event.false_alarm_group === 'NULL')[0]?.count || 0;
  const falseAlarmCount = eventsBySOPData && Array.isArray(eventsBySOPData) && eventsBySOPData.filter((event) => event.false_alarm_group === 'NOT NULL')[0]?.count || 0;
  const setLabels = eventsBySOPData?.length === 1 ? [labels[eventsBySOPData[0].false_alarm_group === 'NOT NULL' ? 0 : 1]] : labels;
  const setColors = eventsBySOPData?.length === 1 ? [colors[eventsBySOPData[0].false_alarm_group === 'NOT NULL' ? 0 : 1]] : colors;
  return (
    <section className='flex flex-col w-[17.5rem] h-[24rem] rounded-[3px] bg-[#EBECEF] dark:bg-[#313233] mx-auto p-2 justify-around'>
      <div className='w-[16.25rem] h-[1.625rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637]'>
        <p className='text-sm text-[#505050] dark:text-[#F5F5F5] pl-3 font-semibold'>정탐/오탐 비율</p>
      </div>
      <div className='bg-white dark:bg-[#353637] w-[16.25rem] h-[6.25rem] p-1.5'>
        <div className='flex justify-between bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm w-[15.625rem] h-[1.75rem] items-center mb-1.5 p-1'>
          <p className='text-[#647DB7] font-semibold text-center w-1/2'>전체</p>
          <span className='text-[19px] text-[#505050] dark:text-[#F5F5F5] flex justify-center items-center w-1/2 h-[1.25rem] rounded-sm bg-white dark:bg-[#313233]'>{totalEventCount}</span>
        </div>
        <div className='flex justify-between text-[#505050]'>
          <div className='w-[7.375rem] h-[3.625rem] bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm flex items-center text-center p-1'>
            <p className='w-1/2 text-[1.02rem] dark:text-[#F3F3F3]'>정탐</p>
            <span className='w-1/2 bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm h-full flex items-center justify-center font-semibold'>{truePositiveCount}</span>
          </div>
          <div className='w-[7.375rem] h-[3.625rem] bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm flex items-center text-center p-1'>
            <p className='w-1/2 text-[1.02rem] dark:text-[#F3F3F3]'>오탐</p>
            <span className='w-1/2 bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm h-full flex items-center justify-center font-semibold'>{falseAlarmCount}</span>
          </div>
        </div>
      </div>
      <div className='bg-white dark:bg-[#353637] rounded-md py-2 w-[16.25rem] h-[14rem] flex items-center justify-center'>
        {isLoading && (<Loading loading={isLoading} />)}
        {eventsBySOPData && Array.isArray(eventsBySOPData) && <SimpleDonut colors={setColors} data={eventsBySOPData} width={275} height={224} labels={setLabels} />}
      </div>
    </section>
  );

}