import React, { useEffect, useState } from 'react'
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid"; 
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule"; 
import { useBroadcastReservationList } from '@/utils/hooks/useBroadcast';
import dayjs from 'dayjs';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';


const WeeklyBroadcastSchedule = () => {
    const {reserveList ,mutate} = useBroadcastReservationList()
    const { socketService } = useSocketConnection()

    useEffect(()=>{
      if (!socketService) {
        return;
      }
  
      const reserveSocket = socketService.subscribe('vb_reserve-update', (received) => {
        if (received) {
          console.log(received)
          mutate();
        }
      })
   
      return () => {
        reserveSocket();
      }
      
    },[socketService])

    const convertToFullCalendarWeekday = (dbWeekday: number) => {
        // DB: 0=일요일, 1=월요일, ... , 6=토요일
        // FullCalendar: 0=월요일, 1=화요일, ..., 6=일요일
        const weekdayMapping:Record<number, number> = {
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


    const newTransformedResults: any = reserveList?.result?.map((item:any) => {
        const formatDateTime = (dateTime: string) => {
          const date = dayjs(dateTime, 'YYYYMMDDTHHmmss');
          const formattedDate = date.format('YYYY-MM-DD'); 
          const formattedTime = date.format('HH:mm'); 
          return { formattedDate, formattedTime };
        };
      
        const { formattedDate: startDate, formattedTime } = formatDateTime(item.start_at);
        const { formattedDate: endDate, formattedTime:test } = formatDateTime(item.end_at);
  
        if (item.type === '정기') {
          const dateType = item.repeat_type === '월' ? 'monthly' : item.repeat_type === '주' ? 'weekly' : 'daily';
          if(dateType === 'daily'){
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
              end:  item.repeat_count ? repeatedStartDate : extendedEndDate
            };
          }else {
            return {
              id: `정기${item.idx}`, 
              title: item.title, 
              rrule: {
                freq: dateType,
                interval: 1,
                ...(item.repeat_type === '월' && item.day_of_month && {bymonthday: [item.day_of_month]}),
                ...(item.repeat_type !== '일' && (item.day_of_week || item.day_of_week === 0) && {byweekday: [convertToFullCalendarWeekday(item.day_of_week)]}),
                ...(item.repeat_type === '월' && {bysetpos: [item.week_of_month]}),
                dtstart: startDate,
                until: item.repeat_count ? null : endDate,
                ...(item.repeat_count > 0 && {count: item.repeat_count}),
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


  return (
     <div className="custom-calendar-header p-2 bg-white  dark:bg-gray-600  rounded-lg shadow-md w-full ">
        <FullCalendar
           plugins={[dayGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridWeek" 
          headerToolbar={{
            // left: "prev,next today", // 이전, 다음, 오늘 버튼
            // center: "title", // 중앙에 날짜 제목
             right: "prev,next today", // 추가 버튼 삭제
          }}
          locale="ko"
          events={newTransformedResults}
          height="auto"
          // dayHeaderFormat={{ weekday: "short" }} 
          dayHeaderClassNames='text-xs'
          dayMaxEvents={2} 
          moreLinkText="더보기"
        />
      </div>
  )
}

export default WeeklyBroadcastSchedule
