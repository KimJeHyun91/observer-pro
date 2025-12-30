import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import type { ZodType } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AxiosError } from 'axios'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, Form } from '@/components/ui/Form'
import ModalNotify from '../../modals/ModalNotify'
import { ModalNotifyType } from '@/@types/modal'
import { apiCreateCamera, apiUpdateCamera } from '@/services/ObserverService'
import CameraUndependentList from '../CameraUndependentList'
import { useIndependentCameras } from '@/utils/hooks/useCameras'
import { CameraIndependent } from '@/@types/camera'
import { ServiceType } from '@/@types/common'
import { Select } from '@/components/ui'

type FormSchema = {
    ipAddress: string;
    name: string;
    id: string;
    pw: string;
    profileToken?: { value: string; label: string };
};

type ApiResult = 'Created' | 'OK' | 'No Content';

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid text-center';
const formItemStyle = 'mb-3 h-11 flex items-center';

const validationSchema: ZodType<FormSchema> = z.object({
    ipAddress: z
        .string()
        .min(1, { message: 'IP 주소를 입력해주세요.' })
        .ip({ message: 'IP 형식이 올바르지 않습니다.' }),
    name: z
        .string()
        .min(1, '이름을 입력해주세요.')
        .max(20, '이름을 1자 이상 20자 이하로 입력해주세요.'),
    id: z
        .string()
        .min(1, 'ID를 입력해주세요.')
        .max(20, 'ID를 1자 이상 20자 이하로 입력해주세요.'),
    pw: z
        .string()
        .min(1, { message: '비밀번호를 입력해주세요.' })
        .min(4, { message: '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.' })
        .refine(
            (value) => /^[A-Za-z\d@$#!%*?&]{4,30}$/.test(value),
            '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.',
        ),
    profileToken: z
        .object({
            value: z.string(),
            label: z.string()
        })
        .optional()
});

type Props = {
    mainServiceName: ServiceType;
}

export type profileTokenOption = {
    value: string;
    label: string;
};

const CameraSetting = ({ mainServiceName }: Props) => {
    const { cameras } = useIndependentCameras('origin');
    const [resMessage, setResMessage] = useState('');
    const [checkedCamera, setCheckedCamera] = useState<Array<CameraIndependent>>([]);
    const [modal, setModal] = useState<ModalNotifyType>({
        show: false,
        title: '카메라 추가'
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [mode, setMode] = useState<'add' | 'modify'>('add');
    const [updateForm, setUpdateForm] = useState<Date>(new Date());
    const { mutate } = useIndependentCameras('origin');
    const [profileTokens, setProfileTokens] = useState<Array<profileTokenOption>>([]);
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
            id: '',
            pw: '',
            profileToken: { value: '', label: '선택 안 함' }
        },
        resolver: zodResolver(validationSchema),
    });

    const toggleModal = ({ show, title }: ModalNotifyType) => {
        setModal({
            show,
            title
        });
    };

    const cameraDetailToggleModal = ({ show, title }: ModalNotifyType, message: string) => {
        toggleModal({ show, title });
        setResMessage(message);
    };

    const isSameCameraModify = ({ ipAddress: newipAddress, name: newName, id: newId, pw: newPw }:
        { ipAddress: string, name: string, id: string, pw: string }) => {
        const { camera_ip, camera_name, access_point } = checkedCamera[0];
        const accessPoint = access_point.split("@");
        const prevId = accessPoint[0];
        const prevPw = accessPoint[1];
        if (camera_ip === newipAddress && camera_name === newName && prevId === newId && prevPw === newPw) {
            setResMessage('수정사항이 없습니다.');
            toggleModal({
                show: true,
                title: '카메라 수정'
            });
            return true
        };
    };


    const onSubmit = async (values: FormSchema) => {
        const { ipAddress, name, id, pw } = values;
        setLoading(true);
        let res;
        try {
            const checkedConflict = isConflict(ipAddress, name);
            if (checkedConflict?.result) {
                setLoading(false);
                const resMessage = checkedConflict.type === 'ipAddress' ? 'IP 주소' : checkedConflict.type === 'name' ? '이름' : '';
                setResMessage(`해당 카메라의 ${resMessage}(이)가 이미 있습니다.`);
                toggleModal({
                    show: true,
                    title: `카메라 ${mode === 'add' ? '추가' : '수정'}`,
                });
                return;
            }
            if (mode === 'modify' && checkedCamera && Array.isArray(checkedCamera) && checkedCamera[0]) {
                const isSameVms = isSameCameraModify(getValues());
                const { idx } = checkedCamera[0];
                if (isSameVms) {
                    setLoading(false);
                    return;
                };
                const profileToken = values.profileToken ? values.profileToken.value : '';
                res = await apiUpdateCamera<ApiResult>({
                    idx,
                    ipAddress,
                    name,
                    id,
                    pw,
                    mainServiceName,
                    profileTokens: profileTokens.map((t) => `${t.value}:${t.label}`).join(','),
                    profileToken: profileToken
                })
            } else {
                res = await apiCreateCamera<ApiResult>({
                    ipAddress,
                    name,
                    id,
                    pw,
                    mainServiceName,
                })
            }
            if (res === 'Created' || res === 'OK') {
                setLoading(false);
                if (mode == 'modify') {
                    setResMessage('카메라가 수정되었습니다.');
                    toggleModal({
                        show: true,
                        title: '카메라 수정'
                    });
                    setCheckedCamera([]);
                }
                mutate();
                resetForm();
            } else {
                setLoading(false);
                setResMessage(`${mode === 'add' ? '카메라 추가에 실패했습니다.' : '카메라 수정에 실패했습니다.'}`);
                toggleModal({
                    show: true,
                    title: `VMS ${mode === 'add' ? '추가' : '수정'}`,
                });
            }
        } catch (error) {
            if (error instanceof AxiosError) {
                setLoading(false);
                setResMessage(error.response?.data.message || `에러로 인해 VMS ${mode === 'add' ? '추가' : '수정'}에 실패했습니다.`);
                toggleModal({
                    show: true,
                    title: `VMS ${mode === 'add' ? '추가' : '수정'}`
                });
            }
        }
        function isConflict(ipAddress: string, cameraName: string) {
            if (!cameras || !Array.isArray(cameras)) return;
            const isExistIp = cameras.find((camera) => camera.camera_ip === ipAddress) && checkedCamera[0]?.camera_ip !== ipAddress;
            const isExistName = cameras.find((camera) => camera.camera_name === cameraName) && checkedCamera[0]?.camera_name !== cameraName;
            if (isExistIp) {
                return {
                    result: true,
                    type: 'ipAddress'
                }
            } else if (isExistName) {
                return {
                    result: true,
                    type: 'name'
                }
            } else {
                return {
                    result: false
                };
            }
        }

    };

    const resetForm = () => {
        reset();
        setMode('add');
        setProfileTokens([]);
        setUpdateForm(new Date());
    };

    const setModifyCamera = ({ camera_ip, camera_name, access_point }: CameraIndependent) => {
        setMode('modify');
        setValue("ipAddress", camera_ip);
        setValue("name", camera_name);
        setValue("id", access_point.split('\n')[0]);
        setValue("pw", access_point.split('\n')[1]);
        const profileTokenOptions: Array<profileTokenOption> = access_point.split('\n')[2] ? access_point.split('\n')[2].split(',').map((tokenAndName: string) => {
            const token = tokenAndName.split(':')[0];
            const name = tokenAndName.split(':')[1];
            return { label: name, value: token }
        }) : [{ label: '선택 안 함', value: '' }];
        setProfileTokens(profileTokenOptions);
        setValue("profileToken", { label: profileTokenOptions.find((profileTokenAndName) => profileTokenAndName.value === access_point.split('\n')[3])?.label || '선택 안 함', value: access_point.split('\n')[3] || '' });
    }

    return (
        <>
            <h4 className='text-[1.2rem] mb-4'>카메라 설정</h4>
            <div className='flex flex-col justify-between'>
                <Form
                    className='w-[46.5rem] h-2/3 border-[2px] border-[#D9DCE3] border-solid p-4'
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
                                    type="ipAddr"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="IP 주소"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="카메라 이름"
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
                                    type="text"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="카메라 이름"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="아이디"
                        invalid={Boolean(errors.id)}
                        errorMessage={errors.id?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="id"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="id"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="카메라 ID"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="비밀번호"
                        invalid={Boolean(errors.pw)}
                        errorMessage={errors.pw?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >
                        <Controller
                            name="pw"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    type="password"
                                    className='h-8'
                                    autoComplete="off"
                                    placeholder="비밀번호"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="영상 프로파일"
                        invalid={Boolean(errors.profileToken)}
                        errorMessage={errors.profileToken?.message}
                        className={formItemStyle}
                        layout='horizontal'
                    >

                        <Controller
                            name="profileToken"
                            control={control}
                            defaultValue={
                                { value: '', label: '선택 안 함' }
                            }
                            render={({ field }) => (
                                <Select {...field}
                                    value={field.value || { value: '', label: '선택 안 함' }}
                                    className="custom-select w-[165px]"
                                    size="xs"
                                    options={profileTokens}
                                    placeholder="영상 프로파일을 선택하세요."

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
                                    onClick={resetForm}
                                >
                                    취소
                                </Button>
                                <Button
                                    variant="solid"
                                    type="submit"
                                    disabled={(checkedCamera.length !== 1)}
                                    loading={loading}
                                    className={`bg-[#17A36F] text-white ${buttonStyle}`}
                                >
                                    수정 완료
                                </Button>
                            </div>
                        }
                    </FormItem>
                </Form>
                <CameraUndependentList
                    toggleModal={cameraDetailToggleModal}
                    setCheckedCamera={setCheckedCamera}
                    mainServiceName={mainServiceName}
                    resetForm={resetForm}
                    updateForm={updateForm}
                    onModify={setModifyCamera}
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

export default CameraSetting;
