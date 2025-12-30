import React, { useRef, ChangeEvent, useCallback, useEffect, useState, useMemo } from 'react';
import inundationIcon from '@/configs/inundation-icon.config';
import Switcher from '@/components/ui/Switcher';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAreaStore } from '@/store/Inundation/useAreaStore';
import { AlertDialog } from '@/components/shared/AlertDialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import MiniMap from './components/MiniMap';
import WaterlevelChart from './components/WaterlevelChart';
import WaterlevelCurrentStateBoard from './components/WaterlevelCurrentStateBoard';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import GuardianliteChannels from './components/GuardianliteControl'
import {
	BillboardMacro,
	DetailAreaProps,
	SelectedObject,
	Waterlevel,
	DialogState,
	BillboardOption,
	SpeakerOption,
	SpeakerMessage,
	AreaInformation,
	WaterLevelAutoControlResult
} from '@/@types/inundation';
import { useDeviceControlStore } from '@/store/Inundation/useDeviceControl';
import LiveStream from '@/components/common/camera/LiveStream';
import PtzControl from '@/components/common/camera/PtzControl';
import { ControlDeviceCrossingGate } from '../worker/ControlDeviceCrossingGate';
import ControlDeviceSpeakerService from '../worker/ControlDeviceSpeaker';
import { useSessionUser } from "@/store/authStore";
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';
import BillboardModal from '../modals/BillboardModal';
import { Tooltip } from '@/components/ui';
import { useWaterlevelLiveStore } from '@/store/Inundation/useWaterlevelLiveStore';
import AutoControlResultPopup from '@/components/shared/AutoControlResultPopup';

interface WaterlevelState {
	water_level_location: string;
	water_level_linked_status: boolean;
	water_level_idx: number;
	water_level_ip: string;
	water_level_name?: string;
	water_level_model?: string;
	threshold?: string;
	curr_water_level?: string;
}

const ConnectionStatus = ({ isConnected, waterlevel }: { waterlevel: boolean, isConnected: boolean }) => (
	!isConnected ? (
		<div
			className="flex items-center bg-red-400 text-white px-2 py-1 rounded"
			style={{ marginTop: !waterlevel ? '-15px' : '-10px' }}
		>
			<span>연결 끊김</span>
			<HiOutlineExclamationCircle className="ml-1" />
		</div>
	) : null
);

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

