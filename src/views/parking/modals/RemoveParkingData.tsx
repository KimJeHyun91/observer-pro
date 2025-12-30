import { ParkingArea } from '@/@types/parking';
import { Building } from '@/@types/building';
import { CameraType } from '@/@types/camera';
import Button from '@/components/ui/Button'

type Props = {
    remove: () => void;
    originData: ParkingArea | Building | CameraType;
    closeModal: () => void;
}

const RemoveParkingData = ({remove, originData, closeModal} : Props ) => {
    const getName = (originData: ParkingArea | Building | CameraType): string => {
        switch (originData.type) {
          case 'parkingArea':
                return (originData as ParkingArea).area_name;
          case 'building':
                return (originData as Building).outside_name;
          case 'camera': {
                    const { camera_id, camera_name, vms_name } = originData as CameraType;
                    const checkName = (originData as CameraType).service_type === 'mgist' ? 
                        `${camera_id}. ${camera_name} (VMS: ${vms_name})` : 
                        `${camera_name}`
                    
                    return checkName;
                }
          default:
                return '';
        }
    };
    
    const getMessage = (originData: ParkingArea | Building | CameraType): string => {
        switch (originData.type) {
          case 'parkingArea':
                return ' 주차면을 삭제 하시겠습니까?';
          case 'building':
                return ' 건물을 삭제 하시겠습니까?';
          case 'camera':
                return ' 카메라를 삭제 하시겠습니까?';
          default:
                return ' 삭제하시겠습니까?';
        }
    };

    const name = getName(originData);
    const message = getMessage(originData);

    const removeClick = () =>{
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

export default RemoveParkingData