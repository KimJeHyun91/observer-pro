import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import type { ZodType } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ModalType } from '@/@types/modal'
import { Building } from '@/@types/building'

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
  modify: ({
    idx,
    outside_name,
    left_location,
    top_location,
    service_type
  }: {
    idx: number;
    outside_name: string;
    left_location: string;
    top_location: string;
    service_type: string;
  }) => void;
  building: Building
}

export default function ModifyBuilding({ toggleModal, modify, building: { idx, outside_name, left_location, top_location, service_type } }: Props) {
  const {
    handleSubmit,
    formState: { errors },
    control,
    setError
  } = useForm<FormSchema>({
    defaultValues: {
      name: ''
    },
    resolver: zodResolver(validationSchema),
  })

  const onSubmit = (values: FormSchema) => {
    if (outside_name === values.name) {
      setError('name', { type: 'manual', message: '건물 이름이 기존 이름과 동일합니다.' });
      return;
    }
    modify({
      idx,
      outside_name: values.name,
      left_location,
      top_location,
      service_type,
    })
    toggleModal({
      show: false,
      type: '',
      title: ''
    })
  }


  return (
    <Form
      className='h-[39.8vh] flex flex-col mt-10'
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
      <FormItem className='flex items-center justify-center mb-0'>
        <Button variant="solid" type="submit">
          수정
        </Button>
      </FormItem>
    </Form>
  );
}