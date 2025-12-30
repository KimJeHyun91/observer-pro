import Button from '@/components/ui/Button'

type Props = {
    isSaving: boolean;
    newParkingName: string;
    setNewParkingName: (ip: string) => void;
    newParkingIp: string;
    setNewParkingIp: (ip: string) => void;
    newParkingPort: string;
    setNewParkingPort: (ip: string) => void;
    closeModal: () => void;
    save: () => void;
};

const AddFeeParking = ({ isSaving, newParkingName, setNewParkingName, newParkingIp , setNewParkingIp, newParkingPort, setNewParkingPort , closeModal, save }: Props) => {
    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className="pt-1">
                <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 명</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="추가 할 주차장 이름을 입력하세요."
                            value={newParkingName}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={(e) => setNewParkingName(e.target.value)}
                        />

                    </div>

                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 IP</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="추가 할 주차장 IP를 입력하세요."
                            value={newParkingIp}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={(e) => setNewParkingIp(e.target.value)}
                        />

                    </div>

                    <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] text-[13px]">주차장 PORT</span>
                    <div className="col-span-4">
                        <input
                            type="text"
                            placeholder="추가 할 주차장 PORT를 입력하세요."
                            value={newParkingPort}
                            className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] border-gray-300`}
                            onChange={(e) => setNewParkingPort(e.target.value)}
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
                    disabled={isSaving}
                    onClick={() => {
                        save();
                    }}
                >
                    {isSaving ? '저장 중...' : '저장'}
                </Button>
            </div>
        </div>
    );
};

export default AddFeeParking;