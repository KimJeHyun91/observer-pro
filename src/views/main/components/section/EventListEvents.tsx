import { EventInfo } from '@/@types/main';
import Loading from '@/components/shared/Loading';
import { useEventList } from '@/utils/hooks/main/useEventList';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import EventListEventsDetail from './EventListEventsDetail';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { apiAckEvent } from '@/services/ObserverService';
import { useSessionUser } from '@/store/authStore';
import ModalConfirm from '../../modals/ModalConfirm';
import { ModalConfirmType, ModalNotifyType } from '@/@types/modal';
import ModalNotify from '../../modals/ModalNotify';
import EventListEventsDetailBuilding from './EventListEventsDetailBuilding';
import { useServiceNavStore } from '@/store/serviceNavStore';

type Props = {
  sort: string;
  filter: string;
  outsideIdx?: number;
};

export default function EventListEvents({ sort, filter, outsideIdx }: Props) {
  const { user: { userId } } = useSessionUser();
  const { use } = useServiceNavStore();
  const { socketService } = useSocketConnection();
  const { isLoading, data, mutate } = useEventList({ sort, filter, outsideIdx });
  const ulRef = useRef<HTMLUListElement | null>(null);
  const [ulHeight, setUlHeight] = useState('auto');
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [modalNotify, setModalNotify] = useState<ModalNotifyType>({
    show: false,
    title: ''
  });
  const [notifyMsg, setNotifyMsg] = useState<string>('');
  const events: EventInfo[] = data?.result || [];
  const unAckEvents = events.filter((event) => !event.is_acknowledge);

  const ackEventConfirm = async () => {
    if (userId == null || !events || events.length === 0) {
      return;
    };
    if (unAckEvents.length === 0) {
      setNotifyMsg('미확인 이벤트가 없습니다.');
      toggleModalNotify({
        show: true,
        title: '전체 이벤트 확인 실패'
      });
      return;
    }
    try {
      const result = await apiAckEvent({
        idxArray: unAckEvents.map((event) => ({ idx: event.idx })),
        userId,
        outsideIdx
      });
      if (result === 'OK') {
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        })
      };
    } catch (error) {
      console.error(error);
    };
  };

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const toggleModalNotify = ({ show, title }: ModalNotifyType) => {
    if (!show) {
      setNotifyMsg('');
    }
    setModalNotify({
      show,
      title
    });
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventListSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventList) {
        mutate();
      }
    });
    return () => {
      eventListSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  const updateHeight = () => {
    const ul = ulRef.current;
    if (!ul) return;
    const rect = ul.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - rect.top - (outsideIdx != null ? use ? 135 : 75 : 77);

    if (availableHeight > 0) {
      setUlHeight(`${availableHeight}px`);
    }
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    const mutationObserver = new MutationObserver(() => {
      updateHeight();
    });

    const ul = ulRef.current;
    if (ul) {
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
  }, []);

  useEffect(() => {
    updateHeight();
  }, [use, events])

  if (isLoading) {
    return (
      <Loading loading={isLoading} className='flex justify-center items-center' />
    )
  } else if (!events) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <p className='dark:text-[#F5F5F5]'>이벤트 데이터를 받아오지 못했습니다.</p>
      </div>
    )
  } else if (events && Array.isArray(events) && events.length > 0 && outsideIdx == null) {
    return (
      <section className='w-full dark:bg-[#272829] relative'>
        <ul
          ref={ulRef}
          className={
            'scroll-container overflow-x-hidden overflow-y-auto h-full ml-2 mr-1 gap-y-1 pr-1 my-2'
          }
          style={{
            height: ulHeight
          }}
        >
          {events.map((event) => (
            <li key={event.idx} className='mb-2' >
              <EventListEventsDetail event={event} />
            </li>
          ))}
        </ul>
        <div className='w-[19.625rem] bg-[#E0E0E0] h-[2px] m-auto mb-2' />
        <Button
          className='w-[19.625rem] h-full border-[1px] border-[#E0E0E0] border-solid ml-1.5'
          disabled={unAckEvents.length === 0}
          onClick={() => toggleModalConfirm({
            show: true,
            title: '전체 이벤트 확인',
            type: 'control'
          })}
        >
          전체 이벤트 확인 처리
        </Button>
        {modalConfirm.show && (
          <ModalConfirm
            modal={modalConfirm}
            toggle={toggleModalConfirm}
            confirm={ackEventConfirm}
          >
            <p>미확인 이벤트 전체를 확인 처리 하시겠습니까?</p>
          </ModalConfirm>
        )}
        {modalNotify.show && (
          <ModalNotify
            modal={modalNotify}
            toggle={toggleModalNotify}
          >
            <p>{notifyMsg}</p>
          </ModalNotify>
        )}
      </section>
    );
  } else if (events && Array.isArray(events) && events.length > 0 && outsideIdx) {
    return (
      <section className='w-full'>
        <ul
          ref={ulRef}
          className={'scroll-container overflow-x-hidden overflow-y-auto h-full ml-2 mr-0.5 pr-1 mt-2'}
          style={{
            height: ulHeight
          }}
        >
          {events.map((event) => (
            <li key={event.idx} className='mb-2' >
              <EventListEventsDetailBuilding event={event} />
            </li>
          ))}
        </ul>
        <div className='w-[21rem] bg-[#E0E0E0] h-[2px] my-1 relative ml-2.5' />
        <Button
          className='w-[21rem] h-full flex justify-center items-center border-[1px] border-[#E0E0E0] border-solid m-auto relative top-1'
          disabled={unAckEvents.length === 0}
          onClick={() => toggleModalConfirm({
            show: true,
            title: '전체 이벤트 확인',
            type: 'control'
          })}
        >
          전체 이벤트 확인 처리
        </Button>
        {modalConfirm.show && (
          <ModalConfirm
            modal={modalConfirm}
            toggle={toggleModalConfirm}
            confirm={ackEventConfirm}
          >
            <p>미확인 이벤트 전체를 확인 처리 하시겠습니까?</p>
          </ModalConfirm>
        )}
        {modalNotify.show && (
          <ModalNotify
            modal={modalNotify}
            toggle={toggleModalNotify}
          >
            <p>{notifyMsg}</p>
          </ModalNotify>
        )}
      </section>
    );
  } else if (events.length === 0) {
    return (
      <div className='w-full h-[calc(100%-4rem)] flex items-center justify-center'>
        <p>발생한 이벤트가 없습니다.</p>
      </div>
    )
  }
};