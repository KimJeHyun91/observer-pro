import { DatePicker, Dialog, Input, MenuItem, ScrollBar, Select, Switcher } from '@/components/ui';
import MenuGroup from '@/components/ui/Menu/MenuGroup';
import React, { useEffect, useState } from 'react';
import AudioFileSelector from '../liveBroadcast/AudioFileSelector';
import TextToSpeech from '../liveBroadcast/TextToSpeech';
import _, { set } from 'lodash';
import { useBroadcastArea, useBroadcastDeviceGroupList, useBroadcastReservationList } from '@/utils/hooks/useBroadcast';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import CustomDatePicker from '@/components/common/customDatePicker';
import { apiAddReserve, apiModifyReserve } from '@/services/BroadcastService';
import ConfirmModal from '../ConfirmModal';
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaCheckSquare } from "react-icons/fa";
import { HiSpeakerWave } from "react-icons/hi2";
import { TbTarget } from "react-icons/tb";
import { LuClock } from "react-icons/lu";
import { MdRepeatOn } from "react-icons/md";
import { SingleValue } from 'react-select';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { AlertDialog } from '@/components/shared/AlertDialog';



const repeatOptions = [
    { value: 'day', label: '일' },
    { value: 'week', label: '주' },
    { value: 'month', label: '월' },
];

const repeatEndOptions = [
    { value: 'duration', label: '반복기간' },
    { value: 'count', label: '반복횟수' },
  ];

interface SelectedFile {
  idx?: number | null;
  [key: string]: any;
}

interface SelectedTTS {
  speaker_idx?: number | null;
  speaker_msg?: string;
  type?: string;
  [key: string]: any;
}

interface ReservationSettingsFormProps {
  isOpen: boolean;
  onClose: (b?:boolean)=>void
  broadcastType: string;
  isModifyReserve: boolean
  setIsModifyReserve: (b:boolean)=>void
  modifyReserveEvent: any
  setIsDetailModal: (b:boolean)=>void
}

