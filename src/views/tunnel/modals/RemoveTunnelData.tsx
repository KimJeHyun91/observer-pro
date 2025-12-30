import { ParkingArea } from '@/@types/parking';
import { Building } from '@/@types/building';
import { CameraType } from '@/@types/camera';
import Button from '@/components/ui/Button'

type Props = {
    remove: () => void;
    originData: ParkingArea | Building | CameraType;
    closeModal: () => void;
}

const RemoveTunnelData = ({ remove, originData, closeModal }: Props) => {

    const getName = (originData: ParkingArea | Building | CameraType): string => {
        switch (originData.type) {
            case 'camera': {
                const { camera_id, camera_name, vms_name, main_service_name } = originData as CameraType;
                if (main_service_name === 'tunnel') {
                    return `${camera_name}`
                }
                return `${camera_id}. ${camera_name} (VMS: ${vms_name})`;
            }
            default:
                return '';
        }
    };

    const getMessage = (originData: ParkingArea | Building | CameraType): string => {
        switch (originData.type) {
            case 'camera':
                return ' 카메라를 삭제 하시겠습니까?';
            default:
                return ' 삭제하시겠습니까?';
        }
    };

    const name = getName(originData);
    const message = getMessage(originData);

    const removeClick = () => {
        remove();
    }

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className='pt-1'>
                <div className="mb-24 mt-20 text-center dark:text-[#FFFFFF]">
                    <span className='text-lg font-bold text-black dark:text-[#FFFFFF]'>`{name}`</span>
                    {message}
                </div>
            </div>

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="flex justify-center space-x-12">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>

                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D76767] rounded"
                    size="sm"
                    variant="solid"
                    onClick={removeClick}
                >
                    삭제
                </Button>

            </div>
        </div>
    )
}

export default RemoveTunnelData