import { useEffect, useRef, useState } from 'react';
import { useCameraStreamContext } from '../../../context/cameraStreamContext';
// eslint-disable-next-line import/no-unresolved
import { ServiceType } from '@/@types/common';
import CameraView from '@/components/common/camera/CameraView';
import { CameraInfo } from '@/types/camera'

type Props = {
  main_service_name: ServiceType | '';
  vms_name: string;
  camera_id: string;
  service_type?: string;
  area_name?: string;
  access_point?: string;
  camera_ip?: string;
}

type StreamFunc = () => void;

export default function LiveStream({ main_service_name, vms_name, camera_id, area_name, access_point, camera_ip }: Props) {
  const { cameraId, updateCameraId } = useCameraStreamContext();
  const [fail, setFail] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>();
  // 해당 컴포넌트 상위에 서비스별 Socket 채널 타입 추가 요망

  const requestStream: StreamFunc = () => {
    if (fail) {
      setFail(false)
    }

    const requesetCameraId = `${main_service_name}:${vms_name}:${camera_id}`;
    const noStream = cameraId !== requesetCameraId;
    if (!isMountedRef.current || !noStream) {
      return;
    }
    setCameraInfo({
      main_service_name,
      vms_name,
      cameraId: camera_id,
      streamType: 'live',
      service_type: vms_name === '' ? 'independent' : 'mgist',
      area_name,
      access_point,
      camera_ip
    });
    updateCameraId(requesetCameraId);
  };

  useEffect(() => {
    isMountedRef.current = true;
    requestStream();
    return () => {
      updateCameraId('');
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main_service_name, vms_name, camera_id]);

  return (
    <div className='h-[100%] flex justify-center mt-1'>
      <CameraView cameraInfo={cameraInfo || {} as CameraInfo} />
    </div>
  );
}