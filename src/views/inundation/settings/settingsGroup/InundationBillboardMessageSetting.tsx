import React, { useEffect, useState } from 'react';
import { ScrollBar } from '@/components/ui';
import { Button } from '@/components/ui';
import { useSettingsStore } from '@/store/inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ConfirmDialog } from '@/components/shared';
import { BillboardMacro } from '@/@types/inundation';

export default function InundationBillboardMessageSetting() {
	const { socketService } = useSocketConnection();

	const [dialogIsOpen, setIsOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isEditMode, setIsEditMode] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const {
		addBillboardMessage,
		modifyBillboardMacroMessage,
		deleteBillboardMessage,
		getBillboardMessageList,
		billboardMessageList
	} = useSettingsStore();

	const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
	const [formData, setFormData] = useState<BillboardMacro>({
		billboard_msg: '',
		billboard_color: 'red',
		billboard_idx: 0
	});

	useEffect(() => {
		getBillboardMessageList();

		if (socketService) {
			const unsubscribe = socketService.subscribe('fl_billboards-update', (received) => {
				if (received) {
					getBillboardMessageList();
				}
			});
			return () => unsubscribe();
		}
	}, [socketService, getBillboardMessageList]);

	useEffect(() => {
		console.log('billboardMessageList:', billboardMessageList)
	}, [billboardMessageList])

	const handleSelectMessage = (messageId: number) => {
		if (isEditMode) {
			setIsEditMode(false);
			setFormData({
				billboard_msg: '',
				billboard_color: 'red',
				billboard_idx: 0
			});
		}
		setSelectedMessages(prev => {
			if (prev.includes(messageId)) {
				return prev.filter(id => id !== messageId);
			}
			return [...prev, messageId];
		});
	};

	const onDialogConfirm = async () => {
		if (!formData.billboard_msg?.trim()) {
			setErrorMessage('문구를 입력해주세요.');
			setIsOpen(true);
			return;
		}
		try {
			if (isEditMode) {
				await modifyBillboardMacroMessage(formData);
			} else {
				await addBillboardMessage(formData);
			}

			setFormData({
				billboard_msg: '',
				billboard_color: 'red',
				billboard_idx: 0
			});
			setIsEditMode(false);
			setSelectedMessages([]);
			setIsOpen(false);
		} catch (error: any) {
			setErrorMessage(error.message || '오류가 발생했습니다.');
			setIsOpen(true);
		}
	};


	const handleModify = async () => {
		if (selectedMessages.length !== 1) {
			setErrorMessage('하나의 문구만 선택해주세요.');
			setIsOpen(true);
			return;
		}

		try {
			const selectedMessage = billboardMessageList.find(msg => msg.billboard_idx === selectedMessages[0]);
			if (selectedMessage) {
				setFormData({
					billboard_idx: selectedMessage?.billboard_idx ?? 0,
					billboard_msg: selectedMessage?.billboard_msg || '',
					billboard_color: selectedMessage?.billboard_color || 'red'
				});
				setIsEditMode(true);
			}
		} catch (error: any) {
			setErrorMessage(error.message || '오류가 발생했습니다.');
			setIsOpen(true);
		}
	};

	const handleCancel = () => {
		setIsEditMode(false);
		setFormData({
			billboard_msg: '',
			billboard_color: 'red',
			billboard_idx: 0
		});
		setSelectedMessages([]);
	};

	const handleDeleteClick = () => {
		if (selectedMessages.length === 0) return;
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		try {
				const result = await deleteBillboardMessage({ billboard_idx: selectedMessages });

				// if (!result) {
				// 	console.error(`billboard_idx ${idx} 삭제 실패`);
				// 	throw new Error(`메시지 ID ${idx} 삭제에 실패했습니다.`);
				// }

			setSelectedMessages([]);
			if (isEditMode) {
				setIsEditMode(false);
				setFormData({
					billboard_msg: '',
					billboard_color: 'red',
					billboard_idx: 0
				});
			}
			setIsDeleteDialogOpen(false);

		} catch (error: any) {
			console.error('삭제 에러 상세:', error);
			setErrorMessage(error.message || '삭제 중 오류가 발생했습니다.');
			setIsOpen(true);
			setIsDeleteDialogOpen(false);
		}
	};

	return (
		<div className="flex h-full mt-2">
			<div className="flex-1 ml-6">
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
					<p>{selectedMessages.length}개의 메시지를 삭제하시겠습니까?</p>
				</ConfirmDialog>

				<div className="bg-white dark:bg-gray-800 rounded-lg p-3">
					<div className="mb-6">
						<span className="text-lg font-semibold">문구 색상</span>
						<div className="flex items-center gap-4 mb-4">
							<div
								className={`w-8 h-8 cursor-pointer ${formData.billboard_color === 'red' ? 'ring-2 ring-offset-2' : ''}`}
								style={{ backgroundColor: '#EF4444' }}
								onClick={() => setFormData({ ...formData, billboard_color: 'red' })}
							/>
							<div
								className={`w-8 h-8 cursor-pointer ${formData.billboard_color === 'yellow' ? 'ring-2 ring-offset-2' : ''}`}
								style={{ backgroundColor: '#EAB308' }}
								onClick={() => setFormData({ ...formData, billboard_color: 'yellow' })}
							/>
							<div
								className={`w-8 h-8 cursor-pointer ${formData.billboard_color === 'green' ? 'ring-2 ring-offset-2' : ''}`}
								style={{ backgroundColor: '#22C55E' }}
								onClick={() => setFormData({ ...formData, billboard_color: 'green' })}
							/>
						</div>
					</div>

					<h3 className="text-lg font-semibold mb-4">{isEditMode ? '문구 수정' : '문구 추가'}</h3>
					<div className="space-y-4 mb-6">
						<div className="grid grid-cols-[120px,1fr] items-center gap-4">
							<label>문구</label>
							<input
								type="text"
								className="w-full p-2 border rounded"
								placeholder="문구를 입력하세요. (중복 문구는 저장되지 않습니다)"
								value={formData.billboard_msg}
								onChange={(e) => setFormData({ ...formData, billboard_msg: e.target.value })}
							/>
						</div>
						<div className="flex justify-end gap-2">
							{isEditMode && (
								<Button
									className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
									size="sm"
									onClick={handleCancel}
								>
									취소
								</Button>
							)}
							<Button
								className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded font-white"
								size="sm"
								variant="solid"
								onClick={onDialogConfirm}
							>
								{isEditMode ? '수정' : '저장'}
							</Button>
						</div>
					</div>

					<div className="mt-8 border-[0.075rem] border-gray-300 rounded p-2">
						<h3 className="text-lg px-3 -mx-2 border-b-[0.075rem] border-gray-300 font-semibold">저장 문구</h3>
						<ScrollBar className="max-h-[250px]">
							<div className="space-y-2">
								{billboardMessageList.map((item) => (
									<div key={item.billboard_idx} className="flex items-center gap-2 p-4 bg-gray-50 rounded">
										<input
											type="checkbox"
											checked={selectedMessages.includes(item.billboard_idx || 0)}
											onChange={() => handleSelectMessage(item.billboard_idx || 0)}
											className="w-4 h-4"
										/>
										<span className="flex-1">{item.billboard_msg}</span>
										<div
											className="w-6 h-6 rounded-full"
											style={{
												backgroundColor: item.billboard_color === 'red' ? '#EF4444' :
													item.billboard_color === 'yellow' ? '#EAB308' : '#22C55E'
											}}
										/>
									</div>
								))}
							</div>
						</ScrollBar>

						<div className="flex justify-end gap-2 mt-4 -mx-2 pb-1 border-t-[0.075rem] border-gray-300">
							<div className="px-3 flex items-center space-x-3 py-2 -mb-2">
								<Button
									className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
									size="sm"
									onClick={handleDeleteClick}
									disabled={selectedMessages.length === 0}
								>
									삭제
								</Button>
								<Button
									className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
									size="sm"
									variant="solid"
									onClick={handleModify}
									disabled={selectedMessages.length > 1 || selectedMessages.length < 1}
								>
									수정
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}