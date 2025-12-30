import { ScrollBar } from '@/components/ui';
import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { Button } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { Waterlevel } from '@/@types/inundation';

export default function InundationWaterlevelGaugeCrossingGateSetting() {
	const { socketService } = useSocketConnection();

	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [selectedWaterlevel, setSelectedWaterlevel] = useState<number | null>(null);
	const [selectedCrossingGates, setSelectedCrossingGates] = useState<number[]>([]);
	const [hasInitialLinkedGates, setHasInitialLinkedGates] = useState<boolean>(false);

	const {
		getWaterlevelGaugeList,
		getCrossinggateList,
		addWaterLevelAutoControl,
		getWaterLevelAutoControlList,
		waterlevelGaugeList,
		waterlevelAutoControlList,
		crossingGateList
	} = useSettingsStore();

	useEffect(() => {
		const initializeData = async () => {
			try {
				await Promise.all([
					getWaterlevelGaugeList(),
					getCrossinggateList(),
					getWaterLevelAutoControlList()
				]);
			} catch (error) {
				setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
				setAlertOpen(true);
			}
		};
		initializeData();
	}, [getWaterlevelGaugeList, getCrossinggateList, getWaterLevelAutoControlList]);

	useEffect(() => {
		if (socketService) {
			const waterlevelUnsubscribe = socketService.subscribe('fl_waterlevels-update', getWaterlevelGaugeList);
			const crossingGateUnsubscribe = socketService.subscribe('fl_crossingGates-update', getCrossinggateList);

			return () => {
				waterlevelUnsubscribe();
				crossingGateUnsubscribe();
			};
		}
	}, [socketService, getWaterlevelGaugeList, getCrossinggateList]);

	useEffect(() => {
		if (selectedWaterlevel !== null) {
			const linkedGates = waterlevelAutoControlList
				.filter(gate => gate.water_level_idx === selectedWaterlevel)
				.map(gate => gate.outside_idx)
				.filter(outside_idx => outside_idx !== null);

			setHasInitialLinkedGates(linkedGates.length > 0);
		} else {
			setHasInitialLinkedGates(false);
		}
	}, [selectedWaterlevel, waterlevelAutoControlList]);

	const handleCrossingGateSelect = (crossingGateId: number) => {
		setSelectedCrossingGates(prev => {
			const updated = prev.includes(crossingGateId)
				? prev.filter(id => id !== crossingGateId)
				: [...prev, crossingGateId];
			return updated;
		});
	};

	const handleSelectAllCrossingGates = (e: React.ChangeEvent<HTMLInputElement>) => {
		const allGateIds = crossingGateList.map(gate => gate.idx);
		const updated = e.target.checked ? allGateIds : [];
		setSelectedCrossingGates(updated);
	};

	const handleSelectRow = (waterlevel: Waterlevel) => {
		setSelectedRows(prev => {
			const updated = new Set(prev);
			if (updated.has(waterlevel.water_level_idx)) {
				updated.delete(waterlevel.water_level_idx);
				setSelectedWaterlevel(null);
				setSelectedCrossingGates([]);
				setHasInitialLinkedGates(false);
			} else {
				updated.clear();
				updated.add(waterlevel.water_level_idx);
				setSelectedWaterlevel(waterlevel.water_level_idx);
				const linkedGates = waterlevelAutoControlList
					.filter(gate => gate.water_level_idx === waterlevel.water_level_idx)
					.map(gate => gate.outside_idx)
					.filter(outside_idx => outside_idx !== null);
				setSelectedCrossingGates(linkedGates);
				setHasInitialLinkedGates(linkedGates.length > 0);
			}
			return updated;
		});
	};

	const handleLinkCrossinggateWithWaterlevel = async () => {
		try {
			if (!selectedWaterlevel) {
				setErrorMessage('수위계와 연동할 차단기를 선택해주세요.');
				setAlertOpen(true);
				return;
			}
			
			console.log('CrossingGateSetting: 차단기 연동 시도');
			console.log('CrossingGateSetting: 선택된 수위계:', selectedWaterlevel);
			console.log('CrossingGateSetting: 선택된 차단기들:', selectedCrossingGates);
			
			const autoControlResult = await addWaterLevelAutoControl({
				waterlevelIdx: selectedWaterlevel,
				crossingGateIds: selectedCrossingGates,
				autoControlEnabled: true
			});
			
			console.log('CrossingGateSetting: 자동제어 설정 결과:', autoControlResult);
			
			if (autoControlResult) {
				setErrorMessage('수위계와 차단기가 연동되었습니다.');
				setSelectedWaterlevel(null);
				setSelectedCrossingGates([]);
				setSelectedRows(new Set());
				setHasInitialLinkedGates(true);

				await Promise.all([
					getWaterlevelGaugeList(),
					getCrossinggateList(),
					getWaterLevelAutoControlList()
				]);
			} else {
				setErrorMessage('연동에 실패했습니다.');
			}
			setAlertOpen(true);
		} catch (error) {
			console.error('CrossingGateSetting: 연동 중 오류 발생:', error);
			console.error('CrossingGateSetting: 에러 상세:', {
				message: error.message,
				stack: error.stack,
				response: error.response
			});
			setErrorMessage(`연동 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
			setAlertOpen(true);
		}
	};

	const handleUpdateLinkCrossinggateWithWaterlevelGauge = async () => {
		try {
			if (selectedWaterlevel === null) {
				setErrorMessage('수위계를 선택해주세요.');
				setAlertOpen(true);
				return;
			}

			const result = await addWaterLevelAutoControl({
				waterlevelIdx: selectedWaterlevel,
				crossingGateIds: selectedCrossingGates,
				autoControlEnabled: true
			});
			console.log('Update Result:', result);
			if (result) {
				setErrorMessage('차단기 정보가 수정 되었습니다.');
				setSelectedWaterlevel(null);
				setSelectedCrossingGates([]);
				setSelectedRows(new Set());

				await Promise.all([
					getWaterlevelGaugeList(),
					getCrossinggateList(),
					getWaterLevelAutoControlList()
				]);
			} else {
				setErrorMessage('수정에 실패했습니다.');
			}
			setAlertOpen(true);
		} catch (error) {
			setErrorMessage('연동 중 오류가 발생했습니다.');
			setAlertOpen(true);
		}
	};

	return (
		<div className="flex-1 h-full overflow-auto">
			<AlertDialog
				isOpen={alertOpen}
				onClose={() => setAlertOpen(false)}
				message={errorMessage}
			/>

			<div className="flex-1 pl-6 overflow-auto">
				<h3 className="text-lg mb-2">차단기 연동</h3>
				<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<div className="flex items-start gap-2">
							ℹ️
						<div>
							<p className="text-sm font-medium text-blue-800">
								차단기 연동 시 자동제어가 자동으로 활성화됩니다
							</p>
							<p className="text-xs text-blue-700 mt-1">
								수위계 임계치 초과 시 이벤트가 발생하면, 연동된 차단기에 대해 스피커 방송 후 자동으로 차단기가 제어됩니다.
							</p>
						</div>
					</div>
				</div>
				<div className="border rounded-lg p-3 mb-3">
					<div className="bg-gray-50 p-3">
						<div className="grid grid-cols-[100px,1fr] gap-2">
							<div>수위계</div>
							<div>
								{selectedWaterlevel ?
									waterlevelGaugeList.find(w =>
										w.water_level_idx === selectedWaterlevel
									)?.water_level_name
									: '-'
								}
							</div>
							<div>차단기</div>
							<div className="flex flex-wrap gap-2">
								{selectedWaterlevel &&
									crossingGateList
										.filter(gate => selectedCrossingGates.includes(gate.idx))
										.map(gate => (
											<div key={gate.idx} className="flex items-center gap-1">
												<span>{gate.outside_name}</span>
												<button
													onClick={() => handleCrossingGateSelect(gate.idx)}
													className="text-red-500 hover:text-red-700"
												>
													✕
												</button>
											</div>
										))
								}
							</div>
						</div>
					</div>
					<div className="flex justify-end gap-2 mt-3">
						<Button
							onClick={handleUpdateLinkCrossinggateWithWaterlevelGauge}
							disabled={
								!selectedWaterlevel ||
								!hasInitialLinkedGates
							}
							className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
						>
							수정
						</Button>

						<Button
							onClick={handleLinkCrossinggateWithWaterlevel}
							disabled={
								!selectedWaterlevel ||
								hasInitialLinkedGates
							}
							className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
						>
							저장
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4 mt-4">
					<div>
						<h3 className="text-lg mb-2">수위계 목록</h3>
						<div className="border rounded-lg">
							<ScrollBar className="max-h-[410px]">
								<table className="w-full">
									<thead>
										<tr className="bg-gray-50">
											<th className="w-10 p-3 rounded-lg"></th>
											<th className="text-left text-sm p-3">수위계</th>
											<th className="text-left text-sm p-3">연동 차단기</th>
										</tr>
									</thead>
									<tbody>
										{waterlevelGaugeList.map((waterlevel) => (
											<tr key={waterlevel.water_level_idx} className="border-t hover:bg-gray-50">
												<td className="p-3">
													<input
														type="checkbox"
														className="w-4 h-4"
														checked={selectedRows.has(waterlevel.water_level_idx)}
														onChange={() => handleSelectRow(waterlevel)}
													/>
												</td>
												<td className="p-3 text-sm">{waterlevel.water_level_name}</td>
												<td className="p-3 text-sm whitespace-pre-line">
													{waterlevel.water_level_idx ?
														waterlevelAutoControlList
															.filter(gate => gate.water_level_idx === waterlevel.water_level_idx)
															.map(gate => gate.outside_name || '알 수 없음')
															.join(',\n')
														: '-'
													}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</ScrollBar>
						</div>
					</div>

					<div>
						<h3 className="text-lg mb-2 ">차단기 목록</h3>
						<div className="border rounded-lg">
							<ScrollBar className="max-h-[370px] ">
								<table className="w-full ">
									<thead>
										<tr className="bg-gray-50">
											<th className="w-10 p-3">
												<input
													type="checkbox"
													className="w-4 h-4"
													checked={crossingGateList.length > 0 &&
														selectedCrossingGates.length === crossingGateList.length}
													onChange={handleSelectAllCrossingGates}
												/>
											</th>
											<th className="text-left text-sm p-3">차단기</th>
											<th className="text-left text-sm p-3">위치</th>
										</tr>
									</thead>
									<tbody>
										{crossingGateList.map((gate) => (
											<tr key={gate.idx} className="border-t hover:bg-gray-50">
												<td className="p-3">
													<input
														type="checkbox"
														className="w-4 h-4"
														checked={selectedCrossingGates.includes(gate.idx)}
														onChange={() => handleCrossingGateSelect(gate.idx)}
													/>
												</td>
												<td className="p-3 text-sm">{gate.outside_name}</td>
												<td className="p-3 text-sm">{gate.location}</td>
											</tr>
										))}
									</tbody>
								</table>
							</ScrollBar>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}