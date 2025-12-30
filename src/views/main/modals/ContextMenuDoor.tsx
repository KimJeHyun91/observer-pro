import { CanvasObject } from '@/@types/canvas';
import { ModalType } from '@/@types/modal';

type Props = {
  fabricObject: CanvasObject;
  updateLocation: () => void;
  handleLockDoor: () => void;
  handleUnlockDoor: (cmdSec?: number) => void;
  close: () => void;
  onClick: ({ show, type, title }: ModalType) => void;
}

export default function ContextMenuDoor({ updateLocation, handleLockDoor, handleUnlockDoor, onClick }: Props) {
  return (
    <>
      <li key={0} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={updateLocation}>출입문 위치 수정</li>
      <li key={1} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'door-camera', title: '출입문 연동 카메라 설정' })}>출입문 연동 카메라 설정</li>
      <li key={2} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={handleLockDoor}>출입문 잠금</li>
      <li key={3} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => handleUnlockDoor()}>출입문 잠금 해제</li>
      <li key={4} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => handleUnlockDoor(10)}>출입문 잠금 해제(10초)</li>
      <li key={5} className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={() => onClick({ show: true, type: 'door-remove', title: '출입문 삭제' })}>출입문 삭제</li>
    </>
  );
}