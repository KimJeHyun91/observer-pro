import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import CustomDatePicker from '@/components/common/customDatePicker';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import BarChart from '../util/ui/chart/BarChart';
import { apiEventsGroupByDevice } from '@/services/ObserverService';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useServiceNavStore } from '@/store/serviceNavStore';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';

type Dates = { startDate: Date | null; endDate: Date | null; }

export type EventsData = {
  device_type: string;
  device_type_per_count: string;
};

export type BarData = {
  name: string;
  data: number[]
};

const categories = ['발생 건수'];

export default function EventsByDevice() {
  const { socketService } = useSocketConnection();
  const { buildingIdx } = useCanvasMapStore();
  const { use } = useServiceNavStore();
  const { isFullscreen } = useFullScreenStore();
  const startDateRef = useRef<Date | null>(null);
  const endDateRef = useRef<Date | null>(null);
  const [startDateState, setStartDateState] = useState<Date | null>(dayjs().subtract(1, 'day').toDate());
  const [endDateState, setEndDateState] = useState<Date | null>(new Date());
  const [data, setData] = useState<BarData[]>([
    { name: 'camera', data: [] },
    { name: 'door', data: [] },
    { name: 'ebell', data: [] },
    { name: 'guardianlite', data: [] },
    { name: 'pids', data: [] },
    { name: 'vms', data: [] },
  ]);


  const changeFormat = (date: Date) => {

    const eventDate = dayjs(date).format('YYYYMMDD');
    const eventTime = dayjs(date).format('HHmmss');
    if (date == null) {
      return;
    };
    return `${eventDate}T${eventTime}`;
  };

  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByDevice<EventsData>(startDate, endDate, buildingIdx);
    if (!result.result) {
      return;
    }
    if (result.result.length === 0) {
      setData([
        { name: 'camera', data: [] },
        { name: 'door', data: [] },
        { name: 'ebell', data: [] },
        { name: 'guardianlite', data: [] },
        { name: 'pids', data: [] },
        { name: 'vms', data: [] },
      ]);
    };
    setData((prevData) => prevData.map((prevDataItem) => {
      const updateData = result.result.find((resultItem) => resultItem.device_type === prevDataItem.name)
      if (updateData) {
        return {
          name: updateData.device_type,
          data: [parseInt(updateData.device_type_per_count)]
        }
      } else {
        return prevDataItem
      };
    }));
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

  const changeDeviceTypeKorean = (deviceType: string) => {
    switch (deviceType) {
      case 'camera':
        return '카메라';
        break;
      case 'door':
        return '출입문';
        break;
      case 'ebell':
        return '비상벨';
        break;
      case 'guardianlite':
        return '가디언라이트';
        break;
      case 'pids':
        return 'PIDS';
        break;
      case 'vms':
        return 'VMS';
        break;
      default:
        throw new Error(`unKnown device type: ${deviceType}`);
    }
  }

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
    <section className={'w-[39.25rem] h-full bg-[#EBECEF] dark:bg-[#292A2C] rounded-[3px] pb-2'}>
      <h6 className='text-sm pl-3 flex items-center mt-1.5'>장치별 이벤트</h6>
      <div className='w-[38.5rem] h-0.5 relative bg-[#616A79] my-1 -right-1.5' />
      <CustomDatePicker
        title={{
          text: "조회 기간 설정",
          className: "ml-1 text-[#716E6E] text-[0.65rem] dark:text-[#FFFFFF] h-[1.125rem] p-0.5",
        }}
        fontSize={9.5}
        startDate={startDateState}
        endDate={endDateState}
        className='rounded mb-1 w-full mx-auto flex justify-end mr-2 pt-0'
        width={110}
        height={20}
        onChange={handleChangeDate}
      />
      <div className='bg-white dark:bg-[#313233] mx-2 h-[calc(100%-4rem)]'>
        <BarChart
          categories={categories}
          columnWidth='50%'
          tooltipFormatter='건'
          height={use ? isFullscreen ? 205 : 165 : isFullscreen ? 235 : 200}
          data={data.map((data) => ({ ...data, name: changeDeviceTypeKorean(data.name) }))}
          legend={true}
        />
      </div>
    </section>
  );
}