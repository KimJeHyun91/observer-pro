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
import { AlertDialog } from '@/components/shared/AlertDialog';
import { 
	apiRemoveCamera, 
	apiCreateCamera, 
	apiUpdateCamera
} from '@/services/ObserverService'
import { AxiosError } from "axios";
import { useIndependentCameras } from '@/utils/hooks/useCameras'

type FormValues = {
    ipAddress: string
    name: string
    id: string
    password: string
}

type CameraLists =  {
    idx: number
    camera_ip: string
    camera_name: string
    access_point: string	// id와 pw 포멧 \n으로 스플릿처리 0 : id, 1 : pw
    service_type: string
}

type ApiResult = 'Created' | 'OK' | 'No Content';
type DeleteApiResult = 'No Content' | 'Bad Request' | 'Internal Server Error';

const ParkingCameraSetting = () => {
	const {
        register,
        handleSubmit,
        formState: { errors },
		reset,
		watch,
		clearErrors
    } = useForm<FormValues>();
	const { isLoading, error, cameras, mutate } = useIndependentCameras('parking');
	const cameraList: CameraLists[] = cameras || [];
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [errorMessage, setErrorMessage] = useState('');
	const [dialogIsOpen, setIsOpen] = useState(false);
	const [addModifyloadingState, setAddModifyloadingState] = useState(false);
	const [deleteloadingState, setDeleteloadingState] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false); 
	const [editOrignCamera, setEditOrignCamera] = useState<CameraLists | null>(null);
	const [isModified, setIsModified] = useState(false);
	const watchedFields = watch();
	
	if (isLoading) {
		console.log('get camera list loading...');
	};

	if (error) {
		console.error('get camera list error: ', error);
	}
	
	useEffect(() => {
		if (isEditMode && editOrignCamera) {
			const [id, pw] = (editOrignCamera.access_point || '').split('\n');

			const isChanged =
				watchedFields.ipAddress !== editOrignCamera.camera_ip ||
				watchedFields.name !== editOrignCamera.camera_name ||
				watchedFields.id !== id ||
				watchedFields.password !== pw;
	
			setIsModified(isChanged);
		}
	}, [watchedFields, isEditMode, editOrignCamera]);

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setAddModifyloadingState(true);
        try {
            if (isEditMode) {
				const result = await apiUpdateCamera<ApiResult>({
					idx: editOrignCamera?.idx || -1,
                    ipAddress: data.ipAddress,
                    name: data.name,
                    id: data.id,
					pw: data.password,
					mainServiceName: 'parking'
				});
				
				if (result === 'Created' || result === 'OK') {
					setIsEditMode(false);
					setErrorMessage(`카메라 수정에 성공했습니다.`);
					mutate();
					reset({
						ipAddress: '',
						name: '',
						id: '',
						password: '',
					});
				} else {
					setErrorMessage(`카메라 수정에 실패했습니다.`);
				}
            } else {
				const result = await apiCreateCamera<ApiResult>({
					ipAddress: data.ipAddress,
					name: data.name,
					id: data.id,
					pw: data.password,
					mainServiceName: 'parking',
				})

				if (result === 'Created' || result === 'OK') {
					setIsEditMode(false);
					setErrorMessage(`카메라 등록에 성공했습니다.`);
					mutate();
					reset({
						ipAddress: '',
						name: '',
						id: '',
						password: '',
					});
				} else {
					setErrorMessage(`카메라 등록에 실패했습니다.`);
				}
            }

			setAddModifyloadingState(false);
            setIsOpen(true);
        } catch (error) {
            if (error instanceof AxiosError && error.response) {
                setErrorMessage(
                    `카메라 ${isEditMode ? '수정' : '추가'}에 실패했습니다. \n\n message : ${error.response.data.message}`
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
		const selectedIds = Array.from(selectedRows);

		if (selectedIds.length === 0) {
			setDeleteloadingState(false);
			return;
		}

		try {
			const result = await apiRemoveCamera<DeleteApiResult>({
				idxs: selectedIds,
				mainServiceName: 'parking'
			});

			if(result){
				setErrorMessage('카메라 삭제에 실패했습니다.')
			} else {
				setErrorMessage(`카메라 ${selectedIds.length} 개가 성공적으로 삭제되었습니다.`);
				setSelectedRows(new Set());
				mutate();
			}
		} catch (error) {
			if (error instanceof AxiosError && error.response) {
				setErrorMessage(`카메라 삭제에 실패했습니다. \n\n ${error.response.data.message}`);
			}
		} finally {
			setIsOpen(true);
			setDeleteloadingState(false);
		}
    };

	const edit = () => {
        if (selectedRows.size !== 1){
			return;
		} 

        const selectedId = Array.from(selectedRows)[0];
        const selectedCamera = cameraList.find((item) => item.idx === selectedId);

        if (selectedCamera) {
			const [id, pw] = (selectedCamera.access_point || '').split('\n');
			setEditOrignCamera(selectedCamera);
            reset({
                ipAddress: selectedCamera.camera_ip,
                name: selectedCamera.camera_name,
                id: id,
                password: pw,
            });
            setIsEditMode(true);
        }
    };
	
	const cancelEdit = () => {
		setIsEditMode(false);
		clearErrors();
		reset({
			ipAddress: '',
			name: '',
			id: '',
			password: '',
		});
	}
	
	const columns: ColumnDef<CameraLists>[] = [
		{
			id: "select",
			header: () => (
				<input
					type="checkbox"
					checked={cameraList.length > 0 && selectedRows.size === cameraList.length}
					disabled={isEditMode || addModifyloadingState}
					onChange={(e) => {
						if (isEditMode || addModifyloadingState) return;
						const isChecked = e.target.checked;
						if (isChecked) {
							const allIds = cameraList.map((row) => row.idx);
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
			accessorKey: "camera_ip",
			header: "IP Address",
			enableSorting: true,
		},
		{
			accessorKey: "camera_name",
			header: "Name",
			enableSorting: true,
		},
		{
			id: "access_point_id",
			header: "ID",
			cell: ({ row }) => {
				const [id] = (row.original.access_point || '').split('\n');
				return id || '';
			},
			enableSorting: true,
		},
		{
			id: "access_point_pw",
			header: "Password",
			cell: ({ row }) => {
				const [, pw] = (row.original.access_point || '').split('\n');
				return pw || '';
			},
			enableSorting: false,
		},
	];

	const table = useReactTable({
		data: cameraList,
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
			{/* 카메라 설정 */}
			<div>
				<h5 className="font-semibold mb-2">카메라 설정</h5>
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
							htmlFor="name"
							className="min-w-[90px] mb-1 font-medium dark:text-[#FFFFFF]"
						>
							Name
						</label>
						<input
							id="name"
							type="text"
							placeholder="카메라 이름을 입력하세요."
							{...register('name', { 
								required: '카메라 이름을 입력해주세요.' 
							})}
							className="w-full border rounded px-3 py-2"
						/>
						{errors.name && (
							<p className=" absolute top-10 left-[100px] text-red-500 text-sm">
								{errors.name.message}
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

			{/* 카메라 목록 */}
			<div className="mt-5">
            	<h5 className="font-semibold mb-2">카메라 목록</h5>
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
export default ParkingCameraSetting