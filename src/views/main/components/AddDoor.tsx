import { Button, Select } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/named
import { SingleValue } from 'react-select';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { ObDeviceType } from '@/@types/device';

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

type Props = {
  onCancel: () => void;
  add: (idx: number) => Promise<void>;
}

type doorOption = {
  label: string;
  value: string;
};

export default function AddDoor({ onCancel, add }: Props) {
  const { socketService } = useSocketConnection();
  const [doorIdx, setDoorIdx] = useState<number | null>(null);
  const { doors, error, isLoading, mutate } = useDoors();
  if (isLoading) {
    console.log(`get accesscontrol doors loading...`);
  };
  if (error) {
    console.error('get accesscontrol doors error: ', error);
  }

  const options: doorOption[] = doors && doors.filter((door: ObDeviceType) => !door.top_location && !door.left_location).map((door: ObDeviceType) => ({ value: `${door.idx}`, label: `${door.device_id}.${door.device_name}(${door.device_ip})` }))

  const handleChange = (e: SingleValue<doorOption>) => {
    if (!e) {
      return;
    }
    setDoorIdx(parseInt(e.value));
  }


  const onAdd = () => {
    if (doorIdx == null) {
      return;
    }
    return add(doorIdx);
  }

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const doorsSocket = socketService.subscribe('ob_doors-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      doorsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <section className='mt-4 h-[118px] flex flex-col justify-between'>
      <Select placeholder="출입문을 선택하세요." options={options} onChange={handleChange} />
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
          disabled={!doorIdx}
          onClick={onAdd}
        >
          추가
        </Button>
      </div>
    </section>
  );
}