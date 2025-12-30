import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui";
import { AreaFormInput } from "@/types/inundation";
import { useEffect, useState } from "react";
import { useAreaStore } from "@/store/Inundation/useAreaStore";
import { AlertDialog } from "@/components/shared/AlertDialog";
import TreeSelect from "@/components/common/camera/TreeSelect";
import { CameraType } from "@/@types/camera";
import SocketService from "../../../../services/Socket";
import { useSessionUser } from "@/store/authStore";
import useValidIpaddress from "@/utils/hooks/useValidIpaddress";
import { includes } from "lodash";

interface AddAreaDialogProps {
	isOpen: boolean;
	onClose: () => void;
	initialValues?: Partial<AreaFormInput>;
	cameraList: Array<{ value: string; label: string }>;
	waterlevelOptions: Array<{ value: number; label: string }>;
	coordinates?: { lat: number; lng: number };
}

interface GateController {
	name: string;
}

interface BillboardController {
	name: string;
}

const GATE_CONTROLLER_MODEL_LIST: GateController[] = [
	// { name: '위즈넷' },
	{ name: '일체형' },
	{ name: '그린파킹'}
];

const BILLBOARD_CONTROLLER_MODEL_LIST: BillboardController[] = [
	{ name: '기본형' },
	{ name: '그린파킹' },
	{ name: '안내판'}
]

const SIGNBOARD_CONTROLLER_MODEL_LIST: BillboardController[] = [
	{ name: '에이엘테크'}
]

const SPEAKER_CONTROLLER_MODEL_LIST: { name: string }[] = [
    { name: 'AXIS' },
    { name: 'aepel' }
];

