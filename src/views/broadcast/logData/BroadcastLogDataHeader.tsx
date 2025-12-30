import CustomDatePicker from '@/components/common/customDatePicker';
import { Input, Menu, Select } from '@/components/ui'
import MenuGroup from '@/components/ui/Menu/MenuGroup';
import MenuItem from '@/components/ui/Menu/MenuItem'
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react'
import { Control, Controller, useFormContext } from 'react-hook-form'

interface BroadcastLogDataHeaderProps {
    selectedLog: string
}

const deviceType = [
    {value: 'all', label: '전체 개소'},
    {value: 'group', label: '그룹'},
    {value: 'each', label: '개별 개소'},
]

const BroadcastLogDataHeader = ({selectedLog}: BroadcastLogDataHeaderProps) => {
    const { setValue,control } = useFormContext();
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


        setValue('broadcastDate', {
            startDate: dayjs(yesterday).format('YYYY-MM-DD'),
            endDate: dayjs(today).format('YYYY-MM-DD'),
        })
        setValue('eventDate', {
            startDate: dayjs(yesterday).format('YYYY-MM-DD'),
            endDate: dayjs(today).format('YYYY-MM-DD'),
        })
       
    }, [selectedLog, setValue]);

    // const handleBlur = () => {
    //   if (time === '24:00') {
    //     setTime('00:00'); 
    //   }
    // };

    // const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //   setTime(e.target.value);
    // };

    return (
    <>
       {selectedLog === '방송 로그' ? 
       <> 
        <div className="flex gap-5">
            <Controller
                // key={'2'}
                name={'transmissionMethod'}
                control={control}
                defaultValue={{ value: 'ALL', label: '전체' }}
                rules={{ required: `${'transmissionMethod'} is required` }}
                render={({ field }) => (
                    <div className="flex items-center">
                        <p className="mr-2">{'송출 방식'}</p>
                        <Select className="custom-select w-[150px] dark:text-white" {...field} options={[{ value: 'ALL', label: '전체' }, { value: 'FILE', label: 'FILE' }, { value: 'TTS', label: 'TTS' }]} size="xs" placeholder="Select a category"  />
                    </div>
                )}
            />

            <Controller
                // key={'2'}
                name={'status'}
                control={control}
                defaultValue={{ value: 'ALL', label: '전체' }}
                rules={{ required: `${'status'} is required` }}
                render={({ field }) => (
                    <div className="flex items-center">
                        <p className="mr-2">{'송출 결과'}</p>
                        <Select 
                            className="custom-select w-[150px] dark:text-white" 
                            {...field} 
                            options={[
                                { value: 'ALL', label: '전체' },
                                { value: 'Ready', label: '준비 중' },
                                { value: 'Started', label: '시작됨' }, 
                                { value: 'Finished', label: '완료' },
                                { value: 'Error', label: '오류' },
                                { value: 'Unknown', label: '상태 모름' }
                            ]} 
                            size="xs" 
                            placeholder="상태 선택"
                            value={field.value || { value: 'ALL', label: '전체' }}
                        />
                    </div>
                )}
            />
        </div>

        {/* <Controller
                key={'3'}
                name="송출 개소" 
                control={control}
                defaultValue={"all"}
                render={({ field }) => (
                    <div className="flex items-center">
                    <p className="mr-2">{'방송 송출 개소'}</p>
                    
                    {deviceType.map((device) => {
                        return (
                        <MenuGroup key={device.value} {...field} className='' label=''>
                            <MenuItem
                            key={device.value}
                            className={`${selectedDeviceType === device.value ? 'bg-[#8699c6] text-white' : 'bg-[#dce0ea]'} w-[80px] flex justify-center border border-gray-300 mr-1 `}
                            menuItemHeight={33}
                            onSelect={() => {
                                field.onChange(device.value)
                                setSelectedDeviceType(device.value)
                            }} 
                            >
                            {device.label}
                            </MenuItem>
                        </MenuGroup>
                        );
                    })}
                    </div>
                )}
        /> */}
        {/* {selectedDeviceType === 'group' &&   <Controller
            key={'4'}
            name={'그룹개소'}
            control={control}
            defaultValue=""
            rules={{ required: `${'송출결과'} is required` }}
            render={({ field }) => (
                <div className="flex items-center">
                    <Select className="custom-select w-[130px]" {...field} options={[{ value: 'option1', label: '마이크' }, { value: 'option2', label: '음원재생' }]} size="xs" placeholder="Select a category" />
                </div>
            )}
        />} */}

        {/* {selectedDeviceType === 'each' &&   <Controller
                key={'5'}
                name={'개별개소'}
                control={control}
                defaultValue=""
                rules={{ required: `${'개별개소'} is required` }}
                render={({ field }) => (
                    <div className="flex items-center">
                        <Select className="custom-select w-[130px]" {...field} options={[{ value: 'option1', label: '마이크' }, { value: 'option2', label: '음원재생' }]} size="xs" placeholder="Select a category" />
                    </div>
                )}
        />} */}

        {/* <Controller
            key={'6'}
            name={'송출결과'}
            control={control}
            defaultValue=""
            rules={{ required: `${'송출결과'} is required` }}
            render={({ field }) => (
                <div className="flex items-center">
                    <p className="mr-2">{'송출결과'}</p>
                    <Select className="custom-select w-[150px]" {...field} options={[{ value: 'option1', label: '마이크' }, { value: 'option2', label: '음원재생' }]} size="xs" placeholder="Select a category" />
                </div>
            )}
        /> */}

        <div className="flex gap-5 mt-3">
            <Controller
                // key={'7'}
                name={'broadcastDate'}
                control={control}
                // defaultValue=""
                render={({ field }) => (
                    <div className="flex items-center mr-10">
                        <p className="mr-2">{'방송 날짜'}</p>
                        <CustomDatePicker 
                            key={`${startDateRef.current}-${endDateRef.current}`}
                            {...field}
                            // title={{
                            //     text: "",
                            //     className:"ml-2 mr-2 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
                            // }}
                            title={{
                                text: "",
                                className: "mr-2",
                            }}
                            startDate={startDateRef.current}
                            endDate={endDateRef.current}
                            className='rounded-lg'
                            height={40}
                            width={140}
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
                        <p className="mr-2 dark:text-black">송출 시간</p>
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
    : <>
        <Controller
                // key={'12'}
                name={'eventType'}
                control={control}
                defaultValue={{ value: 'ALL', label: '전체' }}
                // rules={{ required: `${'transmissionMethod'} is required` }}
                render={({ field }) => (
                    <div className="flex items-center">
                        <p className="mr-2">{'이벤트 종류'}</p>
                        <Select className="custom-select w-[150px] dark:text-white" {...field} options={[{ value: 'ALL', label: '전체' }, { value: 'FILE', label: '음원 업로드' }, { value: 'TTS', label: 'TTS 업로드' }]} size="xs" />
                    </div>
                )}
            />

     <Controller
                // key={'13'}
                name={'eventDate'}
                control={control}
                render={({ field }) => (
                    <div className="flex items-center">
                        <p className="mr-2">{'발생 날짜'}</p>
                        <CustomDatePicker 
                            key={`${startDateRef.current}-${endDateRef.current}`}
                            title={{
                                text: "",
                                className:"ml-2 mr-2 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
                            }}
                            startDate={startDateRef.current}
                            endDate={endDateRef.current}
                            className='rounded-lg'
                            height={40}
                            width={140}
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

        <div className='flex gap-1'>
            <Controller
                // key={14}
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
          
                </div>


     </> }
    
  </>
  )
}

export default BroadcastLogDataHeader
