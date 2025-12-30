import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import CustomDatePicker from '@/components/common/customDatePicker';
import { apiEventsGroupByImportance } from '@/services/ObserverService';
import SimpleDonut from './SimpleDonut';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { EventsDataByImportance } from '@/@types/event';

type Dates = { startDate: Date | null; endDate: Date | null; }

const colors = ['#BEC3CC', '#58B850', '#E3C726', '#DC676B'];
const labels = ['info', 'minor', 'major', 'critical'];

export default function EventsByImportance() {
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const startDateRef = useRef<Date | null>(null);
  const endDateRef = useRef<Date | null>(null);
  const [startDateState, setStartDateState] = useState<Date | null>(dayjs().subtract(1, 'day').toDate());
  const [endDateState, setEndDateState] = useState<Date | null>(new Date());

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
    }
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

  const changeFormat = (date: Date) => {

    const eventDate = dayjs(date).format('YYYYMMDD');
    const eventTime = dayjs(date).format('HHmmss');
    if (date == null) {
      return;
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
    const startDateStr = changeFormat(startDate);
    const endDateStr = changeFormat(endDate);
    getEvents(startDateStr, endDateStr);
  };

  useEffect(() => {
    handleChangeDate({ startDate: startDateState, endDate: endDateState });
  }, [])

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventsSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList?.create && startDateRef.current && endDateRef.current) {
        const startDateStr = changeFormat(startDateRef.current);
        const endDateStr = changeFormat(endDateRef.current);
        getEvents(startDateStr, endDateStr);
      }
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  useEffect(() => {
    startDateRef.current = startDateState;
  }, [startDateState]);

  useEffect(() => {
    endDateRef.current = endDateState;
  }, [endDateState]);

  return (
    <section className='h-1/3 w-[20.5rem] dark:bg-[#262626] rounded-sm flex flex-col justify-evenly'>
      <div>
        <h3 className='text-[1.02rem] font-semibold pl-2 pt-1'>중요도별 이벤트 발생 건수</h3>
        <div className='w-[11/12] bg-[#616A79] h-[2px] m-1' />
        <CustomDatePicker
          title={{
            text: "기간 설정",
            className: "ml-1 text-[#A1A1AA] text-[0.65rem] dark:text-[#FFFFFF]",
          }}
          startDate={startDateState}
          endDate={endDateState}
          className='rounded bg-[#EBECEF] dark:bg-[#262626] mt-2 w-[95%] mx-auto flex justify-between'
          width={110}
          height={20}
          fontSize={9.6}
          onChange={handleChangeDate}
        />
      </div>
      <div className='bg-[#EBECEF] dark:bg-[#313233] m-2 rounded-md py-2 h-full'>
        <SimpleDonut
          colors={colors}
          data={data}
          labels={labels}
          height={isFullscreen ? 220 : 150}
        />
      </div>
    </section>
  );

}