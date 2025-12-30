import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, Input, ScrollBar, Select } from '@/components/ui';
import { DialogState, SpeakerMessage, SpeakerOption } from '@/@types/inundation';
import inundationIcon from '../../../../configs/inundation-icon.config';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useDeviceControlStore } from '@/store/Inundation/useDeviceControl';
import ControlDeviceSpeakerService from '../../worker/ControlDeviceSpeaker';
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';

interface AllSpeakerControlProps {
	isOpen: boolean;
	onClose?: () => void;
}

const DEFAULT_SELECT_OPTION = {
	value: '',
	label: '메시지 선택',
	id: -1,
};

export function AllSpeakerControl({ isOpen, onClose }: AllSpeakerControlProps) {
	const [selectedSpeakerMacro, setSelectedSpeakerMacro] = useState<SpeakerOption>(DEFAULT_SELECT_OPTION);
	const [speakerMessage, setSpeakerMessage] = useState('');
	const [speakerOptions, setSpeakerOptions] = useState<SpeakerOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
	});

	const { speakerMessageList, getSpeakerMessageList } = useSettingsStore();
	const { getSpeakerList, speakerList } = useDeviceControlStore();

	const { checkAdminPermission } = useCheckOperatorPermission();

	const showDialog = (dialogConfig: Partial<DialogState>) => {
		setDialogState((prev) => ({
			...prev,
			isOpen: true,
			...dialogConfig,
			onConfirm: () => {
				dialogConfig.onConfirm?.();
				setDialogState((prev) => ({ ...prev, isOpen: false }));
			},
		}));
	};

	const closeDialog = () => {
		setDialogState((prev) => ({ ...prev, isOpen: false }));
	};

	const fetchData = useCallback(async () => {
		try {
			await Promise.all([getSpeakerMessageList(), getSpeakerList()]);
		} catch (error) {
			console.error('Error fetching data:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '데이터를 불러오는 중 오류가 발생했습니다.',
			});
		}
	}, [getSpeakerMessageList, getSpeakerList]);

	useEffect(() => {
		if (isOpen) {
			fetchData();
		}
	}, [fetchData, isOpen]);

	const convertSpeakerOptions = (messageList: SpeakerMessage[]) => {
		return [
			DEFAULT_SELECT_OPTION,
			...messageList.map((msg) => ({
				value: msg.speaker_msg,
				label: msg.speaker_msg,
				id: msg.speaker_idx,
			})),
		];
	};

	useEffect(() => {
		if (speakerMessageList?.length > 0) {
			setSpeakerOptions(convertSpeakerOptions(speakerMessageList));
		}
	}, [speakerMessageList]);

	const handleChangeSpeakerMacro = (selected: SpeakerOption | null) => {
		if (!selected) {
			setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
			setSpeakerMessage('');
			return;
		}

		setSelectedSpeakerMacro(selected);
		if (selected.id !== -1) {
			setSpeakerMessage(selected.value);
		} else {
			setSpeakerMessage('');
		}
	};

	const resetState = useCallback(() => {
		setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		setSpeakerMessage('');
	}, []);

	const handleAllSpeakerBroadcast = async (type: 'broadcast' | 'click') => {
		if (!checkAdminPermission(showDialog)) return;

		const minLength = 5;
		const maxLength = 26;

		if (type === 'broadcast' && (minLength >= speakerMessage.length + 1) && (speakerMessage.length <= maxLength)) {

			showDialog({
				type: 'alert',
				title: '오류',
				message: `메시지는 ${minLength}자 이상 ${maxLength}자 이하로 작성해주세요.`,
				onConfirm: closeDialog
			});
			return;
		}

		if (isLoading) return;

		try {
			if (!speakerList || speakerList.length === 0) {
				showDialog({
					type: 'alert',
					title: '오류',
					message: '등록된 스피커가 없습니다.',
					onConfirm: closeDialog,
				});
				return;
			}

			if (type === 'broadcast' && !speakerMessage.trim()) {
				showDialog({
					type: 'alert',
					title: '알림',
					message: '방송할 메시지를 입력해주세요.',
					onConfirm: closeDialog,
				});
				return;
			}

			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '모든 스피커 제어',
					message: type === 'broadcast' ? '모든 스피커로 음성을 출력하시겠습니까?' : '모든 스피커로 경고음을 출력하시겠습니까?',
					onConfirm: () => {
						closeDialog();
						resolve(true);
					},
					onCancel: () => {
						closeDialog();
						resolve(false);
					},
				});
			});

			if (!confirmed) return;
			setIsLoading(true);
			showDialog({
				type: 'alert',
				title: '전송 중',
				message: type === 'broadcast' ? '스피커로 음성 메시지를 전송하고 있습니다...' : '스피커로 경고음을 전송하고 있습니다...',
			});

			const speakerService = new ControlDeviceSpeakerService('all');
			const result = await speakerService.broadcastToAll(type === 'broadcast' ? speakerMessage : '', type);

			setIsLoading(false);
			closeDialog();

			if (result.result.successCount > 0) {
				const message = result.result.failCount > 0
					? `${result.result.successCount}개 스피커 성공, ${result.result.failCount}개 스피커 실패\n\n실패한 스피커:\n${result.result.failList.map((f) => f.ip).join('\n')}`
					: `${result.result.successCount}개 스피커 모두 성공적으로 처리되었습니다.`;

				showDialog({
					type: 'alert',
					title: result.result.failCount > 0 ? '부분 성공' : '방송 완료',
					message,
					onConfirm: closeDialog,
				});
			} else {
				const failMessage = result.result.failList.length > 0
					? result.result.failList.map((f) => `${f.ip}: ${f.error || '알 수 없는 오류'}`).join('\n')
					: result.message;

				showDialog({
					type: 'alert',
					title: '방송 실패',
					message: `스피커 제어에 실패했습니다.\n\n실패한 스피커:\n${failMessage}`,
					onConfirm: closeDialog,
				});
			}
			resetState();
		} catch (error) {
			setIsLoading(false); 
			closeDialog(); 
			console.error('All speaker broadcast error:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: error instanceof Error ? error.message : '스피커 제어 중 오류가 발생했습니다.',
				onConfirm: closeDialog,
			});
		}
	};

	const handleChangeTtsMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMessage = e.target.value;
		const minLength = 5;
		const maxLength = 26;

		if (newMessage.length <= maxLength) {
			setSpeakerMessage(newMessage);
			setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		} else {
			setDialogState({
				isOpen: true,
				type: 'alert',
				message: `메시지는 ${minLength}자 이상 ${maxLength}자 이하로 작성해주세요.`,
			});
			setSpeakerMessage(newMessage.slice(0, maxLength));
			setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		}
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
			<div className="relative transform translate-y-1/2">
				<ScrollBar>
					<Dialog
						isOpen={isOpen}
						height="300px"
						className="z-[50]"
						contentClassName="dialog-content-location"
						onClose={onClose}
					>
						<div className="flex flex-col h-full">
							<div className="mb-4 border-b-2 border-gray-300 dark:border-gray-500 mt-2">
								<h2 className="text-lg font-semibold">스피커 전체 제어</h2>
							</div>

							<div className="flex-grow mt-4">
								<div className="flex gap-3 w-full">
									<div className="w-[90%]">
										<Select
											className="mb-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-200"
											placeholder="메시지 선택"
											options={speakerOptions}
											menuPlacement="top"
											size="sm"
											onChange={handleChangeSpeakerMacro}
											value={selectedSpeakerMacro}
											isDisabled={isLoading}
										/>
										<Input
											className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
											placeholder="메시지 입력"
											size="sm"
											onChange={handleChangeTtsMessage}
											value={speakerMessage}
											disabled={isLoading}
										/>
									</div>
									<div className="w-[10%]">
										<div className="flex flex-row gap-1 flex-col h-full">
											<button
												onClick={() => handleAllSpeakerBroadcast('click')}
												className="px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2"
												disabled={isLoading}

											>
												{inundationIcon.warningIcon}
											</button>
											<button
												onClick={() => handleAllSpeakerBroadcast('broadcast')}
												className="px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2"
											>
												{inundationIcon.speakerIcon}
											</button>
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
									disabled={isLoading}
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