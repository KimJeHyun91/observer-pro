import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui';
import { apiCreateFalseAlarm, apiModifyFalseAlarm, apiRemoveFalseAlarm } from '@/services/ObserverService';
import { useFalseAlarm } from '@/utils/hooks/useFalseAlarm';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import ModalConfirm from '../../modals/ModalConfirm';
import { ModalConfirmType, ModalNotifyType } from '@/@types/modal';
import ModalNotify from '../../modals/ModalNotify';

const ModifyButtonStyle = 'w-[3.1875rem] h-[2rem] border-2 border-[#9EA4B6] border-solid flex justify-center items-center';

type ModifyMode = {
  idx: number | null;
  mode: boolean;
}

export default function FalseAlarmSetting() {

  const { socketService } = useSocketConnection();
  const [type, setType] = useState('');
  const selectedFalseAlarmIdx = useRef<number | null>(null);
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');
  const [modifyMode, setModifyMode] = useState<ModifyMode>({
    idx: null,
    mode: false
  });
  const [modifyType, setModifyType] = useState<string | null>(null);
  const [modalNotify, setModalNotify] = useState<ModalNotifyType>({
    show: false,
    title: ''
  });
  const [notifyMsg, setNotifyMsg] = useState('');
  const { error, isLoading, data, mutate } = useFalseAlarm();
  if (error) {
    console.error('get false alarm list error');
  };

  const falseAlarmList = data?.result;
  const changeType = (e: ChangeEvent<HTMLInputElement>) => {
    setType(e.target.value);
  };

  const handleAddFalseAlarm = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (type === '') {
      setNotifyMsg('오탐 사유를 입력해주세요.');
      toggleModalNotify({
        show: true,
        title: '오탐 추가 실패'
      });
      return;
    };
    if (falseAlarmList?.find((falseAlarm) => falseAlarm.type === type)) {
      setNotifyMsg('해당 오탐 사유가 이미 있습니다.');
      toggleModalNotify({
        show: true,
        title: '오탐 추가 실패'
      });
      return;
    };
    try {
      const result = await apiCreateFalseAlarm({
        type
      });
      if (result === 'Created') {
        setType('');
      };
    } catch (error) {
      console.error(error);
    };
  };

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const confirmRemove = async () => {
    if (selectedFalseAlarmIdx.current) {
      try {
        await apiRemoveFalseAlarm({
          idx: selectedFalseAlarmIdx.current
        });
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        });
        selectedFalseAlarmIdx.current = null;
        setConfirmMsg('');
      } catch (err) {
        console.error(err);
      };
    }
  };

  const handleModifyType = (e: ChangeEvent<HTMLInputElement>) => {
    setModifyType(e.target.value);
  };

  const handleSaveModifyType = async () => {
    if (selectedFalseAlarmIdx.current == null || !modifyType) {
      return;
    };
    if (falseAlarmList?.find((falseAlarm) => falseAlarm.type === modifyType)) {
      setNotifyMsg('해당 오탐 사유가 이미 있습니다.');
      toggleModalNotify({
        show: true,
        title: '오탐 수정 실패'
      });
    };
    try {
      const res = await apiModifyFalseAlarm({
        idx: selectedFalseAlarmIdx.current,
        type: modifyType
      });
      if (res === 'OK') {
        selectedFalseAlarmIdx.current = null;
        setModifyType(null);
        setModifyMode({
          idx: null,
          mode: false
        });
      }
    } catch (error) {
      console.error(error);
    };
  };

  const toggleModalNotify = ({ show, title }: ModalNotifyType) => {
    setModalNotify({
      show,
      title
    });
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }

    const SOPStageSocket = socketService.subscribe('cm_sop_falseAlarm-update', (received) => {
      if (received.falseAlarm) {
        mutate();
      }
    });

    return () => {
      SOPStageSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <section>
      <h5 className='text-black'>오탐 설정</h5>
      <div className='w-[45rem] min-h-[15.3125rem] border-2 border-[#D9DCE3] border-solid py-5 px-2'>
        <form
          className='w-[41.9375rem] h-[4.875rem] flex items-center justify-between mx-auto mt-3'
          onSubmit={handleAddFalseAlarm}
        >
          <input
            className='w-[34.9375rem] h-[4.875rem] py-3 px-4 text-[#4E4A4A] bg-[#EDF0F6] rounded'
            value={type}
            placeholder='저장 할 오탐 리스트를 입력하세요.'
            onChange={changeType}
          />
          <Button
            disabled={type === ''}
            className='text-[#647DB7] w-[5rem] h-[2.5rem] border-[#9EA4B6] border-2 border-solid rounded-sm'
          >
            저장
          </Button>
        </form>
        <div className='bg-[#EBECEF] w-[43rem] h-[3px] mx-auto my-4' />
        <div className='bg-[#EBECEF] rounded w-[43rem] h-[3.75rem] mx-auto flex items-center text-[#616A79] pl-4 font-semibold'>
          기타
        </div>
        {isLoading && <Loading loading={isLoading} />}
        {(falseAlarmList && Array.isArray(falseAlarmList)) && (
          <ul className='scroll-container overflow-x-hidden overflow-y-auto h-[28rem] pr-2'>
            {falseAlarmList.map((falseAlarm) => (
              <li
                key={falseAlarm.idx}
                className='flex flex-col'
              >
                <div className='bg-[#EBECEF] w-[43rem] h-[3px] mx-auto my-4' />
                {(modifyMode.mode && modifyMode.idx === falseAlarm.idx) ? (
                  <div className='w-full flex items-center'>
                    <input
                      className='bg-[#EBECEF] rounded w-[34.9375rem] h-[3.75rem] mx-auto flex items-center text-[#616A79] pl-4 font-semibold justify-around'
                      value={modifyType ?? falseAlarm.type}
                      onChange={handleModifyType}
                    />
                    <div className='flex gap-x-1.5'>
                      <Button
                        className={`${ModifyButtonStyle} text-[#D76767]`}
                        onClick={() => setModifyMode({
                          idx: null,
                          mode: false
                        })}
                      >
                        취소
                      </Button>
                      <Button
                        disabled={!modifyType}
                        className={`${ModifyButtonStyle} text-[#616A79]`}
                        onClick={() => {
                          selectedFalseAlarmIdx.current = falseAlarm.idx;
                          handleSaveModifyType();
                        }}
                      >
                        완료
                      </Button>
                    </div>
                  </div>
                )
                  :
                  (
                    <div className='w-full flex items-center'>
                      <div className='bg-[#EBECEF] rounded w-[34.9375rem] h-[3.75rem] mx-auto flex items-center text-[#616A79] pl-4 font-semibold justify-around'>
                        {falseAlarm.type}
                      </div>
                      <div className='flex gap-x-1.5'>
                        <Button
                          className={`${ModifyButtonStyle} text-[#D76767]`}
                          onClick={() => {
                            setConfirmMsg('선택 오탐 목록을 삭제합니다.');
                            selectedFalseAlarmIdx.current = falseAlarm.idx;
                            toggleModalConfirm({
                              show: true,
                              title: '오탐 리스트 삭제',
                              type: 'delete'
                            });
                          }}
                        >
                          삭제
                        </Button>
                        <Button
                          className={`${ModifyButtonStyle} text-[#616A79]`}
                          onClick={() => setModifyMode({
                            idx: falseAlarm.idx,
                            mode: true
                          })}
                        >
                          수정
                        </Button>
                      </div>
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {
        modalConfirm.show && (
          <ModalConfirm
            modal={modalConfirm}
            toggle={toggleModalConfirm}
            confirm={confirmRemove}
          // loading={loading}
          >
            <p>{confirmMsg}</p>
          </ModalConfirm>
        )
      }
      <ModalNotify
        modal={modalNotify}
        toggle={toggleModalNotify}
      >
        <p>{notifyMsg}</p>
      </ModalNotify>
    </section >
  );
} 