import { useEffect, useRef, useState } from 'react';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import BarChart from '../util/ui/chart/BarChart';
import { apiEventsGroupByDevice } from '@/services/ObserverService';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';

export type EventsData = {
  device_type: string;
  device_type_per_count: string;
};

export type BarData = {
  name: string;
  data: number[]
};

const categories = ['발생 건수'];

type Props = {
  startDate: string;
  endDate: string;
}

export default function EventsByDeviceDashboard({ startDate, endDate }: Props) {
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const divRef = useRef<HTMLDivElement | null>(null);
  const [divHeight, setDivHeight] = useState('auto');
  const [data, setData] = useState<BarData[]>([
    { name: 'camera', data: [] },
    { name: 'door', data: [] },
    { name: 'ebell', data: [] },
    { name: 'guardianlite', data: [] },
    { name: 'pids', data: [] },
    { name: 'vms', data: [] }
  ]);

  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByDevice<EventsData>(startDate, endDate);
    if (!result.result) {
      return;
    }
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
    };
  };

  const updateHeight = () => {
    const wrapper = divRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - rect.top - 32;
    if (availableHeight > 0) {
      setDivHeight(`${availableHeight}px`);
    };
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

  useEffect(() => {
    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    const mutationObserver = new MutationObserver(() => {
      updateHeight();
    });

    const div = divRef.current;
    if (div) {
      resizeObserver.observe(document.body);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 300); // fallback 강제 적용 (DOM 안정화 이후)

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [isFullscreen]);
  if (divHeight !== 'auto') {
    return (
      <section className={`w-1/2 h-full bg-[#EBECEF] dark:bg-[#313233] rounded-[3px] p-2 self-center`}>
        <div className='w-[25.375rem] h-[1.75rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637] mx-auto'>
          <p className='text-sm text-[#505050] dark:text-[#F3F3F3] pl-3 font-semibold'>장치별 이벤트</p>
        </div>
        <div
          ref={divRef}
          className={`bg-white dark:bg-[#353637] mx-auto mt-2 w-[25.375rem] scroll-container overflow-x-hidden overflow-y-auto h-full`}
          style={{
            height: divHeight
          }}
        >
          <BarChart
            categories={categories}
            columnWidth='50%'
            tooltipFormatter='건'
            height={isFullscreen ? 390 : parseInt(divHeight.substring(-2)) - 6}
            data={data.map((data) => ({ ...data, name: changeDeviceTypeKorean(data.name) }))}
            legend={true}
          />
        </div>
      </section>
    );
  } else {
    return (
      <section className={`w-1/2 h-full bg-[#EBECEF] dark:bg-[#313233] rounded-[3px] p-2 self-center`}>
        <div className='w-[25.375rem] h-[1.75rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637] mx-auto'>
          <p className='text-sm text-[#505050] dark:text-[#F3F3F3] pl-3 font-semibold'>장치별 이벤트</p>
        </div>
        <div
          ref={divRef}
          className={`bg-white dark:bg-[#353637] mx-auto mt-2 w-[25.375rem] scroll-container overflow-x-hidden overflow-y-auto h-full`}
          style={{
            height: divHeight
          }}
        >
          <BarChart
            categories={categories}
            columnWidth='50%'
            tooltipFormatter='건'
            height={isFullscreen ? 390 : 263}
            data={data.map((data) => ({ ...data, name: changeDeviceTypeKorean(data.name) }))}
            legend={true}
          />
        </div>
      </section>
    );
  }
}