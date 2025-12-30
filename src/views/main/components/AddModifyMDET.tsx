import { useEffect, useState } from 'react'
import type { ZodType } from 'zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ModalNotifyType, ModalType } from '@/@types/modal'
import { ObDeviceType } from '@/@types/device'
import ModalNotify from '../modals/ModalNotify'

type FormSchema = {
  name: string;
  ipaddress: string;
  location?: string;
}

const validationSchema: ZodType<FormSchema> = z.object({
  name: z
    .string()
    .min(1, { message: 'M-DET의 이름을 입력하세요.(1~20자)' })
    .max(20, { message: 'M-DET의 이름을 20자 이하로 입력하세요.' }),
  ipaddress: z
    .string()
    .ip({ message: '입력하신 IP 형식이 올바르지 않습니다.' }),
  location: z
    .string()
    .max(20, { message: 'M-DET의 위치정보를 20자 이하로 입력하세요.' })
    .optional(),
})

type Props = {
  toggleModal: ({ show, type, title }: ModalType) => void;
  add?: ({ name, ipaddress }:
    { name: string, ipaddress: string }) => void;
  modify?: ({ idx, name, ipaddress }:
    { idx: number, name: string, ipaddress: string }) => void;
  mdet?: ObDeviceType
}

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

export default function AddModifyMDET({ toggleModal, add, modify, mdet }: Props) {

  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
    setValue,
    getValues
  } = useForm<FormSchema>({
    defaultValues: {
      name: '',
      ipaddress: ''
    },
    resolver: zodResolver(validationSchema),
  })

  const [modal, setModal] = useState<ModalNotifyType>({
    show: false,
    title: '가디언라이트 수정'
  });
  const [resMessage, setResMessage] = useState('');

  const onCancel = () => {
    toggleModal({
      show: false,
      type: '',
      title: ''
    })
  };

  const toggleNotify = ({ show, title }: ModalNotifyType) => {
    setModal({
      show,
      title
    })
  }

  const unchangeCheck = ({
    name,
    ipaddress
  }: FormSchema) => {
    if (mdet == null) {
      return;
    }
    const { device_name, device_ip } = mdet;
    if ((ipaddress === device_ip) &&
      (name === device_name)) {
      setResMessage('수정사항이 없습니다.');
      toggleNotify({
        show: true,
        title: 'M-DET 수정'
      })
      return true
    }
  }


  const onSubmit = (values: FormSchema) => {
    if (add) {
      add(values)
    } else if (modify && mdet) {
      const isSame = unchangeCheck(getValues());
      if (isSame) {
        return;
      }
      modify({ idx: mdet.idx, ...values });
      reset();
    }
    onCancel();
  }

  useEffect(() => {
    if (mdet) {
      const { device_name, device_ip } = mdet;
      setValue("ipaddress", device_ip);
      setValue("name", device_name);
    };
  }, [])

  return (
    <>
      <Form
        className='max-h-full flex flex-col'
        containerClassName='h-full flex flex-col justify-between'
        onSubmit={handleSubmit(onSubmit)}
      >
        <FormItem
          label="이름(필수)"
          invalid={Boolean(errors.name)}
          errorMessage={errors.name?.message}
          className="mb-3.5"
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="이름을 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="IP 주소(필수)"
          invalid={Boolean(errors.ipaddress)}
          errorMessage={errors.ipaddress?.message}
          className="mb-3.5"
        >
          <Controller
            name="ipaddress"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="IP 주소를 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="위치 정보(선택)"
          invalid={Boolean(errors.location)}
          errorMessage={errors.location?.message}
          className="mb-3.5"
        >
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="위치정보를 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem className='mt-2 mb-0'>
          <div className='flex gap-4 w-full justify-end'>
            <Button
              variant="solid"
              type="reset"
              className={`bg-[#EDF0F6] text-[#696C72] ${buttonStyle}`}
              onClick={onCancel}
            >
              취소
            </Button>
            <Button
              variant="solid"
              type="submit"
              className={`bg-[#17A36F] ${buttonStyle}`}
            >
              {add ? '추가' : '수정'}
            </Button>
          </div>
        </FormItem>
      </Form>
      <ModalNotify
        modal={modal}
        toggle={toggleNotify}
      >
        <p>{resMessage}</p>
      </ModalNotify>
    </>
  );
}