import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ZodType } from 'zod'
import ModalNotify from '../../modals/ModalNotify'
import { useState } from 'react'
import { ModalNotifyType } from '@/@types/modal'
import { ApiResultStatus } from '@/@types/api'
import VmsList from '../VmsList'
import { apiAddObVms, apiModifyObVms } from '@/services/ObserverService'
import { useObVms } from '@/utils/hooks/useObVms'
import { VMS } from '@/@types/vms'
import { AxiosError } from 'axios'

type FormSchema = {
    vms_ip: string
    vms_port: string
    vms_id: string
    vms_pw: string
};

type ApiResultStatusWrapper = {
    message: string;
    result: ApiResultStatus;
}

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid text-center';
const formItemStyle = 'mb-3 h-11 flex items-center';

const validationSchema: ZodType<FormSchema> = z.object({
    vms_ip: z
        .string()
        .min(1, { message: 'VMS IP 주소를 입력해주세요.' })
        .ip({ message: 'VMS IP 형식이 올바르지 않습니다.' }),
    vms_port: z
        .string()
        .min(1, {
            message: '포트를 입력해주세요.'
        })
        .refine(
            (value) => /^[0-9]+$/.test(value),
            '포트를 0~65535의 숫자 형식으로 입력해주세요.',
        )
        .refine(
            (value) => /^(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/.test(value),
            '포트를 0~65535의 숫자 형식으로 입력해주세요.',
        ),
    vms_id: z
        .string()
        .min(1, 'VMS ID를 입력해주세요.')
        .max(20, 'VMS ID를 1자 이상 20자 이하로 입력해주세요.'),
    vms_pw: z
        .string()
        .min(1, { message: '비밀번호를 입력해주세요.' })
        .min(4, { message: '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.' })
        .refine(
            (value) => /^[A-Za-z\d@$#!%*?&]{4,30}$/.test(value),
            '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.',
        ),
});

const VmsSetting = () => {
    const [resMessage, setResMessage] = useState('');
    const [checkedVms, setCheckedVms] = useState<Array<VMS>>([]);
    const [modal, setModal] = useState<ModalNotifyType>({
        show: false,
        title: 'VMS 추가'
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [mode, setMode] = useState<'add' | 'modify'>('add');
    const { mutate } = useObVms('origin');
    const {
        handleSubmit,
        formState: { errors },
        control,
        reset,
        setValue,
        getValues
    } = useForm<FormSchema>({
        defaultValues: {
            vms_ip: '',
            vms_port: '',
            vms_id: '',
            vms_pw: '',
        },
        resolver: zodResolver(validationSchema),
    });

    const toggleModal = ({ show, title }: ModalNotifyType) => {
        setModal({
            show,
            title
        })
    }

    const vmsDetailToggleModal = ({ show, title }: ModalNotifyType, message: string) => {
        toggleModal({ show, title });
        setResMessage(message);
    }

    const isSameVmsModify = ({ vms_ip: newVmsIp, vms_port: newVmsPort, vms_id: newVmsId, vms_pw: newVmsPw }:
        { vms_ip: string, vms_port: string, vms_id: string, vms_pw: string }) => {
        const { vms_ip: prevVmsIp, vms_port: prevVmsPort, vms_id: prevVmsId, vms_pw: prevVmsPw } = checkedVms[0];
        console.log(newVmsIp, prevVmsIp, newVmsPort, prevVmsPort, newVmsId, prevVmsId, newVmsPw, prevVmsPw)
        if (newVmsIp === prevVmsIp && newVmsPort === prevVmsPort && newVmsId === prevVmsId && newVmsPw === prevVmsPw) {
            setResMessage('수정사항이 없습니다.');
            toggleModal({
                show: true,
                title: `VMS 수정`
            })
            return true
        }
    }


    const onSubmit = async (values: FormSchema) => {
        const { vms_ip, vms_port, vms_id, vms_pw } = values;
        setLoading(true);
        let res;
        try {
            if (mode === 'modify') {
                const isSameVms = isSameVmsModify(getValues());
                if (isSameVms) {
                    setLoading(false);
                    return;
                }
                res = await apiModifyObVms<ApiResultStatusWrapper>({
                    vms_id,
                    vms_pw,
                    prev_vms_ip: checkedVms[0].vms_ip,
                    prev_vms_port: checkedVms[0].vms_port,
                    new_vms_ip: vms_ip,
                    new_vms_port: vms_port,
                    mainServiceName: 'origin'
                })
            } else {
                res = await apiAddObVms<ApiResultStatusWrapper>({
                    vms_ip,
                    vms_port,
                    vms_id,
                    vms_pw,
                    mainServiceName: 'origin'
                })
            }
            if (res.result.status) {
                setLoading(false);
                setResMessage(res.result.message);
                mutate();
                reset();
            } else if (!res.result.status) {
                setLoading(false);
                setResMessage(res.result.message);
            }
        } catch (error) {
            if (error instanceof AxiosError) {
                setLoading(false);
                setResMessage(error.response?.data.message || `에러로 인해 VMS ${mode === 'add' ? '추가' : '수정'}에 실패했습니다.`);
            }
        }
        toggleModal({
            show: true,
            title: `VMS ${mode === 'add' ? '추가' : '수정'}`
        })
    };

    const setResetForm = () => {
        reset();
        setMode('add');
    };

    const setModifyVms = ({ vms_ip, vms_port, vms_id, vms_pw }: FormSchema) => {
        setMode('modify');
        setValue("vms_ip", vms_ip)
        setValue("vms_port", vms_port)
        setValue("vms_id", vms_id)
        setValue("vms_pw", vms_pw)
    }

    return (
        <>
            <h4 className='text-[1.2rem] mb-4'>VMS 설정</h4>
            <div className='flex flex-col justify-around'>
                <Form
                    className='w-[744px] h-[285px] border-[2px] border-[#D9DCE3] border-solid p-4'
                    onSubmit={handleSubmit(onSubmit)}
                >
                    <FormItem
                        label="IP 주소"
                        invalid={Boolean(errors.vms_ip)}
                        errorMessage={errors.vms_ip?.message}
                        className={formItemStyle}
                        labelClass='w-[12.58%]'
                        layout='horizontal'

                    >
                        <Controller
                            name="vms_ip"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="ipAddr"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="VMS IP주소"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="포트"
                        invalid={Boolean(errors.vms_port)}
                        errorMessage={errors.vms_port?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="vms_port"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="text"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="VMS Port"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="아이디"
                        invalid={Boolean(errors.vms_id)}
                        errorMessage={errors.vms_id?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="vms_id"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="id"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="VMS ID"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="비밀번호"
                        invalid={Boolean(errors.vms_pw)}
                        errorMessage={errors.vms_pw?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="vms_pw"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="password"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="Password"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        className='mb-0 text-center flex justify-end relative pb-4'
                        layout='horizontal'
                    >
                        {mode === 'add' ?
                            <Button
                                variant="default"
                                type="submit"
                                loading={loading}
                                className={`bg-[#17A36F] text-white ${buttonStyle} relative left-[80%]`}
                            >
                                저장
                            </Button>
                            :
                            <div className='flex relative left-[60.9%] gap-4'>
                                <Button
                                    variant="solid"
                                    type="reset"
                                    loading={loading}
                                    className={`bg-[#EDF0F6] text-[#696C72] ${buttonStyle}`}
                                    onClick={setResetForm}
                                >
                                    취소
                                </Button>
                                <Button
                                    variant="solid"
                                    type="submit"
                                    disabled={(checkedVms.length !== 1)}
                                    loading={loading}
                                    className={`bg-[#17A36F] text-white ${buttonStyle}`}
                                >
                                    수정 완료
                                </Button>
                            </div>
                        }
                    </FormItem>
                </Form>
                <VmsList
                    toggleModal={vmsDetailToggleModal}
                    setCheckedVms={setCheckedVms}
                    onModify={setModifyVms}
                />
            </div>
            <ModalNotify
                modal={modal}
                toggle={toggleModal}
            >
                <p>{resMessage}</p>
            </ModalNotify>
        </>
    )
}

export default VmsSetting
