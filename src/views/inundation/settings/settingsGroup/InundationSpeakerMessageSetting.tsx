import React, { useEffect, useState } from 'react';
import { ScrollBar } from '@/components/ui';
import { Button } from '@/components/ui';
import { useSettingsStore } from '@/store/inundation/useSettingsStore';
import { Speaker } from '@/@types/socket';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ConfirmDialog } from '@/components/shared';

export default function InundationSpeakerMessageSetting() {
	const { socketService } = useSocketConnection();

	const [dialogIsOpen, setIsOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isEditMode, setIsEditMode] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
	const [formData, setFormData] = useState<{
		speakerMessage: string;
		speakerMessageIdx: number | null;
	}>({
		speakerMessage: '',
		speakerMessageIdx: null
	});

	const {
		addSpeakerMessage,
		modifySpeakerMessage,
		deleteSpeakerMessage,
		getSpeakerMessageList,
		speakerMessageList
	} = useSettingsStore();

	useEffect(() => {
		getSpeakerMessageList();

		if (socketService) {
			const unsubscribe = socketService.subscribe('fl_speakers-update', (received) => {
				if (received) {
					getSpeakerMessageList();
					console.log('스피커 메시지 리스트 업데이트:', received);
				}
			});
			return () => unsubscribe();
		}
	}, [socketService, getSpeakerMessageList]);

	useEffect(() => {
		console.log('speakerMessageList:',speakerMessageList)
	}, [speakerMessageList])

	const handleSelectMessage = (message: any) => {
		if (isEditMode) {
			setIsEditMode(false);
			setFormData({
				speakerMessage: '',
				speakerMessageIdx: 0
			});
		}
		setSelectedMessages(prev => {
			if (prev.includes(message.speaker_idx)) {
				return prev.filter(id => id !== message.speaker_idx);
			}
			return [...prev, message.speaker_idx];
		});
	};
	const onDialogConfirm = async () => {
		if (!formData.speakerMessage.trim()) {
			setErrorMessage('문구를 입력해주세요.');
			setIsOpen(true);
			return;
		}

		try {
			if (isEditMode) {
				await modifySpeakerMessage(formData as unknown as Speaker);
			} else {
				await addSpeakerMessage(formData as unknown as Speaker);
			}

			setFormData({
				speakerMessage: '',
				speakerMessageIdx: 0
			});
			setIsEditMode(false);
			setSelectedMessages([]);
			setIsOpen(false);
		} catch (error: any) {
			setErrorMessage(error.message || '오류가 발생했습니다.');
			setIsOpen(true);
		}
	};

	const handleDeleteClick = () => {
		if (selectedMessages.length === 0) return;
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		try {
			const deletePromises = selectedMessages.map(idx =>
				deleteSpeakerMessage({ speakerMessageIdx: idx })
			);

			await Promise.all(deletePromises);
			setSelectedMessages([]);
			if (isEditMode) {
				setIsEditMode(false);
				setFormData({
					speakerMessage: '',
					speakerMessageIdx: 0
				});
			}
			setIsDeleteDialogOpen(false);
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
			const selectedMessage = speakerMessageList.find(msg => msg.speaker_idx === selectedMessages[0]);
			if (selectedMessage) {
				setFormData({
					speakerMessageIdx: selectedMessage.speaker_idx,
					speakerMessage: selectedMessage.speaker_msg
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
			speakerMessage: '',
			speakerMessageIdx: 0
		});
		setSelectedMessages([]);
	};

	return (
		<div className="flex mt-2 ml-2">
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

				<div className="bg-white dark:bg-gray-800 rounded-lg border-[0.075rem] border-gray-300">
					<h3 className="text-lg px-3 pt-3 pb-3 border-b-[0.075rem] border-gray-300 font-semibold">
						{isEditMode ? '문구 수정' : '문구 추가'}
					</h3>
					<div className='p-3'>
						<div className="space-y-4 mb-6">
							<div className="grid grid-cols-[120px,1fr] items-center gap-4">
								<label>문구</label>
								<input
									type="text"
									className="w-full p-2 border rounded"
									placeholder="문구를 입력하세요. (중복 문구는 저장되지 않습니다)"
									value={formData.speakerMessage}
									onChange={(e) => setFormData({ ...formData, speakerMessage: e.target.value })}
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
									className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
									size="sm"
									variant="solid"
									onClick={onDialogConfirm}
								>
									{isEditMode ? '수정' : '저장'}
								</Button>
							</div>
						</div>

						<div className="mt-8 w-full">
							<h3 className="text-lg font-semibold mb-4">저장 문구</h3>
							<ScrollBar className="max-h-[300px] w-full">
								<div className="space-y-2 w-full">
									{speakerMessageList?.map((item) => (
										<div key={item.speaker_msg} className="flex items-center gap-2 p-4 bg-gray-50 rounded">
											<input
												type="checkbox"
												checked={selectedMessages.includes(item.speaker_idx)}
												onChange={() => handleSelectMessage(item)}
												className="w-4 h-4"
											/>
											<span className="flex-1">{item.speaker_msg}</span>
										</div>
									))}
								</div>
							</ScrollBar>

							<div className="flex justify-end gap-2 mt-4 -mx-3 pb-1 border-t-[0.075rem] border-gray-300">
								<div className="px-3 flex items-center space-x-3 py-4 -mb-4">
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
		</div>
	);
}