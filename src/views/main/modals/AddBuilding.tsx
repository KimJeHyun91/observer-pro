import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import type { ZodType } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ModalType } from '@/@types/modal'

type FormSchema = {
  name: string
}

const validationSchema: ZodType<FormSchema> = z.object({
  name: z
    .string()
    .min(1, { message: '건물 이름을 입력하세요.(1~20자)' })
    .max(20, { message: '건물 이름을 20자 이하로 입력하세요.' })

})

type Props = {
  toggleModal: ({ show, type, title }: ModalType) => void
  add: (name: string) => void;
}

const buttonStyle = 'w-[120px] h-[34px] rounded-sm border-[#BEC8BA] border-[1px] border-solid flex justify-center items-center';

export default function AddBuilding({ toggleModal, add }: Props) {

  const {
    handleSubmit,
    setError,
    formState: { errors },
    control,
  } = useForm<FormSchema>({
    defaultValues: {
      name: ''
    },
    resolver: zodResolver(validationSchema),
  })

  const onCancel = () => {
    toggleModal({
      show: false,
      type: '',
      title: ''
    })
  }

  const onSubmit = (values: FormSchema) => {
    if (values.name && !values.name.trim()) {
      setError("name", {
        message: '건물 이름이 올바르지 않습니다.'
      })
      return;
    };
    add(values.name.trim())
    onCancel();
  }

  return (
    <Form
      className='max-h-[39.8vh] flex flex-col'
      containerClassName='h-full flex flex-col justify-between'
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormItem
        label="이름"
        invalid={Boolean(errors.name)}
        errorMessage={errors.name?.message}
      >
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              type="text"
              autoComplete="off"
              placeholder="이름"
              {...field}
            />
          )}
        />
      </FormItem>
      <FormItem className='m-0'>
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
            추가
          </Button>
        </div>
      </FormItem>
    </Form>
  );
}