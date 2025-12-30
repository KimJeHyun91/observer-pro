import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui";
import { AreaModifyFormInput } from "@/types/inundation";
import { useCallback, useEffect, useState } from "react";
import { useAreaStore } from "@/store/Inundation/useAreaStore";
import { AlertDialog } from "@/components/shared/AlertDialog";
import { useSettingsStore } from "@/store/Inundation/useSettingsStore";
import TreeSelect from "@/components/common/camera/TreeSelect";
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";
import { CameraType } from "@/@types/camera";
import { useSessionUser } from "@/store/authStore";
import useValidIpaddress from "@/utils/hooks/useValidIpaddress";
import SocketService from "@/services/socket";

interface ModifyAreaDialogProps {
	isOpen: boolean;
	onClose: () => void;
	cameraList: Array<{
		camera_id: any;
		vms_name: any;
		main_service_name: any;
		camera_ip: string;
		value: string;
		label: string;
	}>;
	coordinates?: { lat: number; lng: number };
	areaData?: AreaModifyFormInput;
}

interface GateController {
	name: string;
}

const GATE_CONTROLLER_MODEL_LIST: GateController[] = [
	{ name: '위즈넷' },
	{ name: '일체형' },
	{ name: '그린파킹' }
];

interface BillboardController {
	name: string;
}

const BILLBOARD_CONTROLLER_MODEL_LIST: BillboardController[] = [
	{ name: '기본형' },
	{ name: '그린파킹' }
];

const SIGNBOARD_CONTROLLER_MODEL_LIST: BillboardController[] = [
	{ name: '에이엘테크' }
];

const SPEAKER_CONTROLLER_MODEL_LIST: { name: string }[] = [
	{ name: 'AXIS' },
	{ name: 'aepel' }
];

