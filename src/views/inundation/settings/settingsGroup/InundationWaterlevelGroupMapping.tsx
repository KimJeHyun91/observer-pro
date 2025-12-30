import { ScrollBar, Select } from '@/components/ui';
import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { Button } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ConfirmDialog } from '@/components/shared';
import Loading from '@/components/shared/Loading';

interface WaterLevelGroup {
	idx: number;
	group_name: string;
	threshold_mode: 'AND';
	created_at: string;
	water_level_count: number;
}

interface WaterLevelGroupDetail {
	group: {
		idx: number;
		group_name: string;
		threshold_mode: 'AND';
		created_at: string;
	};
	waterLevels: Array<{
		idx: number;
		water_level_name: string;
		water_level_ip: string;
		water_level_location: string;
		water_level_model: string;
		threshold: number;
		water_level_role: 'primary' | 'secondary';
	}>;
}

interface GroupFormData {
	groupName: string;
	waterLevelIds: number[];
	thresholdMode: 'AND';
	disableIndividualControl: boolean;
}

interface AlertState {
	isOpen: boolean;
	message: string;
	type: 'success' | 'error';
}

export default function InundationWaterlevelGroupMapping() {
	const { socketService } = useSocketConnection();

	// Alert 상태 개선
	const [alert, setAlert] = useState<AlertState>({
		isOpen: false,
		message: '',
		type: 'error'
	});

	const [isLoading, setIsLoading] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

	// 그룹 관련 상태
	const [groups, setGroups] = useState<WaterLevelGroup[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<WaterLevelGroupDetail | null>(null);

	// 폼 관련 상태
	const [formData, setFormData] = useState<GroupFormData>({
		groupName: '',
		waterLevelIds: [],
		thresholdMode: 'AND',
		disableIndividualControl: true
	});
	const [isEditMode, setIsEditMode] = useState(false);
	const [selectedWaterLevels, setSelectedWaterLevels] = useState<Set<number>>(new Set());

	const {
		getWaterlevelGaugeList,
		waterlevelGaugeList,
		getWaterLevelGroups,
		getWaterLevelGroupDetail,
		getAvailableWaterLevels,
		createWaterLevelGroup,
		updateWaterLevelGroup,
		deleteWaterLevelGroup,
		waterLevelGroups,
		availableWaterLevels,
		selectedGroupDetail
	} = useSettingsStore();

	// Alert 헬퍼 함수
	const showAlert = useCallback((message: string, type: 'success' | 'error' = 'error') => {
		setAlert({
			isOpen: true,
			message,
			type
		});
	}, []);

	const closeAlert = useCallback(() => {
		setAlert(prev => ({ ...prev, isOpen: false }));
	}, []);

	// 초기 데이터 로드
	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);
				await Promise.all([
					getWaterlevelGaugeList(),
					getWaterLevelGroups(),
					getAvailableWaterLevels()
				]);
			} catch (error) {
				showAlert('데이터를 불러오는 중 오류가 발생했습니다.');
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, [getWaterlevelGaugeList, getWaterLevelGroups, getAvailableWaterLevels, showAlert]);

	// 그룹 선택 시 상세 정보 로드
	useEffect(() => {
		if (selectedGroupId) {
			getWaterLevelGroupDetail(selectedGroupId);
		}
	}, [selectedGroupId, getWaterLevelGroupDetail]);

	// 스토어에서 가져온 데이터를 로컬 상태에 동기화
	useEffect(() => {
		setGroups(waterLevelGroups);
	}, [waterLevelGroups]);

	useEffect(() => {
		setSelectedGroup(selectedGroupDetail);
	}, [selectedGroupDetail]);

	// 소켓 연결로 실시간 업데이트
	useEffect(() => {
		if (socketService) {
			const unsubscribe = socketService.subscribe('fl_waterlevels-update', () => {
				getWaterlevelGaugeList();
				getAvailableWaterLevels();
				// 현재 선택된 그룹이 있다면 다시 로드
				if (selectedGroupId) {
					getWaterLevelGroupDetail(selectedGroupId);
				}
			});
			return () => unsubscribe();
		}
	}, [socketService, getWaterlevelGaugeList, getAvailableWaterLevels, selectedGroupId, getWaterLevelGroupDetail]);

	// 수위계 선택 상태와 폼 데이터 동기화
	useEffect(() => {
		setFormData(prev => ({
			...prev,
			waterLevelIds: Array.from(selectedWaterLevels)
		}));
	}, [selectedWaterLevels]);

	// 폼 핸들러들
	const handleWaterLevelSelect = useCallback((waterLevelId: number, event?: React.MouseEvent) => {
		// 이벤트 전파 방지
		if (event) {
			event.stopPropagation();
		}

		setSelectedWaterLevels(prev => {
			const updated = new Set(prev);
			if (updated.has(waterLevelId)) {
				updated.delete(waterLevelId);
			} else {
				updated.add(waterLevelId);
			}
			return updated;
		});
	}, []);

	const handleSelectAllWaterLevels = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		e.stopPropagation();

		if (e.target.checked) {
			const allIds = availableWaterLevels.map(wl => wl.idx);
			setSelectedWaterLevels(new Set(allIds));
		} else {
			setSelectedWaterLevels(new Set());
		}
	}, [availableWaterLevels]);

	const handleCreateGroup = useCallback(() => {
		if (selectedWaterLevels.size < 2) {
			showAlert('최소 2개 이상의 수위계를 선택해주세요.');
			return;
		}

		setFormData({
			groupName: '',
			thresholdMode: 'AND',
			waterLevelIds: Array.from(selectedWaterLevels),
			disableIndividualControl: true
		});
		setIsEditMode(false);
	}, [selectedWaterLevels, showAlert]);

	const handleEditGroup = useCallback(() => {
		if (!selectedGroup) {
			showAlert('수정할 그룹을 선택해주세요.');
			return;
		}

		const waterLevelIds = selectedGroup.waterLevels.map(wl => wl.idx);

		setFormData({
			groupName: selectedGroup.group.group_name,
			thresholdMode: selectedGroup.group.threshold_mode,
			waterLevelIds: waterLevelIds,
			disableIndividualControl: true
		});

		// 선택된 수위계 상태도 동기화
		setSelectedWaterLevels(new Set(waterLevelIds));
		setIsEditMode(true);
	}, [selectedGroup, showAlert]);

	const handleDeleteGroup = useCallback(() => {
		if (!selectedGroupId) {
			showAlert('삭제할 그룹을 선택해주세요.');
			return;
		}
		setIsDeleteDialogOpen(true);
	}, [selectedGroupId, showAlert]);

	const handleDeleteConfirm = useCallback(async () => {
		try {
			if (!selectedGroupId) return;

			const result = await deleteWaterLevelGroup(selectedGroupId);

			if (result) {
				showAlert('그룹이 성공적으로 삭제되었습니다.', 'success');
				setSelectedGroupId(null);
				setSelectedGroup(null);
			} else {
				showAlert('그룹 삭제에 실패했습니다.');
			}

			setIsDeleteDialogOpen(false);
		} catch (error) {
			showAlert('그룹 삭제 중 오류가 발생했습니다.');
			setIsDeleteDialogOpen(false);
		}
	}, [selectedGroupId, deleteWaterLevelGroup, showAlert]);

	const handleSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.groupName.trim()) {
			showAlert('그룹 이름을 입력해주세요.');
			return;
		}

		if (formData.waterLevelIds.length < 2) {
			showAlert('최소 2개 이상의 수위계를 선택해주세요.');
			return;
		}

		try {
			let result = false;

			if (isEditMode && selectedGroupId) {
				// 그룹 수정
				result = await updateWaterLevelGroup(selectedGroupId, formData);
				showAlert(
					result ? '그룹이 성공적으로 수정되었습니다.' : '그룹 수정에 실패했습니다.',
					result ? 'success' : 'error'
				);
			} else {
				// 그룹 생성
				result = await createWaterLevelGroup(formData);
				showAlert(
					result ? '그룹이 성공적으로 생성되었습니다.' : '그룹 생성에 실패했습니다.',
					result ? 'success' : 'error'
				);
			}

			if (result) {
				resetForm();
			}
		} catch (error) {
			showAlert(isEditMode ? '그룹 수정 중 오류가 발생했습니다.' : '그룹 생성 중 오류가 발생했습니다.');
		}
	}, [formData, isEditMode, selectedGroupId, updateWaterLevelGroup, createWaterLevelGroup, showAlert]);

	const resetForm = useCallback(() => {
		setFormData({
			groupName: '',
			waterLevelIds: [],
			thresholdMode: 'AND',
			disableIndividualControl: true
		});
		setSelectedWaterLevels(new Set());
		setIsEditMode(false);
		setSelectedGroupId(null);
		setSelectedGroup(null);
	}, []);

	const handleGroupRowClick = useCallback((groupId: number) => {
		setSelectedGroupId(groupId === selectedGroupId ? null : groupId);
	}, [selectedGroupId]);

	const handleGroupEdit = useCallback((e: React.MouseEvent, groupId: number) => {
		e.stopPropagation();
		setSelectedGroupId(groupId);
		// selectedGroup이 업데이트될 때까지 기다린 후 handleEditGroup 호출
		setTimeout(() => handleEditGroup(), 0);
	}, [handleEditGroup]);

	const handleGroupDelete = useCallback((e: React.MouseEvent, groupId: number) => {
		e.stopPropagation();
		setSelectedGroupId(groupId);
		handleDeleteGroup();
	}, [handleDeleteGroup]);

	if (isLoading) {
		return <Loading loading={true} className="w-full h-full flex items-center justify-center" />;
	}

	return (
		<div className="flex-1 h-full overflow-auto">
			<AlertDialog
				isOpen={alert.isOpen}
				onClose={closeAlert}
				message={alert.message}
			/>

			<ConfirmDialog
				isOpen={isDeleteDialogOpen}
				onCancel={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteConfirm}
				type="danger"
				title="그룹 삭제 확인"
				cancelText="취소"
				confirmText="삭제"
				confirmButtonProps={{ color: 'red-600' }}
			>
				<p>선택한 그룹을 삭제하시겠습니까?</p>
				<p className="text-sm text-gray-500 mt-2">
					그룹을 삭제해도 개별 수위계는 삭제되지 않습니다.
				</p>
			</ConfirmDialog>

			<div className="flex-1 pl-6 overflow-auto">
				{/* 그룹 생성/수정 폼 */}
				<div className="mb-3">
					<h3 className="text-lg mb-2">수위계 그룹 {isEditMode ? '수정' : '생성'}</h3>
					<div className="border rounded-lg p-3">
						<form onSubmit={handleSubmit} className="grid gap-3">
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label className="text-sm">그룹 이름</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="그룹 이름을 입력하세요 (예: A구역 크로스체크)"
									value={formData.groupName}
									onChange={(e) => setFormData(prev => ({ ...prev, groupName: e.target.value }))}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-start">
								<label className="text-sm mt-2">선택된 수위계</label>
								<div className="text-sm text-gray-600">
									{formData.waterLevelIds.length > 0 ? (
										<div className="space-y-1">
											{formData.waterLevelIds.map((id, index) => {
												const waterLevel = waterlevelGaugeList.find(wl => wl.water_level_idx === id);
												return (
													<div key={id} className="flex items-center">
														<span className="font-medium mr-2">
															{index === 0 ? '[주]' : '[보조]'}
														</span>
														<span>{waterLevel?.water_level_name} ({waterLevel?.water_level_ip})</span>
													</div>
												);
											})}
										</div>
									) : (
										<span className="text-gray-400">선택된 수위계가 없습니다</span>
									)}
								</div>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-start">
								<label className="text-sm mt-2">제어 모드</label>
								<div className="space-y-2">
									<div className="flex items-center space-x-4">
										<label className="flex items-center">
											<input
												type="radio"
												name="controlMode"
												className="mr-2"
												checked={formData.disableIndividualControl}
												onChange={() => setFormData(prev => ({ ...prev, disableIndividualControl: true }))}
											/>
											<span className="text-sm">그룹 전용 (개별 제어 비활성화)</span>
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												name="controlMode"
												className="mr-2"
												checked={!formData.disableIndividualControl}
												onChange={() => setFormData(prev => ({ ...prev, disableIndividualControl: false }))}
											/>
											<span className="text-sm">하이브리드 (개별 제어 허용)</span>
										</label>
									</div>
									<div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border">
										<strong>주의:</strong> 그룹 전용 모드 선택 시, 해당 수위계들의 개별 자동제어가 비활성화됩니다.
										그룹 조건이 충족되지 않으면 차단기가 제어되지 않습니다.
									</div>
								</div>
							</div>
							<div className="flex justify-end gap-2 mt-2">
								<Button
									type="button"
									className="w-[100px] h-[34px] bg-gray-500 rounded text-white"
									size="sm"
									onClick={resetForm}
								>
									초기화
								</Button>
								<Button
									type="submit"
									className="w-[100px] h-[34px] bg-[#17A36F] rounded"
									size="sm"
									variant="solid"
									disabled={!formData.groupName.trim() || formData.waterLevelIds.length < 2}
								>
									{isEditMode ? '수정' : '생성'}
								</Button>
							</div>
						</form>
					</div>
				</div>

				{/* 사용 가능한 수위계 목록 */}
				<div className="mb-3">
					<h3 className="text-lg mb-2">사용 가능한 수위계 (그룹에 속하지 않은 수위계)</h3>
					<div className="border rounded-lg">
						<ScrollBar className="max-h-[200px]">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50">
										<th className="w-10 p-3">
											<input
												type="checkbox"
												className="w-4 h-4"
												checked={selectedWaterLevels.size === availableWaterLevels.length && availableWaterLevels.length > 0}
												onChange={handleSelectAllWaterLevels}
												onClick={(e) => e.stopPropagation()}
											/>
										</th>
										<th className="text-left text-sm p-3">Name</th>
										<th className="text-left text-sm p-3">Location</th>
										<th className="text-left text-sm p-3">IP Address</th>
										<th className="text-left text-sm p-3">Model</th>
										<th className="text-left text-sm p-3">Threshold</th>
									</tr>
								</thead>
								<tbody>
									{availableWaterLevels.map((item) => (
										<tr
											key={item.idx}
											className="border-t hover:bg-gray-50 cursor-pointer"
											onClick={(e) => {
												e.preventDefault();
												handleWaterLevelSelect(item.idx);
											}}
										>
											<td className="p-3" onClick={(e) => e.stopPropagation()}>
												<input
													type="checkbox"
													className="w-4 h-4"
													checked={selectedWaterLevels.has(item.idx)}
													onChange={(e) => {
														e.stopPropagation();
														handleWaterLevelSelect(item.idx);
													}}
													onClick={(e) => e.stopPropagation()}
												/>
											</td>
											<td className="p-3 text-sm">{item.water_level_name}</td>
											<td className="p-3 text-sm">{item.water_level_location}</td>
											<td className="p-3 text-sm">{item.water_level_ip}</td>
											<td className="p-3 text-sm">{item.water_level_model}</td>
											<td className="p-3 text-sm">{item.threshold}m</td>
										</tr>
									))}
									{availableWaterLevels.length === 0 && (
										<tr>
											<td colSpan={6} className="p-3 text-center text-gray-500">
												사용 가능한 수위계가 없습니다.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</ScrollBar>
					</div>
				</div>

				<div className="mb-3">
					<h3 className="text-lg mb-2">기존 수위계 그룹 목록</h3>
					<div className="border rounded-lg">
						<ScrollBar className="max-h-[200px]">
							<table className="w-full">
								<thead>
									<tr className="bg-gray-50">
										<th className="text-left text-sm p-3">그룹 이름</th>
										<th className="text-left text-sm p-3">동작 모드</th>
										<th className="text-left text-sm p-3 min-w-[200px]">포함된 수위계</th> {/* 헤더 변경 */}
										<th className="text-left text-sm p-3">생성일</th>
										<th className="text-left text-sm p-3">관리</th>
									</tr>
								</thead>
								<tbody>
									{groups.map((group) => (
										<tr
											key={group.idx}
											className={`border-t hover:bg-gray-50 cursor-pointer ${selectedGroupId === group.idx ? 'bg-blue-50' : ''
												}`}
											onClick={() => handleGroupRowClick(group.idx)}
										>
											<td className="p-3 text-sm font-medium">{group.group_name}</td>
											<td className="p-3 text-sm">
												<span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
													AND
												</span>
											</td>
											<td className="p-3 text-sm max-w-[250px]">
												{/* 수위계 정보 표시 */}
												<GroupWaterLevels
													groupId={group.idx}
													selectedGroupDetail={selectedGroupId === group.idx ? selectedGroup : null}
													waterlevelGaugeList={waterlevelGaugeList}
												/>
											</td>
											<td className="p-3 text-sm">
												{new Date(group.created_at).toLocaleDateString()}
											</td>
											<td className="p-3 text-sm">
												<div className="flex gap-1">

													<button
														className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
														onClick={(e) => handleGroupDelete(e, group.idx)}
													>
														삭제
													</button>
												</div>
											</td>
										</tr>
									))}
									{groups.length === 0 && (
										<tr>
											<td colSpan={5} className="p-3 text-center text-gray-500">
												생성된 그룹이 없습니다.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</ScrollBar>
					</div>
				</div>

			</div>
		</div>
	);
}

import { apiGetWaterLevelGroupDetail } from '../../../../services/InundationService';

const GroupWaterLevels: React.FC<{
	groupId: number;
	selectedGroupDetail: WaterLevelGroupDetail | null;
	waterlevelGaugeList: any[];
}> = ({ groupId, selectedGroupDetail, waterlevelGaugeList }) => {
	const [groupDetail, setGroupDetail] = useState<WaterLevelGroupDetail | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const { getWaterLevelGroupDetail } = useSettingsStore();

	useEffect(() => {
		loadGroupDetail();
	}, [groupId]);

	useEffect(() => {
		if (selectedGroupDetail && selectedGroupDetail.group.idx === groupId) {
			setGroupDetail(selectedGroupDetail);
		}
	}, [selectedGroupDetail, groupId]);

	const loadGroupDetail = useCallback(async () => {
		if (isLoading) return;

		try {
			setIsLoading(true);
			const detail = await apiGetWaterLevelGroupDetail(groupId);
			if (detail) {
				setGroupDetail(detail);
			}
		} catch (error) {
			console.error('그룹 상세 정보 로드 실패:', error);
		} finally {
			setIsLoading(false);
		}
	}, [groupId, isLoading]);

	const getWaterLevelInfo = () => {
		if (groupDetail && groupDetail.waterLevels) {
			return groupDetail.waterLevels.map(wl => ({
				name: wl.water_level_name,
				ip: wl.water_level_ip,
				role: wl.water_level_role
			}));
		}
		return [];
	};

	if (isLoading) {
		return <span className="text-gray-400 text-xs">로딩중...</span>;
	}

	const waterLevels = getWaterLevelInfo();

	if (waterLevels.length === 0) {
		return <span className="text-gray-400 text-xs">정보 없음</span>;
	}

	return (
		<div className="text-xs">
			{waterLevels.map((wl, index) => (
				<span key={index}>
					<span className="text-gray-600 mr-1">
						{wl.role === 'primary' ? '[주]' : '[보조]'}
					</span>
					<span className="font-medium">
						{wl.name}({wl.ip})
					</span>
					{index < waterLevels.length - 1 && ', '}
				</span>
			))}
		</div>
	);
};