import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import type { ZodType } from 'zod'
import { AxiosError } from 'axios'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import { zodResolver } from '@hookform/resolvers/zod'
import ModalNotify from '../../modals/ModalNotify'
import { ModalNotifyType } from '@/@types/modal'
import { ApiResultStatus } from '@/@types/api'
import { apiAddPIDS } from '@/services/ObserverService'
import { PIDSData } from '@/@types/main'
import { usePIDSRoot } from '@/utils/hooks/main/usePIDSRoot'
import PIDSList from '../PIDSList'

type FormSchema = {
    ipAddress: string
    name: string
    location: string
};

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid text-center';
const formItemStyle = 'mb-3 h-11 flex items-center';

const validationSchema: ZodType<FormSchema> = z.object({
    ipAddress: z
        .string()
        .min(1, { message: 'PIDS IP 주소를 입력해주세요.' })
        .ip({ message: 'PIDS IP 형식이 올바르지 않습니다.' }),
    name: z
        .string()
        .min(1, 'PIDS 이름을 입력해주세요.')
        .max(20, 'PIDS 이름을 20자 이하로 입력해주세요.'),
    location: z
        .string()
        .min(1, 'PIDS 설치 장소를 입력해주세요.')
        .max(20, 'PIDS 설치 장소를 20자 이하로 입력해주세요.'),
});

const PIDSSetting = () => {
    const [resMessage, setResMessage] = useState('');
    const [checkedPIDS, setCheckedPIDS] = useState<Array<PIDSData>>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalNotifyType>({
        show: false,
        title: 'PIDS 추가'
    });
    const { mutate, pidsRootList } = usePIDSRoot();
    const {
        handleSubmit,
        formState: { errors },
        control,
        reset,
        setValue,
        getValues
    } = useForm<FormSchema>({
        defaultValues: {
            ipAddress: '',
            name: '',
            location: '',
        },
        resolver: zodResolver(validationSchema),
    });

    const toggleModal = ({ show, title }: ModalNotifyType) => {
        setModal({
            show,
            title
        });
    };

    const PIDSDetailToggleModal = ({ show, title }: ModalNotifyType, message: string) => {
        toggleModal({ show, title });
        setResMessage(message);
    };

    const onSubmit = async (values: FormSchema) => {
        const { ipAddress, name, location } = values;
        setLoading(true);
        try {
            let res = await apiAddPIDS<string>({
                ipaddress: ipAddress,
                name,
                location
            });
            if (res === 'Created') {
                setLoading(false);
                setResMessage('PIDS를 생성했습니다.');
                mutate();
                reset();
            } else {
                setLoading(false);
                setResMessage(res || 'PIDS 생성에 실패했습니다.');
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                setLoading(false);
                setResMessage(error.response?.data.message || '에러로 인해 PIDS 추가에 실패했습니다.');
            };
        };
        toggleModal({
            show: true,
            title: 'PIDS 추가'
        });
    };

    return (
        <>
            <h4 className='text-[1.2rem] mb-4'>PIDS 설정</h4>
            <div className='flex flex-col justify-around'>
                <Form
                    className='w-[744px] h-[285px] border-[2px] border-[#D9DCE3] border-solid p-4'
                    onSubmit={handleSubmit(onSubmit)}
                >
                    <FormItem
                        label="IP 주소"
                        invalid={Boolean(errors.ipAddress)}
                        errorMessage={errors.ipAddress?.message}
                        className={formItemStyle}
                        labelClass='w-[12.58%]'
                        layout='horizontal'

                    >
                        <Controller
                            name="ipAddress"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="ipAddress"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="PIDS IP주소"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="PIDS 이름"
                        invalid={Boolean(errors.name)}
                        errorMessage={errors.name?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="id"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="PIDS 이름"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="PIDS 위치"
                        invalid={Boolean(errors.location)}
                        errorMessage={errors.location?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="location"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="location"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="PIDS 위치"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        className='mb-0 text-center flex justify-end relative pb-4'
                        layout='horizontal'
                    >
                        <Button
                            variant="default"
                            type="submit"
                            loading={loading}
                            className={`bg-[#17A36F] text-white ${buttonStyle} relative left-[80%]`}
                        >
                            저장
                        </Button>
                    </FormItem>
                </Form>
                <PIDSList
                    toggleModal={PIDSDetailToggleModal}
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

export default PIDSSetting;
