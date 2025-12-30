import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { ServiceType } from '@/@types/common';
import { useArchiveStreamContext } from '@/context/ArchiveStreamContext';
import CameraView from './CameraView';
import { CameraInfo } from '@/types/camera'

type Props = {
  main_service_name: ServiceType | '';
  vms_name: string;
  camera_id: string;
  start_dateTime: string;
  service_type?: string;
  rewind?: number;
}

type StreamFunc = () => void;

export default function ArchiveStream({ main_service_name, vms_name, camera_id, start_dateTime, service_type, rewind }: Props) {
  const { cameraId, startDateTime, updateArchive } = useArchiveStreamContext();
  const isMountedRef = useRef<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>();

  const requestStream: StreamFunc = () => {

    const requesetCameraId = `${main_service_name}:${vms_name}:${camera_id}`;
    const isStreaming = (cameraId === requesetCameraId && startDateTime === start_dateTime);
    if (!isMountedRef.current) {
      return
    }
    if (!isStreaming) {
      updateArchive(requesetCameraId, start_dateTime);
    }
    setCameraInfo({
      main_service_name,
      vms_name,
      cameraId: camera_id,
      streamType: 'archive',
      startDateTime: start_dateTime,
      service_type,
      rewind
    });
  };

  useEffect(() => {
    isMountedRef.current = true;
    requestStream();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main_service_name, vms_name, camera_id, service_type, start_dateTime]);

  return (
    <div className='h-[100%] flex justify-center'>
      <CameraView cameraInfo={cameraInfo || {} as CameraInfo} />
    </div>
  );
}