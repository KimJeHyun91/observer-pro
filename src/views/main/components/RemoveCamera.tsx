import { CameraType } from '@/@types/camera';
import { ModalType } from '@/@types/modal';
import { Button } from '@/components/ui';

type Props = {
  camera: CameraType;
  toggleModal: ({ show, type, title }: ModalType) => void
  onDelete: () => void
}

export default function RemoveCamera({ camera, onDelete, toggleModal }: Props) {
  const confirmMessage = camera.vms_name ? `카메라 ${camera.camera_id}.${camera.camera_name} (VMS: ${camera.vms_name})을(를) 삭제하시겠습니까?` : `카메라 ${camera.camera_name}을(를) 삭제하시겠습니까?`;
  return (
    <section>
      <div className='flex flex-col justify-center text-[#4E4A4A] font-bold p-4'>
        <p className='text-[1.25rem]'>{confirmMessage}</p>
      </div>
      <div className='bg-[#D9DCE3] w-full h-[1px] absolute left-[0.03rem]' />
      <div className='flex justify-center gap-4 py-4'>
        <Button
          variant='default'
          onClick={() => toggleModal({ show: false, title: '', type: '' })}
        >
          취소
        </Button>
        <Button
          variant="default"
          type="submit"
          style={{ backgroundColor: '#D76767', color: '#fff' }}
          onClick={onDelete}
        >
          삭제
        </Button>
      </div>
    </section>
  );
}