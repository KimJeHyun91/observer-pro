import { useEffect, useRef, useState } from 'react';
import { ServiceType } from '@/@types/common';
import CameraView from '@/components/common/camera/CameraView';
import { CameraInfo } from '@/types/camera'

type Props = {
  main_service_name: ServiceType | '';
  vms_name: string;
  camera_id: string;
  service_type: string;
  start_datetime: string;
}

type StreamFunc = () => void;

export default function SOPArchiveStream({ main_service_name, vms_name, camera_id, service_type, start_datetime }: Props) {

  const isMountedRef = useRef<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>()

  const requestStream: StreamFunc = () => {

    if (!isMountedRef.current) {
      return
    };
    setCameraInfo({
      main_service_name,
      vms_name,
      cameraId: camera_id,
      streamType: 'archive',
      startDateTime: start_datetime,
      service_type
    });
  }

  useEffect(() => {
    isMountedRef.current = true;
    requestStream();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main_service_name, vms_name, camera_id, start_datetime]);


  return (
    <div className='w-full h-[100%] flex justify-center'>
      <CameraView cameraInfo={cameraInfo || {} as CameraInfo} />
    </div>
  );
};