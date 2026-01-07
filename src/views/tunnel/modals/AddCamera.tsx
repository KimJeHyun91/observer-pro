import { CameraType } from '@/@types/camera';
import { Button } from '@/components/ui';
import { useCameras } from '@/utils/hooks/useCameras';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line import/named
import { SingleValue } from 'react-select';
import TreeSelect from '../../../components/common/camera/TreeSelect';

type Props = {
  onCancel: () => void;
  add: (vms_name: string, camera_id: string) => void;
}

type CameraOption = {
  label: string;
  value: string;
};

export default function AddCamera({ onCancel, add }: Props) {
  const { socketService } = useSocketConnection();
  const [camera, setCamera] = useState('');
  const { cameras, error, isLoading, mutate } = useCameras('tunnel');
  if (isLoading) {
    console.log(`get cameras(origin) loading...`);
  };
  if (error) {
    console.error('get cameras(origin) error: ', error);
  }

  const onAdd = () => {
    const vms_name = camera.split(':')[1];
    const camera_id = camera.split(':')[2];
    return add(vms_name, camera_id);
  }


  const cameraList = useMemo(() => {
    const sorted = (list: CameraType[]) => [...list].sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id)));
    return sorted(cameras?.filter((camera: CameraType) => !camera.left_location && !camera.top_location).sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id))));
  }, [cameras]);

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const camerasSocket = socketService.subscribe('pm_cameras-update', (received) => {
      if (received) {
        mutate();
      }
    })

    return () => {
      camerasSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  const handleChangeCurrentCamera = async (option: SingleValue<CameraOption>) => {
    if (option) {
      setCamera(option.value);
    }
  }

  return (

    <div>
      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

      <div className="pt-1">
        <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
          <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">카메라 목록</span>
          <div className="col-span-4">
            <TreeSelect
              camera={camera}
              cameraList={cameraList}
              handleChangeCurrentCamera={handleChangeCurrentCamera}
            />

          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

      <div className="flex justify-end space-x-2">
        <Button
          className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
          size="sm"
          onClick={onCancel}
        >
          취소
        </Button>

        <Button
          className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
          size="sm"
          variant="solid"
          disabled={!camera}
          onClick={onAdd}
        >
          추가
        </Button>
      </div>
    </div>
  );
}