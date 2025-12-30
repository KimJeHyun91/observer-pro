import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import type { ZodType } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ModalNotifyType, ModalType } from '@/@types/modal'
import { ObGuardianliteType } from '@/@types/device'
import { useEffect, useState } from 'react'
import Modal from './ModalNotify'

type FormSchema = {
  name: string;
  ipaddress: string;
  ch1_label?: string;
  ch2_label?: string;
  ch3_label?: string;
  ch4_label?: string;
  ch5_label?: string;
}

const validationSchema: ZodType<FormSchema> = z.object({
  name: z
    .string()
    .min(1, { message: '가디언라이트의 이름을 입력하세요.(1~20자)' })
    .max(20, { message: '가디언라이트의 이름을 20자 이하로 입력하세요.' }),
  ipaddress: z
    .string()
    .ip({ message: '입력하신 IP 형식이 올바르지 않습니다.' }),
  ch1_label: z
    .string()
    .max(20, { message: '가디언라이트 채널1의 이름을 20자 이하로 입력하세요.' })
    .optional(),
  ch2_label: z
    .string()
    .max(20, { message: '가디언라이트 채널2의 이름을 20자 이하로 입력하세요.' })
    .optional(),
  ch3_label: z
    .string()
    .max(20, { message: '가디언라이트 채널3의 이름을 20자 이하로 입력하세요.' })
    .optional(),
  ch4_label: z
    .string()
    .max(20, { message: '가디언라이트 채널4의 이름을 20자 이하로 입력하세요.' })
    .optional(),
  ch5_label: z
    .string()
    .max(20, { message: '가디언라이트 채널5의 이름을 20자 이하로 입력하세요.' })
    .optional()
})

type Props = {
  toggleModal: ({ show, type, title }: ModalType) => void;
  add?: ({ name, ipaddress, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    { name: string, ipaddress: string, ch1_label?: string, ch2_label?: string, ch3_label?: string, ch4_label?: string, ch5_label?: string }) => void;
  modify?: ({ guardianlite_ip, name, ipaddress, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    { guardianlite_ip: string, name: string, ipaddress: string, ch1_label?: string, ch2_label?: string, ch3_label?: string, ch4_label?: string, ch5_label?: string }) => void;
  guardianlite?: ObGuardianliteType
}

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

export default function AddModifyGuardianlite({ toggleModal, add, modify, guardianlite }: Props) {

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
      ipaddress: '',
      ch1_label: '',
      ch2_label: '',
      ch3_label: '',
      ch4_label: '',
      ch5_label: '',
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
    ipaddress,
    ch1_label: new_ch1_label,
    ch2_label: new_ch2_label,
    ch3_label: new_ch3_label,
    ch4_label: new_ch4_label,
    ch5_label: new_ch5_label
  }: FormSchema) => {
    if (guardianlite == null) {
      return;
    }
    const { guardianlite_ip, guardianlite_name, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label } = guardianlite;
    if ((ipaddress === guardianlite_ip) &&
      (name === guardianlite_name) &&
      (new_ch1_label === ch1_label) &&
      (new_ch2_label === ch2_label) &&
      (new_ch3_label === ch3_label) &&
      (new_ch4_label === ch4_label) &&
      (new_ch5_label === ch5_label)) {
      setResMessage('수정사항이 없습니다.');
      toggleNotify({
        show: true,
        title: '가디언라이트 수정'
      })
      return true
    }
  }


  const onSubmit = (values: FormSchema) => {
    if (add) {
      add(values)
    } else if (modify && guardianlite) {
      const isSame = unchangeCheck(getValues());
      if (isSame) {
        return;
      }
      modify({ guardianlite_ip: guardianlite.guardianlite_ip, ...values });
      reset();
    }
    onCancel();
  }

  useEffect(() => {
    if (guardianlite) {
      const { guardianlite_ip, guardianlite_name, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label } = guardianlite;
      setValue("ipaddress", guardianlite_ip)
      setValue("name", guardianlite_name)
      setValue("ch1_label", ch1_label ?? '')
      setValue("ch2_label", ch2_label ?? '')
      setValue("ch3_label", ch3_label ?? '')
      setValue("ch4_label", ch4_label ?? '')
      setValue("ch5_label", ch5_label ?? '')
    }
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
          className="mb-3"
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
          className="mb-3"
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
          label="채널1 이름"
          invalid={Boolean(errors.ch1_label)}
          errorMessage={errors.ch1_label?.message}
          className="mb-3"
        >
          <Controller
            name="ch1_label"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="채널1 이름을 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="채널2 이름"
          invalid={Boolean(errors.ch2_label)}
          errorMessage={errors.ch2_label?.message}
          className="mb-3"
        >
          <Controller
            name="ch2_label"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="채널2 이름을 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="채널3 이름"
          invalid={Boolean(errors.ch3_label)}
          errorMessage={errors.ch3_label?.message}
          className="mb-3"
        >
          <Controller
            name="ch3_label"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="채널3 이름을 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="채널4 이름"
          invalid={Boolean(errors.ch4_label)}
          errorMessage={errors.ch4_label?.message}
          className="mb-3"
        >
          <Controller
            name="ch4_label"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="채널4 이름을 입력하세요."
                {...field}
              />
            )}
          />
        </FormItem>
        <FormItem
          label="채널5 이름"
          invalid={Boolean(errors.ch5_label)}
          errorMessage={errors.ch5_label?.message}
          className="mb-3"
        >
          <Controller
            name="ch5_label"
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                autoComplete="off"
                placeholder="채널5 이름을 입력하세요."
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
      <Modal
        modal={modal}
        toggle={toggleNotify}
      >
        <p>{resMessage}</p>
      </Modal>
    </>
  );
}