import { Button, Dialog, MenuItem, ScrollBar, Skeleton, Spinner } from '@/components/ui';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import React, { useEffect, useRef, useState } from 'react'
import MenuGroup from '@/components/ui/Menu/MenuGroup';
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import { DayCellContentArg, EventClickArg, EventInput } from "@fullcalendar/core";
import "@fullcalendar/core/locales/ko";
import ReservationSettingsForm from './ReservationSettingsForm';
import ScheduledForm from './ScheduledForm';
import { useBroadcastReservationList } from '@/utils/hooks/useBroadcast';
import { BsCalendar4Event, BsInfoLg } from "react-icons/bs";
import dayjs from 'dayjs';
import DetailReservation from './DetailReservation';
import _ from 'lodash';
import { Reservation } from '@/@types/broadcast';
import { IoMdAddCircle, IoMdAddCircleOutline } from "react-icons/io";
import { RRule } from "rrule";



const menuList = [
  { id: 1, title: '예약 방송' },
  { id: 2, title: '정기 방송' },
]

interface ReservationBroadcastProps {
  isOpen: boolean;
  onClose: () => void
}

const ReservedBroadcast = ({ isOpen, onClose }: ReservationBroadcastProps) => {

  const { reserveList, mutate } = useBroadcastReservationList()
  const [selectedReservation, setSelectedReservation] = useState<Reservation>()
  const [isDetailModal, setIsDetailModal] = useState(false)

  const calendarRef = useRef<FullCalendar | null>(null);


  useEffect(() => {
    (async () => {
      await mutate()
    })()

  }, [reserveList])

  const filteredReserveLists = reserveList?.result?.filter((list) => list.type === '예약')
  const filteredRegularLists = reserveList?.result?.filter((list) => list.type === '정기')


  const formatDateTime = (dateTime: Date) => {
    const date = dayjs(dateTime, 'YYYYMMDDTHHmmss');
    const formattedDate = date.format('YYYY-MM-DD');
    const formattedTime = date.format('HH:mm');
    return { formattedDate, formattedTime };
  };

  // 해당 날짜로 이동
  const handleListItemClick = (data: any) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(formatDateTime(data.start_at).formattedDate);
    }

    const eventData = reserveList?.result?.find((e) => e.idx === data.idx && e.type === data.type);

    if (eventData) {
      setIsDetailModal(true)
      setSelectedReservation(eventData)
    }
  };

  const [modifyReserveEvent, setModifyReserveEvent] = useState<Reservation>()
  const [isModifyReserve, setIsModifyReserve] = useState(false)

  const handleModifyReserve = (event: Reservation) => {
    setIsDetailModal(false)
    setIsModifyReserve(true)
    setModifyReserveEvent(event)
    setAddReserve((prev) => ({ type: `${event.type} 방송`, isOpen: true }))

  }

  const [addReserve, setAddReserve] = useState({ type: '', isOpen: false })


  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={800} className={'h-[835px]'}>

      <h5 className='mb-5'>예약/정기 방송 설정</h5>
      <div className='flex w-full justify-center'>

        <div className={`mt-5`}>

          <div className='' >
            <div className='w-[700px]'>
              <Calendar events={reserveList?.result} calendarRef={calendarRef} setSelectedReservation={setSelectedReservation} setIsDetailModal={setIsDetailModal} />
              {/* <ScheduledForm /> */}
            </div>
            <div className=' mt-6 '>
              <div className='flex gap-2'>
                <div className='flex flex-col gap-2 w-[50%] '>
                  <p className='flex justify-between items-center bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1 rounded-sm px-2 font-bold'>
                    <div className='flex items-center gap-1'><div className='w-[10px] h-[10px] bg-[#4d7aff]' /> <span>예약 방송 리스트</span></div>
                    <button className='flex items-center gap-1 bg-white p-1 rounded-lg px-2 dark:bg-gray-700'
                      onClick={() => {
                        setAddReserve((prev) => ({
                          type: '예약 방송',
                          isOpen: true
                        }));
                      }}><IoMdAddCircle size={18} color='gray' />일정 추가</button>
                  </p>
                  {/* {_.isEmpty(reserveList?.result) ? 
                                  <div  className='h-[160px] flex justify-center items-center bg-[#ebecef] p-2 rounded-sm '><Spinner className='' /></div>
                                 :  */}
                  <ScrollBar className='h-[160px] bg-[#ebecef] dark:bg-gray-500 p-2 rounded-sm'>
                    <div className='flex flex-col gap-2 mx-1 cursor-pointer '>
                      {filteredReserveLists?.map((list) => {
                        return <div key={list.idx}
                          className='flex justify-between items-center px-2 py-1 bg-white dark:bg-slate-300 dark:text-black dark:bg-gray-200 rounded-sm'
                          onClick={() => {
                            handleListItemClick(list)
                          }} >
                          <p >{list.title}</p>
                          <BsCalendar4Event />
                        </div>
                      })}
                    </div>
                  </ScrollBar>
                </div>
                <div className='flex flex-col gap-2 w-[50%] '>
                  <p className='flex justify-between items-center bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1 rounded-sm px-2 font-bold'>
                    <div className='flex items-center gap-1 '><div className='w-[10px] h-[10px] bg-[#17a36f]' /> <span>정기 방송 리스트</span></div>
                    <button className='flex items-center gap-1 bg-white dark:bg-gray-700 p-1 rounded-lg px-2'
                      onClick={() => {
                        setAddReserve((prev) => ({
                          type: '정기 방송',
                          isOpen: true
                        }));
                      }}> <IoMdAddCircle size={18} color='gray' /> 일정 추가</button>
                  </p>
                  {/* {_.isEmpty(reserveList?.result) ? 
                                  <div  className='h-[160px] flex justify-center items-center bg-[#ebecef] p-2 rounded-sm '><Spinner className='' /></div>
                                 :  */}
                  <ScrollBar className='h-[160px] bg-[#ebecef] dark:bg-gray-500 p-2 rounded-sm'>
                    <div className='flex flex-col gap-2 mx-1 cursor-pointer '>
                      {filteredRegularLists?.map((list) => {
                        return <div key={list.idx}
                          className='flex justify-between items-center px-2 py-1 bg-white dark:bg-slate-300 dark:text-black rounded-sm'
                          onClick={() => handleListItemClick(list)} >
                          <p>{list.title}</p>
                          <BsCalendar4Event />
                        </div>
                      })}
                    </div>
                  </ScrollBar>

                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
      <DetailReservation isOpen={isDetailModal} onClose={() => setIsDetailModal(false)} eventsData={selectedReservation} handleModifyReserve={handleModifyReserve} />
      <ReservationSettingsForm isOpen={addReserve.isOpen} onClose={() => { setAddReserve(prev => ({ ...prev, isOpen: false })) }} broadcastType={addReserve.type} isModifyReserve={isModifyReserve} setIsModifyReserve={setIsModifyReserve} modifyReserveEvent={modifyReserveEvent} setIsDetailModal={setIsDetailModal} />

    </Dialog>
  )
}

