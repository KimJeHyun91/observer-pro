import { useForm } from 'react-hook-form';
import { Button, Input } from '@/components/ui';
import { apiAddWaterLevelControlIn } from '@/services/TunnelService'
import { useWaterLevelStore } from '@/store/tunnel/useWaterLevelStore'
import { useState } from 'react';
import Spinner from '@/components/ui/Spinner'

type FormValues = {
  name: string;
};

type Props = {
  onCancel: () => void;
  submitData: {
    outsideIdx: number;
    ip: string;
    location: string;
    topLocation: string;
    leftLocation: string;
    name?: string;
    communication?: string;
  }
};

export default function AddWaterLevelControlIn({ onCancel, submitData }: Props) {
  const { setAddWaterLevelControlIn } = useWaterLevelStore();
  const {
    handleSubmit,
    register,
    formState: { isValid },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
    },
    mode: 'onChange',
  });

  const [loading, setLoading] = useState(false)

  const onSubmit = (data: FormValues) => {
    submitData['name'] = data.name;
    submitData['communication'] = 'control_in';
    onConfirm();

  };

  const onConfirm = async () => {
    try {
      setLoading(true);
      const res = await apiAddWaterLevelControlIn(submitData)
      if (res.message === "ok") {
        setAddWaterLevelControlIn(true);
        onCancel();
      }
    } catch (e) {
      alert("차단막과 동일한 IP로 등록된 수위계가 존재합니다.");
      onCancel();
      console.log(e)

    }
    setLoading(false);

  }



  return (
    <>
      {loading && (
        <div className="absolute w-[100vw] h-[100vh] border-gray-200 dark:border-gray-500 left-0 top-0">
          <Spinner size={50}  className='absolute left-[14%] top-[37%]'/>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-h-[110px] px-4 z-40">
        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

        <div className="pt-5 space-y-5 mt-6">
          <div className="flex items-center gap-4">
            <label className="w-[110px] text-right font-bold text-black dark:text-white flex items-center h-[38px]">
              수위계 이름
            </label>
            <Input
              className="flex-1 h-[38px]"
              type="text"
              {...register('name', { required: true })}
            />
          </div>
        </div>

        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button className="w-[100px] h-[36px] bg-[#D9DCE3] rounded" onClick={onCancel}>
            취소
          </Button>
          <Button
            type="submit"
            className="w-[100px] h-[36px] bg-[#17A36F] rounded"
            variant="solid"
            disabled={!isValid}
          >
            추가
          </Button>
        </div>
      </form>
    </>
  );
}