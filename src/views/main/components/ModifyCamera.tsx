import { ApiResultBoolean } from '@/@types/api';
import { CameraType, CameraTypes } from '@/@types/camera';
import { Button } from '@/components/ui';
import { useState } from 'react';
// eslint-disable-next-line import/named
import Select, { SingleValue } from 'react-select';

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

type Props = {
  onCancel: () => void;
  cameraDetail: CameraType;
  modify: ({ main_service_name, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, camera_type }: {
    main_service_name: string;
    vms_name: string;
    camera_id: string;
    outside_idx: number;
    inside_idx: number;
    top_location: string;
    left_location: string;
    camera_angle?: string | null;
    camera_type: "" | "dome" | "dome_elevator" | "speed_dome" | "bullet" | "bullet_flame" | null;
  }) => Promise<ApiResultBoolean>
}

type CameraOption = {
  label: string;
  value: string;
};

export default function ModifyCamera({ cameraDetail, modify, onCancel }: Props) {
  const [cameraType, setCameraType] = useState<CameraTypes>(cameraDetail.camera_type ?? '');

  const onModify = () => {
    const { camera_id, vms_name, main_service_name, outside_idx, inside_idx, top_location, left_location, camera_angle } = cameraDetail;
    if (outside_idx == null || inside_idx == null) {
      return;
    }

    modify({ main_service_name, vms_name, camera_id, outside_idx, inside_idx, left_location, top_location, camera_angle, camera_type: cameraType });
  };

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

  const handleChangeType = (e: SingleValue<CameraOption>) => {
    setCameraType(e?.value as CameraTypes);
  };

  return (
    <section className='mt-2 h-[118px] flex flex-col justify-between'>
      <Select
        className='mt-2'
        placeholder="카메라 종류를 선택하세요."
        options={options}
        value={options.find(option => option.value === cameraType)}
        onChange={handleChangeType}
      />
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
          onClick={onModify}
        >
          수정
        </Button>
      </div>
    </section>
  );
}