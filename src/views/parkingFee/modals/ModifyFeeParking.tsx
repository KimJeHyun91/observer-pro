import Button from '@/components/ui/Button'
import { parkingFeeOutsideInfo } from "@/@types/parkingFee";
import { useState, useEffect } from 'react';
import { Select } from '@/components/ui'

type Props = {
    modify: (name: string, ip: string, port: string, status: string) => void;
    closeModal: () => void;
    targetParkingFee : parkingFeeOutsideInfo | null;
    isSaving: boolean;
};

const ModifyFeeParking = ({ modify, closeModal, targetParkingFee, isSaving }: Props) => {
    const [name, setName] = useState(targetParkingFee?.outside_name || '');
    const [ip, setIp] = useState(targetParkingFee?.outside_ip || '');
    const [port, setPort] = useState(targetParkingFee?.outside_port || '');
    const [status, setStatus] = useState(targetParkingFee?.status || 'normal');

    useEffect(() => {
        setName(targetParkingFee?.outside_name || '');
        setIp(targetParkingFee?.outside_ip || '');
        setPort(targetParkingFee?.outside_port || '');
        setStatus(targetParkingFee?.status || 'normal');
    }, [targetParkingFee]);

    const isModified = (
        name !== (targetParkingFee?.outside_name || '') ||
        ip   !== (targetParkingFee?.outside_ip || '')   ||
        port !== (targetParkingFee?.outside_port || '') ||
        status !== (targetParkingFee?.status || 'normal')
    );

    const statusOptions = [
        { value: 'normal', label: '정상' },
        { value: 'error', label: '에러' },
        { value: 'lock', label: '운영 중단' }
    ]

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className="pt-1">
                <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 명</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="수정 할 주차장 이름을 입력하세요."
                            value={name}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 IP</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="수정 할 주차장 IP를 입력하세요."
                            value={ip}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={e => setIp(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 PORT</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="수정 할 주차장 PORT를 입력하세요."
                            value={port}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={e => setPort(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">상태</span>
                    <div className="col-span-4">
                        <Select
                            size="xs"
                            isSearchable={false}
                            styles={{
                                control: () => ({
                                    backgroundColor: '#fff',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '5px',
                                }),
                            }}
                            value={statusOptions.find(opt => opt.value === status)}
                            options={statusOptions}
                            onChange={option => setStatus(option?.value || '')}
                        />
                    </div>
                </div>
            </div>
            
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="flex justify-end space-x-2">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>

                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                    size="sm"
                    variant="solid"
                    disabled={!isModified || isSaving}
                    onClick={() => {
                        modify(name, ip, port, status);
                    }}
                >
                    {isSaving ? '수정 중...' : '수정'}
                </Button>
            </div>
        </div>
    );
};

export default ModifyFeeParking;