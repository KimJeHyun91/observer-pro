import Loading from '@/components/shared/Loading';
import { useFalseAlarm } from '@/utils/hooks/useFalseAlarm';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Default from '../util/ui/forms/Checkbox/Default';
import DefaultOne from '../util/ui/forms/Checkbox/DefaultOne';
import { Button } from '@/components/ui';
import { FalseAlram } from './SOPEventDetail';
import { ModalNotifyType } from '@/@types/modal';
import ModalNotify from '../modals/ModalNotify';

type Props = {
  updateFalseAlarm: (idx: number | null, type: string) => void;
  close: () => void;
};

export default function FalseAlarmSettingEvent({
  updateFalseAlarm,
  close
}: Props) {
  const { socketService } = useSocketConnection();
  const [checkedFalseAlarm, setCheckedFalseAlarm] = useState<FalseAlram>({
    idx: null,
    type: null
  });
  const [newFalseAlarm, setNewFalseAlram] = useState<string>('');
  const [newFalseAlarmChecked, setNewFalseAlarmChecked] = useState<boolean>(false);
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

  const toggleModalNotify = ({ show, title }: ModalNotifyType) => {
    setModalNotify({
      show,
      title
    });
  };

  const handleCheckFalseAlarm = (idx: number | null, type: string | null) => {
    if (newFalseAlarmChecked && idx != null) {
      setNewFalseAlarmChecked(false);
    };
    setCheckedFalseAlarm({
      idx,
      type
    });
  };
  const handleUpdateNewFalseAlarm = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNewFalseAlram(e.target.value);
  };

  const handleUpdateNewFalseAlarmChecked = (value: boolean) => {
    if (value) {
      handleCheckFalseAlarm(null, null);
    };
    setNewFalseAlarmChecked(value);
  };

  const handleSave = async () => {
    // falseAlarmList
    try {

      if (checkedFalseAlarm.idx == null && checkedFalseAlarm.type == null && newFalseAlarmChecked === false) {
        setNotifyMsg('오탐 사유를 선택해주세요.');
        toggleModalNotify({
          show: true,
          title: '오탐 추가 실패'
        });
        return;
      };

      if (checkedFalseAlarm.idx != null && checkedFalseAlarm.type != null) {
        updateFalseAlarm(checkedFalseAlarm.idx, checkedFalseAlarm.type);
        close();
        return;
      };

      if (newFalseAlarmChecked === true && newFalseAlarm === '') {
        setNotifyMsg('기타 오탐 사유를 입력해주세요.');
        toggleModalNotify({
          show: true,
          title: '오탐 추가 실패'
        });
        return;
      };

      if (newFalseAlarmChecked === false && newFalseAlarm) {
        setNotifyMsg('오탐 종류를 선택해주세요.');
        toggleModalNotify({
          show: true,
          title: '오탐 추가 실패'
        });
        return;
      };

      if (falseAlarmList?.find((falseAlarm) => falseAlarm.type === newFalseAlarm)) {
        setNotifyMsg('해당 오탐 사유가 이미 있습니다.');
        toggleModalNotify({
          show: true,
          title: '오탐 추가 실패'
        });
        return;
      };

      setNewFalseAlram('');
      updateFalseAlarm(null, newFalseAlarm);
      close();
      return;
    } catch (error) {
      console.error(error);
    };
  };

  useEffect(() => {
    if (!socketService) {
      return;
    };

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
    <>
      <section className='flex flex-col py-3 px-4'>
        {isLoading && <Loading loading={isLoading} />}
        {(falseAlarmList && Array.isArray(falseAlarmList)) && (
          <ul className='scroll-container overflow-x-hidden overflow-y-auto h-[20rem] pr-2'>
            {falseAlarmList.map((falseAlarm) => (
              <li
                key={falseAlarm.idx}
                className='flex items-center justify-between mb-2.5'
              >
                <div className='w-[18.8125rem] h-[1.75rem] rounded-sm bg-[#EBECEF] flex items-center pl-2.5'>{falseAlarm.type}</div>
                <Default
                  falseAlarm={falseAlarm}
                  checkedFalseAlarm={checkedFalseAlarm}
                  handleCheckFalseAlarm={handleCheckFalseAlarm}
                />
              </li>
            ))}
            <li>
              <div className='flex h-[8.1875rem] justify-between items-centern'>
                <div className='flex flex-col bg-[#EBECEF] py-1.5'>
                  <p className='w-[18.8125rem] text-[#4E4A4A] text-sm font-semibold pl-2'>기타</p>
                  <div className='w-[17.5625rem] h-[1px] mx-auto my-1.5 bg-white' />
                  <textarea
                    className='w-[17.6875rem] h-[5.875rem] bg-white rounded-sm mx-auto p-1.5'
                    disabled={newFalseAlarmChecked === false}
                    value={newFalseAlarm}
                    placeholder='오탐 사유를 작성하세요.'
                    onChange={handleUpdateNewFalseAlarm}
                  />
                </div>
                <DefaultOne
                  value={newFalseAlarmChecked}
                  onChange={handleUpdateNewFalseAlarmChecked}
                />
              </div>
            </li>
          </ul>
        )}
      </section>
      <div className='w-full h-0.5 bg-[#A7ACB5] border-2 border-[#D9DCE3]' />
      <div className='flex justify-end gap-x-2 mr-3 my-4'>
        <Button
          className='w-[5.5rem] h-[1.625rem] rounded-sm border-[1px] border-[#D9DCE3] flex justify-center items-center bg-[#EDF0F6] text-[#4E4A4A]'
          onClick={close}
        >
          취소
        </Button>
        <Button
          className='w-[5.5rem] h-[1.625rem] rounded-sm border-[1px] border-[#D9DCE3] flex justify-center items-center bg-[#17A36F] text-[#ECECEC]'
          disabled={checkedFalseAlarm.idx == null && newFalseAlarmChecked == null}
          onClick={handleSave}
        >
          저장
        </Button>
      </div>
      <ModalNotify
        modal={modalNotify}
        toggle={toggleModalNotify}
      >
        <p>{notifyMsg}</p>
      </ModalNotify>
    </>
  );
};