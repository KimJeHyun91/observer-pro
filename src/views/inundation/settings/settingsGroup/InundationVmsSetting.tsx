import { ScrollBar } from '@/components/ui';
import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useAreaStore } from '@/store/Inundation/useAreaStore';
import { Vms } from '@/@types/socket';
import { Button } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ConfirmDialog } from '@/components/shared';
import Loading from '@/components/shared/Loading';

type SortableFields = 'vms_ip' | 'vms_port' | 'vms_id' | 'ipaddress' | 'vmsName';

type SortConfig = {
	key: SortableFields | null;
	direction: 'ascending' | 'descending';
};

type AddVmsRequest = {
	vms_ip: string;
	vms_port: string;
	vms_id: string;
	vms_pw: string;
	mainServiceName: string;
};

export default function InundationVmsSetting() {
	const { socketService } = useSocketConnection();

	const [dialogIsOpen, setIsOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [sortConfig, setSortConfig] = useState<SortConfig>({
		key: null,
		direction: 'ascending'
	});
	const [selectedRows, setSelectedRows] = useState<Set<Vms>>(new Set());
	const [formData, setFormData] = useState({
		ipAddress: '',
		port: '',
		id: '',
		password: ''
	});
	const [isEditMode, setIsEditMode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const {
		addVms,
		getVms,
		modifyVms,
		deleteVms,
		syncVms,
		vmsList
	} = useSettingsStore();

	const fetchData = async () => {
		try {
			if (getVms !== undefined) {
				setIsLoading(true);
				await getVms({ mainServiceName: 'inundation' });
			}
		} catch (error) {
			setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
			setIsOpen(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [getVms]);

	useEffect(() => {
		if (socketService) {
			const unsubscribe = socketService.subscribe('fl_vms-update', () => {
            getVms({ mainServiceName: 'inundation' });
      });
			return () => unsubscribe();
		}
	}, [socketService, getVms]);

	const handleSort = (key: SortableFields) => {
		let direction: 'ascending' | 'descending' = 'ascending';
		if (sortConfig.key === key && sortConfig.direction === 'ascending') {
			direction = 'descending';
		}
		setSortConfig({ key, direction });
	};

	const sortedData = React.useMemo(() => {
		if (!Array.isArray(vmsList)) return [];
		if (!sortConfig.key) return vmsList;

		return [...vmsList].sort((a, b) => {
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
	}, [vmsList, sortConfig]);

	const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
		const isChecked = e.target.checked;
		if (isChecked) {
			const allRows = new Set(vmsList.map((item) => item));
			setSelectedRows(allRows);
		} else {
			setSelectedRows(new Set());
		}
	};

	const handleSelectRow = (vmsInfo: Vms) => {
		setSelectedRows((prev) => {
			const updated = new Set(prev);
			if (updated.has(vmsInfo)) {
				updated.delete(vmsInfo);
			} else {
				updated.add(vmsInfo);
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
			const deletePromises = Array.from(selectedRows).map((vms) => {
				if (!vms.vms_name) {
					setErrorMessage('VMS를 선택해주세요.');
					return
				}
				return deleteVms({ 
					vms_name: vms.vms_name, 
					mainServiceName: 'inundation' 
				});
			});

			await Promise.all(deletePromises);
			setSelectedRows(new Set());
			setIsDeleteDialogOpen(false);
		} catch (error) {
			setErrorMessage('오류가 발생했습니다.');
			setIsOpen(true);
		}
	};

	const handleModifyVms = () => {
		if (selectedRows.size !== 1) {
			setErrorMessage('하나의 항목만 선택해주세요.');
			setIsOpen(true);
			return;
		}
		const selectedItem = Array.from(selectedRows)[0];
		setFormData({
			ipAddress: selectedItem.vms_ip,
			port: selectedItem.vms_port,
			id: selectedItem.vms_id,
			password: selectedItem.vms_pw
		});
		setIsEditMode(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
	};

	const renderSortIcon = (column: keyof Vms) => {
		if (sortConfig.key !== column) {
			return <span className="text-gray-400">↑</span>;
		}
		return sortConfig.direction === 'ascending'
			? <span>↑</span>
			: <span>↓</span>;
	};

	const onDialogConfirm = async () => {
		const emptyFields = Object.entries(formData).filter(([_, value]) => !value.trim());

		if (emptyFields.length > 0) {
			setErrorMessage('필수 입력값이 누락되었습니다.');
			setIsOpen(true);
			return;
		}

		try {
			if (isEditMode) {
				const selectedVms = Array.from(selectedRows)[0];
				const modifyData: Vms = {
					...selectedVms,
					prev_vms_ip: selectedVms.vms_ip,
					prev_vms_port: selectedVms.vms_port,
					new_vms_ip: formData.ipAddress,
					new_vms_port: formData.port,
					vms_id: formData.id,
					vms_pw: formData.password,
					ipaddress: formData.ipAddress,
					mainServiceName: 'inundation'
				};

				const result = await modifyVms(modifyData);
				if (result) {
					setErrorMessage('VMS가 수정되었습니다.');
					setIsEditMode(false);
				} else {
					const errMessage = result.message || 'VMS 수정에 실패했습니다.';
					setErrorMessage(errMessage);
				}
			} else {
				const addData: AddVmsRequest = {
					vms_ip: formData.ipAddress,
					vms_port: formData.port,
					vms_id: formData.id,
					vms_pw: formData.password,
					mainServiceName: 'inundation'
				};

				const result = await addVms(addData as any);
				if (result) {
					setErrorMessage('VMS를 추가했습니다.');
					// VMS 추가 후 데이터 새로고침
					await fetchData();
				} else {
					setErrorMessage('VMS 추가에 실패했습니다.');
				}
			}

			setIsOpen(true);
			setFormData({ ipAddress: '', port: '', id: '', password: '' });
			setSelectedRows(new Set());

		} catch (error) {
			setErrorMessage(isEditMode ? 'VMS 수정에 실패했습니다.' : 'VMS 추가에 실패했습니다.');
			setIsOpen(true);
		}
	};

	const handleSynchronizeVms = async (item: any) => {
		const vmsData = {
			vms_ip: item.vms_ip,
			vms_port: item.vms_port,
			vms_id: item.vms_id,
			vms_pw: item.vms_pw,
			mainServiceName: 'inundation'
		};
		try {
			const result = await syncVms(vmsData as unknown as Vms);
			if (result) {
				setErrorMessage('VMS 카메라 동기화에 성공했습니다.');
				setIsOpen(true);
				return;
			} else if (!result) {
				setErrorMessage('VMS 카메라 동기화에 실패했습니다.');
				setIsOpen(true);
				return;
			}
			setIsOpen(false);
		} catch (error) {
			setErrorMessage((error as Error).message || '오류가 발생했습니다.');
			setIsOpen(true);
		}
	}

	if (isLoading) {
		return <Loading loading={true} className="w-full h-full flex items-center justify-center" />;
	}

	return (
		<div className="flex h-full overflow-auto">
			<div className="flex-1 ml-6 overflow-auto">
				<AlertDialog
					isOpen={dialogIsOpen}
					onClose={() => setIsOpen(false)}
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
					confirmButtonProps={{
						color: 'red-600',
					}}
				>
					<p>{selectedRows.size}개의 항목을 삭제하시겠습니까?</p>
				</ConfirmDialog>

				<div className="bg-white dark:bg-gray-800 rounded-lg h-full overflow-auto">
					<h3 className="text-lg mb-2">VMS 추가</h3>
					<div className={"border rounded-lg p-3"}>
						<form onSubmit={handleSubmit} className="grid gap-2">
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label>IP address</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="IP 주소를 입력하세요."
									value={formData.ipAddress}
									onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label>Port</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="포트 번호를 입력하세요."
									value={formData.port}
									onChange={(e) => setFormData({ ...formData, port: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label>ID</label>
								<input
									type="text"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="ID를 입력하세요."
									value={formData.id}
									onChange={(e) => setFormData({ ...formData, id: e.target.value })}
								/>
							</div>
							<div className="grid grid-cols-[100px,1fr] items-center">
								<label>Password</label>
								<input
									type="password"
									className="w-full p-2 border rounded bg-gray-50"
									placeholder="비밀번호를 입력하세요."
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
								/>
							</div>
							<div className="flex justify-end mt-6">
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

					<div className="mb-3">
						<h3 className="text-lg mb-2 mt-4">VMS 목록</h3>
						<div className={"border rounded-lg p-3"}>
							<ScrollBar className="max-h-[200px]">
								<table className="w-full min-w-full">
									<thead>
										<tr className="bg-gray-50">
											<th className="sticky top-0 bg-gray-50 p-3">
												<input
													type="checkbox"
													className="w-4 h-4"
													checked={selectedRows.size === vmsList.length}
													onChange={handleSelectAll}
												/>
											</th>
											<th
												className="sticky top-0 bg-gray-50 p-3 cursor-pointer"
												onClick={() => handleSort('vms_ip')}
											>
												<div className="flex items-center justify-center gap-1">
													IP address
													{renderSortIcon('vms_ip')}
												</div>
											</th>
											<th
												className="sticky top-0 bg-gray-50 p-3 cursor-pointer"
												onClick={() => handleSort('vms_port')}
											>
												<div className="flex items-center justify-center gap-1">
													Port
													{renderSortIcon('vms_port')}
												</div>
											</th>
											<th
												className="sticky top-0 bg-gray-50 p-3 cursor-pointer"
												onClick={() => handleSort('vms_id')}
											>
												<div className="flex items-center justify-center gap-1">
													ID
													{renderSortIcon('vms_id')}
												</div>
											</th>
											<th className="sticky top-0 bg-gray-50 p-3">Password</th>
											<th className="sticky top-0 bg-gray-50 p-3">Sync</th>
										</tr>
									</thead>
									<tbody>
										{sortedData.map((item) => (
											<tr key={item.idx} className="hover:bg-gray-50">
												<td className="p-3 text-center">
													<input
														type="checkbox"
														className="w-4 h-4"
														checked={selectedRows.has(item)}
														onChange={() => handleSelectRow(item)}
													/>
												</td>
												<td className="p-3 text-center">{item.vms_ip}</td>
												<td className="p-3 text-center">{item.vms_port}</td>
												<td className="p-3 text-center">{item.vms_id}</td>
												<td className="p-3 text-center">{item.vms_pw}</td>
												<td className="p-3 text-center">
													<button className="p-1" onClick={() => handleSynchronizeVms(item)}>🔄</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</ScrollBar>
						</div>
						<div className="flex justify-end gap-2 mt-4">
							<Button
								className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
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
								onClick={handleModifyVms}
								disabled={selectedRows.size !== 1}
							>
								수정
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}