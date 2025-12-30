import { useCallback, useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line import/named
import Select, { SingleValue } from 'react-select';
import { CameraType, CameraTypes } from '@/@types/camera';
import { Button } from '@/components/ui';
import { useCameras } from '@/utils/hooks/useCameras';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
// eslint-disable-next-line import/named
import TreeSelect from '../../../components/common/camera/TreeSelect';
import { ObDeviceType } from '@/@types/device';
import { PIDS } from '@/@types/pids';

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

type Props = {
  onCancel: () => void;
  type: 'add' | 'setCamera';
  add?: (vms_name: string, camera_id: string, cameraType: CameraTypes) => void;
  setDeviceCamera?: (main_service_name: string, vms_name: string, camera_id: string, service_type: string) => Promise<boolean>;
  clickDevice?: ObDeviceType | PIDS;
}

type CameraOption = {
  label: string;
  value: string;
};

export default function AddCamera({ type, onCancel, add, setDeviceCamera, clickDevice }: Props) {
  const { socketService } = useSocketConnection();
  const [camera, setCamera] = useState<string | null>('');
  const { cameras, error, isLoading, mutate } = useCameras('origin');
  if (isLoading) {
    console.log(`get cameras(origin) loading...`);
  };
  if (error) {
    console.error('get cameras(origin) error: ', error);
  };
  const [cameraType, setCameraType] = useState<CameraTypes | ''>('');

  const onAdd = () => {
    if (camera === '') {
      return;
    }
    if (type === 'add' && camera) {
      const vms_name = camera.split(':')[1];
      const camera_id = camera.split(':')[2];
      return add!(vms_name, camera_id, cameraType);
    } else {
      if (camera) {
        const main_service_name = camera.split(':')[0];
        const vms_name = camera.split(':')[1];
        const camera_id = camera.split(':')[2];
        const service_type = camera.split(':')[3];
        return setDeviceCamera!(main_service_name, vms_name, camera_id, service_type);
      } else {
        return setDeviceCamera!('', '', '', '')
      }
    }
  }

  const handleChangeCurrentCamera = async (option: SingleValue<CameraOption>) => {
    if (option) {
      setCamera(option.value);
    }
  }

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const camerasSocket = socketService.subscribe('ob_cameras-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      camerasSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  const okBtnMsg = () => {
    if (camera === null) {
      return '연동 해제';
    } else if (clickDevice) {
      return '연동';
    } else {
      return '추가';
    };
  };

  const cameraList = useMemo(() => {
    const sorted = (list: CameraType[]) => [...list].sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id)));
    if (type === 'add') {
      return sorted(cameras.filter((camera: CameraType) => !camera.left_location && !camera.top_location));
    }
    return sorted(cameras);
  }, [type, cameras]);

  const options: CameraOption[] = [
    {
      label: '선택 안 함',
      value: ''
    },
    {
      label: 'Bullet',
      value: 'bullet',
    },
    {
      label: 'Bullet(flame)',
      value: 'bullet_flame',
    },
    {
      label: 'Dome',
      value: 'dome',
    },
    {
      label: 'Dome(elevator)',
      value: 'dome_elevator',
    },
    {
      label: 'Speed Dome(PTZ)',
      value: 'speed_dome',
    }
  ];

  const handleChangeType = useCallback((e: SingleValue<CameraOption | string>) => {
    if (e == null || typeof e === 'string') return;
    setCameraType(e.value as CameraTypes);
  }, []);

  return (

    <section className='mt-2 h-[118px] flex flex-col justify-between'>
      {clickDevice && (
        <div className='flex items-center w-full justify-between mb-2'>
          <p>연동 카메라 : {clickDevice.camera_id ?? '설정 안 됨'}</p>
          {clickDevice.camera_id ? <Button onClick={() => setCamera(null)}>카메라 연동 해제</Button> : ''}
        </div>
      )}
      <TreeSelect
        cameraList={cameraList}
        handleChangeCurrentCamera={handleChangeCurrentCamera}
        camera={camera}
      />
      {type === 'add' && (
        <Select
          className='mt-2'
          placeholder="카메라 종류를 선택하세요."
          options={options}
          value={cameraType ? options.find(option => option.value === cameraType) : ''}
          onChange={handleChangeType}
        />
      )}
      <div className='flex gap-4 w-full justify-end mt-2'>
        <Button
          variant="solid"
          className={`bg-[#EDF0F6] text-[#696C72] ${buttonStyle}`}
          onClick={onCancel}
        >
          취소
        </Button>
        <Button
          variant="solid"
          className={`bg-[#17A36F] ${buttonStyle}`}
          disabled={camera == null}
          onClick={onAdd}
        >
          {okBtnMsg()}
        </Button>
      </div>
    </section>
  );
}