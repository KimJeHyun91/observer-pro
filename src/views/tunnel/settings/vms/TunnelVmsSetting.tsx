import React, { useState } from 'react'
import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import TunnelVmsList from './TunnelVmsList'
import { Input } from '@/components/ui'
import { useObVms } from '@/utils/hooks/useObVms'
import { apiAddObVms, apiModifyObVms } from '@/services/ObserverService'
import { ApiResultStatus } from '@/@types/api'
import { AlertDialog } from '@/components/shared/AlertDialog'
import { AxiosError } from 'axios'

interface FormValues {
    vms_ip: string
    vms_port: string
    vms_id: string
    vms_pw: string
}

type ApiResultStatusWrapper = {
    message: string;
    result: ApiResultStatus;
}

type VmsLists =  {
    idx: number
    vms_id: string
    vms_pw: string
    vms_ip: string
    vms_port: string
    vms_name: string
    main_service_name: string
}



const TunnelVmsSetting = () => {
    const { isLoading, error, data, mutate } = useObVms('tunnel');
    const [vmsMessage, setVmsMessage] = useState('')
    const [isAlertMsgOpen, setIsAlertMsgOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
      const [selectedRows, setSelectedRows] = useState<Array<VmsLists>>([])
    const {
        register,
        setValue,
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<FormValues>()

    const onSubmit: SubmitHandler<any> = async(data) => {
       try{
        if(isEditMode) {
            const res = await apiModifyObVms<ApiResultStatusWrapper>({
                    vms_id: data.vms_id,
                    vms_pw: data.vms_pw,
                    new_vms_ip: data.vms_ip,
                    new_vms_port: data.vms_port,
                    prev_vms_ip: selectedRows[0].vms_ip || '',
                    prev_vms_port: selectedRows[0].vms_port || '',
                    mainServiceName: 'tunnel'
                });
                setVmsMessage(res.result.message)
                setIsAlertMsgOpen(true)
                if(res.result.status){
                    mutate()
                    reset({
                        vms_id: '',
                        vms_pw: '',
                        vms_ip: '',
                        vms_port: '',
                    })
                }
               
        }else{
            const res = await apiAddObVms<ApiResultStatusWrapper>({
                vms_id: data.vms_id,
                vms_pw: data.vms_pw,
                vms_ip: data.vms_ip,
                vms_port: data.vms_port,
                mainServiceName: 'tunnel',
            }); 
            setVmsMessage(res.message)
            setIsAlertMsgOpen(true)
            mutate()
            reset({
                vms_id: '',
                vms_pw: '',
                vms_ip: '',
                vms_port: '',
            });
        }
       
       }catch(err){
        if (err instanceof AxiosError) {
            if (err.response) {
              setVmsMessage(err.response.data.message);
            
            } else {
              console.error(err.message);
            }
          } else {
            console.error('Unknown error:', err);
          }
          setIsAlertMsgOpen(true);
       }
          
    }

    const handleEdit = (item:FormValues[]) => {
        setValue('vms_ip', item[0].vms_ip)
        setValue('vms_port', item[0].vms_port)
        setValue('vms_id', item[0].vms_id)
        setValue('vms_pw', item[0].vms_pw)
    }

    

    return (
        <>
            <h5 className="font-semibold mb-2">VMS 추가</h5>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5 p-7 border border-gray-200 rounded-sm"
            >
                <div className="relative flex items-center">
                    <label
                        htmlFor="ipAddress"
                        className="min-w-[90px] mb-1 font-medium"
                    >
                        IP Address
                    </label>

                   

                    <Controller
                        name="vms_ip"
                        control={control}
                        // defaultValue={item.vms_ip}
                        render={({ field }) => (
                            <input
                                {...field}
                               className="w-full border rounded px-3 py-2"
                               placeholder='IP 주소를 입력하세요.'
                            />
                        )}
                    />

                    {/* {errors.vms_ip && (
                        <p className="absolute top-10 left-[100px] text-red-500 text-sm">
                            {errors.vms_ip.message}
                        </p>
                    )} */}
                </div>

                <div className="relative flex items-center">
                    <label
                        htmlFor="port"
                        className="min-w-[90px] mb-1 font-medium"
                    >
                        Port
                    </label>

                    <Controller
                        name="vms_port"
                        control={control}
                        // defaultValue={item.vms_ip}
                        render={({ field }) => (
                            <input
                                {...field}
                               className="w-full border rounded px-3 py-2"
                               placeholder="포트 번호를 입력하세요."
                            />
                        )}
                    />
                    {/* {errors.port && (
                        <p className=" absolute top-10 left-[100px] text-red-500 text-sm">
                            {errors.port.message}
                        </p>
                    )} */}
                </div>

                <div className="relative flex items-center">
                    <label
                        htmlFor="id"
                        className="min-w-[90px] mb-1 font-medium"
                    >
                        ID
                    </label>
                    <Controller
                        name="vms_id"
                        control={control}
                        // defaultValue={item.vms_ip}
                        render={({ field }) => (
                            <input
                                {...field}
                               className="w-full border rounded px-3 py-2"
                               placeholder="ID를 입력하세요."
                            />
                        )}
                    />
                   
                    {/* {errors.id && (
                        <p className="absolute top-10 left-[100px] text-red-500 text-sm">
                            {errors.id.message}
                        </p>
                    )} */}
                </div>

                <div className="relative flex items-center">
                    <label
                        htmlFor="password"
                        className="min-w-[90px] mb-1 font-medium"
                    >
                        Password
                    </label>
                    <Controller
                        name="vms_pw"
                        control={control}
                        // defaultValue={item.vms_ip}
                        render={({ field }) => (
                            <input
                                {...field}
                               className="w-full border rounded px-3 py-2"
                                placeholder="비밀번호를 입력하세요."
                            />
                        )}
                    />
                   
                    {/* {errors.password && (
                        <p className="absolute top-10 left-[100px] text-red-500 text-sm">
                            {errors.password.message}
                        </p>
                    )} */}
                </div>
                <div className="flex justify-end gap-2">
                   {isEditMode && <button
                         type="button"
                        className=" w-[100px] h-[34px] mt-2 bg-[#edf0f6] text-black px-4 py-2 rounded hover:bg-[#80d8b8]"
                        onClick={()=>{
                            // setEditBtn(false)
                            setIsEditMode(false)
                            reset({ vms_ip: '',
                                    vms_port: '',
                                    vms_id: '',
                                    vms_pw: ''})
                        }}
                    >
                        취소
                    </button>}
                    <button
                        type="submit"
                        className=" w-[100px] h-[34px] mt-2 bg-[#17A36F] text-white px-4 py-2 rounded hover:bg-[#80d8b8]"
                    >
                        {isEditMode ? '수정 완료' : '저장'}
                    </button>
                </div>
            </form>
            <TunnelVmsList handleEdit={handleEdit} setIsEditMode={setIsEditMode} selectedRows={selectedRows} setSelectedRows={setSelectedRows} />
            <AlertDialog
                isOpen={isAlertMsgOpen}
                message={vmsMessage}
                onClose={() => setIsAlertMsgOpen(false)}
            />
        </>
    )
}

export default TunnelVmsSetting
