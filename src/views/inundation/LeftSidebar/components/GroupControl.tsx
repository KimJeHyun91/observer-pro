import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Input, ScrollBar, Select, Switcher } from '@/components/ui';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useDeviceControlStore } from '@/store/Inundation/useDeviceControl';
import { ControlDeviceCrossingGate } from '../../worker/ControlDeviceCrossingGate';
import ControlDeviceSpeakerService from '../../worker/ControlDeviceSpeaker';
import { useSessionUser } from "@/store/authStore";
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';
import {
	BillboardMacro,
	DialogState,
	BillboardOption,
	SpeakerOption,
	SpeakerMessage,
} from '@/@types/inundation';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { apiGetAllAreaGroup } from '@/services/InundationService';
import inundationIcon from '@/configs/inundation-icon.config';

interface GroupControlProps {
	isOpen: boolean;
	onClose?: () => void;
}

interface GateControlResponse {
	status: 'success' | 'partial' | 'error';
	message: string;
	errorList?: Array<{
		ipaddress: string;
		message: string;
	}>;
	successList?: string[];
	cmd?: string;
	type?: 'all' | 'single';
}

interface WaterlevelState {
	water_level_linked_status: boolean;
	water_level_idx: number;
	water_level_ip: string;
	threshold?: string;
	curr_water_level?: string;
}

interface Group {
	id?: string;
	name: string;
	areas: string[];
}

const convertBillboardOptions = (messageList: BillboardMacro[]) => {
	return messageList.map(msg => ({
		value: msg.billboard_msg || '',
		label: msg.billboard_msg || '',
		color: msg.billboard_color || '',
		id: msg.billboard_idx || 0
	}));
};

const convertSpeakerOptions = (messageList: SpeakerMessage[]) => {
	return messageList.map(msg => ({
		value: msg.speaker_msg,
		label: msg.speaker_msg,
		id: msg.speaker_idx
	}));
};

const DEFAULT_SELECT_OPTION: SpeakerOption = {
	value: '',
	label: '메시지 선택',
	id: -1,
};

const DEFAULT_BILLBOARD_OPTION: BillboardOption = {
	value: '',
	label: '메시지 선택',
	id: -1,
	color: ''
};

const BROADCAST_DELAY_TIME = 1000 * 5;

