import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import { useState, useEffect } from 'react';
import {
	ColumnDef,
	useReactTable,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
} from "@tanstack/react-table";
import Button from '@/components/ui/Button';
import { useParkingFeeDeviceList } from '@/utils/hooks/useParkingFeeDevice';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ApiResultStatus } from '@/@types/api'
import { AxiosError } from "axios";
import { 
	addDeviceInfo,
	updateDeviceInfo,
	deleteDeviceInfo 
} from '@/services/ParkingFeeService';
import { CrossingGateType } from '@/@types/parkingFee';
import { Select } from '@/components/ui'

type FormValues = {
	crossing_gate_ip: string;
	crossing_gate_port: string;
	gate_index: string;
	ledd_index: string;
	pt_index?: string;
	direction: 'in' | 'out';
	location: string;
};

type ApiResultStatusWrapper = {
    message: string;
    result: ApiResultStatus;
}

const ParkingFeeCrossingGateSetting = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		watch,
		clearErrors,
		control,
	} = useForm<FormValues>({
		defaultValues: {
			direction: 'in',
		},
	});
	const { isLoading, error, data, mutate } = useParkingFeeDeviceList();
	const deviceList: CrossingGateType[] = data || [];
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [errorMessage, setErrorMessage] = useState('');
	const [dialogIsOpen, setIsOpen] = useState(false);
	const [addModifyloadingState, setAddModifyloadingState] = useState(false);
	const [deleteloadingState, setDeleteloadingState] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); 
	const [editOrignDevice, setEditOrignDevice] = useState<CrossingGateType | null>(null);
	const [isModified, setIsModified] = useState(false);
	const watchedFields = watch();
	const directionOptions = [
		{ value: 'in', label: '입차 (in)' },
		{ value: 'out', label: '출차 (out)' },
	];

	if (isLoading) {
		console.log('get device list loading...');
	};

	if (error) {
		console.error('get device list error: ', error);
	}

	useEffect(() => {
		if (isEditMode && editOrignDevice) {
			const isChanged =
				watchedFields.crossing_gate_ip !== editOrignDevice.crossing_gate_ip ||
				watchedFields.crossing_gate_port !== editOrignDevice.crossing_gate_port ||
				watchedFields.gate_index !== editOrignDevice.gate_index ||
				watchedFields.ledd_index !== editOrignDevice.ledd_index ||
				watchedFields.pt_index !== editOrignDevice.pt_index ||
				watchedFields.direction !== editOrignDevice.direction ||
				watchedFields.location !== editOrignDevice.location;
	
			setIsModified(isChanged);
		}
	}, [watchedFields, isEditMode, editOrignDevice]);
	
    const onSubmit: SubmitHandler<FormValues> = async (data) => {
		setAddModifyloadingState(true);

		try {
			if (isEditMode) {
				const device = {
					crossing_gate_idx: editOrignDevice?.idx,
					crossing_gate_ip: data.crossing_gate_ip,
					crossing_gate_port: data.crossing_gate_port,
					gate_index: data.gate_index,
					ledd_index: data.ledd_index,
					pt_index: data.pt_index,
					direction: data.direction,
					location: data.location,
				} as unknown as ApiResultStatusWrapper;

				const res = await updateDeviceInfo<ApiResultStatusWrapper>({ data: device });
	
				if(res.message === 'fail'){
					setErrorMessage(`Device 수정에 실패했습니다. \n\n message : ${res.result}`);
					setAddModifyloadingState(false);
					setIsOpen(true);
					return;
				}

				if (!res || !res.result) {
					return;
				}

				setIsEditMode(false);
				setErrorMessage(`Device 등록에 성공했습니다.`);
				mutate();
				reset({
					crossing_gate_ip: '',
					crossing_gate_port: '',
					gate_index: '',
					ledd_index: '',
					pt_index: '',
					direction: 'in',
					location: '',
				});
			} else {
				const device = {
					crossing_gate_ip: data.crossing_gate_ip,
					crossing_gate_port: data.crossing_gate_port,
					gate_index: data.gate_index,
					ledd_index: data.ledd_index,
					pt_index: data.pt_index,
					direction: data.direction,
					location: data.location,
				} as unknown as ApiResultStatusWrapper;
				
				const res = await addDeviceInfo<ApiResultStatusWrapper>({ data: device });
				
				if(res.message === 'fail'){
					setErrorMessage(`Device 등록에 실패했습니다. \n\n message : ${res.result}`);
					setAddModifyloadingState(false);
					setIsOpen(true);
					return;
				}

				if (!res || !res.result) {
					return;
				}

				setIsEditMode(false);
				setErrorMessage(`Device 등록에 성공했습니다.`);
				mutate();
				reset({
					crossing_gate_ip: '',
					crossing_gate_port: '',
					gate_index: '',
					ledd_index: '',
					pt_index: '',
					direction: 'in',
					location: '',
				});
			}
	
			setAddModifyloadingState(false);
			setIsOpen(true);
		} catch (error) {
			if (error instanceof AxiosError && error.response) {
				setErrorMessage(
					`Device ${isEditMode ? '수정' : '등록'}에 실패했습니다. \n\n message : ${error}`
				);
			}
			setIsOpen(true);
			setIsEditMode(false);
			setAddModifyloadingState(false);
		}
	};
	
	const rowSelect = (idx: number) => {
		setSelectedRows((prev) => {
			const newSet = new Set(prev);

			if (newSet.has(idx)) {
				newSet.delete(idx);
			} else {
				newSet.add(idx);
			}

			return newSet;
		});
	};
	
	const remove = async () => {
		setDeleteloadingState(true);
        const selectedDevice = Array.from(selectedRows)
			.map((id) => deviceList.find((device) => device.idx === id));

			
		if (!selectedDevice || selectedDevice.length === 0) {
			setDeleteloadingState(false);
			return;
		}

		const crossing_gate_idx_list = selectedDevice.map(device => device?.idx);
		
		try {
			const res = await deleteDeviceInfo<ApiResultStatusWrapper>({
				data: {
				crossing_gate_idx_list,
			} as unknown as ApiResultStatusWrapper,});
			
			if (res.message === 'ok') {
				setErrorMessage(`Device ${res.result} 개가 성공적으로 삭제되었습니다.`);
				setSelectedRows(new Set());
				mutate();
			} else if(res.message === 'none') {
				setErrorMessage('삭제 할 Device가 없습니다.');
			} else {
				setErrorMessage('Device 삭제에 실패했습니다.');
			}

			setIsOpen(true);
			setDeleteloadingState(false);
		} catch (error) {
			if (error instanceof AxiosError && error.response) {
				setErrorMessage(
				  `Device 삭제에 실패했습니다. \n\n ${error}`
				);
			}
			setIsOpen(true);
			setDeleteloadingState(false);
		}
    };

	const edit = () => {
        if (selectedRows.size !== 1){
			return;
		}

        const selectedId = Array.from(selectedRows)[0];
        const selectedDevice = deviceList.find((device) => device.idx === selectedId);
		
        if (selectedDevice) {
			setEditOrignDevice(selectedDevice);
            reset({
				crossing_gate_ip: selectedDevice.crossing_gate_ip,
				crossing_gate_port: selectedDevice.crossing_gate_port,
				gate_index: selectedDevice.gate_index,
				ledd_index: selectedDevice.ledd_index,
				pt_index: selectedDevice.pt_index,
				direction: selectedDevice.direction,
				location: selectedDevice.location,
			});
            setIsEditMode(true);
        }
    };
	
	const cancelEdit = () => {
		setIsEditMode(false);
		clearErrors();
		reset({
			crossing_gate_ip: '',
			crossing_gate_port: '',
			gate_index: '',
			ledd_index: '',
			pt_index: '',
			direction: 'in',
			location: '',
		});
	}

	const columns: ColumnDef<CrossingGateType>[] = [
		{
			id: "select",
			header: () => (
				<input
					type="checkbox"
					checked={deviceList.length > 0 && selectedRows.size === deviceList.length}
					disabled={isEditMode || addModifyloadingState}
					onChange={(e) => {
						if (isEditMode || addModifyloadingState) return;
						const isChecked = e.target.checked;
						if (isChecked) {
							const allIds = deviceList.map((row) => row.idx);
							setSelectedRows(new Set(allIds));
						} else {
							setSelectedRows(new Set());
						}
					}}
				/>
			),
			cell: ({ row }) => (
				<input
					type="checkbox"
					checked={selectedRows.has(row.original.idx)}
					disabled={isEditMode || addModifyloadingState}
					onChange={() => {
						if (isEditMode || addModifyloadingState) return;
						rowSelect(row.original.idx);
					}}
				/>
			),
		},
		{
			accessorKey: "crossing_gate_ip",
			header: "IP Address",
			enableSorting: false,
		},
		{
			accessorKey: "crossing_gate_port",
			header: "Port",
			enableSorting: false,
		},
		{
			accessorKey: "gate_index",
			header: "Gate Index",
			enableSorting: false,
		},
		{
			accessorKey: "ledd_index",
			header: "LEDD Index",
			enableSorting: false,
		},
		{
			accessorKey: "pt_index",
			header: "PT Index",
			enableSorting: false,
		},
		{
			accessorKey: "direction",
			header: "진입 방향",
			enableSorting: false,
		},
		{
			accessorKey: "location",
			header: "위치",
			enableSorting: false,
		},
	];
	
	const table = useReactTable({
		data: deviceList,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

    return (
		<div>
			<AlertDialog
				isOpen={dialogIsOpen}
				message={errorMessage}
				onClose={() => setIsOpen(false)}
			/>
			{/* 차단기 등록 */}
			<div>
				<h5 className="font-semibold mb-2">차단기 등록</h5>
				<form
					className="flex flex-col gap-2 p-3 border border-gray-200 rounded-sm dark:border-gray-500"
					onSubmit={handleSubmit(onSubmit)}
				>
					<div className="relative flex items-center">
						<label
							htmlFor="crossing_gate_ip"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							IP Address
						</label>

						<input
							id="crossing_gate_ip"
							type="text"
							placeholder="IP 주소를 입력하세요."
							{...register('crossing_gate_ip', {
								required: 'IP 주소를 입력해주세요.',
							})}
							className={`w-full border rounded px-3 py-2 outline-none ${
								errors.crossing_gate_ip
								? 'border-red-500 focus:border-red-500'
								: 'border-gray-300 focus:border-blue-500'
							}`}
						/>
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="crossing_gate_port"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Port
						</label>

						<input
							id="crossing_gate_port"
							type="text"
							placeholder="포트 번호를 입력하세요."
							{...register('crossing_gate_port', {
								required: '포트 번호를 입력해주세요.',
							})}
							className={`w-full border rounded px-3 py-2 outline-none ${
								errors.crossing_gate_port
								? 'border-red-500 focus:border-red-500'
								: 'border-gray-300 focus:border-blue-500'
							}`}
						/>
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="gate_index"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Gate Index
						</label>

						<input
							id="gate_index"
							type="text"
							placeholder="Gate Index를 입력하세요."
							{...register('gate_index', {
								required: 'Gate Index를 입력해주세요.',
							})}
							className={`w-full border rounded px-3 py-2 outline-none ${
								errors.gate_index
								? 'border-red-500 focus:border-red-500'
								: 'border-gray-300 focus:border-blue-500'
							}`}
						/>
					</div>
					
					<div className="relative flex items-center">
						<label
							htmlFor="ledd_index"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Ledd Index
						</label>
						<input
							id="ledd_index"
							type="text"
							placeholder="Ledd Index를 입력하세요."
							{...register('ledd_index', { 
								required: 'Ledd Index를 입력해주세요.' 
							})}
							className={`w-full border rounded px-3 py-2 outline-none ${
								errors.ledd_index
								? 'border-red-500 focus:border-red-500'
								: 'border-gray-300 focus:border-blue-500'
							}`}
						/>
					</div>
					
					<div className="relative flex items-center">
						<label
							htmlFor="pt_index"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Pt Index
						</label>
						<input
							id="pt_index"
							type="text"
							placeholder="Pt Index를 입력하세요."
							{...register('pt_index')}
							className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
						/>
					</div>

				    <div className="relative flex items-center">
						<label 
							htmlFor="direction"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							진입 방향
						</label>

						<Controller
							name="direction"
							control={control}
							rules={{ required: '진입 방향을 선택해주세요.' }}
							render={({ field, fieldState }) => (
								<Select
									inputId="direction"
									size="xs"
									isSearchable={false}
									styles={{
										control: () => ({
											backgroundColor: '#fff',
											border: `1px solid ${fieldState.invalid ? '#f87171' : '#d1d5db'}`,
											borderRadius: '5px',
										}),
									}}
									className="w-full"
									value={directionOptions.find(opt => opt.value === field.value)}
									options={directionOptions}
									onChange={(option) => field.onChange(option?.value)}
									onBlur={field.onBlur}
								/>
							)}
						/>
					</div>

				    <div className="relative flex items-center">
						<label
							htmlFor="location"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Location
						</label>
						<input
							id="location"
							type="text"
							placeholder="Location를 입력하세요."
							{...register('location', { 
								required: 'Location를 입력해주세요.' 
							})}
							className={`w-full border rounded px-3 py-2 outline-none ${
								errors.location
								? 'border-red-500 focus:border-red-500'
								: 'border-gray-300 focus:border-blue-500'
							}`}
						/>
					</div>

					<div className="flex justify-end">
						{isEditMode ? (
                            <>
                                <Button
                                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
                                    size="sm"
									loading={addModifyloadingState}
									onClick={cancelEdit}
                                >
                                    취소
                                </Button>
                                <Button
                                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                                    size="sm"
                                    variant="solid"
									loading={addModifyloadingState}
									disabled={!isModified}
                                >
                                    수정 완료
                                </Button>
                            </>
                        ) : (
                            <Button
                                className="w-[100px] h-[34px] bg-[#17A36F] rounded"
                                size="sm"
                                variant="solid"
                                loading={addModifyloadingState}
                            >
                                저장
                            </Button>
                        )}
					</div>
				</form>
			</div>

			{/* 차단기 목록 */}
			<div className="mt-5">
            	<h5 className="font-semibold mb-2">차단기 목록</h5>
				<div className="border rounded-sm overflow-auto scroll-container h-max[200px] h-[200px] dark:border-gray-500">
					 <table className="min-w-full table-auto border-collapse">
						<thead className="sticky top-0 bg-gray-100">
							{table.getHeaderGroups().map((headerGroup) => (
								<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="p-2 text-left font-medium cursor-pointer dark:text-[#000]"
										onClick={header.column.getToggleSortingHandler()}
									>
									{header.isPlaceholder
										? null
										: flexRender(
											header.column.columnDef.header,
											header.getContext()
									)}
									{header.column.getIsSorted() === "asc"
										? <span>↑</span>
											: header.column.getIsSorted() === "desc"
										? <span>↓</span>
											: ""
									}
									</th>
								))}
								</tr>
							))}
						</thead>

						<tbody>
							{table.getRowModel().rows.map((row) => (
								<tr key={row.id} className="hover:bg-gray-50 dark:text-[#FFFFFF] dark:hover:text-[#000]">
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="p-2">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex justify-end mt-6 mr-2">
					<Button
						className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
						size="sm"
						loading={deleteloadingState}
						disabled={isEditMode || addModifyloadingState}
						onClick={remove}
					>
						삭제
					</Button>
					
					<Button
						className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
						size="sm"
						variant="solid"
						disabled={selectedRows.size > 1 || isEditMode || addModifyloadingState}
						onClick={edit}
					>
						수정
					</Button>
				</div>
			</div>
		</div>
    )
}

export default ParkingFeeCrossingGateSetting