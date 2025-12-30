import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuEbell({ updateLocation, onClick }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>비상벨 위치 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'ebell-camera', title: '비상벨 연동 카메라 설정' })}>비상벨 연동 카메라 설정</li>
      <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'ebell-remove', title: '비상벨 삭제' })}>비상벨 삭제</li>
    </>
  );
}