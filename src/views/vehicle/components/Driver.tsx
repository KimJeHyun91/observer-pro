import Button from '@/components/ui/Button'
import { imageType } from '@/@types/vehicle';

type DriverProps = {
    selectedLineInfo : imageType;
    driverHistory: (line: imageType | undefined, visitResult : string) => void;
}

const Driver = ({driverHistory ,selectedLineInfo} : DriverProps) => {
    return (
        <div className="flex items-center justify-between bg-[#FFFFFF] dark:bg-gray-800 rounded-lg mt-2 h-full">
            <div className="flex-1 flex flex-col border dark:border-none border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-800 h-[77px]">
                <div className="grid grid-cols-2 bg-gray-200 dark:bg-gray-700 p-2 rounded-t-lg">
                    <span className="text-center dark:text-white text-black font-bold border-r border-gray-300">Name</span>
                    <span className="text-center dark:text-white text-black font-bold">Driver Phone No.</span>
                </div>
                <div className="grid grid-cols-2 bg-white dark:bg-gray-900 p-2 rounded-b-lg h-full">
                    <span className="flex items-center justify-center text-center dark:text-gray-300 text-gray-600 border-r border-gray-300 ">
                        {selectedLineInfo?.driverInfo?.driverName || "N/A"}
                    </span>
                    <span className="flex items-center justify-center text-center dark:text-gray-300 text-gray-600 ">
                        {selectedLineInfo?.driverInfo?.driverPhoneNo || "N/A"}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 ml-2">
                <Button
                    className={`w-[110px] h-[32.5px] p-0 text-white rounded-lg ${
                        selectedLineInfo?.driverInfo
                            ? "bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700"
                            : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!selectedLineInfo?.driverInfo}
                    onClick={() => driverHistory(selectedLineInfo, "Return")}
                >
                    RETURN
                </Button>
                <Button
                    className={`w-[110px] h-[32.5px] p-0 text-white rounded-lg ${
                        selectedLineInfo?.driverInfo
                            ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-900"
                            : "bg-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!selectedLineInfo?.driverInfo}
                    onClick={() => driverHistory(selectedLineInfo, "Approval")}
                >
                    APPROVE
                </Button>
            </div>
        </div>
    )
}

export default Driver