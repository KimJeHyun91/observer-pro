import { useState } from 'react';
import Button from '@/components/ui/Button';
import { driverInfo } from '@/@types/vehicle';

type DriverAddProps = {
    driverAdd: (carNumber: string, carType: string, driverName: string, phoneNumber: string) => void;
    closeModal: () => void;
    newDriverInfo: driverInfo;
};

const DriverAdd = ({ driverAdd, closeModal, newDriverInfo }: DriverAddProps) => {
    const [carNumber, setCarNumber] = useState<string>(newDriverInfo?.carNumber || '');
    const [carType] = useState<string>(newDriverInfo?.type || '');
    const [driverName, setDriverName] = useState<string>(newDriverInfo?.driverName || '');
    const [phoneNumber, setPhoneNumber] = useState<string>(newDriverInfo?.driverPhoneNo || '');

    const add = () => {
        driverAdd(carNumber, carType, driverName, phoneNumber);
    };

    return (
        <div>
            <div className="flex space-x-4 dark:bg-[#333335]">
                {/* 이미지 박스 */}
                <div className="w-2/3 flex justify-center items-center  rounded-lg ">
                    <img
                        src={`http://${window.location.hostname}:4200/images/vehicle/car_front.png`}
                        alt="Front"
                        className="w-full h-[36vh] rounded-md"
                        draggable="false"
                    />
                </div>

                {/* 입력 폼 */}
                <div className="flex-1 pr-2 pt-2">
                    <div className="flex flex-col space-y-2">
                        <label className="dark:text-white">Car Number</label>
                        <input
                            type="text"
                            value={carNumber}
                            className="p-2 rounded bg-gray-700 text-white"
                            placeholder="차량 번호를 입력하세요"
                            onChange={(e) => setCarNumber(e.target.value)}
                        />
                        <label className="dark:text-white">Car Type</label>
                        <input
                            type="text"
                            value={carType}
                            className="p-2 rounded bg-gray-700 text-white cursor-not-allowed focus:outline-none disabled:bg-gray-600 disabled:text-gray-400"
                            disabled={true}
                        />
                        <label className="dark:text-white">Driver Name</label>
                        <input
                            type="text"
                            value={driverName}
                            className="p-2 rounded bg-gray-700 text-white"
                            placeholder="운전자 이름을 입력하세요"
                            onChange={(e) => setDriverName(e.target.value)}
                        />
                        <label className="dark:text-white">Phone Number</label>
                        <input
                            type="text"
                            value={phoneNumber}
                            className="p-2 rounded bg-gray-700 text-white"
                            placeholder="전화번호를 입력하세요"
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>
                    
                </div>
            </div>
            <div className="flex justify-end mt-5 space-x-2">
                <Button 
                    className="w-[65px] h-full z-10 rounded dark:bg-opacity-100 bg-green-500 text-white dark:bg-green-700 dark:hover:bg-green-900"
                    size="sm"
                    variant="default"
                    disabled={!carNumber || !carType || !driverName || !phoneNumber}
                    onClick={add}
                >
                    등록
                </Button>
                <Button 
                    className="w-[65px] h-full bg-gray-400 rounded text-white z-10 dark:bg-opacity-100 dark:bg-gray-600" 
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>
            </div>
        </div>
    );
};

export default DriverAdd;
