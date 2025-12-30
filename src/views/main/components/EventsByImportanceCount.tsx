import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
import { apiEventsGroupByImportance } from '@/services/ObserverService';
import dayjs from 'dayjs';

type Dates = { startDate: Date | null; endDate: Date | null; }
type EventsData = {
  label: string;
  severity_id: 0 | 1 | 2 | 3;
  severity_per_count: string;
}

const colors = ['#BEC3CC', '#58B850', '#E3C726', '#DC676B'];

export default function EventsByImportanceCount() {
  const { socketService } = useSocketConnection();
  const [data, setData] = useState<EventsData[]>([
    { severity_id: 0, label: 'info', severity_per_count: '0' },
    { severity_id: 1, label: 'minor', severity_per_count: '0' },
    { severity_id: 2, label: 'major', severity_per_count: '0' },
    { severity_id: 3, label: 'critical', severity_per_count: '0' }
  ]);

  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByImportance<EventsData>(startDate, endDate);
    if (!result.result) {
      return;
    }
    setData((prevData) => prevData.map((prevDataItem) => {
      const updateData = result.result.find((resultItem) => resultItem.severity_id === prevDataItem.severity_id)
      if (updateData) {
        return {
          ...prevDataItem,
          severity_per_count: updateData.severity_per_count
        }
      } else {
        return {
          ...prevDataItem,
          severity_id: prevDataItem.severity_id,
          severity_per_count: '0'
        }
      }
    }))
  }

  const changeFormat = (date: Date) => {

    const eventDate = dayjs(date).format('YYYYMMDD');
    const eventTime = dayjs(date).format('HHmmss');
    if (date == null) {
      return;
    }
    return `${eventDate}T${eventTime}`;
  }

  const handleChangeDate = (dates: Dates) => {
    const { startDate, endDate } = dates;
    if (startDate == null || endDate == null) {
      return;
    }
    const startDateStr = changeFormat(startDate);
    const endDateStr = changeFormat(endDate);
    getEvents(startDateStr, endDateStr);
  }

  useEffect(() => {
    handleChangeDate({ startDate: dayjs().subtract(1, 'day').toDate(), endDate: new Date() });
  }, []);

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventsSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList?.create) {
        handleChangeDate({ startDate: dayjs().subtract(1, 'day').toDate(), endDate: new Date() });
      }
    });
    return () => {
      eventsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <div className='w-[28.9375rem] flex bg-[#EBECEF] dark:bg-[#222222] rounded-md h-[1.875rem] items-center justify-around'>
      <p className='text-black dark:text-[#9E9E9E] font-bold'>현황</p>
      <ul className='flex justify-around gap-x-3'>
        {data.map((importance) => (
          <li
            key={importance.severity_id}
            className='flex w-[5.8125rem] h-[1.375rem] bg-white dark:bg-[#4D4D4D] rounded-sm justify-around'
          >
            <p
              className='font-semibold'
              style={{
                color: colors[importance.severity_id]
              }}
            >
              {importance.label}
            </p>
            <p className='font-semibold dark:text-[#E8E8E8]'>{importance.severity_per_count}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}