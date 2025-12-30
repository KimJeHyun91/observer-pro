import React, { useEffect, useRef, useState } from 'react';
import CustomDatePicker from '@/components/common/customDatePicker';
import { Select } from '@/components/ui';
import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';
import { apiGetWaterLevelLocations, apiGetOutsideLocations } from '@/services/InundationService';

interface InundationLogDataHeaderProps {
  control: any;
  selectedLog: string;
}

const locationTypeOptions = [
  { value: 'all', label: '전체 위치' },
  { value: 'each', label: '개별 위치' },
];


const eventTypeOptions = [
  { value: 'all', label: '전체' },
  { value: '차단기 자동제어', label: '차단기 자동제어' },
  { value: '위험 수위 감지 (주의)', label: '위험 수위 감지 (주의)' },
  { value: '위험 수위 감지 (경계)', label: '위험 수위 감지 (경계)' },
  { value: '위험 수위 감지 (심각)', label: '위험 수위 감지 (심각)' },
  { value: '위험 수위 감지 (대피)', label: '위험 수위 감지 (대피)' },
  // { value: 'nearbyevent', label: '인접 개소 침수 주의' },
];

const deviceTypeOptions = [
  { value: 'all', label: '전체' },
  { value: 'waterlevel', label: '수위계' },
  { value: 'crossinggate', label: '차단막' },
];

const operationTypeOptions = [
  { value: 'all', label: '전체' },
  { value: '카메라 ping 체크', label: '카메라 ping 체크' },
  { value: '전광판 ping 체크', label: '전광판 ping 체크' },
  { value: '스피커 ping 체크', label: '스피커 ping 체크' },
  { value: '게이트(차단기) ping 체크', label: '개소(차단기) ping 체크' },
  { value: '수위계 ping 체크', label: '수위계 ping 체크' },
  { value: '개소 추가', label: '개소 추가' },
  { value: '개소 삭제', label: '개소 삭제' },
  { value: '개소 수정', label: '개소 수정' },
  { value: '차단기제어(오픈)', label: '차단기 제어 (OPEN)' },
  { value: '차단기제어(닫기)', label: '차단기 제어 (CLOSE)' },
  { value: '전광판관리', label: '전광판 수정' },
];

const TunnelLogDataHeader = ({ selectedLog }: { selectedLog: string }) => {
  const { control, setValue, watch } = useFormContext();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const startDateRef = useRef<Date | null>(yesterday);
  const endDateRef = useRef<Date | null>(today);

  const [time, setTime] = useState({ startTime: '', endTime: '' });


  useEffect(() => {
    startDateRef.current = yesterday;
    endDateRef.current = today;
    setTime({ startTime: '', endTime: '' });
    setValue('eventDate', {
      startDate: dayjs(yesterday).format('YYYY-MM-DD'),
      endDate: dayjs(today).format('YYYY-MM-DD'),
    });

    setValue("eventType", { value: 'all', label: '전체' })
    setValue("deviceType", { value: 'all', label: '전체' })
  }, [selectedLog, setValue]);


  return (
    <>
      <div className='w-full h-[50px]  flex gap-4'>
        <Controller
          name="eventType"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <p className="mr-2">이벤트 종류</p>
              <Select
                className="custom-select w-[150px]"
                {...field}
                options={eventTypeOptions}
                size="xs"
              />
            </div>
          )}
        />
        <Controller
          name="deviceType"
          control={control}
          render={({ field }) => (
            <div className="flex items-center">
              <p className="mr-2">장치 종류</p>
              <Select
                className="custom-select w-[150px]"
                {...field}
                options={deviceTypeOptions}
                size="xs"
              />
            </div>
          )}
        />
        <Controller
          name="deviceName"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <div className="flex items-center">
              <p className="mr-2 dark:text-black">장치 이름</p>
              <input {...field}
                placeholder="장치 이름을 입력하세요"
                className="border px-2 py-[9px] rounded-xl text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                value={typeof field.value === 'object' ? '' : field.value}
              />
            </div>
          )}
        />
        <Controller
          name="location"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <div className="flex items-center">
              <p className="mr-2 dark:text-black">위치</p>
              <input {...field}
                placeholder="위치를 입력하세요"
                className="border px-2 py-[9px] rounded-xl text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                value={typeof field.value === 'object' ? '' : field.value}
              />
            </div>
          )}
        />
      </div>
      <div className='w-full h-[50px]  flex'>
        <Controller
          name="eventDate"
          control={control}
          render={({ field }) => (
            <div className="flex items-center mr-10">
              <p className="mr-2 dark:text-black">발생 날짜</p>
              <CustomDatePicker
                key={`${startDateRef.current}-${endDateRef.current}`}
                {...field}
                title={{ text: "", className: "mr-2" }}
                startDate={startDateRef.current}
                endDate={endDateRef.current}
                className="rounded-lg"
                height={40}
                width={130}
                fontSize={12}
                onChange={(selectedDates) => {
                  if (selectedDates.startDate !== null) {
                    startDateRef.current = selectedDates.startDate;
                  }
                  if (selectedDates.endDate !== null) {
                    endDateRef.current = selectedDates.endDate;
                  }
                  const formattedDates = {
                    startDate: startDateRef.current ? dayjs(startDateRef.current).format('YYYY-MM-DD') : null,
                    endDate: endDateRef.current ? dayjs(endDateRef.current).format('YYYY-MM-DD') : null,
                  };
                  field.onChange(formattedDates);
                }}
              />
            </div>
          )}
        />
        <Controller
          name="eventTime"
          control={control}
          defaultValue={{ startTime: '', endTime: '' }}
          render={({ field }) => (
            <div className="flex items-center">
              <p className="mr-2 dark:text-black">이벤트 시간</p>
              <input
                className="h-[40px] rounded-lg p-1 text-black dark:bg-gray-700 dark:text-[#FFFFFF] dark:[&::-webkit-calendar-picker-indicator]:invert"
                type="time"
                value={time.startTime}
                onChange={(e) => {
                  const updated = { ...time, startTime: e.target.value };
                  setTime(updated);
                  field.onChange(updated);
                }}
              />
              <div className="mx-2">~</div>
              <input
                className="h-[40px] rounded-lg p-1 text-black dark:bg-gray-700 dark:text-[#FFFFFF] dark:[&::-webkit-calendar-picker-indicator]:invert"
                type="time"
                value={time.endTime}
                onChange={(e) => {
                  const updated = { ...time, endTime: e.target.value };
                  setTime(updated);
                  field.onChange(updated);
                }}
              />
            </div>
          )}
        />
      </div>
    </>
  );
};

export default TunnelLogDataHeader;