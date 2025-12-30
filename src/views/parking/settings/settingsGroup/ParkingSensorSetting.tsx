import { useForm, SubmitHandler } from 'react-hook-form'
import { useState, useEffect } from 'react';
import {
	ColumnDef,
	useReactTable,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
} from "@tanstack/react-table";
import Button from '@/components/ui/Button';
import { useParkingDeviceList } from '@/utils/hooks/useParkingDevice';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { ApiResultStatus } from '@/@types/api'
import { AxiosError } from "axios";
import { apiAddDevice, apiModifyDevice, apiDeleteDevice } from '@/services/ParkingService';
import { DeviceType } from '@/@types/parking';

type FormValues = {
    ipAddress: string
    port: string
	serialNumber : string
    id: string
    password: string
}

type ApiResultStatusWrapper = {
    message: string;
    result: ApiResultStatus;
}

const ParkingSensorSetting = () => {
	const {
        register,
        handleSubmit,
        formState: { errors },
		reset,
		watch,
		clearErrors
    } = useForm<FormValues>();
	const { isLoading, error, data, mutate } = useParkingDeviceList();
	const deviceList: DeviceType[] = data || [];
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [errorMessage, setErrorMessage] = useState('');
	const [dialogIsOpen, setIsOpen] = useState(false);
	const [addModifyloadingState, setAddModifyloadingState] = useState(false);
	const [deleteloadingState, setDeleteloadingState] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); 
	const [editOrignDevice, setEditOrignDevice] = useState<DeviceType | null>(null);
	const [isModified, setIsModified] = useState(false);
	const watchedFields = watch();

	if (isLoading) {
		console.log('get device list loading...');
	};

	if (error) {
		console.error('get device list error: ', error);
	}

	useEffect(() => {
		if (isEditMode && editOrignDevice) {
			const isChanged =
				watchedFields.ipAddress !== editOrignDevice.device_ip ||
				watchedFields.port !== editOrignDevice.device_port ||
				watchedFields.id !== editOrignDevice.user_id ||
				watchedFields.password !== editOrignDevice.user_pw ||
				watchedFields.serialNumber !== editOrignDevice.device_no16;
	
			setIsModified(isChanged);
		}
	}, [watchedFields, isEditMode, editOrignDevice]);

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setAddModifyloadingState(true);

		try {
			if(isEditMode){
				const device = {
					userId: data.id,
					userPw: data.password,
					new_deviceIp: data.ipAddress,
					new_devicePort: data.port,
					new_deviceNo16: data.serialNumber,
					org_deviceIp: editOrignDevice?.device_ip,
                    org_devicePort: editOrignDevice?.device_port,
                    org_deviceNo16: editOrignDevice?.device_no16,
				} as unknown as ApiResultStatusWrapper;

				const res = await apiModifyDevice<ApiResultStatusWrapper>({data : device});
				
				if (res.result.status) {
					setIsEditMode(false);
					setErrorMessage(res.result.message);
					mutate();
					reset({
						ipAddress: '',
						port: '',
						id: '',
						password: '',
						serialNumber: '',
					});
				} else {
					setErrorMessage(res.result.message);
				}
	
			} else {
				const device = {
					userId: data.id,
					userPw: data.password,
					deviceIp: data.ipAddress,
					devicePort: data.port,
					deviceNo16: data.serialNumber,
				} as unknown as ApiResultStatusWrapper;
				
				const res = await apiAddDevice<ApiResultStatusWrapper>({data : device});
				
				if (res.result.status) {
					setIsEditMode(false);
					setErrorMessage(`Device 등록에 성공했습니다. \n\n message : ${res.result.message}`);
					mutate();
					reset({
						ipAddress: '',
						port: '',
						id: '',
						password: '',
						serialNumber: '',
					});
				} else if (!res.result.status) {
					setErrorMessage(`Device 등록에 실패했습니다. \n\n message : ${res.result.message}`);
				}          
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

		try {
			const res = await apiDeleteDevice<ApiResultStatusWrapper>({data : selectedDevice as unknown as ApiResultStatusWrapper});

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
                ipAddress: selectedDevice.device_ip,
                port: selectedDevice.device_port,
                id: selectedDevice.user_id,
                password: selectedDevice.user_pw,
                serialNumber: selectedDevice.device_no16,
            });
            setIsEditMode(true);
        }
    };
	
	const cancelEdit = () => {
		setIsEditMode(false);
		clearErrors();
		reset({
			ipAddress: '',
			port: '',
			id: '',
			password: '',
			serialNumber: '',
		});
	}

	const columns: ColumnDef<DeviceType>[] = [
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
			accessorKey: "device_ip",
			header: "IP Address",
		},
		{
			accessorKey: "device_port",
			header: "Port",
			enableSorting: true,
		},
		{
			accessorKey: "device_no16",
			header: "Serial Number",
			enableSorting: true,
		},
		{
			accessorKey: "user_id",
			header: "ID",
			enableSorting: true,
		},
		{
			accessorKey: "user_pw",
			header: "Password",
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
			{/* 주차 센서 등록 */}
			<div>
				<h5 className="font-semibold mb-2">주차 센서 등록</h5>
				<form
					className="flex flex-col gap-5 p-7 border border-gray-200 rounded-sm dark:border-gray-500"
					onSubmit={handleSubmit(onSubmit)}
				>
					<div className="relative flex items-center">
						<label
							htmlFor="ipAddress"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							IP Address
						</label>

						<input
							id="ipAddress"
							type="text"
							placeholder="IP 주소를 입력하세요."
							{...register('ipAddress', {
								required: 'IP 주소를 입력해주세요.',
							})}
							className=" w-full border rounded px-3 py-2"
						/>

						{errors.ipAddress && (
							<p className="absolute top-10 left-[110px] text-red-500 text-sm">
								{errors.ipAddress.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="port"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Port
						</label>
						<input
							id="port"
							type="text"
							placeholder="포트 번호를 입력하세요."
							{...register('port', { 
								required: '포트 번호를 입력해주세요.' 
							})}
							className="w-full border rounded px-3 py-2"
						/>
						{errors.port && (
							<p className=" absolute top-10 left-[110px] text-red-500 text-sm">
								{errors.port.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="serialNumber"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Serial Number
						</label>

						<input
							id="serialNumber"
							type="text"
							placeholder="Serial Number를 입력하세요."
							{...register('serialNumber', {
								required: 'Serial Number를 입력해주세요.',
							})}
							className=" w-full border rounded px-3 py-2"
						/>

						{errors.serialNumber && (
							<p className="absolute top-10 left-[110px] text-red-500 text-sm">
								{errors.serialNumber.message}
							</p>
						)}
					</div>
					
					<div className="relative flex items-center">
						<label
							htmlFor="id"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							ID
						</label>
						<input
							id="id"
							type="text"
							placeholder="ID를 입력하세요."
							{...register('id', { 
								required: 'ID를 입력해주세요.' 
							})}
							className="w-full border rounded px-3 py-2"
						/>
						{errors.id && (
							<p className="absolute top-10 left-[110px] text-red-500 text-sm">
								{errors.id.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="password"
							className="min-w-[105px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							placeholder="비밀번호를 입력하세요."
							{...register('password', {
								required: '비밀번호를 입력해주세요.',
							})}
							className="w-full border rounded px-3 py-2"
							autoComplete="password"
						/>
						{errors.password && (
							<p className="absolute top-10 left-[110px] text-red-500 text-sm">
								{errors.password.message}
							</p>
						)}
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

			{/* 주차 센서 목록 */}
			<div className="mt-5">
            	<h5 className="font-semibold mb-2">주차 센서 목록</h5>
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
export default ParkingSensorSetting