import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuMDET({ onClick, updateLocation }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'mdet-modify', title: 'MDET 수정' })}>MDET 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>MDET 위치 수정</li>
      <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'mdet-camera', title: 'MDET 연동 카메라 설정' })}>MDET 연동 카메라 설정</li>
      <li key={3} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'mdet-remove', title: 'MDET 삭제' })}>MDET 삭제</li>
    </>
  );
}