import { useEffect, useRef, useState } from 'react';
import CustomDatePicker from '@/components/common/customDatePicker';
import { apiEventsGroupByImportance } from '@/services/ObserverService';
import SimpleDonut from './SimpleDonut';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import dayjs from 'dayjs';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { useServiceNavStore } from '@/store/serviceNavStore';
import { EventsDataByImportance } from '@/@types/event';

type Dates = { startDate: Date | null; endDate: Date | null; }

const colors = ['#BEC3CC', '#58B850', '#E3C726', '#DC676B'];
const labels = ['info', 'minor', 'major', 'critical'];

export default function EventsByImportanceBuildingDashboard() {
  const { socketService } = useSocketConnection();
  const { buildingIdx } = useCanvasMapStore();
  const { isFullscreen } = useFullScreenStore();
  const { use } = useServiceNavStore();
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
    const result = await apiEventsGroupByImportance<EventsDataByImportance>(startDate, endDate, buildingIdx);
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
    };
    const startDateStr = changeFormat(startDate);
    const endDateStr = changeFormat(endDate);
    getEvents(startDateStr, endDateStr);
  };

  const chartHeight = () => {
    if (use) {
      return isFullscreen ? {
        box: 'h-[calc(100%-5.35rem)]',
        chart: 190
      } : {
        box: 'h-[calc(100%-5.35rem)]',
        chart: 150
      };
    } else {
      return isFullscreen ? {
        box: 'h-[calc(100%-5.35rem)]',
        chart: 220
      } : {
        box: 'h-[calc(100%-5.35rem)]',
        chart: 180
      };
    };
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

  useEffect(() => {
    if (buildingIdx != null && startDateRef.current && endDateRef.current) {
      const startDateStr = changeFormat(startDateRef.current);
      const endDateStr = changeFormat(endDateRef.current);
      getEvents(startDateStr, endDateStr);
    };
  }, [buildingIdx]);

  return (
    <section className='w-[19.25rem] h-full bg-[#EBECEF] dark:bg-[#292A2C] rounded-[3px]'>
      <h6 className='text-sm pl-3 flex items-center mt-1.5'>이벤트 중요도별 발생 건수</h6>
      <div className='w-[97%] h-0.5 relative bg-[#616A79] my-1 -right-1.5' />
      <CustomDatePicker
        title={{
          text: "조회 기간 설정",
          className: "text-[#716E6E] text-[0.5rem] dark:text-[#FFFFFF] h-[1.125rem] p-0.5",
        }}
        startDate={startDateState}
        endDate={endDateState}
        className='rounded bg-[#EBECEF] mt-2 dark:bg-[#313233] w-[95%] mx-auto flex justify-between'
        width={100}
        height={20}
        fontSize={8.2}
        onChange={handleChangeDate}
      />
      <div className={`bg-white dark:bg-[#313233] m-2 rounded-md pt-2 pb-4 ${chartHeight().box}`}>
        <SimpleDonut
          colors={colors}
          data={data}
          height={chartHeight().chart}
          labels={labels}
        />
      </div>
    </section>
  );

}