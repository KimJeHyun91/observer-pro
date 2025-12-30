import { ParkingArea } from '@/@types/parking';
import { Building } from '@/@types/building';
import { CameraType } from '@/@types/camera';
import Button from '@/components/ui/Button'
import { useWaterLevelStore } from '@/store/tunnel/useWaterLevelStore'
import { useEffect, useState } from 'react';
import { apiDeleteWaterLevelMapping, apiDeleteWaterLevel } from '@/services/TunnelService'
type Props = {
  submitData: {
    outsideIdx: number;
    waterLevelIdx: number;
    waterLevelName: string;
    communication: string;
  };
  closeModal: () => void;
}

const RemoveWaterLevel = ({ submitData, closeModal }: Props) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const { setAddWaterLevelControlIn } = useWaterLevelStore();

  useEffect(() => {
    setName(submitData.waterLevelName);
    setMessage('수위계를 삭제 하시겠습니까?');
  }, [name, message])


  const removeClick = () => {
    if (submitData.communication === 'control_out') {
      removeControlOut();
    } else {
      removeControlIn();
    }
  }


  const removeControlOut = async () => {
    try {
      const data = {
        outsideIdx: submitData.outsideIdx,
        waterLevelIdx: submitData.waterLevelIdx
      }
      const res = await apiDeleteWaterLevelMapping(data);
      if (res.message === "ok") {
        closeModal();
      }
    } catch (e) {
      console.log(e)
    }
  }

  const removeControlIn = async () => {
    try {
      const data = [submitData.waterLevelIdx]
      const res = await apiDeleteWaterLevel(data);
      if (res.message === "ok") {
        setAddWaterLevelControlIn(false);
        closeModal();
      }
    } catch (e) {
      console.log(e)
    }
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

export default RemoveWaterLevel