import React, { useCallback, useEffect, useState, useRef } from 'react';
import { GuardianliteChannelProps } from '@/@types/inundation';
import { useAreaStore } from '@/store/Inundation/useAreaStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

type GuardianliteChannel = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5';

const GUARDIAN_CHANNELS: GuardianliteChannel[] = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];

const GuardianliteChannels: React.FC<GuardianliteChannelProps> = ({ data, onChannelControl, onLabelChange }) => {
	const { socketService } = useSocketConnection();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [editedLabels, setEditedLabels] = useState<Record<string, string>>({});
	const lastFetchTime = useRef<number>(0);
	const isFetching = useRef<boolean>(false);

	const { getGuardianliteInfo, guardianliteInfo } = useAreaStore();

	const initializeLabels = (data: any): Record<string, string> => {
		const info = data[0] || {};
		return Object.keys(info)
			.filter((key) => key.endsWith('_label'))
			.reduce((acc, labelKey) => {
				const channel = labelKey.slice(0, -6);
				acc[`${channel}Label`] = info[labelKey] || `CH${channel.slice(2)}`;
				return acc;
			}, {} as Record<string, string>);
	};

	const fetchGuardianliteInfo = useCallback(async () => {
		const now = Date.now();
		
		if (isFetching.current || (now - lastFetchTime.current < 1000)) {
			return;
		}

		try {
			isFetching.current = true;
			lastFetchTime.current = now;
			setIsLoading(true);
			await getGuardianliteInfo({ guardianliteIp: data?.guardianlite_ip });
		} catch (error) {
			setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
		} finally {
			setIsLoading(false);
			isFetching.current = false;
		}
	}, [getGuardianliteInfo, data?.guardianlite_ip]);

	useEffect(() => {
		if (data?.guardianlite_ip) {
			fetchGuardianliteInfo();
		}
	}, [fetchGuardianliteInfo]);

	useEffect(() => {
		if (socketService && data?.guardianlite_ip) {
			const unsubscribe = socketService.subscribe('fl_guardianlites-update', async () => {
				await fetchGuardianliteInfo();
			});
			return () => unsubscribe();
		}
	}, [socketService, data?.guardianlite_ip, fetchGuardianliteInfo]);

	useEffect(() => {
		if (guardianliteInfo && guardianliteInfo.length > 0) {
			setEditedLabels(initializeLabels(guardianliteInfo));
		}
	}, [guardianliteInfo]);

	const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setEditedLabels((prev) => ({
			...prev,
			[name]: value,
		}));
	}, []);

	const handleModifyChannelLabel = () => {
		onLabelChange(editedLabels);
		setIsEditing(false);
	};

	const handleCancel = () => {
		if (guardianliteInfo && guardianliteInfo.length > 0) {
			setEditedLabels(initializeLabels(guardianliteInfo));
		}
		setIsEditing(false);
	};

	const getPlaceholder = (value: any): string => {
		if (typeof value === 'string') return value;
		if (value === null || value === undefined) return '';
		return String(value);
	};

	return (
		<div className="bg-white dark:bg-gray-700">
			<div className="flex items-center p-2">
				<div className="flex-grow border border-gray-300 rounded">
					<div className="grid grid-cols-5 gap-2">
						{guardianliteInfo &&
							GUARDIAN_CHANNELS.map((channel) => {
								const labelKey = `${channel}_label`;
								const statusKey = channel;
								const info = guardianliteInfo[0] || {};
								const status = info[statusKey] === 'ON' ? 'on' : 'off';

								return (
									<div key={channel} className="bg-gray-50 rounded p-1 dark:bg-gray-700">
										{isEditing ? (
											<input
												className="w-full px-1 py-0.4 text-xs text-center bg-gray-200 dark:text-red-400"
												name={`${channel}Label`}
												value={editedLabels[`${channel}Label`]}
												onChange={handleLabelChange}
												placeholder={getPlaceholder(info[labelKey]) || `CH${channel.slice(2)}`}
											/>
										) : (
											<div className="text-center text-xs font-medium mb-1 bg-gray-200 dark:bg-gray-400 dark:text-gray-800">
												{info[labelKey] || `CH${channel.slice(2)}`}
											</div>
										)}
										<div className="flex justify-center mb-1">
											<div
												className={`w-3 h-3 rounded-full mt-1 ${status === 'on' ? 'bg-green-500' : 'bg-red-500'}`}
											/>
										</div>
										<div className="flex justify-center gap-1">
											{channel === 'ch1' ? (
												<button
													className={`px-2 py-0.5 rounded text-xs bg-gray-300 w-[80px] text-gray-900`}
													disabled={false} 
													onClick={() => onChannelControl(channel, 'on')}
												>
													RESET
												</button>
											) : (
												<>
													<button
														className={`px-2 py-0.5 rounded text-xs bg-gray-300 ${status === 'on' ? 'text-gray-400' : 'text-gray-900'
															}`}
														disabled={status === 'on'}
														onClick={() => onChannelControl(channel, 'on')}
													>
														ON
													</button>
													<button
														className={`px-2 py-0.5 rounded text-xs bg-gray-300 ${status === 'off' ? 'text-gray-400' : 'text-gray-900'
															}`}
														disabled={status === 'off'}
														onClick={() => onChannelControl(channel, 'off')}
													>
														OFF
													</button>
												</>
											)}
										</div>
									</div>
								);
							})}
					</div>
				</div>
				<div className="flex flex-col ml-2">
					{isEditing ? (
						<>
							<button
								className="px-2 py-0.5 bg-green-500 text-white rounded text-xs mb-1 whitespace-nowrap"
								onClick={handleModifyChannelLabel}
							>
								저장
							</button>
							<button
								className="px-2 py-0.5 bg-gray-500 text-white rounded text-xs whitespace-nowrap"
								onClick={handleCancel}
							>
								취소
							</button>
						</>
					) : (
						<button
							className="px-1 py-0.5 bg-blue-500 text-white rounded text-xs flex flex-col items-center whitespace-nowrap"
							onClick={() => setIsEditing(true)}
						>
							<span>채널명</span>
							<span>변경</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default GuardianliteChannels;