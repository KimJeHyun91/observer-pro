import { Controller, useFormContext } from "react-hook-form";
import { Select } from '@/components/ui';
import CustomDatePicker from "@/components/common/customDatePicker";
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

const ParkingLogDataHeader = ({ selectedLog }: { selectedLog: string }) => {
    const { control, setValue } = useFormContext();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const startDateRef = useRef<Date | null>(yesterday);
    const endDateRef = useRef<Date | null>(today);

    const [time, setTime] = useState({
        startTime: '',
        endTime: ''
    });
    
    useEffect(() => {
        startDateRef.current = yesterday;
        endDateRef.current = today;

        setTime({
            startTime: '',
            endTime: ''
        })

        setValue('eventDate', {
            startDate: dayjs(yesterday).format('YYYY-MM-DD'),
            endDate: dayjs(today).format('YYYY-MM-DD'),
        })

        setValue('deviceType', { value: 'deviceAll', label: '전체' });
        setValue('eventType', { value: 'eventAll', label: '전체' });
        setValue('deviceName', '');

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLog, setValue]);

    return (
        <div className="flex gap-2 items-center flex-wrap">
            {selectedLog === "이벤트" ? (
                // 이벤트 조회 
                <>
                    {/* 이벤트 */}
                    <Controller
                        name="eventType"
                        control={control}
                        defaultValue={{ value: 'eventAll', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">이벤트</p>
                                <Select {...field} 
                                    value={field.value || { value: 'eventAll', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: 'eventAll', label: '전체' }, 
                                        { value: 'network', label: '네트워크 끊김' },
                                        { value: 'carFull', label: '만차' },
                                    ]}
                                    placeholder="선택하세요" />
                            </div>
                        )}
                    />

                    {/* 장치 종류 */}
                    <Controller
                        name="deviceType"
                        control={control}
                        defaultValue={{ value: 'deviceAll', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">장치 종류</p>
                                <Select {...field} 
                                    value={field.value || { value: 'deviceAll', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: 'deviceAll', label: '전체' }, 
                                        { value: 'sensor', label: '주차면 센서' },
                                        { value: 'camera', label: '카메라' },
                                    ]}
                                    placeholder="선택하세요" />
                            </div>
                        )}
                    />

                    {/* 장치 이름 */}
                    <Controller
                        name="deviceName"
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">장치 이름</p>
                                <input {...field} 
                                    placeholder="장치 이름을 입력하세요" 
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                                    value={typeof field.value === 'object' ? '' : field.value}
                                />
                            </div>
                        )}
                    />

                    {/* 발생 날짜 */}
                    <Controller
                        name="eventDate"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">발생 날짜</p>
                                <CustomDatePicker
                                    key={`${startDateRef.current}-${endDateRef.current}`}
                                    {...field}
                                    title={{
                                        text: "",
                                        className: "mr-2",
                                    }}
                                    startDate={startDateRef.current}
                                    endDate={endDateRef.current}
                                    className='rounded-lg'
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

                    {/* 출입 시간 */}
                    <Controller
                        name="eventTime"
                        control={control}
                        defaultValue={{ startTime: '', endTime: '' }}
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">출입 시간</p>
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
                </>
            ) : (
                // 차량 출입 기록 조회 
                <>
                    {/* 이벤트 */}
                    <Controller
                        name="eventType"
                        control={control}
                        defaultValue={{ value: 'eventAll', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">이벤트</p>
                                <Select {...field} 
                                    value={field.value || { value: 'eventAll', label: '전체' }} 
                                    className="custom-select w-[165px]" 
                                    size="xs"
                                    options={[
                                        { value: 'eventAll', label: '전체' }, 
                                        { value: 'out', label: '출차' },
                                        { value: 'in', label: '입차' },
                                    ]}
                                    placeholder="선택하세요" />
                            </div>
                        )}
                    />

                    {/* 건물명 */}
                    <Controller
                        name="buildingName"
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                            <p className="mr-2 dark:text-black">건물명</p>
                            <input
                                {...field}
                                placeholder="건물명을 입력하세요"
                                className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                                value={typeof field.value === 'object' ? '' : field.value}
                            />
                            </div>
                        )}
                    />

                    {/* 면 타입 */}
                    <Controller
                        name="carType"
                        control={control}
                        defaultValue={{ value: 'carAll', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">면 타입</p>
                                <Select {...field} 
                                    value={field.value || { value: 'carAll', label: '전체' }} 
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: 'carAll', label: '전체' }, 
                                        { value: 'general', label: '일반' },
                                        { value: 'compact', label: '경차' },
                                        { value: 'disabled', label: '장애인' },
                                        { value: 'electric', label: '전기차' },
                                    ]}
                                    placeholder="선택하세요" />
                            </div>
                        )}
                    />

                    {/* 발생 날짜 */}
                    <Controller
                        name="eventDate"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">발생 날짜</p>
                                <CustomDatePicker
                                    key={`${startDateRef.current}-${endDateRef.current}`}
                                    {...field}
                                    title={{
                                        text: "",
                                        className: "mr-2",
                                    }}
                                    startDate={startDateRef.current}
                                    endDate={endDateRef.current}
                                    className='rounded-lg'
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

                    {/* 출입 시간 */}
                    <Controller
                        name="eventTime"
                        control={control}
                        defaultValue={{ startTime: '', endTime: '' }}
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">출입 시간</p>
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
                </>
            )}
        </div>
    );
};

export default ParkingLogDataHeader;
