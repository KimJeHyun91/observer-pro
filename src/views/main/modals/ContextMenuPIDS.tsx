import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuPIDS({ onClick }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'pids-camera', title: 'PIDS 연동 카메라 설정' })}>PIDS 연동 카메라 설정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'pids-remove', title: 'PIDS 삭제' })}>PIDS 삭제</li>
    </>
  );
}