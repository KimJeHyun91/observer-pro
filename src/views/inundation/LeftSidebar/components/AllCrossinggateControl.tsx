import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog, ScrollBar } from '@/components/ui';
import { DialogState } from '@/@types/inundation';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useDeviceControlStore } from '@/store/Inundation/useDeviceControl';
import { ControlDeviceCrossingGate } from '../../worker/ControlDeviceCrossingGate';
import ControlDeviceSpeakerService from '../../worker/ControlDeviceSpeaker';
import { useSessionUser } from "@/store/authStore";
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';

interface AllCrossinggateControlProps {
	isOpen: boolean;
	onClose?: () => void;
}

const BROADCAST_DELAY_TIME = 1000 * 5;

interface GateControlResponse {
	status: 'success' | 'partial' | 'error';
	message: string;
	errorList?: Array<{
		ipaddress: string;
		message: string;
	}>;
	successList?: string[];
	cmd?: string;
	type?: 'all' | 'single' | 'group';
	ipaddress?: string;
}

export function AllCrossinggateControl({ isOpen, onClose }: AllCrossinggateControlProps) {
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
		onConfirm: undefined,
		onCancel: undefined
	});
	const [isLoading, setIsLoading] = useState(false);

	const { user } = useSessionUser();
	const { checkAdminPermission } = useCheckOperatorPermission();

	const dialogRef = useRef<((value: boolean) => void) | null>(null);


	const {
		getCrossingGateList,
		crossingGateList
	} = useDeviceControlStore();

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

	const fetchData = useCallback(async () => {
		try {
			if (crossingGateList.length === 0) {
				await getCrossingGateList();
			}
		} catch (error) {
			console.error('Error fetching crossing gate data:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '차단기 데이터를 불러오는 중 오류가 발생했습니다.'
			});
		}
	}, [getCrossingGateList, crossingGateList.length, showDialog]);

	useEffect(() => {
		if (isOpen) {
			fetchData();
		}
	}, [fetchData, isOpen]);

	const formatControlResult = (result: GateControlResponse): { title: string; message: string } => {
		const actionText = result.cmd === 'open' ? '열기' : '닫기';

		if (result.type === 'all' || result.type === 'group') {
			const successCount = result.successList?.length || 0;
			const errorCount = result.errorList?.length || 0;
			const totalCount = successCount + errorCount;

			let title: string;
			let message: string;

			if (result.status === 'success') {
				title = '성공';
				message = `모든 차단기 ${actionText}가 성공했습니다.\n\n총 ${totalCount}개 차단기가 처리되었습니다.`;

				if (successCount > 0 && result.successList) {
					message += `\n\n 성공한 차단기 (${successCount}개):`;
					result.successList.forEach((ip, index) => {
						message += `\n• ${ip}`;
						if (index >= 9 && result.successList!.length > 10) {
							message += `\n• ... 외 ${result.successList!.length - 10}개`;
							return false;
						}
					});
				}
			} else if (result.status === 'partial') {
				title = '성공 (일부 주의사항)';
				message = `총 ${totalCount}개 중 ${successCount}개 성공`;

				if (errorCount > 0) {
					message += `, ${errorCount}개 처리 못함`;
				}

				if (successCount > 0 && result.successList) {
					message += `\n\n✅ 정상 처리된 차단기 (${successCount}개):`;
					result.successList.slice(0, 8).forEach(ip => {
						message += `\n• ${ip}`;
					});
					if (result.successList.length > 8) {
						message += `\n• ... 외 ${result.successList.length - 8}개`;
					}
				}

				if (errorCount > 0 && result.errorList) {
					message += `\n\n⚠️ 처리되지 않은 차단기 (${errorCount}개):`;
					result.errorList.slice(0, 5).forEach(error => {
						message += `\n• ${error.ipaddress} (${error.message})`;
					});
					if (result.errorList.length > 5) {
						message += `\n• ... 외 ${result.errorList.length - 5}개`;
					}
					message += `\n\n※ 처리되지 않은 차단기는 연결 상태 확인 및 개별 시도해주세요.`;
				}
			} else {
				title = '처리 실패';
				message = `차단기 ${actionText} 처리에 문제가 발생했습니다.\n\n총 ${totalCount}개 차단기 중 처리된 것이 없습니다.`;

				if (errorCount > 0 && result.errorList) {
					message += `\n\n❌ 처리 실패한 차단기 (${errorCount}개):`;
					result.errorList.slice(0, 10).forEach(error => {
						message += `\n• ${error.ipaddress} (${error.message})`;
					});
					if (result.errorList.length > 10) {
						message += `\n• ... 외 ${result.errorList.length - 10}개`;
					}
					message += `\n\n※ 네트워크 연결 상태를 확인한 후 다시 시도해주세요.`;
				}
			}

			return { title, message };
		}
		else {
			const title = result.status === 'success' || result.status === true ? '성공' : '실패';
			const message = result.status === 'success' || result.status === true
				? `차단기 ${actionText}가 성공했습니다.\n\n• ${result.ipaddress} (${result.cmd})`
				: `차단기 ${actionText}가 실패했습니다.\n\n• ${result.ipaddress} (${result.cmd})`;

			return { title, message };
		}
	};

	const handleControlCrossinggate = async (cmd: 'open' | 'close') => {
		if (!checkAdminPermission()) {
			showDialog({
				type: 'alert',
				title: '권한 없음',
				message: '관리자 권한이 필요합니다.',
				onConfirm: closeDialog,
			});
			return;
		}

		try {
			const actionText = cmd === 'open' ? '열기' : '닫기';

			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '전체 차단기 제어',
					message: `모든 차단기를 ${actionText}하시겠습니까?\n\n총 ${crossingGateList.length}개의 차단기가 제어됩니다.`,
					onConfirm: () => {
						closeDialog();
						resolve(true);
					},
					onCancel: () => {
						closeDialog();
						resolve(false);
					}
				});
			});

			if (!confirmed) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);

			const speakerService = new ControlDeviceSpeakerService('all');
			await speakerService.controlGate();

			setTimeout(async () => {
				try {
					const result: GateControlResponse = await ControlDeviceCrossingGate({
						type: 'all',
						cmd,
						crossing_gate_ip: '',
						outside_idx: 0,
						id: user.userId || ''
					});

					if (!result) {
						showDialog({
							type: 'alert',
							title: '오류',
							message: '차단기 제어 응답을 받지 못했습니다.',
							onConfirm: closeDialog,
						});
						setIsLoading(false);
						return;
					}

					const { title, message } = formatControlResult(result);

					showDialog({
						type: 'alert',
						title: title,
						message: message,
						onConfirm: closeDialog,
					});

				} catch (error) {
					console.error('Error Message:', error instanceof Error ? error.message : 'Unknown error');

					showDialog({
						type: 'alert',
						title: '오류',
						message: `차단기 제어 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
						onConfirm: closeDialog,
					});
				} finally {
					setIsLoading(false);
				}
			}, BROADCAST_DELAY_TIME);

		} catch (error) {
			showDialog({
				type: 'alert',
				title: '오류',
				message: `차단기 제어 중 오류가 발생했습니다.\n\n오류 내용: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
				onConfirm: closeDialog,
			});
			setIsLoading(false);
		}
	};

	useEffect(() => {
		return () => {
			dialogRef.current = null;
			setDialogState(prev => ({ ...prev, isOpen: false }));
		};
	}, []);

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
							height="300px"
							className='z-[50]'
							contentClassName="dialog-content-location"
							onClose={onClose}
						>
							<div className="flex flex-col h-full">
								<div className="mb-4 border-b-2 border-gray-300 dark:border-gray-500 mt-2">
									<h2 className="text-lg font-semibold">
										차단기 전체 제어
										{crossingGateList?.length > 0 && ` (${crossingGateList.length}개)`}
									</h2>
								</div>
								<div className="flex-grow mt-4">
									<div className="flex gap-14 w-full justify-center items-center mt-4">
										<Button
											onClick={() => handleControlCrossinggate('open')}
											type="button"
											className="px-10 py-10 bg-green-500 dark:bg-green-500 text-white text-lg font-semibold rounded-xl hover:bg-green-600 transition-colors flex justify-center items-center"
											disabled={isLoading}
										>
											{isLoading ? '처리 중...' : '전체 열기'}
										</Button>
										<Button
											onClick={() => handleControlCrossinggate('close')}
											type="button"
											className="px-10 py-10 bg-red-500 dark:bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center"
											disabled={isLoading}
										>
											{isLoading ? '처리 중...' : '전체 닫기'}
										</Button>
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
					)}
				</ScrollBar>
			</div>
		</>
	);
}