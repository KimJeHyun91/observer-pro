import React, { useState } from 'react'
import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import { AlertDialog } from '@/components/shared/AlertDialog'
import { Button, Select } from '@/components/ui'  
import InundationCameraList from './InundationCameraList'
import { apiCreateCamera, apiUpdateCamera } from '@/services/ObserverService'
import { useIndependentCameras } from '@/utils/hooks/useCameras'

export type Camera = {
    idx: number
    camera_ip: string
    camera_name: string
    access_point: string
}

export type profileTokenOption = {
    value: string
    label: string
}

interface FormValues {
    ipAddress: string
    name: string
    id: string
    pw: string
    profileToken: profileTokenOption  
}

type ApiResult = 'Created' | 'OK' | 'No Content'

const DEFAULT_PROFILE_OPTION: profileTokenOption = { value: '', label: '선택 안 함' }

const InundationCameraSetting = () => {
    const { isLoading, error, cameras = [], mutate } = useIndependentCameras('inundation')

    const [vmsMessage, setVmsMessage] = useState('')
    const [isAlertMsgOpen, setIsAlertMsgOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedRows, setSelectedRows] = useState<Camera[]>([])
    const [profileTokens, setProfileTokens] = useState<profileTokenOption[]>([])  

    const {
        control,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            ipAddress: '',
            name: '',
            id: '',
            pw: '',
            profileToken: DEFAULT_PROFILE_OPTION,
        },
    })

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            const safeProfileTokens = profileTokens
                .filter((opt) => opt.value)
                .map((opt) => `${opt.value}:${opt.label}`)
                .join(',')

            const selectedToken = data.profileToken?.value || ''

            if (isEditMode) {
                const target = selectedRows[0]
                await apiUpdateCamera<ApiResult>({
                    idx: target.idx,
                    ipAddress: data.ipAddress,
                    name: data.name,
                    id: data.id,
                    pw: data.pw,
                    profileTokens: safeProfileTokens,
                    profileToken: selectedToken,
                    mainServiceName: 'inundation',
                })

                setVmsMessage('개별 카메라 수정을 성공하였습니다.')
                setIsAlertMsgOpen(true)

                await mutate()
                resetForm()
            } else {
                await apiCreateCamera<ApiResult>({
                    ipAddress: data.ipAddress,
                    name: data.name,
                    id: data.id,
                    pw: data.pw,
                    mainServiceName: 'inundation',
                })

                setVmsMessage('개별 카메라 등록을 성공하였습니다.')
                setIsAlertMsgOpen(true)

                await mutate()
                resetForm()
            }
        } catch (err) {
            console.error('Camera save error:', err)
            setVmsMessage(
                isEditMode
                    ? '개별 카메라 수정에 실패하였습니다.'
                    : '개별 카메라 등록에 실패하였습니다.'
            )
            setIsAlertMsgOpen(true)
        }
    }

    const resetForm = () => {
        setIsEditMode(false)
        setSelectedRows([])
        reset({
            ipAddress: '',
            name: '',
            id: '',
            pw: '',
            profileToken: DEFAULT_PROFILE_OPTION,
        })
        setProfileTokens([])
    }

    const handleEdit = (rows: Camera[]) => {
        const item = rows[0]
        const parts = (item.access_point || '').split('\n')

        const id = parts[0] || ''
        const pw = parts[1] || ''

        // token:label 형식 파싱해서 옵션 배열 생성
        const options: profileTokenOption[] = parts[2]
            ? parts[2].split(',').map((tokenAndName) => {
                const [token, name] = tokenAndName.split(':')
                return { value: token?.trim() || '', label: name?.trim() || token?.trim() || '' }
            }).filter((opt) => opt.value)
            : []

        const selectedTokenValue = (parts[3] || '').trim()

        const selectedOption = options.find((opt) => opt.value === selectedTokenValue)
            || DEFAULT_PROFILE_OPTION

        setValue('ipAddress', item.camera_ip)
        setValue('name', item.camera_name)
        setValue('id', id)
        setValue('pw', pw)
        setValue('profileToken', selectedOption)  
        setProfileTokens(options)
        setIsEditMode(true)
    }

    return (
        <div className="flex h-full overflow-auto">
            <div className="flex-1 ml-6 overflow-auto">
                <AlertDialog
                    isOpen={isAlertMsgOpen}
                    message={vmsMessage}
                    onClose={() => setIsAlertMsgOpen(false)}
                />

                <div className="bg-white dark:bg-gray-800 rounded-lg h-full overflow-auto">
                    <h3 className="text-lg mb-2">개별 카메라 추가</h3>
                    <div className="border rounded-lg p-3">
                        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
                            <div className="grid grid-cols-[100px,1fr] items-center">
                                <label>IP address</label>
                                <Controller
                                    name="ipAddress"
                                    control={control}
                                    rules={{ required: 'IP 주소를 입력하세요.' }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            className="w-full p-2 border rounded bg-gray-50"
                                            placeholder="IP 주소를 입력하세요."
                                        />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-[100px,1fr] items-center">
                                <label>Name</label>
                                <Controller
                                    name="name"
                                    control={control}
                                    rules={{ required: '카메라명을 입력하세요.' }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            className="w-full p-2 border rounded bg-gray-50"
                                            placeholder="카메라명을 입력하세요."
                                        />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-[100px,1fr] items-center">
                                <label>ID</label>
                                <Controller
                                    name="id"
                                    control={control}
                                    rules={{ required: 'ID를 입력하세요.' }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="text"
                                            className="w-full p-2 border rounded bg-gray-50"
                                            placeholder="ID를 입력하세요."
                                        />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-[100px,1fr] items-center">
                                <label>Password</label>
                                <Controller
                                    name="pw"
                                    control={control}
                                    rules={{ required: '비밀번호를 입력하세요.' }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            type="password"
                                            className="w-full p-2 border rounded bg-gray-50"
                                            placeholder="비밀번호를 입력하세요."
                                        />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-[100px,1fr] items-center">
                                <label>Profile</label>
                                <Controller
                                    name="profileToken"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            className="w-[200px]"
                                            size="sm"
                                            options={[DEFAULT_PROFILE_OPTION, ...profileTokens]}
                                            placeholder="영상 프로파일을 선택하세요."
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex justify-end mt-6">
                                {isEditMode && (
                                    <Button
                                        className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
                                        size="sm"
                                        type="button"
                                        onClick={resetForm}
                                    >
                                        취소
                                    </Button>
                                )}
                                <Button
                                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                                    size="sm"
                                    variant="solid"
                                    type="submit"
                                >
                                    {isEditMode ? '수정' : '저장'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="mb-3 mt-4">
                        <InundationCameraList
                            cameras={cameras}
                            mutate={mutate}
                            handleEdit={handleEdit}
                            setIsEditMode={setIsEditMode}
                            selectedRows={selectedRows}
                            setSelectedRows={setSelectedRows}
                            setMessage={setVmsMessage}
                            setIsAlertOpen={setIsAlertMsgOpen}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default InundationCameraSetting