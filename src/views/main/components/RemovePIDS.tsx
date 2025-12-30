import { ModalType } from '@/@types/modal';
import { PIDS } from '@/@types/pids';
import { Button } from '@/components/ui';

type Props = {
  pids: PIDS;
  toggleModal: ({ show, type, title }: ModalType) => void
  onDelete: () => void
}

export default function RemovePIDS({ pids, onDelete, toggleModal }: Props) {
  return (
    <section>
      <div className='flex flex-col justify-center text-[#4E4A4A] font-bold p-4'>
        <p className='text-[1.25rem]'>{`${pids.pids_id}을(를) 삭제하시겠습니까?`}</p>
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