import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  updateSize?: () => void;
  updateCameraAngle: () => void;
  close: () => void;
  type: string; 
  onClick: ({ show, type, title }: ModalType) => void;
  cameraAngle: boolean;
}

type MenuItem = {
  key: number;
  label: string;
  modalType?: string;
  modalTitle?: string;
  action?: 'updateLocation' | 'updateSize' | 'updateCameraAngle';
};


const menuConfig: Record<string, MenuItem[]> = {
  building: [
    { key: 0, label: '건물명 수정', modalType: 'parkingField-fieldModify', modalTitle: '건물명 수정' },
    { key: 1, label: '건물 위치 이동', action: 'updateLocation' },
    { key: 3, label: '건물 삭제', modalType: 'parkingField-remove', modalTitle: '건물 삭제' },
  ],
  camera: [
    { key: 0, label: '카메라 위치 이동', action: 'updateLocation' },
    { key: 1, label: '카메라 화각 설정', action: 'updateCameraAngle' },
    { key: 2, label: '카메라 종류 수정', modalType: 'camera-type', modalTitle: '카메라 종류 수정' },
    { key: 3, label: '카메라 삭제', modalType: 'camera-remove', modalTitle: '카메라 삭제' },
  ],
  parkingArea: [
    { key: 0, label: '주차 면 구역 수정', modalType: 'parkingArea-areaModify', modalTitle: '주차 면 구역 수정' },
    { key: 1, label: '면 위치 이동', action: 'updateLocation' },
    { key: 2, label: '면 크기 수정', action: 'updateSize' },
    { key: 3, label: '주차 면 삭제', modalType: 'parkingArea-remove', modalTitle: '주차 면 삭제' },
  ],
};

export default function ContextMenuParking({ onClick, updateLocation, updateSize, updateCameraAngle, type, cameraAngle }: Props) {
  const getMenuItems = () => {
      const config = menuConfig[type] || [];

      return config.map((item) => {
          if(item.modalType){
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
      
          if(item.action === 'updateLocation'){
              return {
                  key: item.key,
                  label: item.label,
                  onClick: updateLocation,
              };
          }
      
          if(item.action === 'updateSize'){
              return {
                  key: item.key,
                  label: item.label,
                  onClick: updateSize,
              };
          }
      
          if(item.action === 'updateCameraAngle' && cameraAngle){
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
  );
}
