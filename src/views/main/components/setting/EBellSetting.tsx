import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z, ZodType } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Loading from '@/components/shared/Loading';
import { Button, Form, FormItem, Input } from '@/components/ui';
import { useSettings } from '@/utils/hooks/useSettings';
import { ModalConfirmType, ModalNotifyType } from '@/@types/modal';
import ModalNotify from '../../modals/ModalNotify';
import { AxiosError } from 'axios';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import ModalConfirm from '../../modals/ModalConfirm';

type FormSchema = {
  ip: string;
  port: string;
  dbName: string;
  dbUser: string;
  dbPW: string;
  socketPort: string;
};

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid text-center';
const formItemStyle = 'mb-3 h-11 flex items-center';

const validationSchema: ZodType<FormSchema> = z.object({
  ip: z
    .string()
    .min(1, { message: '비상벨 IP 주소를 입력해주세요.' })
    .ip({ message: '비상벨 IP 형식이 올바르지 않습니다.' }),
  port: z
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
  dbName: z
    .string()
    .min(1, '비상벨 데이터베이스를 입력해주세요.')
    .max(30, '비상벨 데이터베이스 이름을 20자 이하로 입력해주세요.'),
  dbUser: z
    .string()
    .min(1, '비상벨 데이터베이스 ID를 입력해주세요.')
    .max(20, '비상벨 데이터베이스 ID를 20자 이하로 입력해주세요.'),
  dbPW: z
    .string()
    .min(1, { message: '비밀번호를 입력해주세요.' })
    .min(4, { message: '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.' })
    .refine(
      (value) => /^[A-Za-z\d@$#!%*?&]{4,30}$/.test(value),
      '비밀번호는 4자 이상 30자 이하로 영문자, 숫자, 특수문자만 포함된 문자열을 허용합니다.',
    ),
  socketPort: z
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
    )
});

