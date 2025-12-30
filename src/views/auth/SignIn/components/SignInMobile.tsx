import { useState, useEffect } from 'react'
import Logo from '@/components/template/Logo'
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/auth'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

type FormData = {
  id: string
  password: string
}

const SignInMobile = () => {
  const { signIn } = useAuth()
  const [message, setMessage] = useTimeOutMessage()
  const [isSubmitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      id: 'admin00',
      password: ''
    }
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    return () => window.removeEventListener('resize', setVH)
  }, [])

  const onSignIn = async (values: FormData) => {
    const { id, password } = values

    setSubmitting(true)
    const result = await signIn({ id, password, hostname: window.location.hostname })
    if (result?.status === 'failed') {
        setMessage?.(result.message)
    }
    
    setSubmitting(false)
}

  return (
    <div className="min-h-[calc(var(--vh)_*_100)] flex flex-col justify-center px-11 py-6 bg-white dark:bg-black">
        <div className="flex justify-left mb-3">
            <Logo type="streamline" logoWidth={50} imgClass="mx-auto" />
        </div>

        <div className="mb-7">
            <h2 className="">Welcome back!</h2>
            <p className="font-semibold heading-text">
                Please enter your credentials to sign in!
            </p>
        </div>

        {message && (
            <p className="text-red-500 text-s text-left mb-7">{message}</p>
        )}

        <form className="flex flex-col gap-4 w-full max-w-md mx-auto" onSubmit={handleSubmit(onSignIn)}>
            <div className='mb-2'>
                <input
                    {...register('id', { required: '아이디를 입력해주세요.' })}
                    placeholder="ID"
                    className="w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring focus:ring-blue-200 text-base bg-[#f5f5f5]"
                    autoComplete="off"
                />
                {errors.id && <p className="text-red-500 text-xs mt-1">{errors.id.message}</p>}
            </div>

            <div className="relative mb-2">
                <input
                    {...register('password', { required: '비밀번호를 입력해주세요.' })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className="w-full h-11 px-4 pr-12 rounded-xl border focus:outline-none focus:ring focus:ring-blue-200 text-base bg-[#f5f5f5]"
                    autoComplete="off"
                />
                <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center justify-center text-gray-500 h-full"
                    tabIndex={-1}
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? (
                        <AiOutlineEye className='w-5 h-5'/>
                    ) : (
                        <AiOutlineEyeInvisible className='w-5 h-5'/>
                    )}
                </button>
                {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 rounded-xl bg-blue-500 text-white font-semibold text-base hover:bg-blue-600 disabled:opacity-50"
            >
                {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
        </form>
    </div>
  )
}

export default SignInMobile
