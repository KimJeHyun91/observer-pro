import Table from '@/components/ui/Table'
import { Button, ScrollBar } from '@/components/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { VMS } from '@/@types/vms'
import { apiDeleteObVms, apiSyncObVms } from '@/services/ObserverService'
import { ApiResultStatus } from '@/@types/api'
import { useObVms } from '@/utils/hooks/useObVms'
import { Controller, useForm } from 'react-hook-form'
import { IoIosCloseCircleOutline } from 'react-icons/io'
import { AlertDialog } from '@/components/shared/AlertDialog'

type ApiResultStatusWrapper = {
    message: string
    result: ApiResultStatus
}

type VmsLists = {
    idx: number
    vms_id: string
    vms_pw: string
    vms_ip: string
    vms_port: string
    vms_name: string
    main_service_name: string
}


interface TunnelVmsListProps {
    handleEdit: (d: any) => void
    setIsEditMode: (d: boolean) => void
    selectedRows: VmsLists[]
    setSelectedRows: (d: VmsLists[]) => void
}

const TunnelVmsList = ({ handleEdit, setIsEditMode, selectedRows, setSelectedRows }: TunnelVmsListProps) => {
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const { control, handleSubmit, setValue } = useForm()

    const { isLoading, error, data: vmsList, mutate } = useObVms('tunnel')
    const [vmsMessage, setVmsMessage] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [sortConfig, setSortConfig] = useState<{
        key: keyof VmsLists | ''
        direction: 'ascending' | 'descending'
    }>({
        key: '',
        direction: 'ascending',
    })

    useEffect(() => {
        mutate()
    }, [])

    const removeVms = async () => {
        try {
            const selectedNames: string[] = Array.from(selectedRows)
                .map((list) => vmsList.find((vms: VmsLists) => vms.idx === list.idx)?.vms_name)
                .filter((name): name is string => name !== undefined);

            const res = await apiDeleteObVms<ApiResultStatusWrapper>(selectedNames, 'tunnel');
            if (res) {
                console.log(res.result)
                setVmsMessage(`VMS ${res.result} 개가 성공적으로 삭제되었습니다.`)
                mutate()
            } else {
                setVmsMessage('VMS 삭제에 실패했습니다.');
            }
            setIsOpen(true)
        } catch (err) {

        }
    }



    const renderSortIcon = (column: string) => {
        if (sortConfig.key !== column) {
            return <span className="text-gray-400">↑</span>
        }
        return sortConfig.direction === 'ascending' ? (
            <span>↑</span>
        ) : (
            <span>↓</span>
        )
    }

    const handleSort = (key: keyof VmsLists) => {
        let direction: 'ascending' | 'descending' = 'ascending'
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending'
        }
        setSortConfig({ key, direction })
    }

    const sortedData = useMemo(() => {
        if (!Array.isArray(vmsList)) return []
        if (!sortConfig.key) return vmsList

        return [...vmsList].sort((a, b) => {
            if (!sortConfig.key) return 0
            if (a[sortConfig.key] < b[sortConfig.key])
                return sortConfig.direction === 'ascending' ? -1 : 1
            if (a[sortConfig.key] > b[sortConfig.key])
                return sortConfig.direction === 'ascending' ? 1 : -1
            return 0
        })
    }, [vmsList, sortConfig])

    const handleSynchronizeVms = async (item: VmsLists) => {
        const vmsData = {
            vms_ip: item.vms_ip,
            vms_port: item.vms_port,
            vms_id: item.vms_id,
            vms_pw: item.vms_pw,
            mainServiceName: 'tunnel'
        }
        try {
            const res = await apiSyncObVms<ApiResultStatusWrapper>(
                vmsData as any,
            )
            if (res) {
                setIsOpen(true)
                setVmsMessage(res.result.message)
            }
            if (!res || !res.result || !res.result.status) {
                setIsOpen(true)
                setVmsMessage(res.message || 'VMS 동기화에 실패했습니다.')
            }

        } catch (error) {
            console.error(error)

        }
    }

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            // 전체 선택
            setSelectedRows(vmsList);
        } else {
            // 전체 해제
            setSelectedRows([]);
        }
    };



    const handleSelectRow = (item: any) => {
        if (selectedRows.some((selectedItem) => selectedItem.idx === item.idx)) {
            setSelectedRows(selectedRows.filter((selectedItem) => selectedItem.idx !== item.idx));
        } else {
            setSelectedRows([...selectedRows, item]);
        }
    };

    return (
        <div className="mt-5">
            <h5 className="font-semibold mb-2">VMS 목록</h5>
            <div className="">
                <ScrollBar className="max-h-[180px] ">
                    <table className="w-full min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4"
                                        checked={selectedRows?.length === vmsList?.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th
                                    className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                                    onClick={() => handleSort('vms_ip')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        IP address
                                        {renderSortIcon('ipAddress')}
                                    </div>
                                </th>
                                <th
                                    className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                                    onClick={() => handleSort('vms_port')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Port
                                        {renderSortIcon('port')}
                                    </div>
                                </th>
                                <th
                                    className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                                    onClick={() => handleSort('vms_id')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        ID
                                        {renderSortIcon('id')}
                                    </div>
                                </th>
                                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                                    Password
                                </th>
                                {editingRow && (
                                    <th className="sticky top-0 bg-gray-50 py-2 px-2"></th>
                                )}
                                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                                    Sync
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((item, index) => (
                                <tr
                                    key={item.vms_id}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="py-2 px-4 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4"
                                            checked={selectedRows.some((selectedItem) => selectedItem.idx === item.idx)}
                                            onChange={() => handleSelectRow(item)}
                                        />
                                    </td>

                                    {/* {editingRow === item.vms_id ? (
                                        <Controller
                                            name="vms_ip"
                                            control={control}
                                            defaultValue={item.vms_ip}
                                            render={({ field }) => (
                                                <input
                                                    {...field}
                                                    className="border px-2 py-1 w-[170px] mt-2"
                                                />
                                            )}
                                        />
                                    ) : (
                                        <td className=" px-4 py-2 text-center">
                                            {item.vms_ip}
                                        </td>
                                    )} */}
                                    <td className=" px-4 py-2 text-center">
                                        {item.vms_ip}
                                    </td>

                                    <td className=" px-4 py-2 text-center">
                                        {item.vms_port}
                                    </td>

                                    <td className=" px-4 py-2 text-center">
                                        {item.vms_id}
                                    </td>

                                    <td className="py-2 px-4 text-center">
                                        {item.vms_pw}
                                    </td>



                                    <td className="py-2 px-4 text-center">
                                        <button
                                            className="p-1"
                                            onClick={() =>
                                                handleSynchronizeVms(item)
                                            }
                                        >
                                            🔄
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollBar>
                <div className="flex justify-end gap-2 mt-10 mb-5 w-[97%]">
                    <button
                        type="submit"
                        className=" w-[100px] h-[34px] mt-2 bg-[#aeafb1] text-white px-4 py-2 rounded hover:bg-[#b0b3b9]"
                        onClick={removeVms}
                    >
                        삭제
                    </button>

                    <Button
                        type="submit"
                        className="mr-3 mt-2 w-[100px] h-[34px] bg-[#17A36F] rounded"
                        size="sm"
                        variant="solid"
                        onClick={() => {
                            if (selectedRows.length > 0) {
                                setIsEditMode(true)
                                handleEdit(selectedRows)
                            }

                        }}
                        disabled={selectedRows?.length > 1}
                    >
                        수정
                    </Button>

                </div>
            </div>
            <AlertDialog
                isOpen={isOpen}
                message={vmsMessage}
                onClose={() => setIsOpen(false)}
            />

        </div>
    )
}

export default TunnelVmsList
