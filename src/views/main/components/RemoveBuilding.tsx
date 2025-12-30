import { Building } from '@/@types/building';
import { ModalType } from '@/@types/modal';
import { Button } from '@/components/ui';

type Props = {
  building: Building
  toggleModal: ({ show, type, title }: ModalType) => void
  onDelete: () => void
}

export default function RemoveBuilding({ building, onDelete, toggleModal }: Props) {
  return (
    <section>
      <div className='flex flex-col justify-center text-[#4E4A4A] font-bold p-4'>
        <p className='text-[1.25rem]'>{`건물 ${building.outside_name}을 삭제하시겠습니까?`}</p>
        <p className='text-red-600'>(건물 삭제 시 해당 건물에 속한 데이터와 장비가 모두 삭제됩니다!)</p>
      </div>
      <div className='bg-[#D9DCE3] w-full h-[1px] absolute left-[0.03rem]' />
      <div className='flex justify-center gap-4 pt-6'>
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