const ReservationSettingsForm = ({isOpen, onClose, broadcastType, isModifyReserve, setIsModifyReserve, modifyReserveEvent, setIsDetailModal }: ReservationSettingsFormProps) => {
  // 개소 선택
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [isGroupSelected, setIsGroupSelected] = useState(false);
  const [isIndividualSelected, setIsIndividualSelected] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedIndividualItems, setSelectedIndividualItems] = useState<number[]>([]);

  // 방송 내용 선택
  const [selectedMenu, setSelectedMenu] = useState<string>('음원 선택');
  const [selectedFile, setSelectedFile] = useState<SelectedFile>({});
  const [selectedTTS, setSelectedTTS] = useState<SelectedTTS | null>(null);
  const [broadcastDate, setBroadcastDate] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]); 
  const [selectedWeek, setSelectedWeek] = useState<string>(''); // 선택된 주 (첫째, 둘째 등)
  const [selectedMonthDays, setSelectedMonthDays] = useState<string[]>([]); // 선택된 월 반복 요일
  const [isDateSetting, setIsDateSetting] = useState(false); // 날짜 설정 여부
  const [repeatStartDate, setRepeatStartDate] = useState<string | null>(null);
  const [repeatEndDate, setRepeatEndDate] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState<number>()
  const [monthlyDay, setMonthlyDay] = useState<number>()
  const [reserveReqData, setReserveReqData] = useState<{
    broadcastType: string;
    title: string;
    target: string;
    group_idx?: number | null;
    outside_idx?: number | null;
    start_at: string;
    end_at: string;
    device_control: string;
    audio_file_idx?: number;
    speaker_msg?: string;
    speaker_idx?: number | null;
    start_chime: boolean;
    end_chime: boolean;
    repeat: number;
    repeat_interval: number;
    voice_type: string;
    repeat_type?: string;
    day_of_week?: number;
    day_of_month?: number;
    week_of_month?: number;
    repeat_count?: number;
  } | null>(null);
  const [isReserveConfirmModal, setIsReserveConfirmModal] = useState(false)
  const [isStartChimeEnabled, setIsStartChimeEnabled] = useState(false)
  const [isEndChimeEnabled, setIsEndChimeEnabled] = useState(false)
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState<number>(15)
  const [repeatTimes, setRepeatTimes] = useState<number>(0)
  const [selectedTTSVoice, setSelectedTTSVoice] = useState<string>('ko-KR-SunHiNeural')
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [alertDialogMessage, setAlertDialogMessage] = useState<string>('');
  
   // 요일 목록
   const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
   const weekOptions = ['첫째', '둘째', '셋째', '넷째', '다섯째'];

  const { groupList, mutate: getGroupList } = useBroadcastDeviceGroupList();
  const { areaList, mutate: getAreaList } = useBroadcastArea();
  const { mutate:getReserve } = useBroadcastReservationList()
  const {siteId} = useBroadcastStore((state)=> state)

  useEffect(() => {
    getGroupList();
    getAreaList();
  }, []);


  const { control, handleSubmit, setValue, watch, getValues, reset } = useForm({
    defaultValues: {
      // 예약 방송
      reservationBroadcastTitle: '',
      selectedGroup: [],
      selectedIndividual: [],
      reservationBroadcastTime: '',

      // 정기 방송
      broadcastTitle: '',  
      broadcastTime: '',  
      repeatSetting: 'day',
      repeatEnd: 'duration',
    //   selectedDays: [],
    //   selectedWeek: '',
    //   selectedMonthDays: [],
    },
  });

  const reservationBroadcastTitle = watch('reservationBroadcastTitle')
  const reservationBroadcastTime = watch('reservationBroadcastTime')

  const broadcastTitle = watch('broadcastTitle'); 
  const broadcastTime = watch('broadcastTime'); 

  const broadcastRepeatSetting = watch('repeatSetting');
  const broadcastRepeatEnd = watch('repeatEnd');

  
  const formatDate = (dateTime) => {
    const date = dayjs(dateTime, 'YYYYMMDDTHHmmss');
    const formattedDate = date.format('YYYY-MM-DD'); 
    const formattedTime = date.format('HH:mm'); 
    return { formattedDate, formattedTime };
  };


  useEffect(()=>{
   if(isModifyReserve && !_.isEmpty(modifyReserveEvent)){
    console.log('수정', modifyReserveEvent)
    setValue('reservationBroadcastTitle', modifyReserveEvent?.title)
    setValue('broadcastTitle',modifyReserveEvent?.title )
    const { formattedDate: startDate, formattedTime } = formatDate(modifyReserveEvent?.start_at);
    const { formattedDate: endDate } = formatDate(modifyReserveEvent?.end_at);
    setBroadcastDate(dayjs(startDate).format('YYYY-MM-DD'))
    setRepeatStartDate(dayjs(startDate).format('YYYY-MM-DD'))
    setRepeatEndDate(dayjs(endDate).format('YYYY-MM-DD'))
    if(modifyReserveEvent?.repeat_count >0){
      setRepeatEndDate(dayjs(startDate).format('YYYY-MM-DD'))
    }
    setValue('reservationBroadcastTime', formattedTime )
    setValue('broadcastTime', formattedTime )
    setIsStartChimeEnabled(modifyReserveEvent?.start_chime_option)
    setIsEndChimeEnabled(modifyReserveEvent?.end_chime_option)
    if(modifyReserveEvent?.repeat > 0){
      setIsRepeatEnabled(true)
      setRepeatInterval(modifyReserveEvent?.repeat_interval)
      setRepeatTimes(modifyReserveEvent?.repeat)  
    }

    if(modifyReserveEvent?.repeat_type === '일'){
      setValue('repeatSetting', 'day')
    }else if(modifyReserveEvent?.repeat_type === '주'){
      setValue('repeatSetting', 'week')
      setSelectedDays([daysOfWeek[modifyReserveEvent?.day_of_week]])
    }else if(modifyReserveEvent?.repeat_type === '월'){
      if(modifyReserveEvent?.day_of_month ){
        setIsDateSetting(true)
      }else {
        setIsDateSetting(false)
      }
      setValue('repeatSetting', 'month')
      setSelectedMonthDays([daysOfWeek[modifyReserveEvent?.day_of_week]])
      setSelectedWeek(weekOptions[modifyReserveEvent?.week_of_month -1])
    }

    if(modifyReserveEvent?.target === '전체'){
      setIsAllSelected(true)
      setIsGroupSelected(false)
      setIsIndividualSelected(false)
    }else if(modifyReserveEvent?.target === '그룹'){
      setIsGroupSelected(true)
      setIsAllSelected(false)
      setIsIndividualSelected(false)
      setSelectedGroups([modifyReserveEvent?.group_idx])
    }else if(modifyReserveEvent?.target === '개별'){
      setIsIndividualSelected(true)
      setIsAllSelected(false)
      setIsGroupSelected(false)
    }

    if(modifyReserveEvent?.repeat_count > 0){
      setValue('repeatEnd', 'count' )
      setRepeatCount(modifyReserveEvent?.repeat_count)
    }else{
      setValue('repeatEnd', 'duration' )
    }

    setSelectedMenu(modifyReserveEvent?.device_control === 'TTS' ? 'TTS' : '음원 선택')
    setSelectedFile((prev)=>({...prev, idx: modifyReserveEvent?.audio_file_idx}))
    if (modifyReserveEvent?.device_control === 'TTS') {
      setSelectedTTS((prev) => ({
        ...prev,
        speaker_idx: modifyReserveEvent?.speaker_idx === null ? null : Number(modifyReserveEvent?.speaker_idx),
        speaker_msg: modifyReserveEvent?.speaker_msg || '',
        type: 'reserve'
      }))
    }
    setSelectedTTSVoice(modifyReserveEvent?.voice_type)
   }

  },[modifyReserveEvent, isModifyReserve, broadcastType])

  useEffect(()=>{
    if(!isModifyReserve){
      setValue('reservationBroadcastTitle', '')
      setValue('broadcastTitle', '' )
      setValue('reservationBroadcastTime', '' )
      setValue('broadcastTime', '' )
      setBroadcastDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setRepeatStartDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setRepeatEndDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setValue('repeatSetting', 'day')
      setIsAllSelected(true)
      setIsGroupSelected(false)
      setIsIndividualSelected(false)
      setValue('repeatEnd', 'duration' )
      setIsStartChimeEnabled(false)
      setIsEndChimeEnabled(false)
      setIsRepeatEnabled(false)
      setRepeatInterval(0)
      setRepeatTimes(0)
      setSelectedTTSVoice('ko-KR-InJoonNeural')
      setSelectedWeek('')
      setSelectedMonthDays([]);
      setSelectedFile({})
      setSelectedTTS({})
      setSelectedMenu('음원 선택')
     }
  },[isModifyReserve])



  function formatDateTime(dateString: string, timeString: string) {

    const fullDateTimeString = `${dateString} ${timeString}`;

    return dayjs(fullDateTimeString).format('YYYYMMDDTHHmmss');
  }

