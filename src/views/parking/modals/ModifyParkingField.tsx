import { useState,useEffect } from 'react';
import { Building } from '@/@types/building';
import Button from '@/components/ui/Button'

type Props = {
    modify: (newName: string) => void;
    originData: Building;
    closeModal: () => void;
}

const ModifyParkingField = ({modify, closeModal, originData} : Props) => {
    const [newName, setNewName] = useState<string>("");
    
    useEffect(() => {
        setNewName(originData.outside_name);
    }, [originData]);
        
    const change = () =>{
        if (newName === originData.outside_name) {
            return;
        }

        modify(newName);
    }

    return (
       <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className='pt-1'>
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
                    disabled={
                        !newName.trim() || (newName === originData.outside_name)
                    }
                    size="sm"
                    variant="solid"
                    onClick={change}
                >
                    저장
                </Button>
            </div>
        </div>
    )
}

export default ModifyParkingField