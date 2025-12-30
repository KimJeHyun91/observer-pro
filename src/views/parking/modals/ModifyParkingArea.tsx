import { useState,useEffect } from 'react';
import { ParkingArea, ParkingType } from '@/@types/parking';
import { apiParkingTypeList } from '@/services/ParkingService';
import Button from '@/components/ui/Button'
import Radio from '@/components/ui/Radio'

type Props = {
    modify: (newName: string, typeId : number) => void;
    originData: ParkingArea;
    closeModal: () => void;
}

const ModifyParkingArea = ({modify, closeModal, originData} : Props) => {
    const [newName, setNewName] = useState<string>("");
    const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<number>(0);
        
    useEffect(() => {    
        getParkingType();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        setNewName(originData.area_name);
        setSelectedTypeId(originData.parking_type_id);
    }, [originData]);
    
    const getParkingType = async () => {
        try {
            const res = await apiParkingTypeList<ParkingType>();
        
            if (!res || !res.result) {
                return;
            }
        
            setParkingTypes(res.result);
        } catch (error) {
            console.error('주차관리 설정타입 API 에러: ', error);
        }
    };
    
    const change = () => {
        const changeInput = trimInput(newName);
    
        if (changeInput === originData.area_name && selectedTypeId === originData.parking_type_id) {
            return;
        }
    
        modify(changeInput, selectedTypeId);
    };

    const radioChage = (newValue: number) => {
        setSelectedTypeId(newValue);
    };

    const trimInput = (str: string): string => {
        return str.trim().replace(/\s+/g, " ");
    };

    return (
       <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className='pt-1'>
                <div className="grid grid-cols-5 items-center gap-4 mb-4 mt-4">
                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">설정 타입</span>
                    <div className="col-span-4 flex space-x-12">
                        <Radio.Group
                            value={selectedTypeId}
                            className="flex items-center space-x-9"
                            onChange={radioChage}
                        >
                            {parkingTypes.map((type) => (
                            <Radio
                                key={type.id}
                                value={type.id}
                                radioClass="w-4 h-4"
                                className="flex items-center gap-2 text-xs dark:text-[#FFFFFF]" 
                            >
                                {type.parking_type_name}
                            </Radio>
                            ))}
                        </Radio.Group>
                    </div>
                </div>
                <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">센서</span>
                    <input
                        type="text"
                        placeholder="변경 할 센서 명을 입력하세요."
                        value={newName}
                        className="col-span-4 border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]"
                        onChange={(e) => setNewName(e.target.value)}
                    />
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
                    disabled={
                        !trimInput(newName) ||
                        (trimInput(newName) === originData.area_name && selectedTypeId === originData.parking_type_id)
                    }
                    onClick={change}
                >
                    저장
                </Button>
            </div>
        </div>
    )
}

export default ModifyParkingArea