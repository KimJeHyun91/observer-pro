
import LicensePlate from '../components/LicensePlate';
import { imageType, driverInfo } from '@/@types/vehicle';
import Button from '@/components/ui/Button'

type InformationProps = {
    selectedLineInfo : imageType;
    addDriverInfoList : driverInfo[];
    blackListState : (isChecked: boolean) => void;
    driverModify : (line: imageType | undefined) => void;
    newDriverAdd : (line: imageType | undefined) => void;
}

const Information = ({ selectedLineInfo , addDriverInfoList, blackListState, driverModify, newDriverAdd } : InformationProps) => {
    const isDisabled = !selectedLineInfo || addDriverInfoList.some(
        (driver) => driver.carNumber === selectedLineInfo?.driverInfo?.carNumber
    );

    return (
        <div className="flex items-center justify-between bg-[#FFFFFF] dark:bg-gray-800 rounded-lg mt-2">                                        
            <div className="flex-1 flex flex-col border dark:border-none border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-800">
                <div className="grid grid-cols-3 bg-gray-200 dark:bg-gray-700 p-2 rounded-t-lg">
                    <span className="text-center dark:text-white text-black font-bold border-r border-gray-300">Snapshot</span>
                    <span className="text-center dark:text-white text-black font-bold border-r border-gray-300">Car Number</span>
                    <span className="text-center dark:text-white text-black font-bold">Reg Data</span>
                </div>
                <div className="grid grid-cols-3 bg-white dark:bg-gray-900 p-2 rounded-b-lg">
                    {/* Snapshot */}
                    <div className="flex flex-col items-center justify-center text-center border-r border-gray-400 pr-2 w-full">
                        <div className="relative h-full flex items-center justify-center bg-gray-200 dark:bg-[#262626] text-gray-800 dark:text-[#FFFFFF] font-semibold rounded-md w-full">
                            <LicensePlate carNumber={selectedLineInfo?.driverInfo?.carNumber || "N/A"} />
                        </div>
                    </div>

                    {/* Car Number */}
                    <div className="flex flex-col items-center justify-center text-center border-r border-gray-400 px-2 w-full">
                        <div className="h-[36px] flex items-center justify-center bg-gray-200 dark:bg-[#262626] text-gray-800 dark:text-[#FFFFFF] font-semibold mb-1 rounded-md w-full">
                            {selectedLineInfo?.driverInfo?.carNumber || "N/A"}
                        </div>

                        <div className="flex space-x-2 w-full">
                            <Button
                                className="flex-1 h-[36px] rounded-md p-0"
                                disabled={!selectedLineInfo}
                                variant="solid"
                                size="sm"
                                onClick={() => {
                                    driverModify(selectedLineInfo);
                                }}
                            >
                                MODIFY
                            </Button>
                            <Button
                                className="flex-1 h-[36px] rounded-md p-0"
                                disabled={isDisabled}
                                variant="solid"
                                size="sm"
                                onClick={() => {
                                    newDriverAdd(selectedLineInfo);
                                }}
                            >
                                ADD
                            </Button>
                        </div>

                        <div className="flex space-x-2 w-full mt-1">
                            <div className='flex flex-1 items-center justify-center h-[20px] bg-gray-200 rounded dark:bg-[#292929] text-gray-800 dark:text-[#FFFFFF] font-semibold'>
                                WatchList
                            </div>
                            <input
                                type="checkbox"
                                className="form-checkbox cursor-pointer h-5 w-5 text-blue-600 rounded border-gray-400 ml-2 focus:ring-0"
                                checked={selectedLineInfo?.driverInfo?.blackList || false}
                                disabled={!selectedLineInfo}
                                onChange={(e) => {
                                    blackListState(e.target.checked);
                                }}
                            />
                        </div>
                    </div>

                    {/* Reg Data */}
                    <div className="flex flex-col space-y-1 ml-2">
                        <div className="flex items-center justify-between p-2 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-sm h-[50%]">
                            <span className="text-gray-800 dark:text-[#FFFFFF] font-semibold text-sm ">Reg. Info</span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{selectedLineInfo?.driverInfo?.refInfo || "N/A"}</span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-sm h-[50%]">
                            <span className="text-gray-800 dark:text-[#FFFFFF] font-semibold text-sm">Reg. Type</span>
                            <span className="text-gray-700 dark:text-gray-300 text-sm ">{selectedLineInfo?.driverInfo?.regType || "N/A"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Information