const AddAreaDialog = ({
	isOpen,
	onClose,
	coordinates,
	cameraList,
	waterlevelOptions,
}: AddAreaDialogProps) => {
	const { user } = useSessionUser();

	const DEFAULT_VALUES: AreaFormInput = {
		areaName: "",
		areaLocation: "",
		areaCamera: "",
		areaCrossingGate: "",
		areaSpeaker: "",
		areaSpeakerPort: "",
		areaBillboard: "",
		areaBillboardPort: "",
		areaSignboard: "",
		areaSignboardPort: "",
		areaGuardianlite: "",
		areaWaterlevelGauge: null,
		leftLocation: "",
		topLocation: "",
		serviceType: "inundation",
		idx: "",
		markerId: "",
		id: user.userId || '',
		controllerModel: "",
		billboardControllerModel: "",
		signboardControllerModel: "",
		speakerType: "",
	};

	const socketService = SocketService.getInstance();

	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [formData, setFormData] = useState<AreaFormInput>(DEFAULT_VALUES);
	const [isSuccess, setIsSuccess] = useState(false);

	const {
		addArea,
		fetchAreas
	} = useAreaStore();

	useEffect(() => {
		if (!isOpen) {
			setFormData(DEFAULT_VALUES);
			setIsSuccess(false);
		} else if (coordinates) {
			setFormData(prev => ({
				...prev,
				leftLocation: String(coordinates.lng),
				topLocation: String(coordinates.lat)
			}));
		}
	}, [isOpen, coordinates]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;

		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleChangeValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			controllerModel: e.target.value,
		}));
	};

	const handleChangeBillboardValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			billboardControllerModel: e.target.value
		}));
	};

	const handleChangeSignboardValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			signboardControllerModel: e.target.value
		}));
	};

	const handleChangeSpeakerValue = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setFormData((prev) => ({
			...prev,
			speakerType: e.target.value
		}));
	};

	const handleSelectWaterlevel = (selectedOption: { value: number } | null) => {
		setFormData((prev) => ({
			...prev,
			areaWaterlevelGauge: selectedOption?.value || null,
		}));
	};

	const handleClose = () => {
		setFormData(DEFAULT_VALUES);
		setIsSuccess(false);
		onClose();
	};

	const onDialogConfirm = async () => {
		let messages: string[] = [];

		try {
			if (!formData.areaName) {
				messages.push('개소 명을 입력해주세요.');
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			}
			if (!formData.areaLocation) {
				messages.push('개소 위치를 입력해주세요.');
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			}
			if (!formData.areaCrossingGate) {
				messages.push('차단기 정보를 입력해주세요.');
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			} else if (!useValidIpaddress(formData.areaCrossingGate) || !useValidIpaddress(formData.areaBillboard)  || !useValidIpaddress(formData.areaSignboard) || !useValidIpaddress(formData.areaSpeaker) || !useValidIpaddress(formData.areaGuardianlite)) {
				messages.push('유효한 IP 주소를 입력해주세요.');
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			}
			if (!formData.controllerModel) {
				messages.push('차단기 모델을 선택해주세요.');
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			}
			const success = await addArea(formData);
			if (!success.status) {
				messages.push('개소 추가에 실패했습니다.');
				messages.push(success.message);
				setErrorMessage(messages.join('\n'));
				setAlertOpen(true);
				return;
			}

			await fetchAreas();
			messages.push('개소가 추가되었습니다.');
			setIsSuccess(true);

			if (formData.areaCrossingGate) {
				try {
					const socketService = SocketService.getInstance();
					if (!socketService.isConnected()) {
						socketService.initialize();
						await new Promise(resolve => setTimeout(resolve, 500));
					}
					if (!socketService.isConnected()) {
						throw new Error('ManageGate 소켓 연결 실패');
					}
					socketService.onRequest(
						formData.controllerModel === '그린파킹' ?
							'greenParkingManageGate' 
						: 
						"manageGate", { 
							ipaddress: formData.areaCrossingGate, 
							cmd: "add", 
							id: user.userId || '', 
							controllerModel: formData.controllerModel 
						});

					let unsubscribe: () => void;
					unsubscribe = socketService.subscribe(formData.controllerModel === '그린파킹' ? 'greenParkingManageGate' : "manageGate", () => {
						unsubscribe();
					});
				} catch (socketError) {
					console.error('차단기 소켓 연결 실패:', socketError);
					messages.push('! 차단기에 연결에 실패했습니다. 차단기 상태 확인이 필요합니다.');
				}
			}

			setErrorMessage(messages.join('\n'));
			setAlertOpen(true);

			if (success.status) {
				setTimeout(() => {
					setAlertOpen(false);
					onClose();
				}, 1500);
			}

		} catch (error) {
			console.error('개소 추가 중 오류:', error);
			messages.push('개소 추가 중 예상치 못한 오류가 발생했습니다.');
			setErrorMessage(messages.join('\n'));
			setAlertOpen(true);
			setTimeout(() => {
				onClose();
			}, 2000);
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
					if (isSuccess) {
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
					개소 추가
				</h5>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<div className="flex items-center space-x-4">
						<label className="w-1/4 text-sm font-medium dark:text-white text-gray-700">
							개소 명
						</label>
						<Input
							type="text"
							name="areaName"
							placeholder="개소 명을 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.areaName}
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
							name="areaLocation"
							placeholder="개소 위치를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.areaLocation}
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
    handleSelectedCameraIp={(value) => {
       
        const parts = value.split(':');
        
        if (parts.length === 4) {
            const cameraIp = parts[3];
            setFormData(prev => ({
                ...prev,
                camera_ip: cameraIp || "",
            }));
        } 
        else if (parts.length >= 3) {
            const cameraIp = parts[parts.length - 1]; 
            setFormData(prev => ({
                ...prev,
                camera_ip: cameraIp || "",
            }));
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
							name="controllerModel"
							onChange={handleChangeValue}
							value={formData.controllerModel || ''}
						>
							<option></option>
							{GATE_CONTROLLER_MODEL_LIST.map((value, index) => {
								return <option key={index} value={value.name}>{value.name}</option>
							})}
						</select>
						<Input
							type="text"
							name="areaCrossingGate"
							placeholder="차단기 IP를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.areaCrossingGate}
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
										name="speakerType"
										onChange={handleChangeSpeakerValue}
										value={formData.speakerType || ''}
									>
										<option></option>
										{SPEAKER_CONTROLLER_MODEL_LIST.map((value, index) => {
											return <option key={index} value={value.name}>{value.name}</option>
										})}
									</select>
								</div>
								<div className="col-span-2">
									<Input
										type="text"
										name="areaSpeakerId"
										placeholder="스피커 ID"
										className="w-full bg-gray-100 h-8"
										value={formData.areaSpeakerId || ""}
										onChange={handleInputChange}
										autoComplete="username"
									/>
								</div>
								<div className="col-span-3">
									<Input
										type="password"
										name="areaSpeakerPassword"
										placeholder="스피커 Password"
										className="w-full bg-gray-100 h-8"
										value={formData.areaSpeakerPassword || ""}
										onChange={handleInputChange}
										autoComplete="current-password"
									/>
								</div>
							</div>

							<div className="grid grid-cols-5 gap-2">
								<div className="col-span-3">
									<Input
										type="text"
										name="areaSpeaker"
										placeholder="스피커 IP를 입력하세요."
										className="w-full bg-gray-100 h-8"
										value={formData.areaSpeaker}
										onChange={handleInputChange}
									/>
								</div>
								<div className="col-span-2">
									<Input
										type="text"
										name="areaSpeakerPort"
										placeholder="스피커 PORT"
										className="w-full bg-gray-100 h-8"
										value={formData.areaSpeakerPort || ""}
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
								name="billboardControllerModel"
								onChange={handleChangeBillboardValue}
								value={formData.billboardControllerModel || ''}
								>
								<option></option>
								{BILLBOARD_CONTROLLER_MODEL_LIST.map((value, index) => {
									return <option key={index} value={value.name}>{value.name}</option>
								})}
							</select>
						<div className="flex-1 grid grid-cols-5 gap-2">
							<div className="col-span-3">
								<Input
									type="text"
									name="areaBillboard"
									placeholder="전광판 IP를 입력하세요."
									className="w-full bg-gray-100 h-8"
									value={formData.areaBillboard || ""}
									onChange={handleInputChange}
								/>
							</div>
							<div className="col-span-2">
								<Input
									type="text"
									name="areaBillboardPort"
									placeholder= {formData.billboardControllerModel === '그린파킹' ? '9090' : "전광판 PORT"}
									className="w-full bg-gray-100 h-8"
									value={formData.areaBillboardPort || ""}
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
								name="signboardControllerModel"
								onChange={handleChangeSignboardValue}
								value={formData.signboardControllerModel || ''}
								>
								<option></option>
								{SIGNBOARD_CONTROLLER_MODEL_LIST.map((value, index) => {
									return <option key={index} value={value.name}>{value.name}</option>
								})}
							</select>
						<div className="flex-1 grid grid-cols-5 gap-2">
							<div className="col-span-3">
								<Input
									type="text"
									name="areaSignboard"
									placeholder="안내판 IP를 입력하세요."
									className="w-full bg-gray-100 h-8"
									value={formData.areaSignboard || ""}
									onChange={handleInputChange}
								/>
							</div>
							<div className="col-span-2">
								<Input
									type="text"
									name="areaSignboardPort"
									placeholder= "안내판 PORT"
									className="w-full bg-gray-100 h-8"
									value={formData.areaSignboardPort || ""}
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
							name="areaGuardianlite"
							placeholder="가디언라이트 IP를 입력하세요."
							className="flex-1 bg-gray-100 h-8"
							value={formData.areaGuardianlite}
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
								(option) => option.value === formData.areaWaterlevelGauge
							)}
							onChange={(option) => handleSelectWaterlevel(option)}
							options={waterlevelOptions}
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
								저장
							</Button>
						</div>
					</div>
				</form>
			</Dialog>
		</>
	);
};

export default AddAreaDialog;