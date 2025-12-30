import { useForm } from 'react-hook-form';
import { Button, Input } from '@/components/ui';

type Props = {
  onCancel: () => void;
  add: (gaugeData: {
    port: string;
    baudRate: string;
    slaveId: string;
    registerAddress: string;
    name: string;
  }) => void;
};

export default function AddWaterGauge({ onCancel, add }: Props) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      port: '',
      baudRate: '9600',
      slaveId: '',
      registerAddress: '',
      name: '',
    },
  });

  const onSubmit = (data: any) => {
    add(data);
  };

  const values = watch();
  const isFormValid = values.port && values.slaveId && values.registerAddress && values.name;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-h-[350px] px-4">
        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

        <div className="pt-5 space-y-5 mt-6">
          {[
            { label: '수위계 이름', name: 'name' },
            { label: '포트 경로', name: 'port', placeholder: '/dev/ttyUSB0 or COM3' },
            { label: '보드레이트', name: 'baudRate', type: 'number' },
            { label: '슬레이브 ID', name: 'slaveId', type: 'number' },
            { label: '레지스터 주소', name: 'registerAddress', type: 'number' },
          ].map(({ label, name, placeholder, type }) => (
            <div key={name} className="flex items-center gap-4">
              <label className="w-[110px] text-right font-bold text-black dark:text-white flex items-center h-[38px]">
                {label}
              </label>
              <Input
                className="flex-1 h-[38px]"
                type={type || 'text'}
                placeholder={placeholder}
                {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
              />
            </div>
          ))}
        </div>


        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

        <div className="flex justify-end space-x-2 pt-4">
            <Button className="w-[100px] h-[36px] bg-[#D9DCE3] rounded" onClick={onCancel}>취소</Button>
            <Button
              type="submit"
              className="w-[100px] h-[36px] bg-[#17A36F] rounded"
              variant="solid"
              disabled={!isFormValid}
            >
             추가
            </Button>
        </div>
    </form>

  );
}
