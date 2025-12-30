import { CanvasObject, ClickObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';
import ContextMenuParking from './ContextMenuParking';

type Props = {
  mapType: 'indoor' | 'outdoor';
  fabricObject: CanvasObject;
  object: ClickObject;
  onClick: ({ show, type, title }: ModalType) => void;
  updateLocation: () => void;
  updateCameraAngle: () => void;
  updateSize?: () => void;
  cameraAngle: boolean;
}

export default function ContextMenu({ mapType, fabricObject, object, onClick, updateLocation, updateSize, updateCameraAngle,cameraAngle }: Props) {

  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')!;
    menu.style.display = 'none';
  }

  const onClickCb = ({ show, title, type }: ModalType) => {
    onClick({
      show,
      title,
      type
    })
    closeContextMenu();
  }

  const contextMenuObject = (object : ClickObject) => {
    return <ContextMenuParking fabricObject={fabricObject} updateCameraAngle={updateCameraAngle} updateSize={updateSize} updateLocation={updateLocation} close={closeContextMenu} type={object?.type || ''} cameraAngle={cameraAngle} onClick={onClickCb}/>
  }


  if (object == null) {
    return (
      <>
        {mapType && (
          <>
            <li
              key={0}
              className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
              onClick={() =>
                onClickCb({
                  show: true,
                  type: mapType === 'indoor' ? 'parkingArea-add' : 'parkingField-add',
                  title: mapType === 'indoor' ? '주차 면 구역 추가' : '건물 추가',
                })
              }
            >
              {mapType === 'indoor' ? '주차 면 구역 추가' : '건물 추가'}
            </li>
            
          </>
        )}
        
        <li
            key={1}
            className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
            onClick={() =>
              onClickCb({
                show: true,
                type: 'parkingCamera-add',
                title: '카메라 추가',
              })
            }
          >
            카메라 추가
        </li>
      </>
    );
  } else if (object) {
    return contextMenuObject(object)
  }
}