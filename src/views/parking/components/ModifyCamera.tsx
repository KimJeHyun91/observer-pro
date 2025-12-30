import { ApiResultBoolean } from '@/@types/api';
import { CameraType, CameraTypes } from '@/@types/camera';
import { Button } from '@/components/ui';
import { useState } from 'react';
// eslint-disable-next-line import/named
import Select, { SingleValue } from 'react-select';

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
    const {
      camera_id,
      vms_name,
      main_service_name,
      outside_idx,
      inside_idx,
      top_location,
      left_location,
      camera_angle,
    } = cameraDetail;

    if (outside_idx == null || inside_idx == null) {
      return;
    }

    modify({
      main_service_name,
      vms_name,
      camera_id,
      outside_idx,
      inside_idx,
      left_location,
      top_location,
      camera_angle,
      camera_type: cameraType,
    });
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
    <div>
        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

        <div className="pt-1">
            <div className="grid grid-cols-5 items-center gap-4 mb-10 mt-4">
                <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">카메라 종류</span>
                <div className="col-span-4">
                  <Select
                      isSearchable={false} 
                      className='mt-2'
                      placeholder="카메라 종류를 선택하세요."
                      options={options}
                      value={options.find(option => option.value === cameraType)}
                      onChange={handleChangeType}
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
                onClick={onModify}
            >
                추가
            </Button>
        </div>
    </div>
  );
}