import { useEffect, useState } from 'react';
import { apiEventsGroupByAck } from '@/services/ObserverService';
import SimpleDonut from './SimpleDonut';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

export type EventsDataByAck = {
  is_acknowledge: boolean;
  ack_per_count: string;
};

const colors = ['#58B850', '#DC676B'];
const labels = ['확인', '미확인'];

type Props = {
  startDate: string;
  endDate: string;
}

export default function EventsByAckDashboard({ startDate, endDate }: Props) {
  const { socketService } = useSocketConnection();

  const [data, setData] = useState<EventsDataByAck[]>([
    { is_acknowledge: true, ack_per_count: '0' },
    { is_acknowledge: false, ack_per_count: '0' }
  ]);

  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByAck<EventsDataByAck>(startDate, endDate);
    if (!result.result) {
      return;
    };
    setData((prevData) => prevData.map((prevDataItem) => {
      const updateData = result.result.find((resultItem) => resultItem.is_acknowledge === prevDataItem.is_acknowledge);
      if (updateData) {
        return updateData
      } else {
        return {
          ...prevDataItem,
          ack_per_count: '0'
        }
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
      if (received.eventList.update || (received.eventList?.create && startDate && endDate)) {
        getEvents(startDate, endDate);
      };
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);


  const totalEventCount = data.reduce((prev, dataItem) => prev + parseInt(dataItem.ack_per_count), 0);

  return (
    <section className='flex flex-col w-[17.5rem] h-[24rem] rounded-[3px] bg-[#EBECEF] dark:bg-[#313233] mx-auto p-2 justify-around'>
      <div className='w-[16.25rem] h-[1.625rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637]'>
        <p className='text-sm text-[#505050] dark:text-[#F5F5F5] pl-3 font-semibold'>확인/미확인 이벤트</p>
      </div>
      <div className='bg-white dark:bg-[#353637] w-[16.25rem] h-[6.25rem] p-1.5'>
        <div className='flex justify-between bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm w-[15.625rem] h-[1.75rem] items-center mb-1.5 p-1'>
          <p className='text-[#647DB7] font-semibold text-center w-1/2'>전체</p>
          <span className='text-[19px] text-[#505050] dark:text-[#F5F5F5] flex justify-center items-center w-1/2 h-[1.25rem] rounded-sm bg-white dark:bg-[#313233]'>{totalEventCount}</span>
        </div>
        <div className='flex justify-between text-[#505050]'>
          <div className='w-[7.375rem] h-[3.625rem] bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm flex items-center text-center p-1'>
            <p className='w-1/2 text-[1.02rem] dark:text-[#F3F3F3]'>확인</p>
            <span className='w-1/2 bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm h-full flex items-center justify-center font-semibold'>{data[0].ack_per_count}</span>
          </div>
          <div className='w-[7.375rem] h-[3.625rem] bg-[#EBECEF] dark:bg-[#2D2E2F] rounded-sm flex items-center text-center p-1'>
            <p className='w-1/2 text-[1.02rem] dark:text-[#F3F3F3]'>미확인</p>
            <span className='w-1/2 bg-white dark:bg-[#313233] dark:text-[#F5F5F5] rounded-sm h-full flex items-center justify-center font-semibold'>{data[1].ack_per_count}</span>
          </div>
        </div>
      </div>
      <div className='bg-white dark:bg-[#353637] rounded-md py-2 w-[16.25rem] h-[14rem] flex items-center'>
        <SimpleDonut colors={colors} data={data} width={275} height={224} labels={labels} />
      </div>
    </section>
  );

}