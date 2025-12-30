import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, ScrollBar } from '@/components/ui';
import { DialogState } from '@/@types/inundation';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useWaterlevelLiveSocketListener } from '@/store/Inundation/useWaterlevelLiveStore';
import WaterlevelCurrentStateBoard from '../../Detail/components/WaterlevelCurrentStateBoard';
import WaterlevelChart from '../../Detail/components/WaterlevelChart';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { apiGetAllWaterlevelLog } from '@/services/InundationService';
import { debounce } from 'lodash';

interface AllWaterlevelStatusBoardProps {
	isOpen: boolean;
	onClose?: () => void;
}

interface WaterlevelData {
	water_level_idx: number;
	water_level_name: string;
	water_level_location: string;
	water_level_ip: string;
	linked_status: boolean;
	threshold?: string;
	curr_water_level?: string;
}

const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => (
	!isConnected ? (
		<div className="flex items-center bg-red-400 text-white px-2 py-1 rounded mb-2 ml-4">
			<span>연결 끊김</span>
			<HiOutlineExclamationCircle className="ml-1" />
		</div>
	) : null
);

export function AllWaterlevelStatusBoard({ isOpen, onClose }: AllWaterlevelStatusBoardProps) {
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
		onConfirm: undefined,
		onCancel: undefined
	});
	const dialogRef = useRef<((value: boolean) => void) | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [waterlevels, setWaterlevels] = useState<WaterlevelData[]>([]);

	const { socketService } = useSocketConnection();
	const { getWaterlevelGaugeList } = useSettingsStore();
	useWaterlevelLiveSocketListener(socketService);

	const showDialog = useCallback((dialogConfig: Partial<DialogState>) => {
		setDialogState(prev => ({
			...prev,
			isOpen: true,
			...dialogConfig
		}));
	}, []);

	const closeDialog = useCallback(() => {
		setDialogState(prev => ({ ...prev, isOpen: false }));
		if (dialogRef.current) {
			dialogRef.current(false);
			dialogRef.current = null;
		}
	}, []);


	const fetchData = useCallback(
		debounce(async () => {
			if (!isOpen) return;
			try {
				setIsLoading(true);
				await getWaterlevelGaugeList();
				const gauges = useSettingsStore.getState().waterlevelGaugeList;

				if (gauges.length > 0) {
					const allWaterlevels = gauges.map(gauge => {
						const waterLevelIdx = gauge.water_level_idx || (gauge as any).idx || (gauge as any).waterlevel_idx;

						return {
							water_level_idx: waterLevelIdx,
							water_level_name: gauge.water_level_name,
							water_level_location: gauge.water_level_location || '위치 정보 없음',
							water_level_ip: gauge.water_level_ip || '',
							water_level_linked_status: gauge.linked_status || false,
							threshold: gauge.threshold || '0',
							curr_water_level: gauge.curr_water_level || '0',
							linked_status: gauge.linked_status,
							recent_logs: []
						};
					});

					try {
						const response = await apiGetAllWaterlevelLog();
						if (response.result && Array.isArray(response.result)) {
							const updatedWaterlevels = allWaterlevels.map(waterlevel => {
								const logItem = response.result.find(
									(log: any) => log.water_level_idx === waterlevel.water_level_idx
								);
								if (logItem) {
									return {
										...waterlevel,
										curr_water_level: logItem.water_level || waterlevel.curr_water_level,
										recent_logs: logItem.recent_logs || []
									};
								}
								return waterlevel;
							});
							setWaterlevels(updatedWaterlevels);
						} else {
							setWaterlevels(allWaterlevels);
						}
					} catch (logError) {
						setWaterlevels(allWaterlevels);
					}
				} else {
					setWaterlevels([]);
				}
			} catch (error) {
				console.error('Error fetching waterlevel data:', error);
				showDialog({
					type: 'alert',
					title: '오류',
					message: '수위계 데이터를 불러오는 중 오류가 발생했습니다.'
				});
			} finally {
				setIsLoading(false);
			}
		}, 1000),
		[isOpen, getWaterlevelGaugeList, showDialog]
	);

	useEffect(() => {
		if (isOpen) {
			setIsLoading(true);
			fetchData();
		} else {
			setWaterlevels([]);
			setIsLoading(true);
		}
	}, [isOpen, fetchData]);

	useEffect(() => {
		if (socketService && isOpen) {
			const unsubscribe = socketService.subscribe('fl_waterlevels-update' as any, (updatedData: any) => {
				setWaterlevels((prev) =>
					prev.map((wl) => {
						const update = updatedData.find((d: any) => d.water_level_idx === wl.water_level_idx);
						return update
							? { ...wl, curr_water_level: update.curr_water_level || wl.curr_water_level, threshold: update.threshold || wl.threshold }
							: wl;
					})
				);
			});
			return () => unsubscribe();
		}
	}, [socketService, isOpen]);

	useEffect(() => {
		return () => {
			dialogRef.current = null;
			setDialogState(prev => ({ ...prev, isOpen: false }));
		};
	}, []);

	const getGridColumns = () => {
		const count = waterlevels.length;
		if (count <= 3) return 'grid-cols-1 sm:grid-cols-3';
		if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
		if (count <= 6) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
		if (count <= 8) return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4';
		return 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-4';
	};

	return (
		<>
			{dialogState.isOpen && (
				<CommonAlertDialog
					isOpen={dialogState.isOpen}
					onClose={closeDialog}
					message={dialogState.message}
					title={dialogState.title}
					type={dialogState.type}
					onConfirm={dialogState.onConfirm}
				/>
			)}
			<div className="relative transform translate-y-1/2">
				<ScrollBar>
					{isOpen && (
						<Dialog
							isOpen={isOpen}
							height="95vh"
							width="120vw"
							className='z-[50]'
							contentClassName="dialog-waterlevelstatus-location"
							onClose={onClose}
						>
							<div className="flex flex-col h-full">
								<div className="mb-4 border-b-2 border-gray-300 dark:border-gray-500 mt-2">
									<h2 className="text-xl font-semibold flex items-center">
										수위계 수위 현황판
										{isLoading && <span className="ml-3 text-sm text-gray-500">데이터 로딩 중...</span>}
									</h2>
								</div>

								<div className="flex-grow overflow-auto">
									{isLoading ? (
										<div className="flex justify-center items-center h-full">
											<div className="text-lg text-gray-500">데이터를 불러오는 중입니다...</div>
										</div>
									) : waterlevels.length === 0 ? (
										<div className="flex justify-center items-center h-full">
											<div className="text-lg text-gray-500">등록된 수위계가 없습니다.</div>
										</div>
									) : (
										<div className={`grid ${getGridColumns()} gap-4 p-2`}>
											{waterlevels.map((waterlevel) => (
												<div
													key={waterlevel.water_level_idx}
													className="bg-gray-200 dark:bg-gray-800 p-3 rounded-lg"
												>
													<div className="flex justify-between items-center border-b-2 border-gray-300 dark:border-gray-500 mb-2 min-h-[40px]">
														<h4 className="font-semibold dark:text-gray-200 text-base flex items-center">
															{waterlevel.water_level_name}
														</h4>
														{!waterlevel.linked_status && <ConnectionStatus isConnected={waterlevel.linked_status} />}
													</div>

													<div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
														{waterlevel.water_level_location || '위치 정보 없음'}
													</div>

													<WaterlevelCurrentStateBoard
														waterlevelIdx={waterlevel.water_level_idx}
														threshold={waterlevel.threshold || '0'}
														currentWaterLevel={waterlevel.curr_water_level || '0'}
													/>

													<div className="h-40 mt-2">
														<WaterlevelChart
															waterlevelIp={waterlevel.water_level_ip || ''}
															waterlevelIdx={waterlevel.water_level_idx}
															threshold={waterlevel.threshold || '0'}
														/>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</Dialog>
					)}
				</ScrollBar>
			</div>
		</>
	);
}