export default function EBellSetting() {
  const { socketService } = useSocketConnection();
  const { setting, modify, mutate, isLoading } = useSettings('비상벨 설정');
  const settingValue = setting && setting[0].setting_value;
  const [loading, setLoading] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalNotifyType>({
    show: false,
    title: '비상벨 설정'
  });
  const [resMessage, setResMessage] = useState('');
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');

  const toggleModal = ({ show, title }: ModalNotifyType) => {
    setModal({
      show,
      title
    })
  };

  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
    setValue,
    getValues
  } = useForm<FormSchema>({
    defaultValues: {
      ip: settingValue ? settingValue.split(',')[0] : '',
      port: settingValue ? settingValue.split(',')[1] : '',
      dbName: settingValue ? settingValue.split(',')[2] : '',
      dbUser: settingValue ? settingValue.split(',')[3] : '',
      dbPW: settingValue ? settingValue.split(',')[4] : '',
      socketPort: settingValue ? settingValue.split(',')[5] : '',
    },
    resolver: zodResolver(validationSchema),
  });

  const isSameValues = ({ ip, port, dbName, dbUser, dbPW, socketPort }: {
    ip: string;
    port: string;
    dbName: string;
    dbUser: string;
    dbPW: string;
    socketPort: string;
  }) => {
    if (settingValue == null) {
      return;
    };
    if (
      ip === settingValue.split(',')[0] &&
      port === settingValue.split(',')[1] &&
      dbName === settingValue.split(',')[2] &&
      dbUser === settingValue.split(',')[3] &&
      dbPW === settingValue.split(',')[4] &&
      socketPort === settingValue.split(',')[5]
    ) {
      setResMessage('수정사항이 없습니다.');
      toggleModal({
        show: true,
        title: '비상벨 설정'
      });
      return true
    };
  };

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    })
  };

  const onSubmit = async (values: FormSchema) => {
    const { ip, port, dbName, dbUser, dbPW, socketPort } = values;
    setLoading(true);
    try {
      const isSameVms = isSameValues(getValues());
      if (isSameVms) {
        setLoading(false);
        return;
      }
      const res = await modify(`${ip},${port},${dbName},${dbUser},${dbPW},${socketPort}`);
      if (res.result.success) {
        setLoading(false);
        setResMessage('비상벨 설정 정보를 저장했습니다.')
        toggleModal({
          show: true,
          title: '비상벨 설정'
        });
      } else {
        console.log(res);
        setLoading(false);
        setResMessage('비상벨 설정 정보 저장에 실패했습니다.')
        toggleModal({
          show: true,
          title: '비상벨 설정'
        });
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        setLoading(false);
        setResMessage(error.response?.data.message || `에러로 인해 비상벨 설정에 실패했습니다.`);
      };
    };
  };

  const onRemove = async () => {
    setLoading(true);
    try {
      const res = await modify(',,,,,');
      if (res.result.success) {
        setLoading(false);
        setResMessage('비상벨 설정 정보를 삭제했습니다.')
        toggleModal({
          show: true,
          title: '비상벨 설정'
        });
        reset();
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        });
      } else {
        console.log(res);
        setLoading(false);
        setResMessage('비상벨 설정 정보 삭제에 실패했습니다.')
        toggleModal({
          show: true,
          title: '비상벨 설정'
        });
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        setLoading(false);
        setResMessage(error.response?.data.message || '에러로 인해 비상벨 설정에 실패했습니다.');
      };
    }
  };


  useEffect(() => {
    if (settingValue) {
      setValue('ip', settingValue.split(',')[0]);
      setValue('port', settingValue.split(',')[1]);
      setValue('dbName', settingValue.split(',')[2]);
      setValue('dbUser', settingValue.split(',')[3]);
      setValue('dbPW', settingValue.split(',')[4]);
      setValue('socketPort', settingValue.split(',')[5]);
    };
  }, [settingValue]);

  useEffect(() => {
    if (!socketService) return;

    const eBellSettingSocket = socketService.subscribe('cm_settings-update', (received) => {
      if (!received) return;
      if (received.settingName === '비상벨 설정') {
        mutate();
      }
    });
    return () => eBellSettingSocket();
  }, [socketService, mutate]);

  return (
    <section className='p-1.5'>
      <h4 className='text-[1.2rem] mb-4'>비상벨 설정</h4>
      {isLoading ? (
        <Loading loading={isLoading} />
      ) : (
        <>
          <Form
            className='w-[46.5rem] h-[25.5rem] border-[2px] border-[#D9DCE3] border-solid p-4'
            onSubmit={handleSubmit(onSubmit)}
          >
            <FormItem
              label="IP 주소"
              invalid={Boolean(errors.ip)}
              errorMessage={errors.ip?.message}
              className={formItemStyle}
              labelClass='w-[12.58%]'
              layout='horizontal'
            >
              <Controller
                name="ip"
                control={control}
                render={({ field }) => (
                  <Input
                    type="ipAddr"
                    className='h-8'
                    autoComplete="off"
                    placeholder="비상벨 IP 주소"
                    {...field}
                  />
                )}
              />
            </FormItem>
            <FormItem
              label="포트"
              invalid={Boolean(errors.port)}
              errorMessage={errors.port?.message}
              className={formItemStyle}
              layout='horizontal'
            >
              <Controller
                name="port"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    className='h-8'
                    autoComplete="off"
                    placeholder="비상벨 SIP 서버 포트"
                    {...field}
                  />
                )}
              />
            </FormItem>
            <FormItem
              label="DB 이름"
              invalid={Boolean(errors.dbName)}
              errorMessage={errors.dbName?.message}
              className={formItemStyle}
              layout='horizontal'
            >
              <Controller
                name="dbName"
                control={control}
                render={({ field }) => (
                  <Input
                    type="id"
                    className='h-8'
                    autoComplete="off"
                    placeholder="DB 이름"
                    {...field}
                  />
                )}
              />
            </FormItem>
            <FormItem
              label="DB 아이디"
              invalid={Boolean(errors.dbUser)}
              errorMessage={errors.dbUser?.message}
              className={formItemStyle}
              layout='horizontal'
            >
              <Controller
                name="dbUser"
                control={control}
                render={({ field }) => (
                  <Input
                    type="id"
                    className='h-8'
                    autoComplete="off"
                    placeholder="DB 아이디"
                    {...field}
                  />
                )}
              />
            </FormItem>
            <FormItem
              label="DB 비밀번호"
              invalid={Boolean(errors.dbPW)}
              errorMessage={errors.dbPW?.message}
              className={formItemStyle}
              layout='horizontal'
            >
              <Controller
                name="dbPW"
                control={control}
                render={({ field }) => (
                  <Input
                    type="password"
                    className='h-8'
                    autoComplete="off"
                    placeholder="DB 비밀번호"
                    {...field}
                  />
                )}
              />
            </FormItem>
            <FormItem
              label="포트"
              invalid={Boolean(errors.port)}
              errorMessage={errors.port?.message}
              className={formItemStyle}
              layout='horizontal'
            >
              <Controller
                name="socketPort"
                control={control}
                render={({ field }) => (
                  <Input
                    type="text"
                    className='h-8'
                    autoComplete="off"
                    placeholder="비상벨 관제시스템 포트"
                    {...field}
                  />
                )}
              />
            </FormItem>
            {settingValue !== ',,,,,' && (
              <FormItem
                className='mb-0 text-center flex justify-between relative pb-4 '
                layout='vertical'
              >
                <div className='flex gap-3 relative right-20'>
                  <Button
                    variant="default"
                    type="submit"
                    loading={loading}
                    className={`bg-[#17A36F] text-white ${buttonStyle} relative left-[80%]`}
                    onClick={handleSubmit(onSubmit)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="plain"
                    type="reset"
                    loading={loading}
                    className={`bg-[#17A36F] text-white ${buttonStyle} relative left-[80%]`}
                    onClick={() => {
                      setConfirmMsg('설정된 비상벨 정보를 정말로 삭제하시겠습니까?');
                      toggleModalConfirm({
                        show: true,
                        title: '비상벨 설정 정보 삭제',
                        type: 'delete'
                      });
                    }}
                  >
                    삭제
                  </Button>
                </div>
              </FormItem>

            )}
            {settingValue === ',,,,,' && (
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
            )}
          </Form>
        </>
      )}
      <ModalNotify
        modal={modal}
        toggle={toggleModal}
      >
        <p>{resMessage}</p>
      </ModalNotify>
      <ModalConfirm
        modal={modalConfirm}
        toggle={toggleModalConfirm}
        confirm={onRemove}
      >
        <p>{confirmMsg}</p>
      </ModalConfirm>
    </section>
  );
}