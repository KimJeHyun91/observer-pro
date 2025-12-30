import { Controller, useFormContext } from "react-hook-form";
import { Select } from '@/components/ui';
import CustomDatePicker from "@/components/common/customDatePicker";
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { useEventTypeList } from '@/utils/hooks/useEventTypes';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { ObDeviceType } from '@/@types/device';

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

const MainLogDataHeader = ({ selectedLog }: { selectedLog: string }) => {
    const { eventTypeList } = useEventTypeList();
    const { doors } = useDoors();
    const { control, setValue, reset } = useFormContext();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const startDateRef = useRef<Date | null>(yesterday);
    const endDateRef = useRef<Date | null>(today);
    const [time, setTime] = useState({
        startTime: '',
        endTime: ''
    });

    const eventNames = eventTypeList?.result.map((eventType: EventType) => eventType.event_type) || [];
    const eventNamesSOP = eventTypeList?.result.filter((eventType: EventType) => eventType.use_sop && eventType.sop_idx).map((eventType: EventType) => eventType.event_type);

    useEffect(() => {
        startDateRef.current = yesterday;
        endDateRef.current = today;

        setTime({
            startTime: '',
            endTime: ''
        })

        setValue('eventDate', {
            startDate: dayjs(yesterday).format('YYYYMMDD'),
            endDate: dayjs(today).format('YYYYMMDD')
        });

        setValue('logDate', {
            startDate: dayjs(yesterday).format('YYYYMMDD'),
            endDate: dayjs(today).format('YYYYMMDD')
        });
        return () => {
            reset({
                eventName: { value: '', label: '전체' },
                severityId: { value: '', label: '전체' },
                location: '',
                eventTime: { startTime: '', endTime: '' },
                deviceType: { value: '', label: '전체' },
                deviceName: '',
                deviceIp: '',
                isAck: { value: '', label: '전체' },
                logDoorId: { value: '', label: '전체' },
                logPersonLastName: '',
                logDate: {
                    startDate: dayjs(yesterday).format('YYYYMMDD'),
                    endDate: dayjs(today).format('YYYYMMDD')
                },
                logTime: { startTime: '', endTime: '' },
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLog, setValue]);

    return (
        <div className="flex gap-2 items-center flex-wrap">
            {selectedLog === "이벤트" ? (
                // 이벤트 조회 
                <>
                    {/* 이벤트 */}
                    <Controller
                        name="eventName"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">이벤트명</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' }
                                    ].concat(eventNames?.map((eventName: string) => ({ value: eventName, label: eventName })))}
                                    placeholder="이벤트명을 선택하세요."
                                />
                            </div>
                        )}
                    />

                    {/* 중요도 */}
                    <Controller
                        name="severityId"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">중요도</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' },
                                        { value: 0, label: 'info' },
                                        { value: 1, label: 'minor' },
                                        { value: 2, label: 'major' },
                                        { value: 3, label: 'critical' }
                                    ]}
                                    placeholder="중요도를 선택하세요." />
                            </div>
                        )}
                    />

                    {/* 발생 장소 */}
                    <Controller
                        name="location"
                        control={control}
                        defaultValue={''}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">발생 장소</p>
                                <input {...field}
                                    placeholder="이벤트 발생 장소를 입력하세요."
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF] w-[14rem]"
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
                                        if (selectedDates.startDate != null) {
                                            startDateRef.current = selectedDates.startDate;
                                        }
                                        if (selectedDates.endDate != null) {
                                            endDateRef.current = selectedDates.endDate;
                                        }

                                        const formattedDates = {
                                            startDate: startDateRef.current ? dayjs(startDateRef.current).format('YYYYMMDD') : null,
                                            endDate: endDateRef.current ? dayjs(endDateRef.current).format('YYYYMMDD') : null,
                                        };
                                        field.onChange(formattedDates);
                                    }}
                                />
                            </div>
                        )}
                    />

                    {/* 발생 시간 */}
                    <Controller
                        name="eventTime"
                        control={control}
                        defaultValue={{ startTime: '', endTime: '' }}
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">발생 시간</p>
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

                    {/* 장치 종류 */}
                    <Controller
                        name="deviceType"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">장치 종류</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' },
                                        { value: 'camera', label: '카메라' },
                                        { value: 'door', label: '출입문' },
                                        { value: 'ebell', label: '비상벨' },
                                        { value: 'guardianlite', label: '가디언라이트' },
                                        { value: 'pids', label: 'PIDS' },
                                        { value: 'vms', label: 'VMS' },
                                    ]}
                                    placeholder="장치 종류를 선택하세요."
                                />
                            </div>
                        )}
                    />

                    {/* 장치 이름 */}
                    <Controller
                        name="deviceName"
                        control={control}
                        defaultValue={''}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">장치 이름</p>
                                <input {...field}
                                    placeholder="장치 이름을 입력하세요"
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                                    value={typeof field.value === 'object' ? '' : field.value}
                                />
                            </div>
                        )}
                    />

                    {/* 장치 IP 주소 */}
                    <Controller
                        name="deviceIp"
                        control={control}
                        defaultValue={''}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">장치 IP 주소</p>
                                <input {...field}
                                    placeholder="장치 IP주소를 입력하세요"
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                                    value={typeof field.value === 'object' ? '' : field.value}
                                />
                            </div>
                        )}
                    />

                    {/* 확인 여부 */}
                    <Controller
                        name="isAck"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">확인 여부</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' },
                                        { value: true, label: '확인' },
                                        { value: false, label: '미확인' },
                                    ]}
                                    placeholder="확인여부를 선택하세요." />
                            </div>
                        )}
                    />
                </>
            ) : selectedLog === "SOP 이벤트" ? (
                <>
                    {/* SOP 이벤트 */}
                    <Controller
                        name="eventName"
                        control={control}
                        defaultValue={''}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">이벤트명</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' }
                                    ].concat(eventNamesSOP?.map((eventName: string) => ({ value: eventName, label: eventName })))}
                                    placeholder="이벤트명을 선택하세요." />
                            </div>
                        )}
                    />

                    {/* 정/오탐 */}
                    <Controller
                        name="isTruePositive"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">정/오탐</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' },
                                        { value: true, label: '정탐' },
                                        { value: false, label: '오탐' },
                                    ]}
                                    placeholder="정/오탐을 선택하세요." />
                            </div>
                        )}
                    />

                    {/* 발생 장소 */}
                    <Controller
                        name="location"
                        control={control}
                        defaultValue={''}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">발생 장소</p>
                                <input {...field}
                                    placeholder="이벤트 발생 장소를 입력하세요."
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF] w-[14rem]"
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
                                            startDate: startDateRef.current ? dayjs(startDateRef.current).format('YYYYMMDD') : null,
                                            endDate: endDateRef.current ? dayjs(endDateRef.current).format('YYYYMMDD') : null,
                                        };
                                        field.onChange(formattedDates);
                                    }}
                                />
                            </div>
                        )}
                    />

                    {/* 발생 시간 */}
                    <Controller
                        name="eventTime"
                        control={control}
                        defaultValue={{ startTime: '', endTime: '' }}
                        render={({ field }) => (
                            <div className="flex items-center">
                                <p className="mr-2 dark:text-black">발생 시간</p>
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
                <>
                    {/* 출입문 */}
                    <Controller
                        name="logDoorId"
                        control={control}
                        defaultValue={{ value: '', label: '전체' }}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">출입문</p>
                                <Select {...field}
                                    value={field.value || { value: '', label: '전체' }}
                                    className="custom-select w-[165px]" size="xs"
                                    options={[
                                        { value: '', label: '전체' }
                                    ].concat(doors?.map((door: ObDeviceType) => ({ label: door.device_name, value: door.device_id })))}
                                    placeholder="출입문을 선택하세요." />
                            </div>
                        )}
                    />

                    {/* 출입자 */}
                    <Controller
                        name="logPersonLastName"
                        control={control}
                        defaultValue={null}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">출입자</p>
                                <input {...field}
                                    placeholder="출입자를 입력하세요"
                                    className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                                    value={typeof field.value === 'object' ? '' : field.value}
                                />
                            </div>
                        )}
                    />

                    {/* 출입 날짜 */}
                    <Controller
                        name="logDate"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center mr-10">
                                <p className="mr-2 dark:text-black">출입 날짜</p>
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
                        name="logTime"
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

export default MainLogDataHeader;
