import { useEffect, useState } from 'react';
import { apiEventsGroupByImportance } from '@/services/ObserverService';
import SimpleDonut from './SimpleDonut';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { EventsDataByImportance } from '@/@types/event';

const colors = ['#BEC3CC', '#58B850', '#E3C726', '#DC676B'];
const labels = ['info', 'minor', 'major', 'critical'];

type Props = {
  startDate: string;
  endDate: string;
}

export default function EventsByImportanceDashboard({ startDate, endDate }: Props) {
  const { socketService } = useSocketConnection();

  const [data, setData] = useState<EventsDataByImportance[]>([
    { severity_id: 0, severity_per_count: '0' },
    { severity_id: 1, severity_per_count: '0' },
    { severity_id: 2, severity_per_count: '0' },
    { severity_id: 3, severity_per_count: '0' }
  ]);

  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByImportance<EventsDataByImportance>(startDate, endDate);
    if (!result.result) {
      return;
    };
    setData((prevData) => prevData.map((prevDataItem) => {
      const updateData = result.result.find((resultItem) => resultItem.severity_id === prevDataItem.severity_id)
      if (updateData) {
        return updateData
      } else {
        return {
          severity_id: prevDataItem.severity_id,
          severity_per_count: '0'
        };
      };
    }));
  };

  useEffect(() => {
    if (startDate && endDate) {
      getEvents(startDate, endDate);
    };
  }, [startDate, endDate])

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventsSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList?.create && startDate && endDate) {
        getEvents(startDate, endDate);
      }
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  const setSeverityKorean = (severityId: 0 | 1 | 2 | 3) => {
    switch (severityId) {
      case 0:
        return 'info';
        break;
      case 1:
        return 'minor';
        break;
      case 2:
        return 'major';
        break;
      case 3:
        return 'critical';
        break;
      default:
        throw new Error(`unKnown severity id: ${severityId}`);
    }
  }

  const totalEventCount = data.reduce((prev, dataItem) => prev + parseInt(dataItem.severity_per_count), 0);

  return (
    <section className='flex flex-col w-[17.5rem] h-[24rem] rounded-[3px] bg-[#EBECEF] dark:bg-[#313233] mx-auto p-2 justify-around'>
      <div className='w-[16.25rem] h-[1.625rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637]'>
        <p className='text-sm text-[#505050] pl-3 font-semibold dark:text-[#F5F5F5]'>이벤트 중요도별 발생 건수</p>
      </div>
      <div className='bg-white dark:bg-[#353637] w-[16.25rem] h-[6.25rem] p-1.5'>
        <div className='flex justify-between bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm w-[15.625rem] h-[1.75rem] items-center mb-1.5 p-1'>
          <p className='text-[#647DB7] font-semibold text-center w-1/2'>전체</p>
          <span className='text-[19px] text-[#505050] dark:text-[#F5F5F5] flex justify-center items-center w-1/2 h-[1.25rem] rounded-sm bg-white dark:bg-[#313233]'>{totalEventCount}</span>
        </div>
        <div className='flex flex-col gap-1'>
          <div className='flex justify-between'>
            <span
              key={data[0].severity_id}
              className='w-[7.375rem] h-[1.625rem] flex justify-between items-center bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm p-1'
            >
              <p className='font-semibold text-[#505050] dark:text-[#F3F3F3] w-1/2 text-center'>{setSeverityKorean(data[0].severity_id)}</p>
              <span className='w-1/2 h-[1.25rem] bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm flex items-center justify-center'>{data[0].severity_per_count}</span>
            </span>
            <span
              key={data[1].severity_id}
              className='w-[7.375rem] h-[1.625rem] flex justify-between items-center bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm p-1'
            >
              <p className='font-semibold text-[#218043] w-1/2 text-center'>{setSeverityKorean(data[1].severity_id)}</p>
              <span className='w-1/2 h-[1.25rem] bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm flex items-center justify-center'>{data[1].severity_per_count}</span>
            </span>
          </div>
          <div className='flex justify-between'>
            <span
              key={data[2].severity_id}
              className='w-[7.375rem] h-[1.625rem] flex justify-between items-center bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm p-1'
            >
              <p className='font-semibold text-[#FDAC0B] w-1/2 text-center'>{setSeverityKorean(data[2].severity_id)}</p>
              <span className='w-1/2 h-[1.25rem] bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm flex items-center justify-center'>{data[2].severity_per_count}</span>
            </span>
            <span
              key={data[3].severity_id}
              className='w-[7.375rem] h-[1.625rem] flex justify-between items-center bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm p-1'
            >
              <p className='font-semibold text-[#DC676B] w-1/2 text-center'>{setSeverityKorean(data[3].severity_id)}</p>
              <span className='w-1/2 h-[1.25rem] bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm flex items-center justify-center'>{data[3].severity_per_count}</span>
            </span>
          </div>
        </div>
      </div>
      <div className='bg-white dark:bg-[#353637] rounded-md py-2 w-[16.25rem] h-[14rem] flex items-center'>
        <SimpleDonut colors={colors} data={data} width={275} height={224} labels={labels} fontSize='0.5rem' />
      </div>
    </section>
  );

}