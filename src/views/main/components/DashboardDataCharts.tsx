import CustomDatePicker from '@/components/common/customDatePicker';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import EventsByAckDashboard from './EventsByAckDashboard';
import EventsByImportanceDashboard from './EventsByImportanceDashboard';
import EventsBySOPDashboard from './EventsBySOPDashboard ';
import EventsByDeviceDashboard from './EventsByDeviceDashboard';
import EventsByEventNameDashboard from './EventsByEventNameDashboard';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

type Dates = { startDate: Date | null; endDate: Date | null; }

export default function DashboardDataCharts() {
  const { socketService } = useSocketConnection();
  const startDateRef = useRef<Date | null>(null);
  const endDateRef = useRef<Date | null>(null);
  const [startDateState, setStartDateState] = useState<Date | null>(dayjs().subtract(1, 'day').toDate());
  const [endDateState, setEndDateState] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setendDate] = useState<string>('');

  const changeFormat = (date: Date): string => {

    const eventDate = dayjs(date).format('YYYYMMDD');
    const eventTime = dayjs(date).format('HHmmss');
    if (date == null) {
      return '';
    };
    return `${eventDate}T${eventTime}`;
  };

  const handleChangeDate = (dates: Dates) => {
    const { startDate, endDate } = dates;
    setStartDateState(startDate);
    setEndDateState(endDate);
    if (startDate == null || endDate == null) {
      return;
    }
    setStartDate(changeFormat(startDate));
    setendDate(changeFormat(endDate));
  };

  useEffect(() => {
    startDateRef.current = startDateState;
  }, [startDateState]);

  useEffect(() => {
    endDateRef.current = endDateState;
  }, [endDateState]);

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventsSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList?.update || received.eventList?.create?.idx) {
        setEndDateState(new Date());
      }
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);


  return (
    <div className={'bg-white h-full dark:bg-[#262626] rounded-md py-1.5 px-2.5'}>
      <div>
        <h5 className='text-[1.01rem] text-[#505050] pl-2'>데이터 차트</h5>
        <div className='w-[54.0625rem ] bg-[#616A79] h-[2px] mt-1 mx-auto' />
      </div>
      <div className='flex justify-end'>
        <CustomDatePicker
          title={{
            text: "조회 기간 설정",
            className: "ml-1 text-[#A1A1AA] text-[0.65rem] dark:text-[#FFFFFF]",
          }}
          startDate={startDateState}
          endDate={endDateState}
          className='rounded-sm bg-[#EBECEF] my-2 dark:bg-[#2D2E2F] w-[20.2rem] h-[1.5rem] flex items-center'
          width={110}
          height={20}
          fontSize={9.6}
          onChange={handleChangeDate}
        />
      </div>
      <div className='flex justify-around mb-2.5'>
        <EventsByImportanceDashboard
          startDate={startDate || changeFormat(startDateState!)}
          endDate={endDate || changeFormat(endDateState!)}
        />
        <EventsByAckDashboard
          startDate={startDate || changeFormat(startDateState!)}
          endDate={endDate || changeFormat(endDateState!)}
        />
        <EventsBySOPDashboard
          startDate={startDate || changeFormat(startDateState!)}
          endDate={endDate || changeFormat(endDateState!)}
        />
      </div>
      <div className={'h-full flex p-2 items-center'}>
        <EventsByDeviceDashboard
          startDate={startDate || changeFormat(startDateState!)}
          endDate={endDate || changeFormat(endDateState!)}
        />
        <EventsByEventNameDashboard
          startDate={startDate || changeFormat(startDateState!)}
          endDate={endDate || changeFormat(endDateState!)}
        />
      </div>
    </div>
  );

}