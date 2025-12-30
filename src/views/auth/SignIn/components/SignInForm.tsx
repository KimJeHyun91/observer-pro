import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import PasswordInput from '@/components/shared/PasswordInput'
import classNames from '@/utils/classNames'
import { useAuth } from '@/auth'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'
import type { CommonProps } from '@/@types/common'
import type { ReactNode } from 'react'

interface SignInFormProps extends CommonProps {
    disableSubmit?: boolean
    passwordHint?: string | ReactNode
    setMessage?: (message: string) => void
}

type SignInFormSchema = {
    id: string
    password: string
}

const validationSchema: ZodType<SignInFormSchema> = z.object({
    id: z
        .string({ required_error: 'Please enter your ID' })
        .min(1, { message: 'Please enter your ID' }),
    password: z
        .string({ required_error: 'Please enter your password' })
        .min(1, { message: 'Please enter your password' }),
})

const SignInForm = (props: SignInFormProps) => {
    const [isSubmitting, setSubmitting] = useState<boolean>(false)

    const { disableSubmit = false, className, setMessage, passwordHint } = props

    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<SignInFormSchema>({
        defaultValues: {
            id: 'admin00',
            password: '123Qwe',
        },
        resolver: zodResolver(validationSchema),
    })

    const { signIn } = useAuth()

    const onSignIn = async (values: SignInFormSchema) => {
        const { id, password } = values

        if (!disableSubmit) {
            setSubmitting(true)
            const result = await signIn({ id, password, hostname: window.location.hostname })
            if (result?.status === 'failed') {
                setMessage?.(result.message)
            }
        }

        setSubmitting(false)
    }

    return (
        <div className={className}>
            <Form onSubmit={handleSubmit(onSignIn)}>
                <FormItem
                    label="ID"
                    invalid={Boolean(errors.id)}
                    errorMessage={errors.id?.message}
                >
                    <Controller
                        name="id"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="id"
                                placeholder="ID"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Password"
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password?.message}
                    className={classNames(
                        passwordHint && 'mb-0',
                        errors.password?.message && 'mb-8',
                    )}
                >
                    <Controller
                        name="password"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <PasswordInput
                                type="text"
                                placeholder="Password"
                                autoComplete="off"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                {/* {passwordHint} */}
                &nbsp;
                <Button
                    block
                    loading={isSubmitting}
                    variant="solid"
                    type="submit"
                >
                    {isSubmitting ? '로그인 중...' : '로그인'}
                </Button>
            </Form>
        </div>
    )
}

export default SignInForm