export default ReservedBroadcast







interface CustomEvent extends EventInput {
  id: string;
  rrule?: {
    freq: string;
    interval: number;
    byweekday: string[];
    dtstart: string;
    until: string;
  };
  color?: string;
  display?: string;
  allDay?: boolean;
}

interface CalendarProps {
  events: Reservation[] | undefined
  calendarRef: React.RefObject<FullCalendar>
  setSelectedReservation: (d: Reservation) => void
  setIsDetailModal: (d: boolean) => void
}


const Calendar = ({ events, calendarRef, setSelectedReservation, setIsDetailModal }: CalendarProps) => {
  const [isInitialRender, setIsInitialRender] = useState(false);
  const [transformedResults, setTransformedResults] = useState<CustomEvent[]>([]);

  useEffect(() => {

    setTimeout(() => {
      setIsInitialRender(true);
    }, 300);
  }, []);





  // const getEventsForDate = (events, targetDate = new Date()) => {
  //   const formattedTargetDate = dayjs(targetDate).format("YYYY-MM-DD");
  //   const startOfDay = dayjs(targetDate).startOf("day").toDate();
  //   const endOfDay = dayjs(targetDate).endOf("day").toDate();

  //   return events.filter((event) => {
  //     // 단일(정기X) 이벤트 확인
  //     if (event.start && event.end) {
  //       const start = dayjs(event.start).format("YYYY-MM-DD");
  //       const end = dayjs(event.end).format("YYYY-MM-DD");

  //       // targetDate가 start~end 범위 안에 있는 경우 포함
  //       if (formattedTargetDate >= start && formattedTargetDate <= end) {
  //         return true;
  //       }
  //     }

  //     // 정기 이벤트 (rrule 사용)
  //     if (event.rrule) {
  //       try {
  //         const rule = new RRule({
  //           freq: event.rrule.freq === "daily" ? RRule.DAILY :
  //                 event.rrule.freq === "weekly" ? RRule.WEEKLY :
  //                 event.rrule.freq === "monthly" ? RRule.MONTHLY : null,
  //           interval: event.rrule.interval || 1,
  //           dtstart: new Date(event.rrule.dtstart),
  //           until: event.rrule.until ? new Date(event.rrule.until) : null,
  //           count: event.rrule.count || undefined,
  //           byweekday: event.rrule.byweekday || undefined,
  //           bymonthday: event.rrule.bymonthday || undefined,
  //           bysetpos: event.rrule.bysetpos || undefined,
  //         });

  //         // 특정 날짜가 발생하는지 확인
  //         const occurrences = rule.between(startOfDay, endOfDay, true);
  //         return occurrences.length > 0;
  //       } catch (error) {
  //         console.error("RRule 파싱 오류:", error);
  //       }
  //     }

  //     return false;
  //   });
  // };



  // const todayEvents = getEventsForDate(transformedResults, new Date());
  // console.log("오늘의 이벤트:", todayEvents, transformedResults);


  const convertToFullCalendarWeekday = (dbWeekday: number) => {
    // DB: 0=일요일, 1=월요일, ... , 6=토요일
    // FullCalendar: 0=월요일, 1=화요일, ..., 6=일요일
    const weekdayMapping: Record<number, number> = {
      0: 6, // DB 일요일 -> FullCalendar 일요일
      1: 0, // DB 월요일 -> FullCalendar 월요일
      2: 1, // DB 화요일 -> FullCalendar 화요일
      3: 2, // DB 수요일 -> FullCalendar 수요일
      4: 3, // DB 목요일 -> FullCalendar 목요일
      5: 4, // DB 금요일 -> FullCalendar 금요일
      6: 5, // DB 토요일 -> FullCalendar 토요일
    };

    return weekdayMapping[dbWeekday];
  };

  useEffect(() => {
    const newTransformedResults = events?.map(item => {
      const formatDateTime = (dateTime: string) => {
        const date = dayjs(dateTime, 'YYYYMMDDTHHmmss');
        const formattedDate = date.format('YYYY-MM-DD');
        const formattedTime = date.format('HH:mm');
        return { formattedDate, formattedTime };
      };

      const { formattedDate: startDate, formattedTime } = formatDateTime(item.start_at);
      const { formattedDate: endDate, formattedTime: test } = formatDateTime(item.end_at);

      if (item.type === '정기') {
        const dateType = item.repeat_type === '월' ? 'monthly' : item.repeat_type === '주' ? 'weekly' : 'daily';
        if (dateType === 'daily') {
          const extendedEndDate = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD')
          const repeatedStartDate = dayjs(endDate).add(item?.repeat_count, 'day').format('YYYY-MM-DD')

          return {
            id: `정기${item.idx}`,
            title: item.title,
            '송출 대상': item.target,
            '방송 시간': formattedTime,
            '방송 형식': item.device_control,
            color: "#17a36f",
            display: "auto",
            time: formattedTime,
            type: item.type,
            allday: true,
            start: startDate,
            end: item.repeat_count ? repeatedStartDate : extendedEndDate
          };
        } else {
          return {
            id: `정기${item.idx}`,
            title: item.title,
            rrule: {
              freq: dateType,
              interval: 1,
              ...(item.repeat_type === '월' && item.day_of_month && { bymonthday: [item.day_of_month] }),
              ...(item.repeat_type !== '일' && (item.day_of_week || item.day_of_week === 0) && { byweekday: [convertToFullCalendarWeekday(item.day_of_week)] }),
              ...(item.repeat_type === '월' && { bysetpos: [item.week_of_month] }),
              dtstart: startDate,
              until: item.repeat_count ? null : endDate,
              ...(item.repeat_count > 0 && { count: item.repeat_count }),
            },
            '송출 대상': item.target,
            '방송 시간': formattedTime,
            '방송 형식': item.device_control,
            color: "#17a36f",
            display: "auto",
            time: formattedTime,
            type: item.type,
          };
        }

      } else if (item.type === '예약') {
        return {
          id: `예약${item.idx}`,
          title: item.title,
          start: startDate,
          '방송 송출 시간': formattedTime,
          '송출 대상': item.target,
          '방송 형식': item.device_control,
          color: "#4d7aff",
          allday: true,
          date: startDate,
          time: formattedTime,
          type: item.type,
        };
      }
    });
    setTransformedResults(newTransformedResults);

  }, [events]);


  const handleEventClick = (info: EventClickArg) => {
    const eventString = info.event.id;
    const eventId = eventString.replace(/\D/g, '');
    const eventData = events?.find((e) => e.idx === Number(eventId) && e.type === info.event.extendedProps.type);
    if (eventData) {
      setIsDetailModal(true);
      setSelectedReservation(eventData);
    }
  };

  const dayCellContent = (arg: DayCellContentArg) => {
    const today = new Date();
    const date = arg.date;
    const dayNumber = date.getDate();
    const isToday = date.toDateString() === today.toDateString();

    return (
      <div className="day-content">
        <div className={`day-number ${isToday ? 'today' : ''}`}>{dayNumber}</div>
      </div>
    );
  };

  useEffect(() => {
    if (isInitialRender && calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    }
  }, [isInitialRender]);

  return (
    <div>
      {isInitialRender ? (
        <FullCalendar
          ref={calendarRef}
          height={500}
          plugins={[dayGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          events={transformedResults}
          eventClick={handleEventClick}
          businessHours={true}
          locale="ko"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek,dayGridDay",
          }}
          eventClassNames={(info) => {
            return 'rounded-lg';
          }}
          eventContent={(info) => {
            return (
              <div className="rounded-lg">
                <div className="event-title pl-2">{info.event.title}</div>
              </div>
            );
          }}
          dayCellContent={dayCellContent}
          dayMaxEvents={3}
          moreLinkText="더보기"
        />
      ) : <div className='h-[500px] flex justify-center items-center'><Spinner /></div>}
    </div>
  );
};











