import { ModalType } from '@/@types/modal'

type Props = {
  type: string
  onClick: ({ show, type, title }: ModalType) => void
  updateLocation: () => void
  updateCameraAngle: () => void
  close: () => void
  cameraAngle: boolean
}

type MenuItem = {
  key: number
  label: string
  modalType?: string
  modalTitle?: string
  action?: 'updateLocation' | 'updateCameraAngle'
}

const menuConfig: Record<string, MenuItem[]> = {
  camera: [
    { key: 0, label: '카메라 위치 이동', action: 'updateLocation' },
    { key: 1, label: '카메라 화각 설정', action: 'updateCameraAngle' },
    { key: 2, label: '카메라 삭제', modalType: 'tunnelCamera-remove', modalTitle: '카메라 삭제' },
  ],
  waterGauge: [
    { key: 0, label: '수위계 위치 이동', action: 'updateLocation' },
    { key: 1, label: '수위계 삭제', modalType: 'waterGauge-remove', modalTitle: '수위계 삭제' },
  ],
  waterLevel: [
    { key: 0, label: '수위계 위치 이동', action: 'updateLocation' },
    { key: 1, label: '수위계 삭제', modalType: 'waterLevel-remove', modalTitle: '수위계 삭제' },
  ],
}

export default function ContextMenuTunnel({ onClick, updateLocation, updateCameraAngle, type, cameraAngle }: Props) {
  const getMenuItems = () => {
    const config = menuConfig[type] || [];

    return config.map((item) => {
      if (item.modalType) {
        return {
          key: item.key,
          label: item.label,
          onClick: () =>
            onClick({
              show: true,
              type: item.modalType || '',
              title: item.modalTitle || '',
            }),
        };
      }

      if (item.action === 'updateLocation') {
        return {
          key: item.key,
          label: item.label,
          onClick: updateLocation,
        };
      }

      // if(item.action === 'updateSize'){
      //     return {
      //         key: item.key,
      //         label: item.label,
      //         onClick: updateSize,
      //     };
      // }

      if (item.action === 'updateCameraAngle' && cameraAngle) {
        return {
          key: item.key,
          label: item.label,
          onClick: updateCameraAngle,
        };
      }
      return null;
    }).filter(Boolean);
  };

  const menuItems = getMenuItems();

  return (
    <>
      {menuItems.map((item) => {
        if (!item) return null;

        return (
          <li
            key={item.key}
            className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
            onClick={item.onClick}
          >
            {item.label}
          </li>
        );
      })}
    </>
  )
}