const [errorMsg, setErrorMsg] = useState<string>('')


  const onSubmit = async(data: any) => {
    if (broadcastType === '예약 방송') {
      console.log(data,selectedMenu, selectedFile, selectedTTS)
      // 필수 값 체크
      if(_.isEmpty(siteId)){
        setAlertDialogMessage('스피커를 등록해 주세요.');
        setIsAlertDialogOpen(true);
        return;
      }
      if(!data.reservationBroadcastTitle){
        setAlertDialogMessage('방송 제목을 확인해 주세요.');
        setIsAlertDialogOpen(true);
        return;
      }
      if(isGroupSelected){
        if(_.isEmpty(data.selectedGroup)){
          setAlertDialogMessage('그룹을 선택해 주세요.');
          setIsAlertDialogOpen(true);
          return;
        }
      }
      if(isIndividualSelected){
        if(_.isEmpty(data.selectedIndividual)){
          setAlertDialogMessage('개소를 선택해 주세요.');
          setIsAlertDialogOpen(true);
          return;
        }
      }
      if(_.isEmpty(data.reservationBroadcastTime) || _.isEmpty(broadcastDate) || broadcastDate === 'Invalid Date'){
        setAlertDialogMessage('방송 예약 날짜를 선택해 주세요.');
        setIsAlertDialogOpen(true);
        return;
      }
      if(selectedMenu === '음원 선택'){
        if(_.isEmpty(selectedFile) || selectedFile?.idx === null){
          setAlertDialogMessage('음원을 선택해 주세요.');
          setIsAlertDialogOpen(true);
          return;
        }
      }
      if(selectedMenu === 'TTS'){
        if (!selectedTTS?.speaker_msg?.trim()) {
          setAlertDialogMessage('TTS를 확인해 주세요.');
          setIsAlertDialogOpen(true);
          return;
        }
      }

      setIsReserveConfirmModal(true)
      setReserveReqData({
        broadcastType: 'reserve',
        title: data.reservationBroadcastTitle,
        target: isAllSelected ? '전체' : isGroupSelected ? '그룹' : '개별' ,
        ...(isGroupSelected && {group_idx: data.selectedGroup[0], outside_idx: null }),
        ...(isIndividualSelected && data.selectedIndividualp && {outside_idx: data.selectedIndividualp[0], group_idx: null }),
        start_at: formatDateTime(broadcastDate, data.reservationBroadcastTime) ,
        end_at : formatDateTime(broadcastDate, data.reservationBroadcastTime) ,
        device_control: selectedMenu === '음원 선택' ? '음원' : 'TTS',
        ...(selectedMenu === '음원 선택' && {audio_file_idx: selectedFile.idx}),
        ...(selectedMenu === 'TTS' && {speaker_msg: selectedTTS.speaker_msg , speaker_idx: selectedTTS.speaker_idx}),
        start_chime: isStartChimeEnabled,
        end_chime: isEndChimeEnabled,
        repeat: isRepeatEnabled ? repeatTimes : 0,
        repeat_interval: isRepeatEnabled ? repeatInterval : 0,
        voice_type: selectedTTSVoice
      })

    } 
   if(broadcastType === '정기 방송') {
      // 정기 방송일 경우 필수 값 체크
    // 필수 값 체크
    if(!siteId){
      setAlertDialogMessage('스피커를 등록해 주세요.');
      setIsAlertDialogOpen(true);
      return;
    }
    if(!data.broadcastTitle){
      setAlertDialogMessage('방송 제목을 확인해 주세요.');
      setIsAlertDialogOpen(true);
      return;
    }
    if(isGroupSelected){
      if(_.isEmpty(data.selectedGroup)){
      setAlertDialogMessage('그룹을 선택해 주세요.');
      setIsAlertDialogOpen(true);
      return;
      }
    }
    if(isIndividualSelected){
      if(_.isEmpty(data.selectedIndividual)){
      setAlertDialogMessage('개소를 선택해 주세요.');
      setIsAlertDialogOpen(true);
      return;
      }
    }

    if(_.isEmpty(data.broadcastTime)){
      setAlertDialogMessage('방송 시간을 선택해 주세요.');
      setIsAlertDialogOpen(true);
      return;
    }

    if(data.repeatSetting === 'week'){
      if(_.isEmpty(selectedDays)){
      setAlertDialogMessage('방송 일정 설정을 선택해 주세요.');
      setIsAlertDialogOpen(true);
      return;
      }
    }
 
    if(selectedMenu === '음원 선택'){
      if(_.isEmpty(selectedFile) || selectedFile?.idx === null){
        return alert('음원을 선택해 주세요.')
      }
    }
    if(selectedMenu === 'TTS'){
      if (!selectedTTS?.speaker_msg?.trim()) {
        setAlertDialogMessage('TTS를 확인해 주세요.');
        setIsAlertDialogOpen(true);
        return;
      }
    }

    setReserveReqData({
      broadcastType: 'regular',
      title: data?.broadcastTitle ?? '',
      target: isAllSelected ? '전체' : isGroupSelected ? '그룹' : '개별',
      ...(isGroupSelected ? { group_idx: data?.selectedGroup?.[0] ?? null, outside_idx: null } : {}),
      ...(isIndividualSelected ? { outside_idx: data?.selectedIndividual?.[0] ?? null, group_idx: null } : {}),
      repeat_type: data?.repeatSetting === 'day' ? '일' : data?.repeatSetting === 'week' ? '주' : '월',
      ...(data?.repeatSetting === 'week' ? { day_of_week: daysOfWeek.indexOf(selectedDays?.[0] ?? '') } : {}),
      ...(data?.repeatSetting === 'month' && isDateSetting ? { day_of_month: monthlyDay } : {}),
      ...(data?.repeatSetting === 'month' && !isDateSetting
        ? { week_of_month: weekOptions.indexOf(selectedWeek) + 1, day_of_week: daysOfWeek.indexOf(selectedMonthDays?.[0] ?? '') }
        : {}),
      ...(data?.repeatEnd === 'count' ? { repeat_count: repeatCount } : {}),
      start_at: repeatStartDate
        ? formatDateTime(dayjs(repeatStartDate).format('YYYY-MM-DD'), data?.broadcastTime ?? '')
        : formatDateTime(dayjs(new Date()).format('YYYY-MM-DD'), data?.broadcastTime ?? ''),
      end_at: formatDateTime(dayjs(repeatEndDate).format('YYYY-MM-DD'), data?.broadcastTime ?? ''),
      device_control: selectedMenu === '음원 선택' ? '음원' : 'TTS',
      ...(selectedMenu === '음원 선택' ? { audio_file_idx: selectedFile?.idx ?? undefined } : {}),
      ...(selectedMenu === 'TTS' ? { speaker_msg: selectedTTS?.speaker_msg ?? '', speaker_idx: selectedTTS?.speaker_idx ?? null } : {}),
      start_chime: isStartChimeEnabled,
      end_chime: isEndChimeEnabled,
      repeat: isRepeatEnabled ? repeatTimes : 0,
      repeat_interval: isRepeatEnabled ? repeatInterval : 0,
      voice_type: selectedTTSVoice ?? '',
    });
    
    setIsReserveConfirmModal(true)
    }
  };

  const onConfirmSubmit = async() => {

    if(!isModifyReserve){
      await apiAddReserve(reserveReqData)
      await getReserve()
      setIsReserveConfirmModal(false)
      onClose()
      setValue('reservationBroadcastTitle', '')
      setValue('broadcastTitle', '' )
      setValue('reservationBroadcastTime', '' )
      setValue('broadcastTime', '' )
      setBroadcastDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setRepeatStartDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setRepeatEndDate(dayjs(new Date()).format('YYYY-MM-DD'))
      setValue('repeatSetting', 'day')
      setIsAllSelected(true)
      setIsGroupSelected(false)
      setIsIndividualSelected(false)
      setValue('repeatEnd', 'duration' )
    }
    if(isModifyReserve){
      if(!modifyReserveEvent) return
       await apiModifyReserve({...reserveReqData, idx: modifyReserveEvent.idx, broadcastType: modifyReserveEvent.type})
       await getReserve()
       setIsReserveConfirmModal(false)
       setIsDetailModal(false)
       onClose()
    }
  }

  const handleAllSelect = () => {
    setIsAllSelected(true);
    setIsGroupSelected(false);
    setIsIndividualSelected(false);
    setSelectedGroups([]);
    setSelectedIndividualItems([]);
    setValue('selectedGroup', []);
    setValue('selectedIndividual', []);
  };

  const handleGroupSelect = () => {
    setIsGroupSelected(true);
    setIsAllSelected(false);
    setIsIndividualSelected(false);
  };

  const handleIndividualSelect = () => {
    setIsIndividualSelected(true);
    setIsGroupSelected(false);
    setIsAllSelected(false);
  };

  const handleGroupCheck = (groupIdx: number) => {
    const updatedGroups = selectedGroups.includes(groupIdx)
      ? [] 
      : [groupIdx]; 
    setSelectedGroups(updatedGroups);
    setValue('selectedGroup', updatedGroups);
  }

  const handleIndividualCheck = (individualId: number) => {
    const updatedItems = selectedIndividualItems.includes(individualId)
      ? []
      : [individualId]; 
    setSelectedIndividualItems(updatedItems);
    setValue('selectedIndividual', updatedItems); 
  };
  

  const handleRepeatSettingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // setRepeatSetting(event.target.value);
  };

  const handleRepeatEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // setRepeatEnd(event.target.value);
  };

  // 요일 선택/해제 핸들러 (다중 선택 보류류)
  // const handleDayToggle = (day: string) => {
  //   setSelectedDays((prevSelectedDays) =>
  //       prevSelectedDays.includes(day)
  //       ? prevSelectedDays.filter((d) => d !== day)
  //       : [...prevSelectedDays, day]
  //   );
  //   };

    // 요일 선택/해제 핸들러
    const handleDayToggle = (day: string) => {
      setSelectedDays([day]); 
    };


  // 월 반복 주 선택 핸들러
  const handleWeekSelect = (week: string) => {
    setSelectedWeek(week);
    setSelectedMonthDays([]); // 주 변경 시 선택된 요일 초기화
  };

  // 월 반복 요일 선택/해제 핸들러 (다중 선택 보류)
  // const handleMonthDayToggle = (day: string) => {
  //   setSelectedMonthDays((prevSelectedMonthDays) =>
  //     prevSelectedMonthDays.includes(day)
  //       ? prevSelectedMonthDays.filter((d) => d !== day)
  //       : [...prevSelectedMonthDays, day]
  //   );
  // };

  // 월 반복 요일 선택/해제 핸들러
  const handleMonthDayToggle = (day: string) => {
    setSelectedMonthDays([day]); 
  };



  return (
    <Dialog className='custom-dialog' isOpen={isOpen} onClose={()=>{onClose(); setIsModifyReserve(false)}} width={750} >
     <div className=''>
      <p className='text-lg font-extrabold text-black dark:text-white'>{`${broadcastType} 일정 ${isModifyReserve ? '수정' : '추가'}`}</p>
     </div>
    
    <form onSubmit={handleSubmit(onSubmit)} className='p-3 '>
    <ScrollBar
    //  classNames='h-[700px]'
     className={`${isModifyReserve ? broadcastType === "예약 방송" ? 'h-[680px]' : 'h-[700px]' : 'h-[700px]'}`}
     >
      {/* 설정 내용 미리보기 */}
     {broadcastType === '예약 방송' && !isModifyReserve && <div className='bg-white dark:bg-gray-500 dark:text-white rounded-sm p-2 mt-5 mb-3'>
        <p className='bg-[#d9dce3] dark:bg-gray-800 text-center font-bold mb-1'>설정 내용 미리보기</p>
        <div className="grid grid-cols-3 gap-1.5">
          <div className='flex gap-1'>
            <p className='flex items-center  text-[.9rem] font-bold'>
              <FaCheckSquare  color='#00bc00'  />
              <span>방송 제목</span> 
            </p>
          <span className='text-[#895f1e] dark:text-white'>[</span><div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{reservationBroadcastTitle || '미제목'}</p></div> <span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1'>
             <p className='flex items-center text-[.9rem] font-bold'>
                <TbTarget color={'#ffd400'} />
                <span>송출 대상</span>
              </p>
              <span className='text-[#895f1e] dark:text-white'>[</span><div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{isAllSelected ? '전체 개소' : isGroupSelected ? '그룹' : isIndividualSelected ? '개별 개소' : '선택 안됨'}</p></div>  <span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1'>
            <p className='flex items-center text-[.9rem] font-bold'>
              <FaRegCalendarAlt  color='#bc6b6b' />
              <span>방송 날짜 </span>
            </p>
            <span className='text-[#895f1e] dark:text-white'>[</span><div className='w-[90px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{broadcastDate || '미설정'}</p></div><span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1'>
             <p className='flex items-center text-[.9rem] font-bold'>
              <LuClock   color={'#ebbb74'} />
              <span>방송 시간 </span>
             </p>
             <span className='text-[#895f1e] dark:text-white'>[</span> <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{reservationBroadcastTime || '미설정'}</p></div><span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1'>
            <p className='flex items-center gap-1 text-[.9rem] font-bold'>
              <HiSpeakerWave color='skyblue' />
              <span>방송 형식</span>
            </p>
            <span className='text-[#895f1e] dark:text-white'>[</span> <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{selectedMenu === '음원 선택' ? '음원' : 'TTS'}</p></div> <span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
        </div>
      </div>}
      {broadcastType === '정기 방송' && !isModifyReserve && <div className='bg-white dark:bg-gray-500 dark:text-white rounded-sm p-2 mb-3'>
        <p className='bg-[#d9dce3] dark:bg-gray-800 text-center font-bold mb-1'>설정 내용 미리보기</p>
        <div className="grid grid-cols-3 gap-1.5">
          <div className='flex gap-1'>
           <p className='flex items-center  text-[.9rem] font-bold'>
              <FaCheckSquare  color='#00bc00'  />
              <span>방송 제목</span> 
            </p>
            <span className='text-[#895f1e] dark:text-white'>[</span> <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{broadcastTitle || '미제목'}</p></div><span className='text-[#895f1e] dark:text-white'>]</span> 
          </div>
          <div className='flex gap-1'>
             <p className='flex items-center text-[.9rem] font-bold'>
                <TbTarget color='#ffd400' />
                <span>송출 대상</span>
              </p>
              <span className='text-[#895f1e] dark:text-white'>[</span> <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{isAllSelected ? '전체 개소' : isGroupSelected ? '그룹 선택' : isIndividualSelected ? '개별 개소' : '선택 안됨'}</p></div><span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1'>
             <p className='flex items-center text-[.9rem] font-bold'>
                <LuClock   color='gray' />
                <span>방송 시간 </span>
             </p>
             <span className='text-[#895f1e] dark:text-white'>[</span> <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{broadcastTime || '미설정'}</p></div> <span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
          <div className='flex gap-1 w-[180px]'>
             <p className='flex items-center text-[.9rem] font-bold'>
                <MdRepeatOn    color='gray' />
                <span>반복 주기 </span>
             </p>
             <span className='text-[#895f1e] dark:text-white'>[</span>  <div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{broadcastRepeatSetting === 'day' ? '매일반복' : broadcastRepeatSetting === 'week' ? selectedDays.join(','): `${selectedWeek} 주 ${selectedMonthDays.join(',')}` }</p></div> <span className='text-[#895f1e] dark:text-white'>]</span> 
          </div>
          <div className='flex gap-1 w-[250px]'>
             <p className='flex items-center text-[.9rem] font-bold'>
              <FaRegCalendarAlt  color='#bc6b6b' />
              <span>방송 기간 </span>
            </p>
            <div className='flex flex-wrap w-[150px]'>
             <span className='text-[#895f1e] dark:text-white'>[</span> <div className='flex text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center tracking-[-0.10rem]'>{broadcastRepeatEnd === 'duration' ? ` ${repeatStartDate ? dayjs(repeatStartDate).format('YYYY-MM-DD') : ''}~${repeatEndDate ? dayjs(repeatEndDate).format('YYYY-MM-DD') : ''}` : ''}</p></div><span className='text-[#895f1e] dark:text-white'>]</span>
            </div>
          </div>
          <div className='flex gap-1'>
             <p className='flex items-center gap-1 text-[.9rem] font-bold'>
              <HiSpeakerWave color='skyblue' />
              <span>방송 형식</span>
             </p>
             <span className='text-[#895f1e] dark:text-white'>[</span><div className='w-[80px] overflow-hidden text-ellipsis whitespace-nowrap text-[#895f1e] dark:text-white'><p className='text-center'>{selectedMenu === '음원 선택' ? '음원' : 'TTS'}</p></div>  <span className='text-[#895f1e] dark:text-white'>]</span>
          </div>
        </div>
      </div>}

      {/* 방송 제목 */}
      <div className='bg-white dark:bg-gray-500 dark:text-white rounded-sm p-2 mb-2'>
        <p className='font-bold mb-1'><span className='text-red-500'>*</span>방송 제목</p>
        <Controller
          name={broadcastType === '예약 방송' ? 'reservationBroadcastTitle' : 'broadcastTitle'}
          control={control}
          defaultValue=''  
          render={({ field }) => {
           return <Input
              placeholder='방송 제목을 입력하세요.'
              {...field}  
            />
          }}
        />
      </div>

      {/* 전시회 제외 대상 */}
      {/* 송출 대상 선택 */}
      {/* <div className='bg-white rounded-sm p-2'> */}
        {/* <p className='font-bold'><span className='text-red-500'>*</span>송출 대상 선택</p> */}
        {/* <div className='flex gap-10'> */}
          {/* <div className='ml-5 mt-2'>
            <div className='flex items-center mb-2'>
              <input
                className='mr-1'
                type='radio'
                checked={isAllSelected}
                onChange={handleAllSelect}
              />
              <p>전체 개소</p>
            </div>
            <div className='flex items-center mb-2 '>
              <input
                className='mr-1'
                type='radio'
                checked={isGroupSelected}
                onChange={handleGroupSelect}
              />
              <p>그룹</p>
            </div>
            <div className='flex items-center'>
              <input
                className='mr-1'
                type='radio'
                checked={isIndividualSelected}
                onChange={handleIndividualSelect}
              />
              <p>개별 개소</p>
            </div>
          </div> */}

          {/* 그룹 및 개별 개소 체크리스트 */}
          {/* <div className='bg-gray-100 mt-2'> */}
            {/* {isGroupSelected &&
              (_.isEmpty(groupList?.result) ? (
                <div className='w-[400px] h-[70px] text-center pt-3'>
                  <p>생성된 그룹이 없습니다.</p>
                  <p>(개소 그룹화에서 그룹을 추가해주세요.)</p>
                </div>
              ) : (
                <div className="scroll-container h-[80px] overflow-y-auto overflow-x-hidden scrollbar-hidden">
                  {groupList?.result?.map((group: any) => (
                    <div key={group.group_idx} className="flex items-center w-[400px] ml-5 p-1">
                      <input
                        className='mr-3'
                        type='checkbox'
                        checked={selectedGroups.includes(group.group_idx)}
                        onChange={() => handleGroupCheck(group.group_idx)}
                      />
                      <p className='w-[200px]'>{group.group_name}</p>
                      <p>개소 {group.outside_count}개</p>
                    </div>
                  ))}
                </div>
              ))} */}

            {/* {isIndividualSelected &&
              (_.isEmpty(areaList?.result) ? (
                <div className='w-[400px] h-[70px] text-center pt-3'>
                  <p>생성된 개소가 없습니다.</p>
                  <p>(개소를 추가해주세요.)</p>
                </div>
              ) : (
                <div className="scroll-container h-[80px] overflow-y-auto overflow-x-hidden scrollbar-hidden">
                  {areaList?.result?.map((individual: any) => (
                    <div key={individual.outside_idx} className="flex items-center w-[400px] ml-5 p-1">
                      <input
                        className='mr-3'
                        type='checkbox'
                        checked={selectedIndividualItems.includes(individual.outside_idx)}
                        onChange={() => handleIndividualCheck(individual.outside_idx)}
                      />
                      <p className='w-[200px]'>{individual.outside_name}</p>
                    </div>
                  ))}
              </div>
              ))} */}
          {/* </div> */}
        {/* </div> */}
      {/* </div> */}

      {/* 방송 일정 설정 */}
      <div className='bg-white dark:bg-gray-500 dark:text-white rounded-sm p-2 mb-2'>
        {broadcastType === '예약 방송' ? (
          <>
            <p className='font-bold'><span className='text-red-500'>*</span>방송 예약 날짜</p>
            <div className='flex gap-3 ml-5 mt-2'>
              <div className='flex items-center gap-3'>
                <p>방송 날짜</p>
                <div className='w-[150px]'>
                  <DatePicker size='xs' value={broadcastDate ? new Date(broadcastDate) : null} onChange={(date) => setBroadcastDate(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <p>방송 송출 시간</p>
                <div className='w-[90px] '>
                  <input type='time' className='dark:bg-gray-700 rounded p-1' {...control.register('reservationBroadcastTime')} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className='font-bold'><span className='text-red-500'>*</span>방송 일정 설정</p>
            <div className='flex flex-col gap-3 ml-5 mt-2'>
              <div className='flex items-center gap-3 font-semibold'>
                <p className='w-[70px]'>방송 시간</p>
                <div className='w-[150px]'>
                  <input type='time' className='dark:bg-gray-700 rounded p-1' {...control.register('broadcastTime')} />
                </div>
              </div>
              <div className='flex flex-col  gap-3'>
                <div className='flex gap-3'>
                    <p className='w-[70px] font-semibold'>반복 설정</p>
                    <div className='flex gap-2'>
                        {repeatOptions.map((option) => (
                        <div key={option.value}>
                            <input
                            type='radio'
                            id={option.value}
                            value={option.value}
                            checked={broadcastRepeatSetting === option.value}
                            // onChange={handleRepeatSettingChange}
                            onChange={() => setValue('repeatSetting', option.value)}
                            />
                            <label htmlFor={option.value}>{option.label}</label>
                        </div>
                        ))}
                    </div>
                 </div>
                     {broadcastRepeatSetting === 'day' && (
                        <div className='ml-20'>
                            <p>매일 반복</p>
                        </div>
                        )}

                        {broadcastRepeatSetting === 'week' && (
                        <div className='ml-20'>
                            {/* <p>요일 선택</p> */}
                            <div className='flex gap-2'>
                            {daysOfWeek.map((day) => {
                              return  <button
                                key={day}
                                className={`px-2 py-1 rounded-md border ${selectedDays.includes(day) ? 'bg-blue-500  text-white' : 'bg-gray-200 dark:bg-gray-500'}`}
                                onClick={(e) => { 
                                  e.preventDefault()
                                  handleDayToggle(day)}}
                                >
                                {day}
                                </button>
                            })}
                            </div>
                        </div>
                        )}
                        {broadcastRepeatSetting === 'month' && (
                            <div className='ml-20'>
                                <div className='flex gap-2 mb-1'>
                                <button
                                    className={`px-1 py-1 rounded-md border ${!isDateSetting ? 'bg-blue-500 text-white' : 'bg-gray-100  dark:bg-gray-500'} `}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setIsDateSetting(false)
                                    }}
                                >
                                    요일 설정
                                </button>
                                <button
                                    className={`px-1 py-1 rounded-md border ${isDateSetting ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-500'}`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setIsDateSetting(true)
                                    }}
                                >
                                    날짜 설정
                                </button>
                                </div>

                                {/* 요일 설정 */}
                                {!isDateSetting &&  (
                                <div className='h-[100px] bg-gray-50 rounded-lg p-3'>
                                    <div className='flex flex-col gap-2'>
                                        <div className='flex items-center gap-2 text-gray-500'>
                                            <p className='text-sm font-medium mb-1 mt-1'>매월</p>
                                            <div className='flex gap-1'>
                                             {weekOptions.map((week) => (
                                                <button
                                                key={week}
                                                className={`px-2 py-1 rounded-lg border transition-colors duration-200 hover:bg-blue-100 
                                                ${selectedWeek === week ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600' : 
                                                'bg-white border-gray-200 text-gray-700'}`}
                                                onClick={(e) =>{
                                                  e.preventDefault()
                                                  handleWeekSelect(week)
                                                }}
                                                >
                                                {week}
                                                </button>
                                            ))}
                                            </div> 주
                                        </div>

                                        <div>
                                          <div className='flex gap-2 items-center text-gray-500'>
                                            {daysOfWeek.map((day) => (
                                                <button
                                                key={day}
                                                className={`w-8 h-8 rounded-full border transition-colors duration-200 hover:bg-blue-100
                                                ${selectedMonthDays.includes(day) ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600' :
                                                'bg-white border-gray-200 text-gray-700'}`}
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  handleMonthDayToggle(day)
                                                }}
                                                >
                                                {day}
                                                </button>
                                            ))}
                                             <p className='text-sm font-medium mb-1 mt-1'>요일에 반복</p>
                                          </div>
                                        </div>
                                    </div>
                                    
                                </div>
                          )}

                    {/* 날짜 설정 */}
                    {isDateSetting && (
                    <div className='mt-2'>
                       매월 <Input className='w-[70px] ' size='xs' type='number'  value={monthlyDay}
                              onChange={(e) => setMonthlyDay(Math.max(0, Math.min(31, Number(e.target.value))))} /> 일
                    </div>
                    )}
                </div>
                )}

                
              </div>
              <div className='flex flex-col'>
                <div  className='flex items-center gap-3'>
                    <p className='w-[70px] font-semibold'>반복 종료</p>
                    <div className='flex gap-3'>
                        {repeatEndOptions.map((option) => (
                        <div key={option.value}>
                            <input
                            type='radio'
                            id={option.value}
                            value={option.value}
                            checked={broadcastRepeatEnd === option.value}
                            // onChange={handleRepeatEndChange}
                            onChange={() => setValue('repeatEnd', option.value)}
                            />
                            <label htmlFor={option.value}>{option.label}</label>
                        </div>
                        ))}
                    </div>
                </div>
                {broadcastRepeatEnd === 'duration' &&
                 <div className='flex items-center mt-2 ml-20'>
                  <DatePicker className='w-[150px]' size='xs' value={repeatStartDate ? new Date(repeatStartDate) : null} onChange={(date)=> setRepeatStartDate(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                  <span className='mx-2'>~</span>
                  <DatePicker className='w-[150px]' size='xs' value={repeatEndDate ? new Date(repeatEndDate) : null} onChange={(date)=> setRepeatEndDate(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    
                    
                     {/* <CustomDatePicker startDate={modifyReserveEvent ? repeatStartDate : repeatStartDate} endDate={modifyReserveEvent ? new Date(repeatEndDate) : repeatEndDate} onChange={(date)=> {setRepeatStartDate((date['startDate'])); setRepeatEndDate((date['endDate']))}} /> */}
                </div>}
                
                {broadcastRepeatEnd === 'count' &&
                 <div className='mt-2 ml-20'>
                    <Input type='number'  className='w-[80px]' size='xs' value={repeatCount} onChange={(e)=> setRepeatCount(Math.max(1, Number(e.target.value)))} /> 회
                    <span className='ml-2 text-xs'>(저장 완료 시간부터 반복됩니다.)</span>
                </div>}  
                    
              </div>
            </div>
          </>
        )}
      </div>



      {/* 방송 내용 설정 */}
      <div className='bg-white dark:bg-gray-500 dark:text-white rounded-sm p-2'>
        <p className='font-extrabold'><span className='text-red-500'>*</span>방송 내용 설정</p>
        <div className='flex flex-col gap-2'>
          {/* 방송 내용 설정 */}
          <div className='flex gap-2'>
            <div className='w-[105px] flex justify-center items-center gap-1  p-1 '>
              {/* <PiDeviceTabletSpeakerFill color='#4A90E2' size={18} /> */}
              <p className='text-[.9rem] font-semibold'>방송 선택</p>
            </div>
            <div className='flex flex-1 gap-5 p-3 '>
              <div className='flex items-center gap-2'>
                <input
                  type='radio'
                  id='audioFile'
                  name='broadcastContent'
                  value='음원 선택'
                  checked={selectedMenu === '음원 선택'}
                  onChange={(e) => setSelectedMenu(e.target.value)}
                  className='w-4 h-4'
                />
                <label htmlFor='audioFile'>음원 선택</label>
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='radio'
                  id='tts'
                  name='broadcastContent'
                  value='TTS'
                  checked={selectedMenu === 'TTS'}
                  onChange={(e) => setSelectedMenu(e.target.value)}
                  className='w-4 h-4'
                />
                <label htmlFor='tts'>TTS</label>
              </div>
            </div>
          </div>

          {/* 음성 선택 */}
          {selectedMenu === 'TTS' && <div className='flex gap-2'>
            <div className='w-[105px] flex justify-center items-center gap-1  p-1'>
              {/* <FaMicrophoneLines color='#A7AAB1' size={18} /> */}
              <p className='text-[.9rem] font-semibold'>음성 선택</p>
            </div>
            <div className="flex flex-1 gap-5 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="injun"
                  name="voiceType"
                  value="ko-KR-InJoonNeural"
                  checked={selectedTTSVoice === 'ko-KR-InJoonNeural'}
                  onChange={(e) => setSelectedTTSVoice(e.target.value)}
                  className="w-4 h-4"
                />
                <label htmlFor="injun">남성</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="sunhi"
                  name="voiceType"
                  value="ko-KR-SunHiNeural"
                  checked={selectedTTSVoice === 'ko-KR-SunHiNeural'}
                  onChange={(e) => setSelectedTTSVoice(e.target.value)}
                  className="w-4 h-4"
                />
                <label htmlFor="sunhi">여성</label>
              </div>
            </div>
          </div>}

          {/* 방송 옵션 */}
          <div className='flex gap-2'>
            <div className='w-[105px] flex justify-center pt-3 gap-1 p-1 '>
              {/* <FaBell color='#FFD700' size={18} /> */}
              <p className='text-[.9rem] font-semibold'>방송 옵션</p>
            </div>
            <div className='flex flex-1 flex-col gap-3 p-3 '>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="optionEnabled" 
                    name="chimeOption"
                    value="enabled"
                    checked={isStartChimeEnabled || isEndChimeEnabled}
                    onChange={() => {
                      setIsStartChimeEnabled(true);
                      setIsEndChimeEnabled(true);
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor="optionEnabled">옵션 선택</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="optionDisabled"
                    name="chimeOption" 
                    value="disabled"
                    checked={!isStartChimeEnabled && !isEndChimeEnabled}
                    onChange={() => {
                      setIsStartChimeEnabled(false);
                      setIsEndChimeEnabled(false);
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor="optionDisabled">없음</label>
                </div>
              </div>

              <div className='flex items-center gap-5 ml-5'>
                <div className='flex items-center gap-2'>
                  <p>시작 차임</p>
                  <Switcher 
                    checked={isStartChimeEnabled} 
                    onChange={(checked) => setIsStartChimeEnabled(checked)}
                    disabled={!isStartChimeEnabled && !isEndChimeEnabled}
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <p>종료 차임</p>
                  <Switcher 
                    checked={isEndChimeEnabled} 
                    onChange={(checked) => setIsEndChimeEnabled(checked)}
                    disabled={!isStartChimeEnabled && !isEndChimeEnabled}
                  />
                </div>
              </div>
            </div>

           
          </div>
           {/* 반복 설정 */}
           <div className='flex gap-2 '>
              <div className='w-[105px] flex justify-center pt-3 gap-1 p-1 '>
                <p className='text-[.9rem] font-semibold'>반복 설정</p>
              </div>
              <div className=''>
              <div className="flex flex-1 gap-5 p-3 ">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="repeatEnabled"
                    name="repeatOption"
                    value="enabled"
                    checked={isRepeatEnabled}
                    onChange={() => setIsRepeatEnabled(true)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="repeatEnabled">반복 설정</label>
                </div>

                <div className="flex items-center gap-2 ">
                  <input
                    type="radio"
                    id="repeatDisabled"
                    name="repeatOption"
                    value="disabled" 
                    checked={!isRepeatEnabled}
                    onChange={() => setIsRepeatEnabled(false)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="repeatDisabled">없음</label>
                </div>
              </div>
              <div className='flex gap-2 ml-5'>
                <div className='flex items-center gap-2'>
                  <p>반복 간격(분)</p>
                  <input
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(Number(e.target.value))}
                    min={1}
                    className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-none"
                    disabled={!isRepeatEnabled}
                  />
                </div>
                <div className='flex items-center gap-2'>
                  <p>반복 횟수</p>
                  <input
                    type="number"
                    value={repeatTimes}
                    onChange={(e) => setRepeatTimes(Number(e.target.value))}
                    min={0}
                    className="w-20 p-1 border rounded dark:bg-gray-700 dark:border-none"
                    disabled={!isRepeatEnabled}
                  />
                </div>
              </div>
              </div>
            </div>

          {/* 음원 or TTS 선택 */}
          <div className='flex gap-2 mt-4'>
            <div className='w-[105px] flex justify-center pt-4 gap-1'>
              <p className='text-[.9rem] font-semibold'>{selectedMenu === '음원 선택' ? '음원 선택' : '문구 선택'}</p>
            </div>
            <div className='flex flex-1 flex-col gap-3'>
            <div className="rounded-lg py-1 max-h-[160px] border border-gray-200">
              {selectedMenu === '음원 선택' && <AudioFileSelector selectedFile={selectedFile} setSelectedFile={setSelectedFile} />}
              {selectedMenu === 'TTS' && <TextToSpeech selectedTTS={selectedTTS} setSelectedTTS={setSelectedTTS} />}
            </div>
            </div>
          </div>
        </div>
      </div>
      </ScrollBar>
      <div className={`flex justify-end gap-3 mt-1`}>
        <button  className="btn btn-primary mt-2 p-2 w-[100px] border-2 border-gray-300 rounded-lg bg-[#e3e9f7]" 
            onClick={(e)=>{
              e.preventDefault()
                reset({
                broadcastTitle: '',
                selectedGroup: [],
                selectedIndividual: [],
                broadcastTime: '',
                repeatSetting: 'day',
                repeatEnd: 'duration',
            })
            setBroadcastDate(dayjs(new Date()).format('YYYY-MM-DD'))
            setRepeatStartDate(dayjs(new Date()).format('YYYY-MM-DD'))
            setRepeatEndDate(dayjs(new Date()).format('YYYY-MM-DD'))
            handleAllSelect()
        }}
        >초기화</button>
        <button type="submit" className="btn btn-primary mt-2 p-2 w-[100px] text-white rounded-lg bg-[#17a36f]">{isModifyReserve ? '수정하기' : '예약하기'}</button>
      </div>
    </form>
   
    <ConfirmModal show={isReserveConfirmModal} contents={`예약/정기 방송을 ${isModifyReserve ? '수정' : '추가' } 하시겠습니까?`} buttonName='확인' onClose={()=>setIsReserveConfirmModal(false)} onConfirm={onConfirmSubmit} />
    <AlertDialog isOpen={isAlertDialogOpen} message={alertDialogMessage} onClose={()=> setIsAlertDialogOpen(false)} />
    </Dialog>
  );
};

export default ReservationSettingsForm;
