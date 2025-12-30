import { ScrollBar, Select } from '@/components/ui';
import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { Button } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ConfirmDialog } from '@/components/shared';
import Loading from '@/components/shared/Loading';
import Switcher from '@/components/ui/Switcher'
import { Waterlevel, AddWaterlevelRequest, ModifyWaterlevelRequest } from '@/@types/inundation'
import SocketService from '@/services/socket';
import { useSessionUser } from '@/store/authStore';

type SortableFields = 'water_level_name' | 'water_level_location' | 'water_level_ip' | 'water_level_port' | 'water_level_id';

type SortConfig = {
	key: SortableFields | null;
	direction: 'ascending' | 'descending';
};

interface WaterlevelOptions {
	name: string;
}

const WATERLEVEL_MODEL_LIST: WaterlevelOptions[] = [
	{ name: 'Mago CP100' },
	{ name: 'AI BOX' },
	{ name: '우리기술' }
]

export default function InundationWaterlevelGaugeSetting() {
	const { socketService } = useSocketConnection();

	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		key: null,
		direction: 'ascending',
	});
	const [selectedRows, setSelectedRows] = useState<Set<Waterlevel>>(new Set());
	const [formData, setFormData] = useState<AddWaterlevelRequest>({
		water_level_name: '',
		water_level_location: '',
		water_level_ip: '',
		water_level_port: '',
		water_level_id: '',
		water_level_pw: '',
		water_level_model: '',
		ground_value: 0,
		water_level_uid: ''
	});
	const [isEditMode, setIsEditMode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [activeItems, setActiveItems] = useState<Map<number, boolean>>(new Map());
	const [isStatusChangeDialogOpen, setIsStatusChangeDialogOpen] = useState(false);
	const [statusChangeItem, setStatusChangeItem] = useState<any>(null);
	const [newStatus, setNewStatus] = useState(false);

	const {
		addWaterlevelGauge,
		modifyWaterlevelGauge,
		getWaterlevelGaugeList,
		deleteWaterlevelGauge,
		statusValueChangeWaterlevelGauge,
		waterlevelGaugeList
	} = useSettingsStore();

	const { user } = useSessionUser();

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);
				await getWaterlevelGaugeList();
			} catch (error) {
				setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
				setAlertOpen(true);
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, [getWaterlevelGaugeList]);

	useEffect(() => {
		if (socketService) {
			const unsubscribe = socketService.subscribe('fl_waterlevels-update', getWaterlevelGaugeList);
			return () => unsubscribe();
		}
	}, [socketService, getWaterlevelGaugeList]);

	useEffect(() => {
		if (waterlevelGaugeList && waterlevelGaugeList.length > 0) {
			const activeItemsMap = new Map<number, boolean>();
			waterlevelGaugeList.forEach(item => {
				activeItemsMap.set(item.water_level_idx, item.use_status);
			});
			setActiveItems(activeItemsMap);
		}
	}, [waterlevelGaugeList]);

	useEffect(() => {
		if (formData.water_level_model === '우리기술') {
			setFormData(prev => ({
				...prev,
				water_level_port: '3306',
				water_level_id: 'root',
				water_level_pw: 'edscorp1!'
			}));
		}
	}, [formData.water_level_model]);

	const handleSwitchChange = useCallback((item: Waterlevel, checked: boolean) => {
		setActiveItems(prev => {
			const updated = new Map(prev);
			updated.set(item.water_level_idx, checked);
			return updated;
		});
		setStatusChangeItem(item);
		setNewStatus(checked);
		setIsStatusChangeDialogOpen(true);
	}, []);

	const handleSort = useCallback((key: SortableFields) => {
		let direction: 'ascending' | 'descending' = 'ascending';
		if (sortConfig.key === key && sortConfig.direction === 'ascending') {
			direction = 'descending';
		}
		setSortConfig({ key, direction });
	}, [sortConfig]);

	const sortedData = React.useMemo(() => {
		if (!Array.isArray(waterlevelGaugeList)) return [];
		if (!sortConfig.key) return waterlevelGaugeList;

		return [...waterlevelGaugeList].sort((a, b) => {
			const aValue = a[sortConfig.key!];
			const bValue = b[sortConfig.key!];

			if (aValue == null && bValue == null) return 0;
			if (aValue == null) return 1;
			if (bValue == null) return -1;

			const aString = String(aValue);
			const bString = String(bValue);

			if (sortConfig.direction === 'ascending') {
				return aString.localeCompare(bString);
			} else {
				return bString.localeCompare(aString);
			}
		});
	}, [waterlevelGaugeList, sortConfig]);


	const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
		const isChecked = e.target.checked;
		if (isChecked) {
			const activeRows = new Set(waterlevelGaugeList.filter(item => item.use_status));
			setSelectedRows(activeRows);
		} else {
			setSelectedRows(new Set());
		}
	};

	const handleChangeWaterlevelValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			water_level_model: e.target.value
		}));
	};

	const handleSelectRow = (waterlevelInfo: Waterlevel) => {
		setSelectedRows((prev) => {
			const updated = new Set(prev);
			if (updated.has(waterlevelInfo)) {
				updated.delete(waterlevelInfo);
			} else {
				updated.add(waterlevelInfo);
			}
			return updated;
		});
	};

	const handleDeleteClick = () => {
		if (selectedRows.size === 0) return;
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		try {
			const deletePromises = Array.from(selectedRows).map(waterlevel =>
				deleteWaterlevelGauge({ waterlevelIdx: waterlevel.water_level_idx })
			);
			try {
				const socketService = SocketService.getInstance();
				if (!socketService.isConnected()) {
					socketService.initialize();
				}

				Array.from(selectedRows).forEach(waterlevel => {
					socketService.onRequest("manageWaterLevel", {
						ipaddress: waterlevel.water_level_ip,
						port: waterlevel.water_level_port,
						cmd: "remove",
						id: user.userId || '',
					});

					console.log(`수위계 삭제 소켓 이벤트 전송: ${waterlevel.water_level_ip}:${waterlevel.water_level_port}`);
				});
			} catch (socketError) {
				console.error('수위계 삭제 소켓 이벤트 실패:', socketError);
			}

			await Promise.all(deletePromises);
			setSelectedRows(new Set());
			setIsDeleteDialogOpen(false);
		} catch (error) {
			setErrorMessage('오류가 발생했습니다.');
			setAlertOpen(true);
		}
	};

	const handleModifyWaterlevelGauge = () => {
		if (selectedRows.size !== 1) {
			alert('하나의 항목만 선택해주세요.');
			return;
		}
		const selectedItem = Array.from(selectedRows)[0];
		setFormData({
			water_level_name: selectedItem.water_level_name,
			water_level_location: selectedItem.water_level_location,
			water_level_ip: selectedItem.water_level_ip,
			water_level_port: selectedItem.water_level_port,
			water_level_id: selectedItem.water_level_id,
			water_level_pw: selectedItem.water_level_pw,
			water_level_model: selectedItem.water_level_model,
			ground_value: selectedItem.ground_value || 0,
			water_level_uid: selectedItem.water_level_uid || ''
		});
		setIsEditMode(true);
	};

	const handleSubmit = (e: { preventDefault: () => void; }) => {
		e.preventDefault();
	};

	const renderSortIcon = (column: string | null) => {
		if (sortConfig.key !== column) {
			return <span className="text-gray-400">↑</span>;
		}
		return sortConfig.direction === 'ascending'
			? <span>↑</span>
			: <span>↓</span>;
	};

	const onDialogConfirm = async () => {
		const emptyFields = Object.entries(formData).filter(([_, value]) => {
			if (typeof value === 'string') {
				return !value.trim();
			}
			return value === undefined || value === null;
		});

		if (emptyFields.length > 0) {
			setErrorMessage('필수 입력값이 누락되었습니다.');
			setAlertOpen(true);
			return;
		}

		try {
			if (isEditMode) {
				const selectedItem = Array.from(selectedRows)[0];
				const modifyData: ModifyWaterlevelRequest = {
					water_level_idx: selectedItem.water_level_idx,
					water_level_name: formData.water_level_name,
					water_level_location: formData.water_level_location,
					prevWaterlevelIpaddress: selectedItem.water_level_ip,
					prevWaterlevelPort: selectedItem.water_level_port,
					newWaterlevelIpaddress: formData.water_level_ip,
					newWaterlevelPort: formData.water_level_port,
					water_level_id: formData.water_level_id,
					water_level_pw: formData.water_level_pw,
					ground_value: formData.ground_value,
					water_level_uid: formData.water_level_uid
				};

				const result = await modifyWaterlevelGauge(modifyData);

				try {
					const socketService = SocketService.getInstance();
					if (!socketService.isConnected()) {
						socketService.initialize();
					}

					const prevWaterlevelAddress = `${modifyData.prevWaterlevelIpaddress}:${modifyData.prevWaterlevelPort}`;
					const newWaterlevelAddress = `${modifyData.newWaterlevelIpaddress}:${modifyData.newWaterlevelPort}`;

					if (prevWaterlevelAddress !== newWaterlevelAddress) {
						console.log('remove', modifyData.prevWaterlevelIpaddress, modifyData.prevWaterlevelPort)
						socketService.onRequest("manageWaterLevel", {
							ipaddress: modifyData.prevWaterlevelIpaddress,
							port: modifyData.prevWaterlevelPort,
							cmd: "remove",
							id: user.userId || selectedItem.water_level_idx.toString(),
						});

						socketService.onRequest("manageWaterLevel", {
							ipaddress: modifyData.newWaterlevelIpaddress,
							port: modifyData.newWaterlevelPort,
							cmd: "add",
							id: user.userId || selectedItem.water_level_idx.toString(),
							ground_value: modifyData.ground_value || 0
						});
					} else {
						socketService.onRequest("manageWaterLevel", {
							ipaddress: modifyData.newWaterlevelIpaddress,
							port: modifyData.newWaterlevelPort,
							cmd: "modify",
							id: user.userId || selectedItem.water_level_idx.toString(),
							ground_value: modifyData.ground_value || 0
						});
					}
				} catch (socketError) {
					console.error('수위계 소켓 연결 실패:', socketError);
					setErrorMessage('수위계 연결에 실패했습니다. 수위계 상태 확인이 필요합니다.');
					setAlertOpen(true);
				}
				if (result) {
					setErrorMessage('수위계가 수정되었습니다.');
					setIsEditMode(false);
				} else {
					setErrorMessage('수위계 수정에 실패했습니다.');
				}

			} else {
				const result = await addWaterlevelGauge(formData as AddWaterlevelRequest);

				if (result) {
					try {
						const socketService = SocketService.getInstance();
						if (!socketService.isConnected()) {
							socketService.initialize();
						}

						socketService.onRequest("manageWaterLevel", {
							ipaddress: formData.water_level_ip,
							port: formData.water_level_port,
							cmd: "add",
							id: user.userId || 'system',
							ground_value: formData.ground_value || 0
						});
					} catch (socketError) {
						console.error('새 수위계 소켓 연결 실패:', socketError);
						setErrorMessage('수위계가 추가되었으나 실시간 연결에 실패했습니다.');
						setAlertOpen(true);
					}
					setErrorMessage('수위계를 추가했습니다.');
				} else {
					setErrorMessage('수위계 추가에 실패했습니다.');
				}
			}

			setAlertOpen(true);
			setFormData({
				water_level_name: '',
				water_level_location: '',
				water_level_ip: '',
				water_level_port: '',
				water_level_id: '',
				water_level_pw: '',
				water_level_model: '',
				ground_value: 0,
				water_level_uid: ''
			});
			setSelectedRows(new Set());

		} catch (error) {
			setErrorMessage(isEditMode ? '수위계 수정에 실패했습니다.' : '수위계 추가에 실패했습니다.');
			setAlertOpen(true);
		}
	};

	const handleStatusChangeConfirm = async () => {
		try {
			const result = await statusValueChangeWaterlevelGauge({
				waterlevelIdx: statusChangeItem.water_level_idx,
				waterlevelStatus: newStatus
			});
			console.log(newStatus)
			if (result) {
				await getWaterlevelGaugeList();
				setErrorMessage(`수위계가 ${newStatus ? '활성화' : '비활성화'} 되었습니다.`);
			} else {
				setErrorMessage('상태 변경에 실패했습니다.');
			}
			setAlertOpen(true);
		} catch (error: any) {
			setErrorMessage(error.message || '오류가 발생했습니다.');
			setAlertOpen(true);
		} finally {
			setIsStatusChangeDialogOpen(false);
			setStatusChangeItem(null);
		}
	};

	if (isLoading) {
		return <Loading loading={true} className="w-full h-full flex items-center justify-center" />;
	}

	const isCheckboxDisabled = (item: Waterlevel) => !item?.use_status;

	return (
		<div className="flex-1 h-full overflow-auto">
			<AlertDialog
				isOpen={alertOpen}
				onClose={() => setAlertOpen(false)}
				message={errorMessage}
			/>

			<ConfirmDialog
				isOpen={isDeleteDialogOpen}
				onCancel={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteConfirm}
				type="danger"
				title="확인"
				cancelText="취소"
				confirmText="확인"
				confirmButtonProps={{ color: 'red-600' }}
			>
				<p>{selectedRows.size}개의 항목을 삭제하시겠습니까?</p>
			</ConfirmDialog>

			<ConfirmDialog
				isOpen={isStatusChangeDialogOpen}
				onCancel={() => {
					setIsStatusChangeDialogOpen(false);
					setStatusChangeItem(null);
				}}
				onConfirm={handleStatusChangeConfirm}
				type="info"
				title="상태 변경 확인"
				cancelText="취소"
				confirmText="확인"
			>
				<p>
					수위계를 {newStatus ? '활성화' : '비활성화'} 하시겠습니까?
				</p>
			</ConfirmDialog>

			<div className="flex-1 pl-6 overflow-auto">
				<div className="mb-3">
					<h3 className="text-lg mb-2">수위계 추가</h3>
					<div className="border rounded-lg p-3">
						<form onSubmit={handleSubmit} className="grid gap-1">
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">Name</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="수위계의 이름을 입력하세요."
									value={formData.water_level_name}
									onChange={(e) => setFormData({ ...formData, water_level_name: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">Location</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="수위계의 주소를 입력하세요."
									value={formData.water_level_location}
									onChange={(e) => setFormData({ ...formData, water_level_location: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">Model</label>
								<div className="flex gap-2">
									<select
										className="flex-1 p-2 border rounded bg-gray-50"
										name="waterLevelModel"
										onChange={handleChangeWaterlevelValue}
										value={formData.water_level_model || ''}
									>
										<option value="">모델을 선택하세요</option>
										{WATERLEVEL_MODEL_LIST.map((value, index) => (
											<option key={index} value={value.name}>
												{value.name}
											</option>
										))}
									</select>
									{formData.water_level_model === 'Mago CP100' && (
										<>
											<label className="text-sm whitespace-nowrap flex items-center">
												Ground Value
											</label>
											<input
												type="number"
												className="w-48 p-2 border rounded bg-gray-50"
												placeholder="평시 센서와의 거리(mm)"
												value={formData.ground_value || ''}
												onChange={(e) => {
													const val = e.target.value;
													setFormData(prev => ({
														...prev,
														ground_value: val === '' ? 0 : Number(val)
													}));
												}}
											/>
										</>
									)}
									{formData.water_level_model === '우리기술' && (
										<>
											<label className="text-sm whitespace-nowrap flex items-center">
												DB Name
											</label>
											<input
												type="text"
												className="w-32 p-2 border rounded bg-gray-50"
												value={'waterlv'}
											/>
										</>
									)}
									{isEditMode && formData.water_level_model !== 'Mago CP100' && (
										<input
											type="number"
											className="w-32 p-2 border rounded bg-gray-50"
											placeholder="Ground"
											value={formData.ground_value || 10000}
											onChange={(e) => setFormData({ ...formData, ground_value: parseInt(e.target.value) || 10000 })}
										/>
									)}
								</div>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">IP address</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="IP 주소를 입력하세요."
									value={formData.water_level_ip}
									onChange={(e) => setFormData({ ...formData, water_level_ip: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">{formData.water_level_model === '우리기술' ? 'DB Port' : 'Port'}</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder={formData.water_level_model === '우리기술' ? "" : "포트 번호를 입력하세요."}
									value={formData.water_level_model === '우리기술' ? '3306' : formData.water_level_port}
									onChange={(e) => {
										if (formData.water_level_model !== '우리기술') {
											setFormData({ ...formData, water_level_port: e.target.value });
										}
									}}
									readOnly={formData.water_level_model === '우리기술'}
								/>
							</div>

							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">{formData.water_level_model === '우리기술' ? 'DB Id' : 'ID'}</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder={formData.water_level_model === '우리기술' ? "" : "ID를 입력하세요."}
									value={formData.water_level_model === '우리기술' ? 'root' : formData.water_level_id}
									onChange={(e) => {
										if (formData.water_level_model !== '우리기술') {
											setFormData({ ...formData, water_level_id: e.target.value });
										}
									}}
									readOnly={formData.water_level_model === '우리기술'}
								/>
							</div>
							{formData.water_level_model === '우리기술' &&
								<div className="grid grid-cols-[100px,1fr] items-center">
									<label className="text-sm">{formData.water_level_model === '우리기술' ? 'DB Pw' : 'Password'}</label>
									<div className="flex gap-2">
										<input
											type="password"
											className="flex-1 p-2 border rounded bg-gray-50"
											placeholder={formData.water_level_model === '우리기술' ? "" : "비밀번호를 입력하세요."}
											value={formData.water_level_model === '우리기술' ? 'edscorp1!' : formData.water_level_pw}
											onChange={(e) => {
												if (formData.water_level_model !== '우리기술') {
													setFormData({ ...formData, water_level_pw: e.target.value });
												}
											}}
											readOnly={formData.water_level_model === '우리기술'}
										/>
										<label className="text-sm whitespace-nowrap flex items-center">
											UID
										</label>
										<input
											type="text"
											className="w-48 p-2 border rounded bg-gray-50"
											placeholder="UID를 입력하세요"
											value={formData.water_level_uid || ''}
											onChange={(e) => setFormData({ ...formData, water_level_uid: e.target.value })}
										/>
									</div>
								</div>
							}
							<div className="flex justify-end mt-2">
								<Button
									className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
									size="sm"
									variant="solid"
									onClick={onDialogConfirm}
								>
									{isEditMode ? '수정' : '저장'}
								</Button>
							</div>
						</form>
					</div>
				</div>

				<div className="mb-3">
					<h3 className="text-lg mb-2">수위계 목록</h3>
					<div className="border rounded-lg">
						<ScrollBar className="max-h-[160px]">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50 text-red">
										<th className="w-10 p-3">
											<input
												type="checkbox"
												className="w-4 h-4"
												checked={selectedRows.size === waterlevelGaugeList.length}
												onChange={handleSelectAll}
											/>
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('water_level_name')}>
											Name{renderSortIcon('water_level_name')}
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('water_level_location')}>
											Location{renderSortIcon('water_level_location')}
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('water_level_ip')}>
											IP address{renderSortIcon('water_level_ip')}
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('water_level_port')}>
											Port{renderSortIcon('water_level_port')}
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('water_level_id')}>
											ID{renderSortIcon('water_level_id')}
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100">
											Password
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100">
											Model
										</th>
										<th className="text-left text-sm p-3 cursor-pointer hover:bg-gray-100">
											on/off
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedData.map((item) => (
										<tr key={item.water_level_idx} className={item.use_status ? "border-t hover:bg-gray-50" : "border-t bg-gray-400 text-white-100 dark:text-black"}>
											<td className="p-3">
												<input
													type="checkbox"
													className="w-4 h-4"
													checked={selectedRows.has(item)}
													onChange={() => handleSelectRow(item)}
													disabled={isCheckboxDisabled(item)}
												/>
											</td>
											<td className="p-3 text-sm">{item.water_level_name}</td>
											<td className="p-3 text-sm">{item.water_level_location}</td>
											<td className="p-3 text-sm">{item.water_level_ip}</td>
											<td className="p-3 text-sm">{item.water_level_port}</td>
											<td className="p-3 text-sm">{item.water_level_id}</td>
											<td className="p-3 text-sm">{item.water_level_pw}</td>
											<td className="p-3 text-sm">{item.water_level_model || '-'}</td>
											<td className="p-3 text-sm"> <Switcher
												checked={item.use_status}
												onChange={(checked) => handleSwitchChange(item, checked)} />
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</ScrollBar>
					</div>
				</div>
			</div>

			<div className="flex justify-end 1 mt-4 pt-4 items-center space-x-3">
				<Button
					className="mr-3 w-[100px] h-[34px] bg-[#d56666] rounded text-white"
					size="sm"
					onClick={handleDeleteClick}
					disabled={selectedRows.size === 0}
				>
					삭제
				</Button>
				<Button
					className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
					size="sm"
					variant="solid"
					onClick={handleModifyWaterlevelGauge}
					disabled={selectedRows.size !== 1}
				>
					수정
				</Button>
			</div>
		</div>
	);
}