export function GroupControl({ isOpen, onClose }: GroupControlProps) {
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
		onConfirm: undefined,
		onCancel: undefined
	});
	const [isLoading, setIsLoading] = useState(false);
	const [selectedBillboardMacro, setSelectedBillboardMacro] = useState<BillboardOption>(DEFAULT_BILLBOARD_OPTION);
	const [billboardMessage, setBillboardMessage] = useState('');
	const [selectedColor, setSelectedColor] = useState('');
	const [billboardOptions, setBillboardOptions] = useState<BillboardOption[]>([]);
	const [selectedSpeakerMacro, setSelectedSpeakerMacro] = useState<SpeakerOption>(DEFAULT_SELECT_OPTION);
	const [speakerMessage, setSpeakerMessage] = useState('');
	const [speakerOptions, setSpeakerOptions] = useState<SpeakerOption[]>([]);
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
	const [groupName, setGroupName] = useState('');
	const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

	const {
		speakerMessageList,
		getSpeakerMessageList,
		billboardMessageList,
		getBillboardMessageList,
	} = useSettingsStore();
	const {
		billboardList,
		getBillboardList,
		updateGroupBillboards,
		getCrossingGateList,
		crossingGateList,
		getSpeakerList,
		speakerList
	} = useDeviceControlStore();


	const { user } = useSessionUser();
	const { checkAdminPermission } = useCheckOperatorPermission();

	const dialogRef = useRef<((value: boolean) => void) | null>(null);

	const showDialog = useCallback((dialogConfig: Partial<DialogState>) => {
		setDialogState(prev => ({
			...prev,
			isOpen: true,
			...dialogConfig
		}));
	}, []);


	const fetchGroups = useCallback(async () => {
		try {
			const response = await apiGetAllAreaGroup();
			if (Array.isArray(response.result)) {
				setGroups(response.result);
			} else {
				console.error('Unexpected response format:', response);
			}
		} catch (error) {
			console.error('Error fetching groups:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '그룹 데이터를 불러오는 중 오류가 발생했습니다.',
			});
		} finally {
			setIsLoading(false);
		}
	}, [getCrossingGateList, getBillboardMessageList, getBillboardList, showDialog]);

	useEffect(() => {
		if (isOpen) {
			fetchGroups();
			setSelectedGroup(null);
			setGroupName('');
			setSelectedAreas([]);
			setBillboardMessage('');
			setSpeakerMessage('');
		}
	}, [isOpen, fetchGroups]);

	useEffect(() => {
		if (billboardMessageList?.length > 0) {
			setBillboardOptions(convertBillboardOptions(billboardMessageList));
		}
	}, [billboardMessageList]);

	useEffect(() => {
		if (speakerMessageList?.length > 0) {
			setSpeakerOptions(convertSpeakerOptions(speakerMessageList));
		}
	}, [speakerMessageList]);

	const handleGroupSelect = useCallback((group: Group) => {
		setSelectedGroup(group);
		setGroupName(group.name);
		setSelectedAreas([...group.areas]);
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
			await Promise.all([
				getCrossingGateList(),
				getBillboardMessageList(),
				getBillboardList(),
				getSpeakerMessageList(),
				getSpeakerList()
			]);
		} catch (error) {
			console.error('Error fetching crossing gate data:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '차단기 데이터를 불러오는 중 오류가 발생했습니다.'
			});
		}
	}, [getCrossingGateList, showDialog]);

	useEffect(() => {
		if (isOpen) {
			fetchData();
		}
	}, [fetchData, isOpen]);

	const handleControlCrossinggate = async (cmd: 'open' | 'close') => {
		if (!checkAdminPermission(showDialog)) return;

		if (!selectedGroup) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '좌측 메뉴의 그룹을 선택해주세요',
				onConfirm: closeDialog,
			});
			return;
		}

		try {
			setIsLoading(true);

			const groupGateIps = crossingGateList
				.filter(gate =>
					selectedGroup.areas.some(area => area.outside_idx === gate.idx)
				)
				.map(gate => gate.crossing_gate_ip);

			if (!groupGateIps.length) {
				showDialog({
					type: 'alert',
					title: '오류',
					message: '선택된 그룹에 차단기가 없습니다.',
					onConfirm: closeDialog,
				});
				setIsLoading(false);
				return;
			}

			const confirmed = await new Promise<boolean>((resolve) => {
				dialogRef.current = resolve;
				showDialog({
					type: 'confirm',
					title: '그룹 차단기 제어',
					message: `그룹 '${selectedGroup.name}' 내 ${groupGateIps.length}개 차단기를 ${cmd === 'open' ? '여' : '닫으'}시겠습니까?`,
					onConfirm: () => resolve(true),
					onCancel: () => resolve(false),
				});
			});

			if (!confirmed) {
				setIsLoading(false);
				return;
			}

			showDialog({
				type: 'alert',
				title: '알림',
				message: '경고 방송 후 차단기를 제어합니다.',
				onConfirm: closeDialog,
			});

			showDialog({
				type: 'alert',
				title: '알림',
				message: `경고 방송 중입니다. ${BROADCAST_DELAY_TIME / 1000}초 후 모든 차단기가 ${cmd === 'open' ? '열립니다' : '닫힙니다'}.`,
				onConfirm: closeDialog,
			});

			const speakerService = new ControlDeviceSpeakerService('all');
			speakerService.controlGate().catch(error => {
				console.error('경고 방송 실행 중 오류:', error);
			});

			setTimeout(async () => {
				try {
					const result: GateControlResponse = await ControlDeviceCrossingGate({
						type: 'group',
						cmd,
						crossing_gate_ips: groupGateIps,
						id: user.userId || ''
					});

					if (!result || !result.status) {
						throw new Error('유효하지 않은 응답 형식');
					}

					if (result.status === 'error' && !result.errorList?.length) {
						showDialog({
							type: 'alert',
							title: '오류',
							message: result.message || '알 수 없는 오류가 발생했습니다.',
							onConfirm: closeDialog,
						});
						setIsLoading(false);
						return;
					}

					const failureMessage = result.errorList?.length
						? `\n\n실패한 차단기:\n${result.errorList
							.map(err => `• ${err.ipaddress}: ${err.message}`)
							.join('\n')}`
						: '';

					const dialogTitle = {
						success: '알림',
						partial: '부분 성공',
						error: '실패'
					}[result.status] || '알림'; // 기본값 추가

					showDialog({
						type: 'alert',
						title: dialogTitle,
						message: `${result.message || '처리 완료'}${failureMessage}`,
						onConfirm: closeDialog,
					});

					fetchData();
				} catch (error) {
					console.error('Group crossing gate control error:', error);
					showDialog({
						type: 'alert',
						title: '오류',
						message: '그룹 차단기 제어 중 오류가 발생했습니다.',
						onConfirm: closeDialog,
					});
				} finally {
					setIsLoading(false);
				}
			}, BROADCAST_DELAY_TIME);
		} catch (error) {
			console.error('Crossing gate control error:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '차단기 제어 중 오류가 발생했습니다.',
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

	const handleSpeakerGroupBroadcast = async (type: 'broadcast' | 'warning') => {
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

		if (!selectedGroup) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '좌측 메뉴의 그룹을 선택해주세요',
				onConfirm: closeDialog,
			});
			return;
		}

		const groupSpeakerIps = speakerList
			.filter(speaker => selectedGroup.areas.some(area => area.outside_idx === speaker.outside_idx))
			.map(speaker => speaker.speaker_ip);

		if (!groupSpeakerIps.length) {
			showDialog({
				type: 'alert',
				title: '오류',
				message: '선택된 그룹에 스피커가 없습니다.',
				onConfirm: closeDialog
			});
			return;
		}

		if (type === 'broadcast' && !speakerMessage.trim()) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '방송할 메시지를 입력해주세요.',
				onConfirm: closeDialog
			});
			return;
		}

		try {
			setIsLoading(true);
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '그룹 스피커 방송',
					message: `그룹 '${selectedGroup.name}' 내 ${groupSpeakerIps.length}개 스피커로 ${type === 'broadcast' ? '음성을' : '경고음을'} 출력하시겠습니까?`,
					onConfirm: () => resolve(true),
					onCancel: () => resolve(false),
				});
			});

			if (!confirmed) {
				setIsLoading(false);
				return;
			}

			const speakerService = new ControlDeviceSpeakerService('group', groupSpeakerIps);
			showDialog({
				type: 'alert',
				title: '알림',
				message: type === 'broadcast' ? '그룹 스피커 방송이 시작되었습니다.' : '그룹 스피커 경고음이 출력됩니다.',
				onConfirm: closeDialog
			});

			let result;
			if (type === 'broadcast') {
				result = await speakerService.playSpeakerMessage(speakerMessage);
			} else {
				result = await speakerService.clickSound();
			}

			if (result.success) {
				const { message, result: detail } = result;
				const { total, successCount, failCount, failList = [] } = detail || {};

				let detailMessage = '';
				if (typeof total === 'number' && typeof successCount === 'number') {
					detailMessage = `${total}개 중 ${successCount}개 성공했습니다.`;

					if (failCount > 0 && failList.length > 0) {
						const failedItems = failList.map(item =>
							item?.ip || item?.toString() || String(item)
						);

						detailMessage += `\n실패 개소: [ ${failedItems.join(', ')} ]`;
					}
				} else {
					detailMessage = type === 'broadcast'
						? `${message}했습니다.`
						: '그룹 경고음 출력이 완료되었습니다.';
				}

				console.log('Group speaker broadcast success:', result);

				showDialog({
					type: 'alert',
					title: '알림',
					message: detailMessage,
					onConfirm: closeDialog,
				});

				setSpeakerMessage('');
				setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
			} else {
				throw new Error(result.error || '그룹 스피커 제어 중 오류 발생');
			}
		} catch (error) {
			console.error('Group speaker broadcast error:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '그룹 스피커 제어 중 오류가 발생했습니다.',
				onConfirm: closeDialog
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleChangeSpeakerMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
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

	const handleChangeBillboardMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMessage = e.target.value;
		const minLength = 5;
		const maxLength = 26;

		if (newMessage.length <= maxLength) {
			setBillboardMessage(newMessage);
			setSelectedBillboardMacro(DEFAULT_SELECT_OPTION);
		} else {
			setDialogState({
				isOpen: true,
				type: 'alert',
				message: `메시지는 ${minLength}자 이상 ${maxLength}자 이하로 작성해주세요.`,
			});
			setBillboardMessage(newMessage.slice(0, maxLength));
			setSelectedBillboardMacro(DEFAULT_SELECT_OPTION);
		}
	};

	const handleBillboardGroupMessageChange = async () => {
		if (!checkAdminPermission(showDialog)) return;
		if (!selectedGroup) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '좌측 메뉴의 그룹을 선택해주세요',
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

		const groupBillboardIps = billboardList
			.filter(board => selectedGroup.areas.some(area => area.outside_idx === board.outside_idx))
			.map(board => board.billboard_ip);

		if (!groupBillboardIps.length) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '선택된 그룹에 전광판이 없습니다.',
				onConfirm: closeDialog
			});
			return;
		}

	  try {
        const confirmed = await new Promise<boolean>((resolve) => {
            showDialog({
                type: 'confirm',
                title: '그룹 전광판 메시지 변경',
                message: `그룹 '${selectedGroup.name}' 내 ${groupBillboardIps.length}개 전광판 메시지를 변경하시겠습니까?`,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });

        if (!confirmed) {
            return;
        }

        setIsLoading(true);

        const result = await updateGroupBillboards({
            billboard_ips: groupBillboardIps,
            billboard_msg: billboardMessage,
            billboard_color: selectedColor,
            id: user.userId || ''
        });

        if (result && result.success.length > 0) {
            resetState();
            showDialog({
                type: 'alert',
                title: '알림',
                message: '그룹 전광판 메시지가 변경되었습니다.',
                onConfirm: closeDialog
            });
        } else {
            showDialog({
                type: 'alert',
                title: '오류',
                message: '그룹 전광판 메시지 변경에 실패했습니다.',
                onConfirm: closeDialog
            });
        }
    } catch (error) {
        console.error('Group billboard message change error:', error);
        showDialog({
            type: 'alert',
            title: '오류',
            message: '그룹 전광판 메시지 변경 중 오류가 발생했습니다.',
            onConfirm: closeDialog
        });
    } finally {
        setIsLoading(false);
    }
};

	const resetState = useCallback(() => {
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
		setBillboardMessage('');
		setSelectedColor('');
	}, []);

	const sortedGroups = useMemo(() => {
        if (!groups || groups.length === 0) return [];
        
        return [...groups].sort((a, b) => {
            const regex = /^([^\d]*)(\d*)$/;
            
            const [, textA, numA] = a.name.match(regex) || ["", "", "0"];
            const [, textB, numB] = b.name.match(regex) || ["", "", "0"];

            if (textA !== textB) {
                return textA.localeCompare(textB);
            }

            return parseInt(numA || "0", 10) - parseInt(numB || "0", 10);
        });
    }, [groups]);

	 const getSortedAreas = useCallback((areas) => {
        if (!areas || areas.length === 0) return [];
        
        return [...areas].sort((a, b) => {
            const regex = /^([^\d]*)(\d*)$/;
            const [, textA, numA] = a.outside_name.match(regex) || ["", "", "0"];
            const [, textB, numB] = b.outside_name.match(regex) || ["", "", "0"];

            if (textA !== textB) {
                return textA.localeCompare(textB);
            }

            return parseInt(numA || "0", 10) - parseInt(numB || "0", 10);
        });
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
			<ScrollBar>
				{isOpen && (
					<Dialog
						isOpen={isOpen}
						height="700px"
						width='800px'
						className='z-[50]'
						// contentClassName="dialog-content-groupControl"
						onClose={onClose}
					>
						<h5>그룹 제어</h5>
						<div className="w-full border-b-2 border-gray-300 dark:border-gray-700 mt-6" />
						<div className="flex flex-1 p-2 mt-2">
							<div className=" flex-shrink-0 w-[30%]">
								<div className="flex flex-col px-1 py-1 mr-2">
									<div className="h-[580px] bg-white dark:bg-gray-800 shadow-md rounded-lg p-3 flex flex-col">
										<span className="font-bold text-black dark:text-white mb-2">그룹 목록</span>
										<li className="flex justify-between border-solid border-b-2 dark:border-gray-700" />
										<div className="mt-2 space-y-1 flex-1 overflow-auto" >
											{sortedGroups.length > 0 ? (
                    sortedGroups.map((group) => {
                        const isSelected = selectedGroup?.id === group.id;
                        const sortedAreas = getSortedAreas(group.areas);

                        return (
                            <div key={group.id} className="mb-2">
                                <div 
                                    className={`
                                        px-4 py-2 font-medium 
                                        rounded cursor-pointer 
                                        mr-2 
                                        ${isSelected
                                            ? 'text-gray-50 bg-gray-600' 
                                            : 'text-gray-700 bg-gray-100 dark:text-gray-800 dark:bg-gray-400'
                                        }
                                    `}
                                    onClick={() => handleGroupSelect(group)}
                                >
                                    {group.name}
                                </div>

                                <div>
                                    {sortedAreas.map((area) => (
                                        <div
                                            key={area.outside_idx}
                                            className={`
                                                px-8 py-2 text-sm
                                                ${isSelected 
                                                    ? 'text-gray-800 font-bold dark:text-gray-200' 
                                                    : 'text-gray-600 dark:text-gray-200'
                                                }
                                            `}
                                        >
                                            {area.outside_name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                        그룹 생성 후 사용
                    </span>
                )}
										</div>
									</div>
								</div>
							</div>

							<div className='flex flex-col'>
								<h5 className=''>
									{selectedGroup ? '선택 그룹: ' + selectedGroup.name + ' (해당 그룹 내 장치 제어)' : ''}</h5>
								<div className="h-[305px]  gap-3 mb-1 mr-1 w-[70%] mt-4">
									<div className="flex flex-col gap-3">
										<div className="h-[170px] w-[520px] bg-gray-200 dark:bg-gray-600 shadow-md rounded-lg p-3">
											<div className="flex justify-between items-center w-full border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
												<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
													진입차단기
												</h4>
											</div>
											<div className="flex justify-between items-center mt-6">
												<div className="flex gap-14 w-full justify-center items-center">
													<Button
														onClick={() => handleControlCrossinggate('open')}
														type="button"
														className="px-6 py-8 bg-green-500 dark:bg-green-500 text-white text-lg font-semibold rounded-xl hover:bg-green-600 transition-colors flex justify-center items-center"
														disabled={isLoading}
													>
														{isLoading ? '처리 중...' : '그룹 차단기 열기'}
													</Button>
													<Button
														onClick={() => handleControlCrossinggate('close')}
														type="button"
														className="px-6 py-8 bg-red-500 dark:bg-red-500 text-white text-lg font-semibold rounded-xl hover:bg-red-600 transition-colors flex justify-center items-center"
														disabled={isLoading}
													>
														{isLoading ? '처리 중...' : '그룹 차단기 닫기'}
													</Button>
												</div>
											</div>
										</div>

										<div className="h-[170px]  w-[520px] bg-gray-200 dark:bg-gray-600 shadow-md rounded-lg p-3">
											<div className="flex justify-between items-center mb-3 border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
												<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
													<span className="text-black-500 dark:text-gray-200 text-xl">
													</span>
													전광판
												</h4>
											</div>
											<div className="flex gap-3">
												<div className="w-[80%]">
													<Select
														className="mb-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-200"
														placeholder="매크로 메시지"
														options={billboardOptions}
														menuPlacement="top"
														size="sm"
														onChange={handleChangeBillboardMacro}
														value={selectedBillboardMacro}
													/>
													<Input
														className={`dark:border-gray-600 dark:placeholder-gray-400 mt-2 
																${billboardMessage.length > 0 ? 'bg-[#020617] focus:bg-[#020617]' : 'bg-white focus:bg-white'}
																${selectedColor === 'green' ? 'text-green-500' :
																selectedColor === 'red' ? 'text-red-500' :
																	selectedColor === 'yellow' ? 'text-yellow-500' : 'text-gray-700'
															} dark:text-gray-200`}
														placeholder="메시지 입력"
														name="billboardMessage"
														size="sm"
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
															className={`flex-1 h-8 bg-green-500 dark:bg-green-600 ${selectedColor === 'green' ? 'border-4 border-blue-800' : ''}`}
														/>
														<Button
															value={'red'}
															onClick={() => setSelectedColor('red')}
															className={`flex-1 h-8 bg-red-500 dark:bg-red-600 ${selectedColor === 'red' ? 'border-4 border-blue-800' : ''}`}
														/>
														<Button
															value={'yellow'}
															onClick={() => setSelectedColor('yellow')}
															className={`flex-1 h-8 bg-yellow-500 dark:bg-yellow-600 ${selectedColor === 'yellow' ? 'border-4 border-blue-800' : ''}`}
														/>
													</div>
													<div className="items-center">
														<Button
															disabled={isLoading}
															onClick={handleBillboardGroupMessageChange}
															className="w-[5.5vw] h-8 flex justify-center items-center border border-2 rounded mt-2"
														>
															변경
														</Button>
													</div>
												</div>
											</div>
										</div>

										<div className="flex-1 flex flex-col gap-3">
											<div className="h-[170px]  w-[520px] bg-gray-200 dark:bg-gray-600 shadow-md rounded-lg p-3">
												<div className="flex justify-between items-center w-full border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
													<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
														<span className="text-black-500 dark:text-gray-200 text-xl">
														</span>
														스피커
													</h4>
												</div>
												<div className="flex gap-3 w-full">
													<div className="w-[90%]">
														<Select
															className="mb-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-200 mt-2"
															placeholder="메시지 선택"
															options={speakerOptions}
															menuPlacement="top"
															size='sm'
															onChange={handleChangeSpeakerMacro}
															value={selectedSpeakerMacro}
														/>
														<Input
															className="mt-1 h-15 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
															placeholder="메시지 입력"
															size='sm'
															onChange={handleChangeSpeakerMessage}
															value={speakerMessage}
														/>
													</div>
													<div className="w-[10%]">
														<div className="flex flex-row gap-1 flex-col h-full">
															<button onClick={() => handleSpeakerGroupBroadcast('warning')} className="px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2">
																{inundationIcon.warningIcon}
															</button>
															<button onClick={() => handleSpeakerGroupBroadcast('broadcast')} className="px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2">
																{inundationIcon.speakerIcon}
															</button>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</Dialog>
				)}
			</ScrollBar>
		</>
	);
}