import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { ServiceType } from '@/@types/common';
import CameraView from '@/components/common/camera/CameraView';
import { CameraInfo } from '@/types/camera'

type Props = {
  main_service_name: ServiceType | '';
  vms_name: string;
  camera_id: string;
  service_type?: string;
  access_point?: string;
  camera_ip?: string;
}

type ServicePrfix = 'ob' | 'fl' | 'vm' | 'pm' | 'tm' | 'vb';

/**
TODO 서비스별로 채널 타입 추가해주세요.
ex) ob_cameraStream | fl_cameraStream | pm_cameraStream
*/
type LiveStreamSocketChannelType =
  | 'ob_cameraStreamEvent'
  | 'pm_cameraStreamEvent'
  | 'fl_cameraStreamEvent'
  | 'vm_cameraStreamEvent'
  | 'tm_cameraStreamEvent'
  | 'vb_cameraStreamEvent';

type LiveStreamSocketErrChannelType =
  | 'ob_cameraStreamEventErr'
  | 'pm_cameraStreamEventErr'
  | 'fl_cameraStreamEventErr'
  | 'vm_cameraStreamEventErr'
  | 'tm_cameraStreamEventErr'
  | 'vb_cameraStreamEventErr';

type StreamFunc = () => void;

function fn_mainServicePrefix(mainService: ServiceType | ''): ServicePrfix {
  let mainServicePrefix = 'ob';

  if (mainService === 'inundation') {
    // 침수
    mainServicePrefix = 'fl';

  } else if (mainService === 'vehicle') {
    // 차량관리
    mainServicePrefix = 'vm';

  } else if (mainService === 'parking') {
    // 주차관리
    mainServicePrefix = 'pm';

  } else if (mainService === 'tunnel') {
    // 터널관리
    mainServicePrefix = 'tm';

  } else if (mainService === 'broadcast') {
    // 마을방송
    mainServicePrefix = 'vb';
  } else {
    // 옵저버
    mainServicePrefix = 'ob';
  }
  return mainServicePrefix as ServicePrfix;
}

export default function LiveEventStream({ main_service_name, vms_name, camera_id, service_type, access_point, camera_ip }: Props) {
  const isMountedRef = useRef<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>()
  // const servicePrefix = fn_mainServicePrefix(main_service_name);
  // 해당 컴포넌트 상위에 서비스별 Socket 채널 타입 추가 요망

  const requestStream: StreamFunc = () => {

    if (!isMountedRef.current) {
      return;
    }
    setCameraInfo({
      main_service_name,
      vms_name,
      cameraId: camera_id,
      streamType: 'live',
      service_type: vms_name === '' ? 'independent' : 'mgist',
      access_point,
      camera_ip
    })
  };

  useEffect(() => {
    isMountedRef.current = true;
    requestStream();
    return () => {
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