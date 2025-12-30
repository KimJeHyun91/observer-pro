import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  cameraAngle: boolean;
  updateCameraAngle: () => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuCamera({ onClick, updateLocation, cameraAngle, updateCameraAngle }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>카메라 위치 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'camera-type', title: '카메라 종류 수정' })}>카메라 종류 수정</li>
      {cameraAngle && <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateCameraAngle}>카메라 화각 설정</li>}
      <li key={3} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'camera-remove', title: '카메라 삭제' })}>카메라 삭제</li>
    </>
  );
}