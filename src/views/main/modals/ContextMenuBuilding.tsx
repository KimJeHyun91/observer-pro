import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuBuilding({ onClick, updateLocation }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'building-modify', title: '건물명 수정' })}>건물명 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>건물 위치 수정</li>
      <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'building-remove', title: '건물 삭제' })}>건물 삭제</li>
    </>
  );
}