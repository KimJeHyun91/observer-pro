import { Button, Select } from '@/components/ui';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
// eslint-disable-next-line import/named
import { SingleValue } from 'react-select';
import { usePIDS } from '@/utils/hooks/main/usePIDS';
import { PIDS } from '@/@types/pids';

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

type Props = {
  onCancel: () => void;
  add: (idx: number, label: string) => Promise<{
    success: boolean;
  } | undefined>;
}

type PIDSOption = {
  label: string;
  value: string;
};

export default function AddPIDS({ onCancel, add }: Props) {
  const { socketService } = useSocketConnection();
  const [PIDSIdx, setPIDSIdx] = useState<number | null>(null);
  const [PIDSLabel, setPIDSLabel] = useState<string>('');
  const { pidsList, error, mutate } = usePIDS();
  if (error) {
    console.error('get pids list error: ', error);
  }

  const options: PIDSOption[] = pidsList && pidsList.filter((pids: PIDS) => (!pids.line_x1 && !pids.line_x2 && !pids.line_y1 && !pids.line_y2)).map((pids: PIDS) => ({ value: `${pids.idx}:${pids.pids_id}`, label: `${pids.pids_id}(${pids.pids_ip})` }));

  const handleChange = (e: SingleValue<PIDSOption>) => {
    if (!e) {
      return;
    }
    setPIDSIdx(parseInt(e.value.split(':')[0]));
    setPIDSLabel(e.value.split(':')[1])
  }


  const onAdd = () => {
    if (PIDSIdx == null) {
      return;
    }
    onCancel();
    return add(PIDSIdx, PIDSLabel);
  }

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const PIDSSocket = socketService.subscribe('ob_pids-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      PIDSSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <section className='mt-4 h-[118px] flex flex-col justify-between'>
      <Select placeholder="PIDS를 선택하세요." options={options} onChange={handleChange} />
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
          disabled={!PIDSIdx}
          onClick={onAdd}
        >
          추가
        </Button>
      </div>
    </section>
  );
}