import React, { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { Input } from '@/components/ui'
import { useForm, Controller } from 'react-hook-form'
import { useCameras } from '@/utils/hooks/useCameras'
import { CameraType } from '@/@types/camera'
import TreeSelect from '@/components/common/camera/TreeSelect'
import { SingleValue } from 'react-select'

type AddBroadcastProps = {
    show: boolean
    broadcastMenuOpen: boolean
    onModalClose: () => void
    onConfirm: (device: { value: string; label: string } | null) => void
}

type CameraOption = {
    label: string;
    value: string;
  };

const AddBroadcast = ({
    show,
    // children,
    onModalClose,
    onConfirm,
}: AddBroadcastProps) => {
    const [selectedDevice, setSelectedDevice] = useState<{
        value: string
        label: string
    } | null>(null)
    const [camera, setCamera] = useState('');
    const [selectedCameraData, setSelectedCameraData] = useState<any>()

    const { cameras, error, isLoading, mutate } = useCameras('broadcast');

    const { handleSubmit, control, reset , setValue} = useForm({
        defaultValues: {
            name: '',
            location: '',
            camera: '',
            guardianLight: '',
            speaker: '',
        },
    })

    useEffect(()=>{
        mutate()
    },[])

    const onSubmit = (data: any) => {
        onConfirm(data, selectedCameraData)
        reset()
    }

    const handleChangeCurrentCamera = async (option: SingleValue<CameraOption>) => {
        if (option) {
            setCamera(option.value);
            setValue('camera', option.value)
        }
    }

    return (
        <Dialog
            className="relative h-[470px]"
            isOpen={show}
            contentClassName="pb-0 px-0"
            onClose={onModalClose}
            // onRequestClose={onDialogClose}
        >
            <div className="px-4">
                <h5 className="mb-4">개소 추가</h5>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="absolute left-0 right-0 border-t-2 px-6 py-10"
                >
                    <div className="flex items-center mb-5">
                        <p className="min-w-[100px] text-gray-500 font-bold">
                            개소 명 설정
                        </p>
                         <Controller
                            name="name"
                            control={control}
                            rules={{ required: '개소 명을 입력하세요.' }}
                            render={({ field, fieldState: { error } }) => ( 
                                  <div className="w-full"> 
                                     <Input
                                        {...field}
                                        className={`${error && 'border-red-500'}`}
                                        placeholder="개소 명을 입력하세요."
                                        size="sm"
                                    />
                                    {error && (
                                        <p className="text-red-500 text-xs">
                                            {error.message}
                                        </p>
                                    )}
                                </div>
                              )} 
                         /> 
                     </div>

                    {/* <div className="flex items-center mb-5">
                        <p className="min-w-[100px] text-gray-500 font-bold">
                            개소 위치
                        </p>
                        <Controller
                            name="location"
                            control={control}
                            rules={{ required: '개소 위치를 입력하세요.' }}
                            render={({ field, fieldState: { error } }) => (
                                <div className="w-full">
                                    <Input
                                        {...field}
                                        className={`${error && 'border-red-500'}`}
                                        placeholder="개소 위치를 입력하세요."
                                        size="sm"
                                    />
                                
                                </div>
                            )}
                        />
                    </div> */}

                    <div className="flex items-center mb-5">
                        <p className="min-w-[100px] text-gray-500 font-bold">
                            카메라
                        </p>
                        <Controller
                            name="camera"
                            control={control}
                            // rules={{ required: '카메라를 선택하세요.' }}
                            render={({ field, fieldState: { error } }) => (
                                <div className="w-full">
                                     <TreeSelect
                                        {...field}
                                        cameraList={cameras?.filter((camera: CameraType) => !camera.left_location && !camera.top_location).sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id)))}
                                        handleChangeCurrentCamera={handleChangeCurrentCamera}
                                        isServiceType={'broadcast'}
                                        setSelectedCameraData={setSelectedCameraData}
                                        />
                                </div>
                            )}
                        />
                    </div>

                    <div className="flex items-center mb-5">
                        <p className="min-w-[100px] text-gray-500 font-bold">
                            가디언라이트
                        </p>
                        <Controller
                            name="guardianLight"
                            control={control}
                            // rules={{ required: '가디언라이트를 입력하세요.' }}
                            render={({ field, fieldState: { error } }) => (
                                <Input
                                    {...field}
                                    className={`${error && 'border-red-500'}`}
                                    placeholder="가디언라이트를 입력하세요."
                                    size="sm"
                                />
                            )}
                        />
                    </div>

                    <div className="flex items-center mb-5">
                        <p className="min-w-[100px] text-gray-500 font-bold">
                            스피커
                        </p>
                        <Controller
                            name="speaker"
                            control={control}
                            // rules={{ required: '스피커 IP를 입력하세요.' }}
                            render={({ field, fieldState: { error } }) => (
                                <Input
                                    {...field}
                                    className={`${error && 'border-red-500'}`}
                                    placeholder="스피커 IP를 입력하세요."
                                    size="sm"
                                />
                            )}
                        />
                    </div>

                    <div className="absolute border-t-2 w-[100%] left-0 flex justify-end mt-[30px] pt-5 pr-4">
                        <Button
                            className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded-none"
                            size="sm"
                            onClick={() => {
                                onModalClose()
                                reset()
                            }}
                        >
                            취소
                        </Button>
                        <Button
                            className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded-none text-white"
                            size="sm"
                            type="submit"
                        >
                            저장
                        </Button>
                    </div>
                </form>
            </div>
        </Dialog>
    )
}
export default AddBroadcast
