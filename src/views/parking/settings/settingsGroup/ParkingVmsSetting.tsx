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
import { useObVms } from '@/utils/hooks/useObVms';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { apiAddObVms, apiModifyObVms, apiDeleteObVms, apiSyncObVms } from '@/services/ObserverService'
import { ApiResultStatus } from '@/@types/api'
import { AxiosError } from "axios";

type FormValues = {
    ipAddress: string
    port: string
    id: string
    password: string
}

type VmsLists =  {
    idx: number
    vms_id: string
    vms_pw: string
    vms_ip: string
    vms_port: string
    vms_name: string
    main_service_name: string
}

type ApiResultStatusWrapper = {
    message: string;
    result: ApiResultStatus;
}

const ParkingVmsSetting = () => {
	const {
        register,
        handleSubmit,
        formState: { errors },
		reset,
		watch,
		clearErrors
    } = useForm<FormValues>();
	const { isLoading, error, data, mutate } = useObVms('parking');
	const vmsList: VmsLists[] = data || [];
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [errorMessage, setErrorMessage] = useState('');
	const [dialogIsOpen, setIsOpen] = useState(false);
	const [addModifyloadingState, setAddModifyloadingState] = useState(false);
	const [deleteloadingState, setDeleteloadingState] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); 
	const [editOrignVms, setEditOrignVms] = useState<VmsLists | null>(null);
	const [isModified, setIsModified] = useState(false);
	const watchedFields = watch();

	if (isLoading) {
		console.log('get vms list loading...');
	};

	if (error) {
		console.error('get vms list error: ', error);
	}
	
	useEffect(() => {
		if (isEditMode && editOrignVms) {
			const isChanged =
				watchedFields.ipAddress !== editOrignVms.vms_ip ||
				watchedFields.port !== editOrignVms.vms_port ||
				watchedFields.id !== editOrignVms.vms_id ||
				watchedFields.password !== editOrignVms.vms_pw;
	
			setIsModified(isChanged);
		}
	}, [watchedFields, isEditMode, editOrignVms]);

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setAddModifyloadingState(true);
        try {
            if (isEditMode) {
				const result = await apiModifyObVms<ApiResultStatusWrapper>({
					vms_id: data.id,
                    vms_pw: data.password,
                    new_vms_ip: data.ipAddress,
                    new_vms_port: data.port,
					prev_vms_ip: editOrignVms?.vms_ip || '',
					prev_vms_port: editOrignVms?.vms_port || '',
					mainServiceName: 'parking'
				});
				
				if (result.result.status) {
					setIsEditMode(false);
					setErrorMessage(`VMS 수정에 성공했습니다. \n\n message : ${result.result.message}`);
					mutate();
					reset({
						ipAddress: '',
						port: '',
						id: '',
						password: '',
					});
				} else if (!result.result.status) {
					setErrorMessage(`VMS 수정에 실패했습니다. \n\n message : ${result.result.message}`);
				}
            } else {
                const result = await apiAddObVms<ApiResultStatusWrapper>({
                    vms_id: data.id,
                    vms_pw: data.password,
                    vms_ip: data.ipAddress,
                    vms_port: data.port,
                    mainServiceName: 'parking',
                });

				if (result.result.status) {
					setIsEditMode(false);
					setErrorMessage(`VMS 등록에 성공했습니다. \n\n message : ${result.result.message}`);
					mutate();
					reset({
						ipAddress: '',
						port: '',
						id: '',
						password: '',
					});
				} else if (!result.result.status) {
					setErrorMessage(`VMS 등록에 실패했습니다. \n\n message : ${result.result.message}`);
				}
            }

			setAddModifyloadingState(false);
            setIsOpen(true);
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                setErrorMessage(
                    `VMS ${isEditMode ? '수정' : '추가'}에 실패했습니다. \n\n message : ${error.response.data.message}`
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
	
	const refreshClick = async (vms: VmsLists) => {
		try {
			const result = await apiSyncObVms<ApiResultStatusWrapper>({
				vms_ip: vms.vms_ip,
				vms_port: vms.vms_port,
				vms_id: vms.vms_id,
				vms_pw: vms.vms_pw,
				mainServiceName: 'parking'
			});
			if (result) {
				setErrorMessage('VMS 카메라 동기화에 성공했습니다.');
				setIsOpen(true);
				return;
			} else if (!result) {
				setErrorMessage('VMS 카메라 동기화에 실패했습니다.');
				setIsOpen(true);
				return;
			}
			
			setIsOpen(false);
		} catch (error) {
			if (error instanceof AxiosError && error.response) {
				setErrorMessage(
				  `VMS 카메라 동기화에 실패했습니다. \n\n ${error.response.data.message}`
				);
			}
			setIsOpen(true);
		}
    };

	const remove = async () => {
		setDeleteloadingState(true);
        const selectedNames: string[] = Array.from(selectedRows)
			.map((id) => vmsList.find((vms) => vms.idx === id)?.vms_name)
			.filter((name): name is string => name !== undefined);

		if (!selectedNames || selectedNames.length === 0) {
			setDeleteloadingState(false);
			return;
		}

		try {
			const result = await apiDeleteObVms<ApiResultStatusWrapper>(selectedNames, 'parking');

			if (result) {
				setErrorMessage(`VMS ${result.result} 개가 성공적으로 삭제되었습니다.`);
				setSelectedRows(new Set());
				mutate();
			} else {
				setErrorMessage('VMS 삭제에 실패했습니다.');
			}

			setIsOpen(true);
			setDeleteloadingState(false);

		} catch (error) {
			if (error instanceof AxiosError && error.response) {
				setErrorMessage(
				  `VMS 삭제에 실패했습니다. \n\n ${error.response.data.message}`
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
        const selectedVms = vmsList.find((vms) => vms.idx === selectedId);

        if (selectedVms) {
			setEditOrignVms(selectedVms);
            reset({
                ipAddress: selectedVms.vms_ip,
                port: selectedVms.vms_port,
                id: selectedVms.vms_id,
                password: selectedVms.vms_pw,
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
		});
		
	}

	const columns: ColumnDef<VmsLists>[] = [
		{
			id: "select",
			header: () => (
				<input
					type="checkbox"
					checked={vmsList.length > 0 && selectedRows.size === vmsList.length}
					disabled={isEditMode || addModifyloadingState}
					onChange={(e) => {
						if (isEditMode || addModifyloadingState) return;
						const isChecked = e.target.checked;
						if (isChecked) {
							const allIds = vmsList.map((row) => row.idx);
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
			accessorKey: "vms_ip",
			header: "IP Address",
		},
		{
			accessorKey: "vms_port",
			header: "Port",
			enableSorting: true,
		},
		{
			accessorKey: "vms_id",
			header: "ID",
			enableSorting: true,
		},
		{
			accessorKey: "vms_pw",
			header: "Password",
			enableSorting: false,
		},
		{
			id: "sync",
			header: () => (
				<div className="flex justify-center items-center">
					Sync
				</div>
			),
			cell: ({ row }) => (
				<div
					className={`flex justify-center items-center cursor-pointer  ${
						isEditMode || addModifyloadingState ? "pointer-events-none opacity-50" : ""
					}`} 
					onClick={() => {
						if (isEditMode || addModifyloadingState) return;
						refreshClick(row.original);
					}}
				>
					🔄
				</div>
			),
		}
	];

	const table = useReactTable({
		data: vmsList,
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
			{/* VMS 설정 */}
			<div>
				<h5 className="font-semibold mb-2">VMS 설정</h5>
				<form
					className="flex flex-col gap-5 p-7 border border-gray-200 rounded-sm dark:border-gray-500"
					onSubmit={handleSubmit(onSubmit)}
				>
					
					<div className="relative flex items-center">
						<label
							htmlFor="ipAddress"
							className="min-w-[90px] mb-1 font-medium dark:text-[#FFFFFF]"
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
							<p className="absolute top-10 left-[100px] text-red-500 text-sm">
								{errors.ipAddress.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="port"
							className="min-w-[90px] mb-1 font-medium dark:text-[#FFFFFF]"
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
							<p className=" absolute top-10 left-[100px] text-red-500 text-sm">
								{errors.port.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="id"
							className="min-w-[90px] mb-1 font-medium dark:text-[#FFFFFF]"
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
							<p className="absolute top-10 left-[100px] text-red-500 text-sm">
								{errors.id.message}
							</p>
						)}
					</div>

					<div className="relative flex items-center">
						<label
							htmlFor="password"
							className="min-w-[90px] mb-1 font-medium dark:text-[#FFFFFF]"
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
							<p className="absolute top-10 left-[100px] text-red-500 text-sm">
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

			{/* VMS 목록 */}
			<div className="mt-5">
            	<h5 className="font-semibold mb-2">VMS 목록</h5>
				<div className="border rounded-sm overflow-auto scroll-container h-max[250px] h-[250px] dark:border-gray-500">
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
export default ParkingVmsSetting