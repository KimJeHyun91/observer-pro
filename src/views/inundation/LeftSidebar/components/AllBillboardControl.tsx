import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog, Input, ScrollBar, Select } from '@/components/ui';
import { BillboardMacro, BillboardOption, DialogState } from '@/@types/inundation';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useDeviceControlStore } from '@/store/Inundation/useDeviceControl';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useSessionUser } from "@/store/authStore";
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';

interface AllBillboardControlProps {
	isOpen: boolean;
	onClose?: () => void;
}

const DEFAULT_BILLBOARD_OPTION: BillboardOption = {
	value: '',
	label: '메시지 선택',
	id: -1,
	color: ''
};

export function AllBillboardControl({ isOpen, onClose }: AllBillboardControlProps) {
	const [selectedBillboardMacro, setSelectedBillboardMacro] = useState<BillboardOption>(DEFAULT_BILLBOARD_OPTION);
	const [billboardMessage, setBillboardMessage] = useState('');
	const [billboardOptions, setBillboardOptions] = useState<BillboardOption[]>([]);
	const [selectedColor, setSelectedColor] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
	});
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

	const { user } = useSessionUser();
	const { checkAdminPermission } = useCheckOperatorPermission();
	const dialogRef = useRef<((value: boolean) => void) | null>(null);

	const {
		billboardMessageList,
		getBillboardMessageList,
	} = useSettingsStore();
	const {
		updateAllBillboards,
		getBillboardList,
		billboardList
	} = useDeviceControlStore();

	const showDialog = (dialogConfig: Partial<DialogState>) => {
		setDialogState(prev => ({
			...prev,
			isOpen: true,
			...dialogConfig
		}));
	};

	const closeDialog = useCallback(() => {
		setDialogState(prev => ({ ...prev, isOpen: false }));
		if (dialogRef.current) {
			dialogRef.current(false);
			dialogRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			dialogRef.current = null;
			setDialogState(prev => ({ ...prev, isOpen: false }));
		};
	}, []);

	const fetchData = useCallback(async () => {
		try {
			await Promise.all([
				getBillboardMessageList(),
				getBillboardList()
			]);
		} catch (error) {
			console.error('Error fetching waterlevel data:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '데이터를 불러오는 중 오류가 발생했습니다.'
			});
		}
	}, [getBillboardMessageList, getBillboardList]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const convertBillboardOptions = (messageList: BillboardMacro[]): BillboardOption[] => {
		return [
			DEFAULT_BILLBOARD_OPTION,
			...messageList.map(msg => ({
				value: msg.billboard_msg ?? '',
				label: msg.billboard_msg ?? '',
				id: msg.billboard_idx ?? -1,
				color: msg.billboard_color ?? ''
			}))
		];
	};

	useEffect(() => {
		if (billboardMessageList?.length > 0) {
			setBillboardOptions(convertBillboardOptions(billboardMessageList));
		}
	}, [billboardMessageList]);

	const handleChangeBillboardMacro = (selected: BillboardOption | null) => {
		if (!selected) {
			setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
			setBillboardMessage('');
			setSelectedColor('');
			return;
		}

		setSelectedBillboardMacro(selected);
		if (selected.id !== -1) {
			setBillboardMessage(selected.value);
			setSelectedColor(selected.color || '');
		} else {
			setBillboardMessage('');
			setSelectedColor('');
		}
	};

	const resetState = useCallback(() => {
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
		setBillboardMessage('');
		setSelectedColor('');
	}, []);

	const handleDisplayMessageChange = async () => {
		if (!checkAdminPermission()) {
			showDialog({
				type: 'alert',
				title: '권한 없음',
				message: '관리자 권한이 필요합니다.',
				onConfirm: closeDialog,
			});
			return;
		}
		if (!billboardMessage.trim()) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '표시할 메시지를 입력해주세요.',
				onConfirm: closeDialog
			});
			return;
		}

		if (!selectedColor) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '메시지 색상을 선택해주세요.',
				onConfirm: closeDialog
			});
			return;
		}

		if (billboardList.length < 1) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '등록된 전광판이 없습니다.',
				onConfirm: closeDialog
			});
			return;
		}

		setIsLoading(true);
		setIsConfirmDialogOpen(true);
	};

	const handleConfirm = async () => {
		setIsConfirmDialogOpen(false);

		try {
			const success = await updateAllBillboards({
				billboard_msg: billboardMessage,
				billboard_color: selectedColor,
				id: user.userId || ''
			});

			if (success) {
				resetState();
				showDialog({
					type: 'alert',
					title: '알림',
					message: '전광판 메시지가 변경되었습니다.',
					onConfirm: closeDialog
				});
			} else {
				showDialog({
					type: 'alert',
					title: '오류',
					message: '전광판 메시지 변경에 실패했습니다.',
					onConfirm: closeDialog
				});
			}
		} catch (error) {
			console.error('에러 발생:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '전광판 메시지 변경 중 오류가 발생했습니다.',
				onConfirm: closeDialog
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setIsConfirmDialogOpen(false);
		setIsLoading(false);
	};

	const handleConfirmChange = async () => {
		closeDialog();

		try {
			const success = await updateAllBillboards({
				billboard_msg: billboardMessage,
				billboard_color: selectedColor,
				id: user.userId || ''
			});

			if (success) {
				resetState();
				showDialog({
					type: 'alert',
					title: '알림',
					message: '전광판 메시지가 변경되었습니다.',
					onConfirm: closeDialog
				});
			} else {
				showDialog({
					type: 'alert',
					title: '오류',
					message: '전광판 메시지 변경에 실패했습니다.',
					onConfirm: closeDialog
				});
			}
		} catch (error) {
			showDialog({
				type: 'alert',
				title: '오류',
				message: '전광판 메시지 변경 중 오류가 발생했습니다.',
				onConfirm: closeDialog
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancelChange = () => {
		closeDialog();
		setIsLoading(false);
	};


	const handleChangeBillboardMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMessage = e.target.value;
		const maxLength = 26;

		if (newMessage.length > maxLength) {
			setBillboardMessage(newMessage.slice(0, maxLength));
			setTimeout(() => {
				showDialog({
					type: 'alert',
					title: '알림',
					message: `메시지는 최대 ${maxLength}자까지 입력 가능합니다.`,
				});
			}, 0);
		} else {
			setBillboardMessage(newMessage);
		}
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
	};

	return (
		<>
			<CommonAlertDialog
				isOpen={dialogState.isOpen}
				onClose={closeDialog}
				message={dialogState.message}
				title={dialogState.title}
				type={dialogState.type}
				onConfirm={dialogState.onConfirm}
			/>
			<CommonAlertDialog
				isOpen={isConfirmDialogOpen}
				onClose={handleCancel}
				message="모든 전광판 메시지를 변경하시겠습니까?"
				title="전광판 메시지 변경"
				type="confirm"
				onConfirm={handleConfirm}
			/>
			<div className="relative transform translate-y-1/2">
				<ScrollBar>
					<Dialog
						isOpen={isOpen}
						height="300px"
						className='z-[50]'
						contentClassName="dialog-content-location"
						onClose={onClose}
					>
						<div className="flex flex-col h-full">
							<div className="mb-4 border-b-2 border-gray-300 dark:border-gray-500 mt-2">
								<h2 className="text-lg font-semibold">전광판 전체 제어</h2>
							</div>

							<div className="flex-grow mt-4">
								<div className="flex gap-3 w-full">
									<div className="w-[80%]">
										<Select
											className="mb-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-200"
											placeholder="매크로 메시지"
											options={billboardOptions}
											menuPlacement="top"
											size='sm'
											onChange={handleChangeBillboardMacro}
											value={selectedBillboardMacro}
										/>
										<Input
											className={`dark:border-gray-600 dark:placeholder-gray-400 mt-2 
											${billboardMessage.length > 0 ? 'bg-[#020617] focus:bg-[#020617]' : 'bg-white focus:bg-white'}
											${selectedColor === 'green' ? 'text-green-500' :
													selectedColor === 'red' ? 'text-red-500' :
														selectedColor === 'yellow' ? 'text-yellow-500' : 'text-gray-700'
												} 
											dark:text-gray-200 `}
											placeholder="메시지 입력"
											name='billboardMessage'
											size='sm'
											value={billboardMessage}
											onChange={handleChangeBillboardMessage}
											type="text"
										/>
									</div>
									<div className="w-[20%]">
										<div className="flex gap-1 flex-col">
											<Button
												value={'green'}
												onClick={() => setSelectedColor('green')}
												className={`flex-1 h-8 bg-green-500 dark:bg-green-600 ${selectedColor === 'green' ? 'border-4 border-blue-800' : ''
													}`}
											/>
											<Button
												value={'red'}
												onClick={() => setSelectedColor('red')}
												className={`flex-1 h-8 bg-red-500 dark:bg-red-600 ${selectedColor === 'red' ? 'border-4 border-blue-800' : ''
													}`}
											/>
											<Button
												value={'yellow'}
												onClick={() => setSelectedColor('yellow')}
												className={`flex-1 h-8 bg-yellow-500 dark:bg-yellow-600 ${selectedColor === 'yellow' ? 'border-4 border-blue-800' : ''
													}`}
											/>
										</div>
										<div className="items-center">
											<Button
												disabled={isLoading}
												onClick={handleDisplayMessageChange}
												className="w-[4.7vw] h-8 flex justify-center items-center border border-2 rounded mt-2"
											>
												변경
											</Button>
										</div>
									</div>
								</div>
							</div>
							<div className="flex justify-end mt-4 pt-2 border-t border-gray-200 dark:border-gray-700">
								<Button
									onClick={onClose}
									className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
									size="sm"
									variant="solid"
								>
									닫기
								</Button>
							</div>
						</div>
					</Dialog>
				</ScrollBar>
			</div>
		</>
	);
}

