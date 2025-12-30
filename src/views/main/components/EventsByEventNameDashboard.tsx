import { useEffect, useRef, useState } from 'react';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import BarChart from '../util/ui/chart/BarChart';
import { apiEventsGroupByEventName } from '@/services/ObserverService';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { useEventTypeList } from '@/utils/hooks/useEventTypes';

export type EventsData = {
  event_name: string;
  event_name_per_count: string;
};

export type BarData = {
  name: string;
  data: number[]
};

const categories = ['발생 건수'];

type Props = {
  startDate: string;
  endDate: string;
};

type EventType = {
  event_type_id: number;
  event_type: string;
  service_type: string;
  use_warning_board: boolean;
  use_popup: boolean;
  use_sop: boolean;
  use_event_type: boolean;
  use_severity_id: 0 | 1 | 2 | 3;
  use_severity: 'info' | 'minor' | 'major' | 'critical';
  use_severity_color: 'gray' | 'green' | 'yellow' | 'red';
  sop_idx: number;
};

export default function EventsByEventNameDashboard({ startDate, endDate }: Props) {
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const { eventTypeList } = useEventTypeList();
  const divRef = useRef<HTMLDivElement | null>(null);
  const [divHeight, setDivHeight] = useState('auto');
  const [data, setData] = useState<BarData[]>(eventTypeList?.result.map((eventType: EventType) => ({ name: eventType.event_type, data: [] })) || []);
  const getEvents = async (startDate?: string, endDate?: string) => {
    const result = await apiEventsGroupByEventName<EventsData>(startDate, endDate);
    if (!result.result || data.length === 0) {
      return;
    }
    setData((prevData) => prevData.map((prevDataItem) => {
      const updateData = result.result.find((resultItem) => resultItem.event_name === prevDataItem.name)
      if (updateData) {
        return {
          name: updateData.event_name,
          data: [parseInt(updateData.event_name_per_count)]
        }
      } else {
        return prevDataItem
      };
    }));
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
    if (eventTypeList?.result) {
      setData(eventTypeList.result.map((eventType: EventType) => ({ name: eventType.event_type, data: [] })));
    }
  }, [eventTypeList?.result]);

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
          <p className='text-sm text-[#505050] dark:text-[#F5F5F5] pl-3 font-semibold'>이벤트별 건수</p>
        </div>
        <div
          ref={divRef}
          className={`bg-white dark:bg-[#353637] mx-auto mt-2 w-[25.375rem] scroll-container overflow-x-hidden overflow-y-auto ${isFullscreen ? 'h-[25.625rem]' : ''}`}
          style={{
            height: divHeight
          }}
        >
          <BarChart
            categories={categories}
            columnWidth='30%'
            tooltipFormatter='건'
            // height={isFullscreen ? 412 : 285}
            height={isFullscreen ? 390 : parseInt(divHeight.substring(-2)) - 6}
            data={data}
            legend={false}
          />
        </div>
      </section>
    );
  } else {
    return (
      <section className={`w-1/2 h-full bg-[#EBECEF] dark:bg-[#313233] rounded-[3px] p-2 self-center`}>
        <div className='w-[25.375rem] h-[1.75rem] flex items-center rounded-sm bg-[#FFFFFF] dark:bg-[#353637] mx-auto'>
          <p className='text-sm text-[#505050] dark:text-[#F5F5F5] pl-3 font-semibold'>이벤트별 건수</p>
        </div>
        <div
          className={`bg-white dark:bg-[#353637] mx-auto mt-2 w-[25.375rem] scroll-container overflow-x-hidden overflow-y-auto ${isFullscreen ? 'h-[25.625rem]' : ''}`}
          ref={divRef}
          style={{
            height: divHeight
          }}
        >
          <BarChart
            categories={categories}
            columnWidth='30%'
            tooltipFormatter='건'
            height={isFullscreen ? 390 : 263}
            data={data}
            legend={false}
          />
        </div>
      </section>
    );
  }

}