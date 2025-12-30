import dayjs from 'dayjs';
import { Button, Checkbox, TimeInput } from '@/components/ui';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/utils/hooks/useSettings';
import ModalNotify from '@/views/main/modals/ModalNotify';
import { ModalNotifyType } from '@/@types/modal';

type ActiveTime = Date | null;
type ActiveTimeRange = [ActiveTime, ActiveTime];

type Props = {
  index: number;
}

export default function SMSSettingTime({ index }: Props) {
  const { setting, mutate, modify } = useSettings('SMS 시간 설정');
  const useSMSTimeRange = setting ? setting[0].setting_value.split(',')[index] : '';
  const useSMSTime = useRef<boolean>((useSMSTimeRange && useSMSTimeRange.startsWith('!')) ? false : true);
  const [, forceRender] = useState(false); // 렌더링 트리거용
  const [activeTime, setActiveTime] = useState<ActiveTimeRange>([
    null,
    null,
  ]);
  const [modal, setModal] = useState<ModalNotifyType>({
    show: false,
    title: 'SMS 전송 시간 설정'
  });
  const [resMessage, setResMessage] = useState('');
  const toggleModal = ({ show, title }: ModalNotifyType) => {
    setModal({
      show,
      title
    })
  };

  const isSameValues = (sMSSetting: string) => {
    if (sMSSetting == null) {
      return;
    };
    if (sMSSetting === setting[0].setting_value) {
      setResMessage('수정사항이 없습니다.');
      toggleModal({
        show: true,
        title: 'SMS 전송 시간 설정'
      })
      return true
    };
  }

  const handleSaveSMSTime = async () => {
    let useSMSSetting;
    const useSMS = useSMSTime.current ? '' : '!';
    if (activeTime[0] == null && activeTime[1] == null) {
      if (index === 0) {
        useSMSSetting = `,${setting[0].setting_value.split(',')[1]}`;
      } else {
        useSMSSetting = `${setting[0].setting_value.split(',')[0]},`;
      }
    } else if (!activeTime[0] || !activeTime[1]) {
      setResMessage('입력 값이 올바르지 않습니다.');
      toggleModal({
        show: true,
        title: 'SMS 전송 시간 설정'
      })
      return;
    } else {

      const startTime = dayjs(activeTime[0]).format('HH:mm');
      const endTime = dayjs(activeTime[1]).format('HH:mm');
      if (index === 0) {
        useSMSSetting = `${useSMS}${startTime}~${endTime},${setting[0].setting_value.split(',')[1]}`;
      } else {
        useSMSSetting = `${setting[0].setting_value.split(',')[0]},${useSMS}${startTime}~${endTime}`;
      }
    }
    const isSameVms = isSameValues(useSMSSetting);
    if (isSameVms) {
      return;
    }
    const result = await modify(useSMSSetting);
    if (result.result.success) {
      setResMessage('수정 완료되었습니다.');
      toggleModal({
        show: true,
        title: 'SMS 전송 시간 설정'
      })
      mutate();
    }
  };

  useEffect(() => {
    if (setting && setting[0] && setting[0].setting_value) {
      const rawSetting = setting[0].setting_value.split(',');
      if (rawSetting[index] === '') {
        useSMSTime.current = false;
      } else {
        useSMSTime.current = rawSetting[index].startsWith('!') ? false : true
      }
      const [startStr, endStr] = rawSetting[index].split('~');
      if (!startStr || !endStr) {
        return;
      }

      const today = dayjs().format('YYYY-MM-DD'); // 오늘 날짜 기준

      const parsedRange: ActiveTimeRange = [
        dayjs(`${today} ${startStr}`).toDate(),
        dayjs(`${today} ${endStr}`).toDate(),
      ];

      setActiveTime(parsedRange);
    }
  }, [setting]);

  return (
    <div className='mb-2 flex items-center justify-around'>
      <p className='w-2/12 font-semibold'>문자 전송 시간{index + 1}</p>
      <Checkbox
        className='flex justify-center'
        checked={useSMSTime.current}
        onChange={(_checked) => {
          useSMSTime.current = !useSMSTime.current;
          forceRender((prev) => !prev);
        }}
      />
      <TimeInput.TimeInputRange
        clearable
        className='w-4/6'
        value={activeTime}
        onChange={setActiveTime}
      />
      {useSMSTimeRange && (
        <Button
          className='w-1/12 flex justify-center items-center bg-[#F1F1F1] text-black'
          onClick={handleSaveSMSTime}
        >
          수정
        </Button>
      )}
      {!useSMSTimeRange && (
        <Button
          className='w-1/12 flex justify-center items-center bg-[#17A36F] text-[#F1F1F1]'
          onClick={handleSaveSMSTime}
        >
          저장
        </Button>
      )}
      <ModalNotify
        modal={modal}
        toggle={toggleModal}
      >
        <p>{resMessage}</p>
      </ModalNotify>
    </div>
  );
}