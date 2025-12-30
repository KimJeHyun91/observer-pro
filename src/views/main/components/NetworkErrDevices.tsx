import { useEffect, useRef, useState } from 'react';
import { IoMdAlert } from 'react-icons/io';
import { ObCameraType } from '@/@types/camera';
import { ObDeviceType, ObGuardianliteType } from '@/@types/device';
import { PIDS } from '@/@types/pids';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { useEbells } from '@/utils/hooks/main/useEbells';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import { usePIDS } from '@/utils/hooks/main/usePIDS';
import { useCameras } from '@/utils/hooks/useCameras';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';

const DEVICE_CARD_STYLE = 'bg-[#EBECEF] rounded-sm my-2 p-2 dark:bg-[#313233] ';
const DEVICE_NAME_STYLE = 'text-[#D76767] text-[0.75rem] font-semibold';

export default function NetworkErrDevices() {
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const ulRef = useRef<HTMLUListElement | null>(null);
  const [ulHeight, setUlHeight] = useState('auto');
  const { cameras, mutate: mutateCameras, error: errorCameras } = useCameras('origin');
  const { doors, mutate: mutateDoors, error: errorDoors } = useDoors();
  const { ebells, mutate: mutateEbells, error: errorEbells } = useEbells({});
  const { guardianlites, mutate: mutateGuardianlites, error: errorGuardianlites } = useGuardianlites({});
  const { pidsList, mutate: mutatePIDS, error: errorPIDS } = usePIDS();

  if (errorCameras) {
    console.log('use cameras error');
  };
  if (errorDoors) {
    console.log('use doors error');
  };
  if (errorEbells) {
    console.log('use ebells error');
  };
  if (errorGuardianlites) {
    console.log('use guardianlites error');
  };
  if (errorPIDS) {
    console.log('use PIDS error');
  };

  const updateHeight = () => {
    const ul = ulRef.current;
    if (!ul) return;

    const rect = ul.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - rect.top - 14 - (isFullscreen ? 540 : 443);
    if (availableHeight > 0) {
      setUlHeight(`${availableHeight}px`);
    }
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const cameraSocket = socketService.subscribe('ob_cameras-update', (received) => {
      if (received) {
        mutateCameras();
      }
    });
    const doorSocket = socketService.subscribe('ob_doors-update', (received) => {
      if (received) {
        mutateDoors();
      }
    })
    const ebellSocket = socketService.subscribe('ob_ebells-update', (received) => {
      if (received) {
        mutateEbells();
      }
    });
    const guardianliteSocket = socketService.subscribe('ob_guardianlites-update', (received) => {
      if (received) {
        mutateGuardianlites();
      }
    });
    const pidsSocket = socketService.subscribe('ob_pids-update', (received) => {
      if (received) {
        mutatePIDS();
      }
    });
    return () => {
      cameraSocket();
      doorSocket();
      ebellSocket();
      guardianliteSocket();
      pidsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  useEffect(() => {
    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    const mutationObserver = new MutationObserver(() => {
      updateHeight();
    });

    const ul = ulRef.current;
    if (ul) {
      resizeObserver.observe(document.body);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 300); // fallback 강제 적용 (DOM 안정화 이후)

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [isFullscreen]);

  const networkErrDevices = []
    .concat(
      cameras?.filter((camera: ObCameraType) => camera.linked_status === false)
        .map((door: ObCameraType) => ({ ...door, type: 'camera' }))
    )
    .concat(
      doors?.filter((door: ObDeviceType) => door.linked_status === false)
        .map((door: ObDeviceType) => ({ ...door, type: 'door' }))
    )
    .concat(
      ebells?.filter((ebell: ObDeviceType) => ebell.linked_status === false)
        .map((ebell: ObDeviceType) => ({ ...ebell, type: 'ebell' }))
    )
    .concat(
      guardianlites?.filter((guardianlite: ObGuardianliteType) => guardianlite.status === false)
        .map((guardianlite: ObGuardianliteType) => ({ ...guardianlite, type: 'guardianlite' }))
    )
    .concat(
      pidsList?.filter((pids: PIDS) => pids.linked_status === false)
        .map((pids: PIDS) => ({ ...pids, type: 'pids' }))
    );

  const mapDevices = (device: ObCameraType | ObDeviceType | ObGuardianliteType | PIDS) => {
    if (device == null || !device.type) {
      return;
    };
    switch (device.type) {
      case 'camera':
        device = device as ObCameraType;
        if (device.service_type === 'independent') {
          return (
            <li
              key={device.idx}
              className={DEVICE_CARD_STYLE}
            >
              <h5 className={DEVICE_NAME_STYLE}>{device.camera_name}(카메라)</h5>
              <p>{device.outside_name ?? '실외'} {device.inside_name}</p>
              <p>IP : {device.camera_ip}</p>
            </li>
          );
        } else {
          return (
            <li
              key={device.idx}
              className={DEVICE_CARD_STYLE}
            >
              <h5 className={DEVICE_NAME_STYLE}>{device.camera_id}.{device.camera_name}(카메라)</h5>
              <p>{device.outside_name ?? '실외'} {device.inside_name}</p>
              <p>IP : {device.camera_ip}</p>
            </li>
          );
        }
        break;
      case 'door':
        device = device as ObDeviceType;
        return (
          <li
            key={device.idx}
            className={DEVICE_CARD_STYLE}
          >
            <h5 className={DEVICE_NAME_STYLE}>{device.device_id}.{device.device_name}(출입문)</h5>
            <p>{device.outside_name ?? '위치 정보 없음'} {device.inside_name}</p>
          </li>
        );
        break;
      case 'ebell':
        device = device as ObDeviceType;
        return (
          <li
            key={device.idx}
            className={DEVICE_CARD_STYLE}
          >
            <h5 className={DEVICE_NAME_STYLE}>{device.device_id}.{device.device_name}(비상벨)</h5>
            <p>{device.outside_name ?? '위치 정보 없음'} {device.inside_name}</p>
            <p>IP : {device.device_ip}</p>
          </li>
        );
        break;
      case 'guardianlite':
        device = device as ObGuardianliteType;
        return (
          <li
            key={device.guardianlite_ip}
            className={DEVICE_CARD_STYLE}
          >
            <h5 className={DEVICE_NAME_STYLE}>{device.guardianlite_name}(가디언라이트)</h5>
            <p>{device.outside_name} {device.inside_name}</p>
            <p>IP : {device.guardianlite_ip}</p>
          </li>
        );
        break;
      case 'pids':
        device = device as PIDS;
        return (
          <li
            key={device.idx}
            className={DEVICE_CARD_STYLE}
          >
            <h5 className={DEVICE_NAME_STYLE}>{device.pids_id}(PIDS Zone)</h5>
            <p>실외 {device.pids_location}</p>
            <p>IP : {device.pids_ip}</p>
          </li>
        );
        break;
      default:
        throw new Error(`unKnown device type: ${device.type}`);
    }
  }

  return (
    <section className='bg-white dark:bg-[#262626] rounded-sm h-[40%]'>
      <div className='flex justify-between items-center'>
        <h4 className='text-[1.03rem] font-bold px-2 pt-1'>네트워크 장애 장치</h4>
        <IoMdAlert size={25} color='#D76767' className='mr-2' />
      </div>
      <div className='w-[10/12] bg-[#616A79] h-[2px] mt-1' />
      <ul
        ref={ulRef}
        className='h-full px-3 scroll-container overflow-x-hidden overflow-y-auto py-1 mr-2'
        style={{
          height: ulHeight
        }}
      >
        {(Array.isArray(networkErrDevices) && networkErrDevices.length) ? networkErrDevices.map(mapDevices) : <p className='relative top-[44%] text-center'>연결 끊김 장비가 없습니다.</p>}
      </ul>
    </section>
  );
}