export default function InundationDetailArea(props: DetailAreaProps) {
	const { socketService } = useSocketConnection();
	const { data, onObjectSelect } = props;

	const [targetWaterlevel, setTargetWaterlevel] = useState<WaterlevelState | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [dialogState, setDialogState] = useState<DialogState>({
		isOpen: false,
		type: 'alert',
		title: '',
		message: '',
	});
	const [selectedBillboardMacro, setSelectedBillboardMacro] = useState<BillboardOption>(DEFAULT_BILLBOARD_OPTION);
	const [billboardMessage, setBillboardMessage] = useState('');
	const [selectedColor, setSelectedColor] = useState('');
	const [billboardOptions, setBillboardOptions] = useState<BillboardOption[]>([]);
	const [selectedSpeakerMacro, setSelectedSpeakerMacro] = useState<SpeakerOption>(DEFAULT_SELECT_OPTION);
	const [speakerMessage, setSpeakerMessage] = useState('');
	const [speakerOptions, setSpeakerOptions] = useState<SpeakerOption[]>([]);
	const [crossingGateStatus, setCrossingGateStatus] = useState<boolean | null>(data.crossing_gate_status);
	const [isChangingArea, setIsChangingArea] = useState(false);
	const [currentOutsideIdx, setCurrentOutsideIdx] = useState(null);

	const [guardianliteStatus, setGuardianliteStatus] = useState({
		ch1: data.ch1,
		ch2: data.ch2,
		ch3: data.ch3,
		ch4: data.ch4,
		ch5: data.ch5,
		ch6: data.ch6,
		ch7: data.ch7,
		ch8: data.ch8,
		temper: data.temper,
	});
	const [areaValue, setAreaValue] = useState<string>('');
	const [isLoadingGateStatus, setIsLoadingGateStatus] = useState(false);
	const [showModal, setShowModal] = useState(false);

	const [autoControlResult, setAutoControlResult] = useState<WaterLevelAutoControlResult | null>(null);
	const [isPopupOpen, setIsPopupOpen] = useState(false);

	const { user } = useSessionUser();
	const { checkAdminPermission } = useCheckOperatorPermission();
	const prevOutsideIdxRef = useRef<number | null>(null);

	const { areas, fetchAreas } = useAreaStore((state) => ({
		areas: state.areas,
		fetchAreas: state.fetchAreas
	}));

	useEffect(() => {
		const currentArea = areas.find(area => area.outside_idx === data.outside_idx);
		if (currentArea) {
			setCrossingGateStatus(currentArea.crossing_gate_status);
		}
	}, [areas, data.outside_idx]);

	const {
		speakerMessageList,
		billboardMessageList,
		getWaterlevelOutsideList,
		waterlevelGaugeList,
		getWaterlevelGaugeList,
		getSpeakerMessageList,
		getBillboardMessageList
	} = useSettingsStore();

	const {
		modifyGuardianliteChannel,
		modifyGuardianliteChannelLabel,
	} = useAreaStore();

	const {
		updateBillboard,
		updateGreenParkingBillboard
	} = useDeviceControlStore();

	const waterlevels = useWaterlevelLiveStore(state => state.waterlevels);

	useEffect(() => {
		if (!socketService) return;

		const handleSetGate = (eventData) => {
			useAreaStore.setState((prev) => ({
				areas: prev.areas.map(area => {
					if (area.crossing_gate_ip === eventData.ipaddress) {
						const updatedArea = {
							...area,
							crossing_gate_status: eventData.crossing_gate_status !== undefined
								? eventData.crossing_gate_status
								: (eventData.status === true ? true : eventData.status === false ? false : area.crossing_gate_status),
							outside_linked_status: eventData.linked_status !== undefined
								? eventData.linked_status
								: (eventData.cmd === 'disconnect' ? false : area.outside_linked_status)
						};

						if (area.outside_idx === data.outside_idx) {
							setCrossingGateStatus(updatedArea.crossing_gate_status);
						}

						return updatedArea;
					}
					return area;
				})
			}));
		};

		const unsubscribe = socketService.subscribe('setGate', handleSetGate);
		return unsubscribe;
	}, [socketService, data.outside_idx, data.crossing_gate_ip, crossingGateStatus]);

	useEffect(() => {
		if (!socketService) return;

		const handleSpeakerUpdate = (eventData) => {
			useSettingsStore.getState().getSpeakerMessageList();
		};

		const handleBillboardUpdate = (eventData) => {
			useSettingsStore.getState().getBillboardMessageList();
		};

		const unsubscribeSpeaker = socketService.subscribe('fl_speakers-update', handleSpeakerUpdate);
		const unsubscribeBillboard = socketService.subscribe('fl_billboards-update', handleBillboardUpdate);

		return () => {
			unsubscribeSpeaker();
			unsubscribeBillboard();
		};
	}, [socketService, getSpeakerMessageList, getBillboardMessageList]);

	const showDialog = useCallback((dialogConfig: Partial<DialogState>) => {
		setDialogState(prev => ({
			...prev,
			isOpen: true,
			...dialogConfig
		}));
	}, []);

	const closeDialog = useCallback(() => {
		setDialogState(prev => ({ ...prev, isOpen: false }));
	}, []);

	const handleOpenModal = () => setShowModal(true);
	const handleCloseModal = () => setShowModal(false);

	const handleModalSubmit = async (messageObj) => {
		if (!checkAdminPermission(showDialog)) return;
		if (!data.billboard_ip) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '등록된 전광판이 없습니다.',
				onConfirm: closeDialog
			});
			return;
		}

		try {
			setIsLoading(true);
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '전광판 메시지 변경',
					message: '전광판 메시지를 변경하시겠습니까?',
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

			setIsLoading(true);

			if (confirmed) {
				const success = await updateGreenParkingBillboard({
					billboard_ip: data.billboard_ip,
					billboard_msg: messageObj,
					billboard_color: selectedColor,
					id: user.userId || '',
					billboard_controller_model: data.billboard_controller_model
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
					setIsLoading(false);
					return;
				}
			}
		} catch (error) {
			console.error('Billboard message change error:', error);
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

	useEffect(() => {
		const outsideIdx = data?.outside_idx;
		if (!outsideIdx || !waterlevels) {
			return;
		}

		const latestOutsideList = useSettingsStore.getState().waterlevelOutsideList;
		const latestGaugeList = useSettingsStore.getState().waterlevelGaugeList;

		const waterlevelOutside = latestOutsideList.find(
			item => item.outside_idx === outsideIdx
		);

		if (!waterlevelOutside?.water_level_idx) {
			return;
		}

		const waterlevelGauge = latestGaugeList.find(
			gauge => gauge.water_level_idx === waterlevelOutside.water_level_idx
		);

		if (!waterlevelGauge) {
			return;
		}

		const waterLevelIdx = waterlevelOutside.water_level_idx;

		let currentWaterData = null;

		const idxKey = `idx_${waterLevelIdx}`;
		if (waterlevels[idxKey]) {
			currentWaterData = waterlevels[idxKey];
		}

		if (!currentWaterData && waterlevelGauge.water_level_ip) {
			if (waterlevels[waterlevelGauge.water_level_ip]) {
				currentWaterData = waterlevels[waterlevelGauge.water_level_ip];
			}
		}

		if (!currentWaterData) {
			currentWaterData = Object.values(waterlevels).find(
				data => data && data.water_level_idx === waterLevelIdx
			);
		}

		if (currentWaterData && currentWaterData.value !== undefined) {
			setTargetWaterlevel(prev => ({
				...prev,
				curr_water_level: currentWaterData.value.toString()
			}));
		}

	}, [waterlevels, data?.outside_idx]);

	useEffect(() => {
		if (prevOutsideIdxRef.current !== null && prevOutsideIdxRef.current !== data?.outside_idx) {
			setTargetWaterlevel(null);
			setIsChangingArea(true);

			setTimeout(() => {
				setIsChangingArea(false);
			}, 100);
		}
		prevOutsideIdxRef.current = data?.outside_idx || null;
	}, [data?.outside_idx]);

	const fetchData = async (outsideIdx) => {
		if (!outsideIdx) {
			setTargetWaterlevel(null);
			return;
		}

		try {
			setIsLoading(true);
			setCurrentOutsideIdx(outsideIdx);

			await Promise.all([
				getWaterlevelOutsideList(),
				getWaterlevelGaugeList()
			]);

			const latestOutsideList = useSettingsStore.getState().waterlevelOutsideList;
			const latestGaugeList = useSettingsStore.getState().waterlevelGaugeList;

			const waterlevelOutside = latestOutsideList.find(
				item => item.outside_idx === outsideIdx
			);

			if (waterlevelOutside?.water_level_idx) {
				const waterlevelGauge = latestGaugeList.find(
					gauge => gauge.water_level_idx === waterlevelOutside.water_level_idx
				);

				if (waterlevelGauge) {
					const newTargetWaterlevel = {
						water_level_location: waterlevelGauge.water_level_location || '',
						water_level_linked_status: waterlevelGauge.linked_status || false,
						water_level_idx: waterlevelGauge.water_level_idx,
						water_level_ip: waterlevelGauge.water_level_ip || '',
						water_level_name: waterlevelGauge.water_level_name || '',
						water_level_model: waterlevelGauge.water_level_model || '',
						threshold: waterlevelGauge.threshold || '0',
						curr_water_level: waterlevelGauge.curr_water_level || '0'
					};

					setTargetWaterlevel(newTargetWaterlevel);
				} else {
					console.warn(`수위계 데이터를 찾을 수 없습니다: water_level_idx=${waterlevelOutside.water_level_idx}`);
					setTargetWaterlevel(null);
				}
			} else {
				// console.warn(`해당 area에 연결된 수위계가 없습니다: outside_idx=${outsideIdx}`);
				setTargetWaterlevel(null);
			}

		} catch (error) {
			console.error('Error fetching waterlevel data:', error);
			setTargetWaterlevel(null);
			showDialog({
				type: 'alert',
				title: '오류',
				message: '데이터를 불러오는데 실패했습니다.'
			});
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const newOutsideIdx = data?.outside_idx;

		if (prevOutsideIdxRef.current !== newOutsideIdx) {
			if (prevOutsideIdxRef.current !== null) {
				setTargetWaterlevel(null);
				setIsChangingArea(true);

				setTimeout(() => {
					setIsChangingArea(false);
				}, 100);
			}

			prevOutsideIdxRef.current = newOutsideIdx;

			if (newOutsideIdx && !isChangingArea) {
				fetchData(newOutsideIdx);
			}
		}
	}, [data?.outside_idx]);

	useEffect(() => {
		Promise.all([
			fetchAreas(),
			getWaterlevelOutsideList(),
			getWaterlevelGaugeList()
		]).then(() => {
			if (data?.outside_idx) {
				fetchData(data.outside_idx);
			}
		}).catch(error => {
			console.error('초기 데이터 로드 실패:', error);
		});
	}, []);

	useEffect(() => {
		if (!socketService || !data?.outside_idx) return;

		let timeoutId;

		const handleWaterlevelUpdate = async () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			if (isLoading) {
				return;
			}

			timeoutId = setTimeout(async () => {
				try {
					await Promise.all([
						getWaterlevelOutsideList(),
						getWaterlevelGaugeList()
					]);

					const currentIdx = data.outside_idx;
					if (currentIdx) {

						const latestOutsideList = useSettingsStore.getState().waterlevelOutsideList;
						const latestGaugeList = useSettingsStore.getState().waterlevelGaugeList;

						const waterlevelOutside = latestOutsideList.find(
							item => item.outside_idx === currentIdx
						);

						if (waterlevelOutside?.water_level_idx) {
							const waterlevelGauge = latestGaugeList.find(
								gauge => gauge.water_level_idx === waterlevelOutside.water_level_idx
							);

							if (waterlevelGauge) {
								setTargetWaterlevel({
									water_level_location: waterlevelGauge.water_level_location || '',
									water_level_linked_status: waterlevelGauge.linked_status || false,
									water_level_idx: waterlevelGauge.water_level_idx,
									water_level_ip: waterlevelGauge.water_level_ip || '',
									water_level_name: waterlevelGauge.water_level_name || '',
									water_level_model: waterlevelGauge.water_level_model || '',
									threshold: waterlevelGauge.threshold || '0',
									curr_water_level: waterlevelGauge.curr_water_level || '0'
								});
							}
						}
					}
				} catch (error) {
					console.error('소켓 이벤트 처리 중 오류:', error);
				}
			}, 500);
		};

		const unsubscribe = socketService.subscribe('fl_waterlevels-update', handleWaterlevelUpdate);

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			unsubscribe();
		};
	}, [socketService, data?.outside_idx, isLoading]);

	useEffect(() => {
		setSpeakerOptions(convertSpeakerOptions(speakerMessageList));
	}, [speakerMessageList]);

	useEffect(() => {
		setBillboardOptions(convertBillboardOptions(billboardMessageList));
	}, [billboardMessageList]);

	useEffect(() => {
		const initializeMessageLists = async () => {
			try {
				await Promise.all([
					getSpeakerMessageList(),
					getBillboardMessageList()
				]);
			} catch (error) {
				console.error('초기 메시지 리스트 로드 실패:', error);
			}
		};

		initializeMessageLists();
	}, []);

	useEffect(() => {
		const initializeGateStatus = async () => {
			setIsLoadingGateStatus(true);
			setCrossingGateStatus(data.crossing_gate_status);
			setIsLoadingGateStatus(false);
		};
		initializeGateStatus();
	}, [data.crossing_gate_status]);

	useEffect(() => {
		if (!socketService) return;

		const unsubscribeGuardianlite = socketService.subscribe('fl_guardianlites-update', (eventData) => {
			if (eventData.guardianlite_ip === data.guardianlite_ip) {
				setGuardianliteStatus(prev => ({
					...prev,
					...eventData,
				}));
			}
		});

		return () => {
			unsubscribeGuardianlite();
		};
	}, [socketService, data.guardianlite_ip]);

	useEffect(() => {
		setGuardianliteStatus({
			ch1: data.ch1,
			ch2: data.ch2,
			ch3: data.ch3,
			ch4: data.ch4,
			ch5: data.ch5,
			ch6: data.ch6,
			ch7: data.ch7,
			ch8: data.ch8,
			temper: data.temper,
		});
	}, [data]);

	useEffect(() => {
		if (!socketService) return;

		const unsubscribe = socketService.subscribe('fl_waterLevelAutoControlResult-update', (result: WaterLevelAutoControlResult) => {
			setAutoControlResult(result);
			setIsPopupOpen(true);
		});

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [socketService]);

	const handleClickChangeAreaDetail = async (area) => {
		if (area.outside_idx === data?.outside_idx) {
			return;
		}

		setTargetWaterlevel(null);
		setIsChangingArea(true);
		setSpeakerMessage('');
		setBillboardMessage('');
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
		setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		setSelectedColor('');

		const selectedObject = {
			id: area.outside_idx,
			name: area.outside_name,
			position: [parseFloat(area.outside_top_location), parseFloat(area.outside_left_location)],
			...area,
			location: area.outside_location,
		};

		onObjectSelect(selectedObject);

		setTimeout(() => {
			setIsChangingArea(false);
		}, 100);

		if (area.outside_idx) {
			try {
				setIsLoading(true);

				await Promise.all([
					getWaterlevelOutsideList(),
					getWaterlevelGaugeList()
				]);

				const latestOutsideList = useSettingsStore.getState().waterlevelOutsideList;
				const latestGaugeList = useSettingsStore.getState().waterlevelGaugeList;

				const waterlevelOutside = latestOutsideList.find(
					item => item.outside_idx === area.outside_idx
				);

				if (waterlevelOutside?.water_level_idx) {
					const waterlevelGauge = latestGaugeList.find(
						gauge => gauge.water_level_idx === waterlevelOutside.water_level_idx
					);

					if (waterlevelGauge) {
						const newTargetWaterlevel = {
							water_level_location: waterlevelGauge.water_level_location || '',
							water_level_linked_status: waterlevelGauge.linked_status || false,
							water_level_idx: waterlevelGauge.water_level_idx,
							water_level_ip: waterlevelGauge.water_level_ip || '',
							water_level_name: waterlevelGauge.water_level_name || '',
							water_level_model: waterlevelGauge.water_level_model || '',
							threshold: waterlevelGauge.threshold || '0',
							curr_water_level: waterlevelGauge.curr_water_level || '0'
						};
						setTargetWaterlevel(newTargetWaterlevel);
					} else {
						setTargetWaterlevel(null);
					}
				} else {
					setTargetWaterlevel(null);
				}
			} catch (error) {
				console.error('Error fetching waterlevel data for area:', error);
				setTargetWaterlevel(null);
			} finally {
				setIsLoading(false);
			}
		}
	};


	const resetState = useCallback(() => {
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
		setBillboardMessage('');
		setSelectedColor('');
	}, []);

	const handleChangeArea = (e: ChangeEvent<HTMLInputElement>) => {
		setAreaValue(e.target.value);
	};

	const handleChangeBillboardMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMessage = e.target.value;
		setBillboardMessage(newMessage);
		setSelectedBillboardMacro(DEFAULT_BILLBOARD_OPTION);
	};

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

	const handleChangeSpeakerMessage = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMessage = e.target.value;
		const minLength = 5;
		const maxLength = 26;

		if (newMessage.length <= maxLength) {
			setSpeakerMessage(newMessage);
			setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		} else {
			setDialogState({
				type: 'alert',
				isOpen: true,
				title: '알림',
				message: `메시지는 ${minLength}자 이상 ${maxLength}자 이하로 작성해주세요.`,
			});

			setSpeakerMessage(newMessage.slice(0, maxLength));
			setSelectedSpeakerMacro(DEFAULT_SELECT_OPTION);
		}
	};

	const handleGuardianliteControl = (channel: string, status: 'on' | 'off') => {
		if (!checkAdminPermission(showDialog)) return;
		showDialog({
			type: 'confirm',
			title: '가디언라이트 제어',
			message: channel === 'ch1'
				? `${channel.toUpperCase()}을 리셋하시겠습니까?`
				: `${channel.toUpperCase()}를 ${status === 'on' ? '켜시' : '끄시'}겠습니까?`,
			onConfirm: async () => {
				try {
					const success = await modifyGuardianliteChannel({
						guardianlite_ip: data.guardianlite_ip,
						channel: channel.slice(2),
						cmd: status,
						id: 'admin',
						password: 'greenit',
						operatorId: user.userId || '',
					});

					if (success) {
						setGuardianliteStatus((prev) => ({
							...prev,
							[channel]: channel === 'ch1' ? 'ON' : status.toUpperCase(),
						}));
					}

					showDialog({
						type: 'alert',
						title: '알림',
						message: success
							? channel === 'ch1'
								? `가디언라이트 ${channel.toUpperCase()}이 리셋되었습니다.`
								: `가디언라이트 ${channel.toUpperCase()}을 ${status === 'on' ? 'ON' : 'OFF'} 했습니다.`
							: '가디언라이트 제어에 실패했습니다.',
					});
				} catch (error) {
					console.error('Error controlling guardianlite:', error);
					showDialog({
						type: 'alert',
						title: '오류',
						message: '가디언라이트 제어 중 오류가 발생했습니다.',
					});
				}
			},
		});
	};

	const handleGuardianliteLabelChange = async (labels: Record<string, string>) => {
		if (!checkAdminPermission(showDialog)) return;
		try {
			const success = await modifyGuardianliteChannelLabel({
				guardianlite_ip: data.guardianlite_ip,
				...labels,
				id: 'admin',
				password: 'greenit',
				cmd: '',
				operatorId: user.userId || ''
			});
			showDialog({
				type: 'alert',
				title: '알림',
				message: success ? '채널명이 변경되었습니다.' : '채널명 변경에 실패했습니다.'
			});
		} catch (error) {
			showDialog({
				type: 'alert',
				title: '오류',
				message: '채널명 변경 중 오류가 발생했습니다.'
			});
		}
	};

	const handleControlCrossinggate = async (val: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
		if (!checkAdminPermission(showDialog)) return;
		const newStatus = !crossingGateStatus;

		try {
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '차단기 제어',
					message: newStatus ? '차단기를 여시겠습니까?' : '차단기를 닫으시겠습니까?',
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

			showDialog({
				type: 'alert',
				title: '알림',
				message: '경고 방송 후 차단기를 제어합니다.',
				onConfirm: closeDialog,
			});

			const speakerService = new ControlDeviceSpeakerService('single', data.speaker_ip);
			await speakerService.controlGate();

			showDialog({
				type: 'alert',
				title: '알림',
				message: `경고 방송 중입니다. ${BROADCAST_DELAY_TIME / 1000}초 후 차단기가 ${newStatus ? '열립니다' : '닫힙니다'}.`,
				onConfirm: closeDialog,
			});

			setTimeout(async () => {
				await ControlDeviceCrossingGate({
					crossing_gate_ip: data.crossing_gate_ip,
					cmd: newStatus ? 'open' : 'close',
					outside_idx: data.outside_idx,
					type: 'single',
					id: user.userId || '',
					controllerModel: data.controller_model
				});
			}, BROADCAST_DELAY_TIME);
		} catch (error) {
			console.error('차단기 제어 오류:', error);
			showDialog({
				type: 'alert',
				title: '오류',
				message: error instanceof Error ? error.message : '차단기 제어 중 오류가 발생했습니다.',
				onConfirm: closeDialog,
			});
		}
	};

	const handleBillboardMessageChange = async () => {
		if (!checkAdminPermission(showDialog)) return;
		if (!data.billboard_ip) {
			showDialog({
				type: 'alert',
				title: '알림',
				message: '등록된 전광판이 없습니다.',
				onConfirm: closeDialog
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

		try {
			showDialog({
				type: 'confirm',
				title: '전광판 메시지 변경',
				message: '전광판 메시지를 변경하시겠습니까?',
				onConfirm: async () => {
					closeDialog();

					try {
						const success = await updateBillboard({
							billboard_ip: data.billboard_ip,
							billboard_msg: billboardMessage,
							billboard_color: selectedColor,
							id: user.userId || '',
							billboard_controller_model: data.billboard_controller_model
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
				},
				onCancel: () => {
					closeDialog();
					setIsLoading(false);
				}
			});
		} catch (error) {
			console.error('Billboard message change error:', error);
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

	const handleSpeakerBroadcast = async (type: string) => {
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

		if (!checkAdminPermission(showDialog)) return;
		if (!data.speaker_ip) {
			showDialog({
				type: 'alert',
				title: '오류',
				message: '등록된 스피커가 없습니다.',
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
			const confirmed = await new Promise<boolean>((resolve) => {
				showDialog({
					type: 'confirm',
					title: '스피커 방송',
					message: type === 'broadcast' ? '스피커로 음성을 출력하시겠습니까?' : '스피커로 경고음을 출력하시겠습니까?',
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

			if (!confirmed) return;

			const speakerService = new ControlDeviceSpeakerService('single', data.speaker_ip);

			showDialog({
				type: 'alert',
				title: '알림',
				message: type === 'broadcast' ? '스피커 방송이 시작되었습니다.' : '경고음이 출력됩니다.',
				onConfirm: closeDialog
			});

			if (type === 'broadcast') {
				const result = await speakerService.playSpeakerMessage(speakerMessage);
				if (result.success) {
					showDialog({
						type: 'alert',
						title: '알림',
						message: '음성 출력이 완료되었습니다.',
						onConfirm: closeDialog
					});
				} else {
					throw new Error(result.error || '음성 출력 중 오류가 발생했습니다.');
				}
			} else {
				await speakerService.clickSound();
			}

			resetState();

		} catch (error) {
			console.error('Speaker broadcast error:', error);
		}
	};
	
	const areasList = () => {
		let newArr = [];
		if (areaValue) {
			newArr = areas.filter((area) => area.outside_name.includes(areaValue));
		} else {
			newArr = [...areas];
		}

		newArr.sort((a, b) => {
			const regex = /^([^\d]*)(\d*)$/;
			const [, textA, numA] = a.outside_name.match(regex) || ["", "", "0"];
			const [, textB, numB] = b.outside_name.match(regex) || ["", "", "0"];

			if (textA !== textB) {
				return textA.localeCompare(textB);
			}

			return parseInt(numA || "0") - parseInt(numB || "0");
		});

		return newArr.map((area, index) => {

			const getStatusText = () => {
				if (area.outside_linked_status && area.crossing_gate_status === true) return '열림';
				if (area.outside_linked_status && area.crossing_gate_status === false) return '닫힘';
				if (!area.outside_linked_status) return '연결끊김';
				return '알 수 없음';
			};

			return (
				<div
					key={index}
					onClick={() => handleClickChangeAreaDetail(area)}
					className="relative flex items-center hover:bg-green-100 dark:hover:bg-green-900 h-10 cursor-pointer"
				>
					<Tooltip
						title={getStatusText()}
						placement="right"
						wrapperClass="w-full"
						className={`${!area.crossing_gate_ip
							? 'text-gray-500 dark:text-gray-200'
							: area.outside_linked_status
								? area.crossing_gate_status === true
									? 'text-green-600'
									: area.crossing_gate_status === false
										? 'text-red-500'
										: 'text-[#0e1163]'
								: 'text-gray-500'
							}`}
					>
						<label
							className={`flex items-center w-full cursor-pointer ${area.outside_linked_status
								? area.crossing_gate_status === true
									? 'text-green-500'
									: area.crossing_gate_status === false
										? 'text-red-500'
										: 'text-gray-500 dark:text-gray-400'
								: 'text-gray-500 dark:text-gray-200'
								}`}
						>
							<span>{area.outside_name}</span>
						</label>
					</Tooltip>
				</div>
			);
		});
	};

	const renderWaterlevelSection = () => {
		if (isChangingArea || isLoading) {
			return (
				<div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] bg-gray-100 dark:bg-gray-700 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 my-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
					<p className="text-sm text-gray-500 dark:text-gray-400">로딩 중...</p>
				</div>
			);
		}

		if (targetWaterlevel && targetWaterlevel.water_level_idx && targetWaterlevel.water_level_ip) {
			return (
				<div className="flex flex-col h-full">
					<div className="flex justify-between items-center mt-1">
						<div>
							<p className="text-gray-600 dark:text-gray-400">
								{targetWaterlevel?.water_level_name || data?.water_level_name || '수위계 정보 없음'}
							</p>
							<p className="text-gray-600 dark:text-gray-400">
								{targetWaterlevel?.water_level_location || data?.water_level_location || '위치 정보 없음'}
							</p>
						</div>
						<div className="text-right">
							<p className="text-gray-600 dark:text-gray-400">
								현재 수위: <span className="font-semibold">{targetWaterlevel.curr_water_level || '0'}m</span>

							</p>
							<p className="text-gray-600 dark:text-gray-400">
								기준 수위: <span className="font-semibold">{targetWaterlevel.threshold || '0'}m</span>
							</p>
						</div>
					</div>
					<WaterlevelCurrentStateBoard
						waterlevelIdx={targetWaterlevel.water_level_idx}
						threshold={targetWaterlevel.threshold || '0'}
						currentWaterLevel={targetWaterlevel.curr_water_level || '0'}
					/>
					<div className="flex-1 min-h-0 pb-2">
						<WaterlevelChart
							waterlevelIp={targetWaterlevel.water_level_ip}
							waterlevelIdx={targetWaterlevel.water_level_idx}
							threshold={targetWaterlevel.threshold || '0'}
						/>
					</div>
				</div>
			);
		}

		return (
			<div className="flex flex-col items-center justify-center h-[calc(100%-3rem)] bg-gray-100 dark:bg-gray-700 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 my-4">
				<p className="text-lg font-semibold text-red-400 mb-2">연동된 수위계가 없습니다</p>
				<p className="text-sm text-gray-500 dark:text-gray-400 text-center">
					수위계 장치를 연동한 후 이용해 주세요.
				</p>
			</div>
		);
	};

	const memoizedMiniMap = useMemo(() => (
		<MiniMap
			position={[parseFloat(data.outside_top_location), parseFloat(data.outside_left_location)]}
			markerType={data.type}
			gateStatus={crossingGateStatus}
			gateLinkedStatus={data.outside_linked_status}
		/>
	), [data.outside_idx, data.outside_top_location, data.outside_left_location, data.type, crossingGateStatus, data.outside_linked_status]);


	const isBillboardRegistered = data.billboard_ip !== null && data.billboard_ip !== '';
	const isSpeakerRegistered = data.speaker_ip !== null && data.speaker_ip !== '';
	const isGuardianliteRegistered = data.guardianlite_ip !== null && data.guardianlite_ip !== '';

	return (
		<div className="flex flex-1 h-full overflow-hidden">
			{dialogState.type === 'alert' ? (
				<AlertDialog
					isOpen={dialogState.isOpen}
					onClose={closeDialog}
					message={dialogState.message}
				/>
			) : (
				<ConfirmDialog
					isOpen={dialogState.isOpen}
					onCancel={closeDialog}
					onConfirm={() => {
						dialogState.onConfirm?.();
						closeDialog();
					}}
					type="danger"
					title={dialogState.title}
					cancelText="취소"
					confirmText="확인"
					confirmButtonProps={{
						color: 'red-600',
					}}
				>
					{dialogState.message}
				</ConfirmDialog>
			)}

			<div className="w-60 flex-shrink-0" style={{ contain: 'layout' }}>
				<div className="flex flex-col px-1 py-1 h-full text-semibold text-lg">
					<div className="h-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-3 flex flex-col">
						<div className="flex-shrink-0">
							<span className="font-bold text-black dark:text-white mb-2 block">개소검색</span>
							<li className="flex justify-between border-solid border-b-2 dark:border-gray-700" />
							<input
								type="text"
								placeholder="검색어 입력"
								className="w-full dark:bg-gray-300 px-2 py-1 border rounded-2xl mt-2 dark:text-gray-500"
								onChange={handleChangeArea}
							/>
						</div>
						<div
							className="mt-2 space-y-1 flex-1 min-h-0 overflow-y-auto"
							style={{ contain: 'size layout' }}
						>
							{areasList()}
						</div>
					</div>
				</div>
			</div>

			<div className="flex-1 flex flex-col min-h-0 px-1 py-1">
				<div className="bg-white dark:bg-gray-900 rounded-lg flex flex-col h-full w-full">
					<div className="flex items-center justify-between h-[4vh] mb-1 mt-1 mr-1">
						<div className="w-full p-1 bg-gray-200 dark:bg-gray-800 rounded-lg ml-1 mr-1">
							<h3 className="font-semibold text-gray-700 dark:text-gray-200 text-lg ml-2">
								개소 현황
							</h3>
						</div>
					</div>

					<div className="flex-1 flex gap-2 flex-grow mr-1 min-h-0">
						<div className="w-1/4 flex flex-col gap-1 bg-white-200 rounded-lg">
							<div className="flex-grow bg-gray-200 dark:bg-gray-800 p-3 rounded-lg ml-1 h-[11%] max-h-[10vh]">
								<div className="flex-[1] h-[20%] p-1 flex flex-col">
									<h4 className="font-semibold dark:text-gray-200">차단기 정보</h4>
									<div className="border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]" />
									<span className="flex justify-end text-gray-600 dark:text-gray-400">
										{data?.outside_location}
									</span>
								</div>
							</div>

							<div className="flex-grow bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mt-1 ml-1 min-h-[28.5%]">
								<div className="h-[100%]">
									{memoizedMiniMap}
									{/* {data && (
										<MiniMap
											position={[parseFloat(data.outside_top_location), parseFloat(data.outside_left_location)]}
											markerType={data.type}
											gateStatus={crossingGateStatus}
											gateLinkedStatus={data.outside_linked_status}
										/>
									)} */}
								</div>
							</div>

							<div className="flex-grow bg-gray-200 dark:bg-gray-800 p-3 rounded-lg mt-1 ml-1 mb-1 relative overflow-hidden">
								<div className="flex justify-between items-center border-b-2 border-gray-300 dark:border-gray-500">
									<h4 className="font-semibold dark:text-gray-200">수위계</h4>
									<ConnectionStatus waterlevel={true} isConnected={targetWaterlevel?.water_level_linked_status ?? false} />
								</div>
								{renderWaterlevelSection()}
							</div>
						</div>

						<div className="w-3/4 flex flex-col gap-2 mb-2">
							<div className="flex-grow bg-gray-200 dark:bg-gray-800 shadow-md rounded-lg p-3 mr-1 max-h-[50vh]">
								<div className="flex justify-between items-center border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
									<h4 className="font-semibold dark:text-gray-200">카메라 영상</h4>
									{data?.camera_id ? data?.camera_id?.length > 5 ? `${data?.camera_name} (${data?.camera_ip})` : `${data?.camera_id}_${data?.camera_name} (${data?.camera_ip})` : ''}
									<ConnectionStatus waterlevel={true} isConnected={data.camera_linked_status} />
								</div>
								<span className="absolute right-10"></span>
								<div className="h-[calc(100%-2.5rem)] mt-2 rounded-lg">
									<LiveStream
										main_service_name={'inundation'}
										vms_name={data.vms_name}
										camera_id={data.camera_id}
										service_type={data.service_type}
										area_name={data.outside_name}
									/>
									{user && user.userRole === 'admin' && (
										<PtzControl
											cameraId={data.camera_id}
											isDetailView={true}
											vmsName={data.vms_name}
											mainServiceName={'inundation'}
										/>
									)}
								</div>
							</div>

							<div className="h-[305px] flex gap-3 mb-1 mr-1">
								<div className="w-1/2 flex flex-col gap-3">
									<div className="h-[140px] bg-gray-200 dark:bg-gray-800 shadow-md rounded-lg p-3">
										<div className="flex justify-between items-center w-full border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
											<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
												진입차단기
											</h4>
											<ConnectionStatus isConnected={data.outside_linked_status} waterlevel={false} />
										</div>
										<div className="flex justify-between items-center mt-3">
											<div>
												<p className="text-gray-600 dark:text-gray-400">{data.outside_name}</p>
												<p className="text-gray-600 dark:text-gray-400">{data.outside_location}</p>
												<p className="text-gray-600 dark:text-gray-400">{data.crossing_gate_ip}</p>
											</div>
											<div className="flex flex-col items-center">
												<Switcher
													className={`scale-150 transform ${data.outside_linked_status
														? (crossingGateStatus === true
															? 'bg-green-600'
															: crossingGateStatus === false
																? 'bg-red-500'
																: 'bg-[#0e1163]')
														: 'bg-gray-400'
														}`}
													checked={crossingGateStatus === true && data.outside_linked_status}
													onChange={data.outside_linked_status && crossingGateStatus !== null ? handleControlCrossinggate : null}
													disabled={isLoadingGateStatus || !data.outside_linked_status || crossingGateStatus === null}
												/>
												<div className="mt-2">
													<div className="flex space-x-4 mt-1">
														현재상태
														{data.outside_linked_status ? (
															<>
																{crossingGateStatus === true && (
																	<span className="text-sm text-green-500 font-bold">
																		{`: open`}
																	</span>
																)}
																{crossingGateStatus === false && (
																	<span className="text-sm text-red-500 font-bold">
																		{`: close`}
																	</span>
																)}
																{crossingGateStatus === null && (
																	<span className="text-sm text-[#0e1163] font-bold">
																		{`: 알 수 없음`}
																	</span>
																)}
															</>
														) : (
															<span className="text-sm text-gray-500 font-bold">
																: 연결끊김
															</span>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
									<div className={`h-[166px] bg-gray-200 dark:bg-gray-800 shadow-md rounded-lg p-3 relative ${!isBillboardRegistered ? 'opacity-60' : ''}`}>
										{!isBillboardRegistered && (
											<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10 rounded-lg">
												<div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-md shadow-lg">
													<p className="text-red-500 font-semibold">등록되지 않은 장치입니다</p>
												</div>
											</div>
										)}

										<div className="flex justify-between items-center mb-3 border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
											<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
												<span className="text-black-500 dark:text-gray-200 text-xl"></span>
												전광판 {data && data.billboard_ip ? `(${data.billboard_ip})` : ''}
											</h4>
											<ConnectionStatus isConnected={data.billboard_linked_status} waterlevel={false} />
										</div>
										<div className="flex gap-3">
											<div className="w-[80%]">
												<Select
													className="mb-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-200"
													placeholder="매크로 메시지"
													options={billboardOptions}
													menuPlacement="top"
													size='sm'
													onChange={handleChangeBillboardMacro}
													value={selectedBillboardMacro}
													isDisabled={!isBillboardRegistered}
												/>
												{data.billboard_controller_model === '그린파킹' ? (
													<>
														<Input
															onClick={handleOpenModal}
															readOnly
															placeholder="메시지를 입력하려면 클릭하세요"
															className="cursor-pointer bg-white dark:bg-[#020617] dark:text-gray-200 dark:border-gray-600"
														/>
														{showModal && (
															<BillboardModal
																onClose={() => setShowModal(false)}
																onSubmit={handleModalSubmit}
															/>
														)}
													</>
												) : (
													<Input
														className={`dark:border-gray-600 dark:placeholder-gray-400 mt-2 
																	${billboardMessage.length > 0 ? 'bg-[#020617] focus:bg-[#020617]' : 'bg-white focus:bg-white'}
																	${selectedColor === 'green' ? 'text-green-500' :
																selectedColor === 'red' ? 'text-red-500' :
																	selectedColor === 'yellow' ? 'text-yellow-500' : 'text-gray-700'
															} dark:text-gray-200`}
														placeholder={isBillboardRegistered ? "메시지 입력" : "등록되지 않은 장치입니다"}
														name='billboardMessage'
														size='sm'
														value={billboardMessage}
														onChange={handleChangeBillboardMessage}
														type="text"
														disabled={!isBillboardRegistered || isLoading}
													/>
												)}
											</div>
											<div className="w-[20%]">
												<div className="flex gap-1 flex-col">
													<Button
														value={'green'}
														onClick={() => setSelectedColor('green')}
														className={`flex-1 h-8 bg-green-500 dark:bg-green-600 ${selectedColor === 'green' ? 'border-4 border-blue-800' : ''}`}
														disabled={!isBillboardRegistered}
													/>
													<Button
														value={'red'}
														onClick={() => setSelectedColor('red')}
														className={`flex-1 h-8 bg-red-500 dark:bg-red-600 ${selectedColor === 'red' ? 'border-4 border-blue-800' : ''}`}
														disabled={!isBillboardRegistered}
													/>
													<Button
														value={'yellow'}
														onClick={() => setSelectedColor('yellow')}
														className={`flex-1 h-8 bg-yellow-500 dark:bg-yellow-600 ${selectedColor === 'yellow' ? 'border-4 border-blue-800' : ''}`}
														disabled={!isBillboardRegistered}
													/>
												</div>
												<div className="items-center">
													<Button
														disabled={isLoading}
														onClick={handleBillboardMessageChange}
														className={`w-[5.5vw] h-8 flex justify-center items-center border border-2 rounded mt-2 ${!isBillboardRegistered ? 'cursor-not-allowed bg-gray-400 text-gray-600' : ''}`}
													>
														변경
													</Button>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="flex-1 flex flex-col gap-3">
									<div className={`h-[154px] bg-gray-200 dark:bg-gray-800 shadow-md rounded-lg p-3 relative ${!isSpeakerRegistered ? 'opacity-60' : ''}`}>
										{!isSpeakerRegistered && (
											<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10 rounded-lg">
												<div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-md shadow-lg">
													<p className="text-red-500 font-semibold">등록되지 않은 장치입니다</p>
												</div>
											</div>
										)}

										<div className="flex justify-between items-center w-full border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
											<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
												<span className="text-black-500 dark:text-gray-200 text-xl">
												</span>
												스피커 {data && data.speaker_ip ? `(${data.speaker_ip})` : ''}
											</h4>
											<ConnectionStatus isConnected={data.speaker_linked_status} waterlevel={false} />
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
													isDisabled={!isSpeakerRegistered}
												/>
												<Input
													className="mt-1 h-15 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400"
													placeholder={isSpeakerRegistered ? "메시지 입력" : "등록되지 않은 장치입니다"}
													size='sm'
													onChange={handleChangeSpeakerMessage}
													value={speakerMessage}
													disabled={!isSpeakerRegistered}
												/>
											</div>
											<div className="w-[10%]">
												<div className="flex flex-row gap-1 flex-col h-full">
													{data?.speaker_type !== 'aepel' && 													<button
														onClick={() => handleSpeakerBroadcast('warning')}
														className={`px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2 ${!isSpeakerRegistered ? 'cursor-not-allowed opacity-50' : ''}`}
														disabled={!isSpeakerRegistered}
													>
														{inundationIcon.warningIcon}
													</button>
}
													<button
														onClick={() => handleSpeakerBroadcast('broadcast')}
														className={`px-3 h-9 py-0.2 w-10 text-lg bg-gray-300 dark:bg-blue-600 text-bk rounded hover:bg-gray-800 dark:hover:bg-gray-700 rounded-lg mt-2 ${!isSpeakerRegistered ? 'cursor-not-allowed opacity-50' : ''}`}
														disabled={!isSpeakerRegistered}
													>
														{inundationIcon.speakerIcon}
													</button>
												</div>
											</div>
										</div>
									</div>

									<div className={`h-[142px] bg-gray-200 dark:bg-gray-800 shadow-md rounded-lg p-3 relative ${!isGuardianliteRegistered ? 'opacity-60' : ''}`}>
										{!isGuardianliteRegistered && (
											<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10 rounded-lg">
												<div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-md shadow-lg">
													<p className="text-red-500 font-semibold">등록되지 않은 장치입니다</p>
												</div>
											</div>
										)}

										<div className="flex justify-between items-center w-full border-b-2 border-gray-300 dark:border-gray-500 my-[0.125rem]">
											<h4 className="font-semibold flex items-center gap-1 dark:text-gray-200">
												가디언라이트 {data && data.guardianlite_ip ? `(${data.guardianlite_ip})` : ''}
											</h4>
											<ConnectionStatus isConnected={data.guardianlite_linked_status} waterlevel={false} />
										</div>

										<div className="flex flex-col gap-4 p-1 rounded w-full">
											<GuardianliteChannels
												data={{ ...data, ...guardianliteStatus }}
												onChannelControl={handleGuardianliteControl}
												onLabelChange={handleGuardianliteLabelChange}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{autoControlResult && (
				<AutoControlResultPopup
					result={autoControlResult}
					isOpen={isPopupOpen}
					onClose={() => {
						setIsPopupOpen(false);
						setAutoControlResult(null);
					}}
				/>
			)}
		</div>
	);
}