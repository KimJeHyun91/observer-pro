import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuGuardianlite({ onClick, updateLocation }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'guardianlite-modify', title: '가디언라이트 수정' })}>가디언라이트 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>가디언라이트 위치 수정</li>
      <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'guardianlite-remove', title: '가디언라이트 삭제' })}>가디언라이트 삭제</li>
    </>
  );
}