const ModifyAreaDialog = ({
	isOpen,
	onClose,
	coordinates,
	cameraList,
	areaData,
}: ModifyAreaDialogProps) => {
	const { user } = useSessionUser();

	const DEFAULT_VALUES: AreaModifyFormInput = {
		outside_idx: 0,
		outside_name: "",
		outside_location: "",
		camera_ip: "",
		crossing_gate_ip: "",
		speaker_ip: "",
		speaker_port: "",
		guardianlite_ip: "",
		water_level_idx: 0,
		service_type: "inundation",
		areaCamera: undefined,
		id: user.userId || '',
		controller_model: "",
		billboard_ip: "",
		billboard_port: "",
		billboard_controller_model: "",
		signboard_ip: "",
		signboard_port: "",
		signboard_controller_model: "",
		vms_name: '',
		speaker_type: ''
	};

	const { socketService } = useSocketConnection();
	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [formData, setFormData] = useState(DEFAULT_VALUES);
	const [isLoading, setIsLoading] = useState(false);
	const [initialDataLoaded, setInitialDataLoaded] = useState(false);
	const [originalCrossingGateIp, setOriginalCrossingGateIp] = useState('');

	const { fetchAreas, modifyArea } = useAreaStore();
	const {
		waterlevelOutsideList,
		waterlevelGaugeList,
		getWaterlevelGaugeList,
		getWaterlevelOutsideList
	} = useSettingsStore();

	const [waterlevelOptions, setWaterlevelOptions] = useState<Array<{ value: number; label: string }>>([]);
	const [isWaterlevelLoading, setIsWaterlevelLoading] = useState(false);

	const fetchWaterlevelData = useCallback(async () => {
		if (!areaData?.outside_idx) return;

		try {
			setIsWaterlevelLoading(true);
			await Promise.all([
				getWaterlevelGaugeList(),
				getWaterlevelOutsideList()
			]);
		} catch (error) {
			console.error('ModifyAreaDialog: 수위계 데이터 로딩 실패:', error);
		} finally {
			setIsWaterlevelLoading(false);
		}
	}, [getWaterlevelGaugeList, getWaterlevelOutsideList, areaData?.outside_idx]);

	useEffect(() => {
		if (isOpen) {
			fetchWaterlevelData();
		}
	}, [isOpen, fetchWaterlevelData]);

	useEffect(() => {
		if (waterlevelOutsideList && Array.isArray(waterlevelOutsideList) && waterlevelOutsideList.length > 0) {
			const currentWaterlevel = waterlevelOutsideList.find(
				item => item.outside_idx === areaData?.outside_idx
			);

			if (currentWaterlevel && currentWaterlevel.water_level_idx) {
				setFormData(prev => ({
					...prev,
					water_level_idx: currentWaterlevel.water_level_idx
				}));
			} else {
				setFormData(prev => ({
					...prev,
					water_level_idx: 0
				}));
			}
		}
	}, [waterlevelOutsideList, areaData?.outside_idx]);

	useEffect(() => {
		if (isOpen && areaData && !initialDataLoaded) {
			let selectedCamera = null;

			if (areaData.camera_id) {
				selectedCamera = cameraList.find(
					camera => camera.camera_id === areaData.camera_id
				);
			}

			let areaCameraValue = undefined;

			if (selectedCamera) {
				areaCameraValue = `${selectedCamera.main_service_name}:${selectedCamera.vms_name}:${selectedCamera.camera_id}:${selectedCamera.service_type}`;
			}

			setOriginalCrossingGateIp(areaData.crossing_gate_ip || '');
			setFormData(prev => ({
				...prev,
				...areaData,
				areaCamera: areaCameraValue
			}));
			setInitialDataLoaded(true);
		}
	}, [isOpen, areaData, cameraList, initialDataLoaded]);

	useEffect(() => {
		if (waterlevelGaugeList && Array.isArray(waterlevelGaugeList) && waterlevelGaugeList.length > 0) {
			const options = waterlevelGaugeList
				.filter(item => item.water_level_idx && item.water_level_name)
				.map(item => ({
					value: item.water_level_idx,
					label: `${item.water_level_name || '수위계'} (${item.water_level_location || item.water_level_ip || 'IP 없음'})`
				}));
			setWaterlevelOptions(options);
		} else {
			setWaterlevelOptions([]);
		}
	}, [waterlevelGaugeList]);

	useEffect(() => {
		if (socketService && areaData?.outside_idx) {
			const unsubscribe = socketService.subscribe('fl_waterlevels-update', async () => {
				try {
					await fetchWaterlevelData();
				} catch (error) {
					console.error('Error updating waterlevel data:', error);
				}
			});
			return () => unsubscribe();
		}
	}, [socketService, areaData?.outside_idx, fetchWaterlevelData]);

	useEffect(() => {
		if (!isOpen) {
			setInitialDataLoaded(false);
			setFormData(DEFAULT_VALUES);
			setOriginalCrossingGateIp('');
			setWaterlevelOptions([]);
		}
	}, [isOpen]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleChangeValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			controller_model: e.target.value,
		}));
	};

	const handleChangeBillboardValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			billboard_controller_model: e.target.value
		}));
	};

	const handleChangeSignboardValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			signboard_controller_model: e.target.value
		}));
	};

	const handleChangeSpeakerValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			speaker_type: e.target.value
		}));
	};

	const handleSelectWaterlevel = (selectedOption: { value: number } | null) => {
		setFormData((prev) => ({
			...prev,
			water_level_idx: selectedOption?.value || 0,
		}));
	};

	const handleClose = () => {
		setFormData(DEFAULT_VALUES);
		onClose();
	};

	// IP 주소 유효성 검사
	const validateIPAddresses = (formData: AreaModifyFormInput) => {
		const messages: string[] = [];
		const ipFields = [
			{ key: 'crossing_gate_ip' as keyof AreaModifyFormInput, label: '차단기 IP' },
			{ key: 'billboard_ip' as keyof AreaModifyFormInput, label: '전광판 IP' },
			{ key: 'signboard_ip' as keyof AreaModifyFormInput, label: '안내판 IP' },
			{ key: 'speaker_ip' as keyof AreaModifyFormInput, label: '스피커 IP' },
			{ key: 'guardianlite_ip' as keyof AreaModifyFormInput, label: '가디언라이트 IP' }
		];

		for (const field of ipFields) {
			const value = formData[field.key] as string;
			if (value !== undefined && value !== null && value.trim() !== '') {
				if (!useValidIpaddress(value)) {
					messages.push(`${field.label}가 유효하지 않습니다.`);
				}
			}
		}

		return messages;
	};

	// 폼 유효성 검사
	const validateForm = (): boolean => {
		const messages: string[] = [];

		if (!formData.outside_name) {
			setErrorMessage('개소 명을 입력해주세요.');
			setAlertOpen(true);
			return false;
		}

		if (!formData.outside_location) {
			setErrorMessage('개소 위치를 입력해주세요.');
			setAlertOpen(true);
			return false;
		}

		if (!formData.crossing_gate_ip) {
			setErrorMessage('차단기 정보를 입력해주세요.');
			setAlertOpen(true);
			return false;
		}

		if (!formData.controller_model) {
			messages.push('차단기 모델을 선택해주세요.');
			setErrorMessage(messages.join('\n'));
			setAlertOpen(true);
			return false;
		}

		const ipValidationMessages = validateIPAddresses(formData);
		if (ipValidationMessages.length > 0) {
			messages.push(...ipValidationMessages);
			setErrorMessage(messages.join('\n'));
			setAlertOpen(true);
			return false;
		}

		return true;
	};

	const onDialogConfirm = async () => {
		try {
			if (!validateForm()) return;

			const submitData = {
				...formData
			};

			if (formData.camera_id) {
				const cameraIdValue = formData.camera_id;

				if (cameraIdValue.includes(':')) {
					const parts = cameraIdValue.split(':');

					if (parts.length === 4) {
						const [cameraId, vmsName, mainServiceName, cameraIp] = parts;

						const isUUID = cameraId.length >= 32 && cameraId.includes('-');

						if (isUUID && (!vmsName || vmsName === '')) {
							submitData.camera_ip = cameraId;
						} else {
							submitData.camera_ip = `${cameraId}:${vmsName}:${mainServiceName}`;
						}
					} else if (parts.length === 3) {
						const [cameraId, vmsName, mainServiceName] = parts;
						submitData.camera_ip = `${cameraId}:${vmsName}:${mainServiceName}`;
					}
				} else {
					submitData.camera_ip = cameraIdValue;
				}
			} else {
				submitData.camera_ip = null;
			}

			const result: any = await modifyArea(submitData);

			if (result && typeof result === 'object' && result?.response?.data?.message === 'error') {
				setErrorMessage(result?.response?.data?.result?.detail || '오류가 발생했습니다.');
				setAlertOpen(true);
				return;
			}

			await fetchAreas();
			await Promise.all([
				getWaterlevelOutsideList(),
				getWaterlevelGaugeList()
			]);

			let messages: string[] = ['개소가 수정되었습니다.'];

			const originalCrossingGate = originalCrossingGateIp;
			const newCrossingGate = formData.crossing_gate_ip;

			if (newCrossingGate) {
				try {
					const socketService = SocketService.getInstance();
					if (!socketService.isConnected()) {
						socketService.initialize();
					}

					if (originalCrossingGate !== newCrossingGate) {
						if (originalCrossingGate) {
							socketService.onRequest("manageGate", {
								ipaddress: originalCrossingGate,
								cmd: "remove",
								id: user.userId || '',
								controllerModel: formData?.controller_model || ''
							});

							const unsubscribeRemove = socketService.subscribe("manageGate", () => {
								unsubscribeRemove();
							});
						}

						socketService.onRequest("manageGate", {
							ipaddress: newCrossingGate,
							cmd: "add",
							id: user.userId || '',
							controllerModel: formData?.controller_model || ''
						});

						const unsubscribeAdd = socketService.subscribe("manageGate", () => {
							unsubscribeAdd();
						});
					}
				} catch (socketError) {
					console.error('차단기 소켓 연결 실패:', socketError);
					messages.push('! 차단기 연결에 실패했습니다. 차단기 상태 확인이 필요합니다.');
				}
			} else if (originalCrossingGate) {
				try {
					const socketService = SocketService.getInstance();
					if (!socketService.isConnected()) {
						socketService.initialize();
					}

					socketService.onRequest("manageGate", {
						ipaddress: originalCrossingGate,
						cmd: "remove",
						id: user.userId || '',
						controllerModel: formData?.controller_model || ''
					});

					const unsubscribeRemove = socketService.subscribe("manageGate", () => {
						unsubscribeRemove();
					});
				} catch (socketError) {
					console.error('차단기 소켓 연결 실패:', socketError);
					messages.push('! 차단기 연결에 실패했습니다. 차단기 상태 확인이 필요합니다.');
				}
			}

			setErrorMessage(messages.join('\n'));
			setAlertOpen(true);

		} catch (error) {
			console.error('Error saving area:', error);
			setErrorMessage('개소 수정 중 오류가 발생했습니다.');
			setAlertOpen(true);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onDialogConfirm();
	};

	return (
		<>
			<AlertDialog
				isOpen={alertOpen}
				onClose={() => {
					setAlertOpen(false);
					if (errorMessage === '개소가 수정되었습니다.') {
						onClose();
					}
				}}
				message={errorMessage}
				overlayClassName="z-[100]"
			/>
			<Dialog
				isOpen={isOpen}
				onClose={handleClose}
				width={600}
				height={730}
				closable={true}
				overlayClassName="z-[1000]"
			>
				<h5 className="mb-4 border-b-2 border-gray-300 dark:border-gray-700 my-[0.125rem] mt-4">
					개소 수정
				</h5>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							개소 명
						</label>
						<Input
							type="text"
							name="outside_name"
							placeholder="개소 명을 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.outside_name}
							onChange={handleInputChange}
							required
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							개소 위치
						</label>
						<Input
							type="text"
							name="outside_location"
							placeholder="개소 위치를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.outside_location}
							onChange={handleInputChange}
							required
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							카메라
						</label>
						<TreeSelect
							cameraList={cameraList as unknown as CameraType[]}
							customMenuStyle="25rem"
							placeholder="카메라를 선택하세요"
							isServiceType="inundation"
							handleSelectedCameraIp={(cameraData) => {
								if (cameraData) {
									const parts = cameraData.split(':');
									if (parts.length >= 3) {
										const [mainService, vmsName, cameraId] = parts;
										if (!vmsName || vmsName === '') {
											setFormData(prev => ({ ...prev, camera_ip: cameraId }));
										} else {
											setFormData(prev => ({ ...prev, camera_ip: `${cameraId}:${vmsName}:${mainService}` }));
										}
									}
								} else {
									setFormData(prev => ({ ...prev, camera_ip: null }));
								}
							}}
							initialCameraValue={formData.areaCamera}
							handleChangeCurrentCamera={(option) => {
								setFormData(prev => ({
									...prev,
									areaCamera: option?.value || "",
								}));
							}}
							camera={formData.areaCamera ? formData.areaCamera : null}
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							차단기
						</label>
						<select
							className="form-control bg-gray-100 rounded-xl w-20 h-8"
							name="controller_model"
							onChange={handleChangeValue}
							value={formData.controller_model || ''}
						>
							<option value="">선택</option>
							{GATE_CONTROLLER_MODEL_LIST.map((controller, index) => (
								<option key={index} value={controller.name}>
									{controller.name}
								</option>
							))}
						</select>
						<Input
							type="text"
							name="crossing_gate_ip"
							placeholder="차단기 IP를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.crossing_gate_ip}
							onChange={handleInputChange}
							required
						/>
					</div>

					<div className="flex items-start space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700 pt-2">
							스피커 설정
						</label>
						<div className="flex-1 space-y-3">
							<div className="grid grid-cols-7 gap-2">
								<div className="col-span-2">
									<select
										className="form-control bg-gray-100 rounded-xl w-20 h-8"
										name="speaker_type"
										onChange={handleChangeSpeakerValue}
										value={formData.speaker_type || ''}
									>
										<option value="">선택</option>
										{SPEAKER_CONTROLLER_MODEL_LIST.map((value, index) => (
											<option key={index} value={value.name}>{value.name}</option>
										))}
									</select>
								</div>
								<div className="col-span-2">
									<Input
										type="text"
										name="speaker_id"
										placeholder="스피커 ID"
										className="w-full bg-gray-100 h-8"
										value={formData.speaker_id || ""}
										onChange={handleInputChange}
									/>
								</div>
								<div className="col-span-3">
									<Input
										type="password"
										name="speaker_password"
										placeholder="스피커 Password"
										className="w-full bg-gray-100 h-8"
										value={formData.speaker_password || ""}
										onChange={handleInputChange}
									/>
								</div>
							</div>

							<div className="grid grid-cols-5 gap-2">
								<div className="col-span-3">
									<Input
										type="text"
										name="speaker_ip"
										placeholder="스피커 IP를 입력하세요."
										className="w-full bg-gray-100 h-8"
										value={formData.speaker_ip}
										onChange={handleInputChange}
									/>
								</div>
								<div className="col-span-2">
									<Input
										type="text"
										name="speaker_port"
										placeholder="스피커 PORT"
										className="w-full bg-gray-100 h-8"
										value={formData.speaker_port || ""}
										onChange={handleInputChange}
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							전광판
						</label>
						<select
							className="form-control bg-gray-100 rounded-xl w-20 h-8"
							name="billboard_controller_model"
							onChange={handleChangeBillboardValue}
							value={formData.billboard_controller_model || ''}
						>
							<option value="">선택</option>
							{BILLBOARD_CONTROLLER_MODEL_LIST.map((value, index) => (
								<option key={index} value={value.name}>{value.name}</option>
							))}
						</select>
						<div className="flex-1 grid grid-cols-5 gap-2">
							<div className="col-span-3">
								<Input
									type="text"
									name="billboard_ip"
									placeholder="전광판 IP를 입력하세요."
									className="w-full bg-gray-100 h-8"
									value={formData.billboard_ip || ""}
									onChange={handleInputChange}
								/>
							</div>
							<div className="col-span-2">
								<Input
									type="text"
									name="billboard_port"
									placeholder={formData.billboard_controller_model === '그린파킹' ? '9090' : "전광판 PORT"}
									className="w-full bg-gray-100 h-8"
									value={formData.billboard_port || ""}
									onChange={handleInputChange}
								/>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							안내판
						</label>
						<select
							className="form-control bg-gray-100 rounded-xl w-20 h-8"
							name="signboard_controller_model"
							onChange={handleChangeSignboardValue}
							value={formData.signboard_controller_model || ''}
						>
							<option value="">선택</option>
							{SIGNBOARD_CONTROLLER_MODEL_LIST.map((value, index) => (
								<option key={index} value={value.name}>{value.name}</option>
							))}
						</select>
						<div className="flex-1 grid grid-cols-5 gap-2">
							<div className="col-span-3">
								<Input
									type="text"
									name="signboard_ip"
									placeholder="안내판 IP를 입력하세요."
									className="w-full bg-gray-100 h-8"
									value={formData.signboard_ip || ""}
									onChange={handleInputChange}
								/>
							</div>
							<div className="col-span-2">
								<Input
									type="text"
									name="signboard_port"
									placeholder="안내판 PORT"
									className="w-full bg-gray-100 h-8"
									value={formData.signboard_port || ""}
									onChange={handleInputChange}
								/>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							가디언라이트
						</label>
						<Input
							type="text"
							name="guardianlite_ip"
							placeholder="가디언라이트 IP를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.guardianlite_ip}
							onChange={handleInputChange}
						/>
					</div>

					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							수위계
						</label>
						<Select
							className="flex-1"
							size="sm"
							placeholder="수위계를 선택하세요."
							value={waterlevelOptions.find(
								option => option.value === formData.water_level_idx
							)}
							onChange={handleSelectWaterlevel}
							options={waterlevelOptions}
							isDisabled={isWaterlevelLoading}
							isClearable
						/>
					</div>

					<div className="text-right border-t-2 border-gray-300 dark:border-gray-700 my-[0.125rem]">
						<div className="mt-5">
							<Button
								className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
								size="sm"
								onClick={handleClose}
								type="button"
							>
								취소
							</Button>
							<Button
								className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
								size="sm"
								variant="solid"
								type="submit"
							>
								수정
							</Button>
						</div>
					</div>
				</form>
			</Dialog>
		</>
	);
};

export default ModifyAreaDialog;