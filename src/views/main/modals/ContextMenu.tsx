import { CanvasObject, ClickObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';
import { ObService } from '@/@types/service';
import { useObserverServices } from '@/utils/hooks/main/useObserverServices';
import ContextMenuBuilding from './ContextMenuBuilding';
import { ApiResultObjectArray } from '@/@types/api';
import ContextMenuCamera from './ContextMenuCamera';
import ContextMenuDoor from './ContextMenuDoor';
import ContextMenuEbell from './ContextMenuEbell';
import ContextMenuGuardianlite from './ContextMenuGuardianlite';
import ContextMenuPIDS from './ContextMenuPIDS';

type Props = {
  mapType: 'indoor' | 'outdoor';
  fabricObject: CanvasObject;
  object: ClickObject;
  updateLocation: () => void;
  cameraAngle: boolean;
  updateCameraAngle: () => void;
  handleLockDoor?: () => void;
  handleUnlockDoor?: (cmdSec?: number) => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenu({
  mapType,
  fabricObject,
  object,
  handleLockDoor,
  handleUnlockDoor,
  updateLocation,
  cameraAngle,
  updateCameraAngle,
  onClick
}: Props) {
  const { data: services } = useObserverServices<ApiResultObjectArray<ObService>>();
  const filterDevices = (service: ObService) => {
    return (
      service.service_type !== 'observer' &&
      service.service_type !== 'ndoctor' &&
      service.service_type !== 'anpr' &&
      !(mapType === 'outdoor' && service.service_type === 'accesscontrol') &&
      !(mapType === 'indoor' && service.service_type === 'pids')
    )
  }

  const changeDevice = (serviceTypeKr: string) => {
    switch (serviceTypeKr) {
      case 'MGIST':
        return '카메라';
        break;
      case '출입통제':
        return '출입문';
        break;
      // case 'mdet':
      //   return 'M-DET';
      //   break;
      default:
        return serviceTypeKr;
        break;
    };
  };

  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')!;
    menu.style.display = 'none'; // 메뉴 숨기기
  };

  const onClickCb = ({ show, title, type }: ModalType) => {
    onClick({
      show,
      title,
      type
    });
    closeContextMenu();
  };

  const contextMenuObject = (object: ClickObject) => {
    switch (object?.type) {
      case 'building':
        return <ContextMenuBuilding fabricObject={fabricObject} updateLocation={updateLocation} close={closeContextMenu} onClick={onClickCb} />
        break;
      case 'camera':
        return <ContextMenuCamera fabricObject={fabricObject} updateLocation={updateLocation} cameraAngle={cameraAngle} updateCameraAngle={updateCameraAngle} close={closeContextMenu} onClick={onClickCb} />
        break;
      case 'door':
        return (
          <ContextMenuDoor
            fabricObject={fabricObject}
            updateLocation={updateLocation}
            handleLockDoor={handleLockDoor!}
            handleUnlockDoor={handleUnlockDoor!}
            close={closeContextMenu}
            onClick={onClickCb}
          />
        )
        break;
      case 'ebell':
        return (
          <ContextMenuEbell
            fabricObject={fabricObject}
            updateLocation={updateLocation}
            close={closeContextMenu}
            onClick={onClickCb}
          />
        )
        break;
      case 'guardianlite':
        return (
          <ContextMenuGuardianlite
            fabricObject={fabricObject}
            updateLocation={updateLocation}
            close={closeContextMenu}
            onClick={onClickCb}
          />
        )
        break;
      case 'pids':
        return (
          <ContextMenuPIDS
            fabricObject={fabricObject}
            close={closeContextMenu}
            onClick={onClickCb}
          />
        );
        break;
      // case 'mdet':
      //   return (
      //     <ContextMenuMDET
      //       fabricObject={fabricObject}
      //       close={closeContextMenu}
      //       onClick={onClickCb}
      //     />
      //   );
      default:
        break
    }
  }

  const mapFromServiceToDevice = (serviceName: string) => {
    switch (serviceName) {
      case 'mgist':
        return 'camera';
        break;
      case 'accesscontrol':
        return 'door';
        break;
      default:
        return serviceName;
        break;
    }
  }

  const mapFromServiceToDeviceTitle = (serviceName: string) => {
    switch (serviceName) {
      case 'mgist':
        return '카메라';
        break;
      case 'ebell':
        return '비상벨';
        break;
      case 'accesscontrol':
        return '출입문';
        break;
      case 'guardianlite':
        return '가디언라이트';
        break;
      case 'pids':
        return 'PIDS';
        break;
      // case 'mdet':
      //   return 'M-DET';
      //   break;
      default:
        return serviceName;
        break;
    }
  }

  const deviceList = services?.result.filter(filterDevices)
  if (object == null) {
    return (
      <>
        {mapType === 'outdoor' && (
          <li
            key={0}
            className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold'
            onClick={
              () => onClickCb({ show: true, type: 'building-add', title: '건물 추가' })
            }>
            건물 추가
          </li>
        )}
        {deviceList?.map((device) => (
          <li
            key={device.id}
            className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold'
            onClick={() => onClickCb({ show: true, type: `${mapFromServiceToDevice(device.service_type)}-add`, title: `${mapFromServiceToDeviceTitle(device.service_type)} 추가` })}
          >
            {changeDevice(device.service_type_kr)} 추가
          </li>)
        )}
      </>
    );
  } else if (object) {
    return contextMenuObject(object)
  }
}