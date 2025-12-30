import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui";
import { WaterlevelLinkInfo } from "@/types/inundation";
import { useEffect, useState } from "react";
import { useAreaStore } from "@/store/Inundation/useAreaStore";
import { AlertDialog } from "@/components/shared/AlertDialog";
import { useSettingsStore } from "@/store/Inundation/useSettingsStore";
import TreeSelect from "@/components/common/camera/TreeSelect";
import { CameraType } from "@/@types/camera";

interface AddWaterlevelDialogProps {
	isOpen: boolean;
	onClose: () => void;
	coordinates?: { lat: number; lng: number };
	cameraList: Array<{ value: string; label: string }>;
	waterlevelOptions: Array<{ value: number; label: string }>;
}

const DEFAULT_VALUES: WaterlevelLinkInfo = {
	leftLocation: "",
	topLocation: "",
	selectedWaterlevel: null,
	areaCamera: undefined
};

const AddWaterlevelDialog = ({
	isOpen,
	onClose,
	coordinates,
	cameraList,
	waterlevelOptions,
}: AddWaterlevelDialogProps) => {
	const [alertOpen, setAlertOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [formData, setFormData] = useState<WaterlevelLinkInfo>(DEFAULT_VALUES);

	const {
		addWaterlevelGaugeToMap,
	} = useAreaStore();
	const {
		getWaterlevelGaugeList,
	} = useSettingsStore();

	useEffect(() => {
		if (!isOpen) {
			setFormData(DEFAULT_VALUES);
		} else if (coordinates) {
			setFormData(prev => ({
				...prev,
				leftLocation: String(coordinates.lng),
				topLocation: String(coordinates.lat)
			}));
		}
	}, [isOpen, coordinates]);

	const handleClose = () => {
		setFormData(DEFAULT_VALUES);
		onClose();
	};

	const onDialogConfirm = async () => {
		try {
			if (!formData.selectedWaterlevel) {
				setErrorMessage('수위계를 선택해주세요.');
				setAlertOpen(true);
				return;
			}

			const success = await addWaterlevelGaugeToMap(formData);
			if (success) {
				getWaterlevelGaugeList();
				setErrorMessage('수위계가 추가되었습니다.');
				setAlertOpen(true);
				onClose();
			} else {
				setErrorMessage('수위계 추가에 실패했습니다.');
				setAlertOpen(true);
			}
		} catch (error) {
			console.error('Error adding waterlevel:', error);
			setErrorMessage('수위계 추가 중 오류가 발생했습니다.');
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
				onClose={() => setAlertOpen(false)}
				message={errorMessage}
			/>
			<Dialog
				isOpen={isOpen}
				onClose={handleClose}
				width={600}
				height={340}
				closable={true}
			>
				<h5 className="mb-4 border-b-2 border-gray-300 dark:border-gray-700 my-[0.125rem] mt-4">
					수위계 추가
				</h5>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<div className="flex items-center space-x-4">
						<p className="text-red-500">*</p>
						<label className="w-1/5 text-sm font-medium dark:text-white text-gray-700">
							수위계
						</label>
						<Select
							className="flex-1"
							placeholder="수위계를 선택하세요."
							name="selectedWaterlevel"
							value={waterlevelOptions.find(option => option.value === formData.selectedWaterlevel) || null}
							onChange={(selectedOption) => {
								setFormData((prev) => ({
									...prev,
									selectedWaterlevel: selectedOption?.value || null,
								}));
							}}
							options={waterlevelOptions}
							isClearable
						/>
					</div>

					<div className="flex items-center space-x-4">
						<p className="invisible w-[8px]">*</p>
						<label className="w-1/5 text-sm font-medium dark:text-white text-gray-700">
							카메라
						</label>
						<TreeSelect
							cameraList={cameraList as unknown as CameraType[]}
							customMenuStyle="25rem"
							placeholder="카메라를 선택하세요"
							isServiceType="inundation"
							handleSelectedCameraIp={(identifier) => {
								setFormData(prev => ({
									...prev,
									areaCamera: identifier || "",
								}));
							}}
							initialCameraValue={formData.areaCamera}
							handleChangeCurrentCamera={(option) => {
								setFormData(prev => ({
									...prev,
									areaCamera: option?.value || "",
								}));
							}}
						/>
					</div>


					<div className="text-right mt-10 border-t-2 border-gray-300 dark:border-gray-700 my-[0.125rem]">
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

export default AddWaterlevelDialog;