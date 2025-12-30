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

const deviceTypeOptions = [
	{ value: 'all', label: '전체' },
	{ value: 'waterlevel', label: '수위계' },
	{ value: 'crossinggate', label: '차단기' },
];

const eventTypeOptions = [
	{ value: 'allevents', label: '전체' },
	{ value: 'flooddetection', label: '위험 수위 감지' },
	{ value: 'gatecontrol', label: '차단기 자동제어' },
	{ value: 'nearbyevent', label: '인접 개소 침수 주의' },
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

const InundationLogDataHeader = ({ selectedLog }: InundationLogDataHeaderProps) => {
	const { control, setValue, watch } = useFormContext();
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);

	const startDateRef = useRef<Date | null>(yesterday);
	const endDateRef = useRef<Date | null>(today);

	const [time, setTime] = useState({ startTime: '', endTime: '' });
	const [locationOptions, setLocationOptions] = useState<{ value: string; label: string }[]>([]);

	const selectedLocationType = watch('발생 위치', '');
	const selectedDeviceType = watch('장치 종류', '');

	const fetchLocations = async () => {
		try {
			const [waterLevels, outsides] = await Promise.all([
				apiGetWaterLevelLocations(),
				apiGetOutsideLocations(),
			]);

			const waterLevelArray = Array.isArray(waterLevels?.result?.result)
				? waterLevels.result.result
				: Array.isArray(waterLevels?.result)
					? waterLevels.result
					: [];
			const outsideArray = Array.isArray(outsides?.result?.result)
				? outsides.result.result
				: Array.isArray(outsides?.result)
					? outsides.result
					: [];

			let options = [];
			if (selectedDeviceType?.value === 'waterlevel') {
				options = waterLevelArray.map((loc) => ({
					value: `waterlevel-${loc.water_level_location}`,
					label: `수위계 - ${loc.water_level_location}`,
				}));
			} else if (selectedDeviceType?.value === 'crossinggate') {
				options = outsideArray.map((loc) => ({
					value: `crossinggate-${loc.location}`,
					label: `차단기 - ${loc.location}`,
				}));
			} else {
				options = [
					...waterLevelArray.map((loc) => ({
						value: `waterlevel-${loc.water_level_location}`,
						label: `수위계 - ${loc.water_level_location}`,
					})),
					...outsideArray.map((loc) => ({
						value: `crossinggate-${loc.location}`,
						label: `차단기 - ${loc.location}`,
					})),
				];
			}

			setLocationOptions(options);
		} catch (error) {
			console.error('위치 옵션 조회 중 오류 발생:', error);
			setLocationOptions([]);
		}
	};

	useEffect(() => {
		if (selectedDeviceType?.value && selectedDeviceType.value !== 'all') {
			fetchLocations();
		} else {
			setLocationOptions([]);
		}
	}, [selectedDeviceType]);

	useEffect(() => {
		if (selectedLocationType?.value !== 'each') {
			setValue('개별 위치', '');
		}
	}, [selectedLocationType, setValue]);

	useEffect(() => {
		startDateRef.current = yesterday;
		endDateRef.current = today;
		setTime({ startTime: '', endTime: '' });
		setValue('eventDate', {
			startDate: dayjs(yesterday).format('YYYY-MM-DD'),
			endDate: dayjs(today).format('YYYY-MM-DD'),
		});
		setValue('발생 위치', '');
		setValue('장치 종류', { value: 'all', label: '전체' });
		setValue('개별 위치', '');
		setLocationOptions([]);
	}, [selectedLog, setValue]);

	const handleLocationChange = (value: any) => {
		const stringValue = typeof value === 'string' ? value : value?.value;
		if (stringValue) {
			const [deviceType, location] = stringValue.split('-');
			setValue('장치 종류', deviceType === 'waterlevel' ? 'waterlevel' : 'crossinggate');
		}
	};

	return (
		<>
			<Controller
				name="transmissionMethod"
				control={control}
				defaultValue=""
				render={({ field }) => (
					<div className="flex items-center">
						<p className="mr-2">{selectedLog === "이벤트" ? "이벤트 종류" : "작업 종류"}</p>
						<Select
							className="custom-select w-[150px]"
							{...field}
							options={selectedLog === "이벤트" ? eventTypeOptions : operationTypeOptions}
							size="xs"
							placeholder="Select a category"
						/>
					</div>
				)}
			/>
			{selectedLog === "이벤트" && (
				<>
					<Controller
						key={'10'}
						name={'장치 종류'}
						control={control}
						defaultValue={{ value: 'all', label: '전체' }}
						rules={{ required: `${'장치 종류'} is required` }}
						render={({ field }) => (
							<div className="flex items-center">
								<p className="mr-2">{'장치 종류'}</p>
								<Select
									className="custom-select w-[150px]"
									{...field}
									options={deviceTypeOptions}
									size="xs"
									placeholder="Select a category"
								/>
							</div>
						)}
					/>
					<Controller
						key={'11'}
						name={'발생 위치'}
						control={control}
						defaultValue=""
						render={({ field }) => (
							<div className="flex items-center">
								<p className="mr-2">{'발생 위치'}</p>
								<Select
									className="custom-select w-[150px]"
									{...field}
									value={field.value}
									onChange={(option) => field.onChange(option)}
									options={locationTypeOptions}
									size="xs"
									placeholder="Select a category"
								/>
							</div>
						)}
					/>
					{selectedLocationType?.value === 'each' && (
						<Controller
							key={'12'}
							name={'개별 위치'}
							control={control}
							defaultValue=""
							render={({ field }) => (
								<div className="flex items-center">
									<p className="mr-2">{'개별 위치'}</p>
									<Select
										className="custom-select w-[150px]"
										{...field}
										options={locationOptions}
										size="xs"
										placeholder="Select a location"
										onChange={(value) => {
											console.log('Selected value:', value);
											field.onChange(value);
											if (value) {
												handleLocationChange(value);
											}
										}}
									/>
								</div>
							)}
						/>
					)}
				</>
			)}
			<div className="flex gap-1">
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

export default InundationLogDataHeader;