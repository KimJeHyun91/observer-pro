import { Button, Select } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/named
import { SingleValue } from 'react-select';
import { ObDeviceType } from '@/@types/device';
import { useEbells } from '@/utils/hooks/main/useEbells';

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

type Props = {
  onCancel: () => void;
  add: (idx: number) => Promise<void>;
}

type ebellOption = {
  label: string;
  value: string;
};

export default function AddEbell({ onCancel, add }: Props) {
  const { socketService } = useSocketConnection();
  const [ebellIdx, setEbellIdx] = useState<number | null>(null);
  const { ebells, error, isLoading, mutate } = useEbells({});
  if (isLoading) {
    console.log(`get ebells device loading...`);
  };
  if (error) {
    console.error('get ebells device error: ', error);
  }

  const options: ebellOption[] = ebells && ebells.filter((ebell: ObDeviceType) => !ebell.top_location && !ebell.left_location).map((ebell: ObDeviceType) => ({ value: `${ebell.idx}`, label: `${ebell.device_name} (내선번호:${ebell.device_id}, IP:${ebell.device_ip})` }))

  const handleChange = (e: SingleValue<ebellOption>) => {
    if (!e) {
      return;
    }
    setEbellIdx(parseInt(e.value));
  }


  const onAdd = () => {
    if (ebellIdx == null) {
      return;
    }
    return add(ebellIdx);
  }

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const ebellsSocket = socketService.subscribe('ob_ebells-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      ebellsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <section className='mt-4 h-[118px] flex flex-col justify-between'>
      <Select placeholder="비상벨을 선택하세요." options={options} onChange={handleChange} />
      <div className='flex gap-4 w-full justify-end'>
        <Button
          variant="solid"
          className={`bg-[#EDF0F6] text-[#696C72] ${buttonStyle}`}
          onClick={onCancel}
        >
          취소
        </Button>
        <Button
          variant="solid"
          className={`bg-[#17A36F] ${buttonStyle}`}
          disabled={!ebellIdx}
          onClick={onAdd}
        >
          추가
        </Button>
      </div>
    </section>
  );
}