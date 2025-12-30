import { Button, Dialog } from '@/components/ui'
import { apiDeleteReserve } from '@/services/BroadcastService';
import { useBroadcastAudioFileList, useBroadcastReservationList } from '@/utils/hooks/useBroadcast'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaCheckSquare } from "react-icons/fa";
import { HiSpeakerWave } from "react-icons/hi2";
import { BiBell } from "react-icons/bi";
import { TbTarget } from "react-icons/tb";
import DeleteConfirm from '../DeleteConfirm';
import { Reservation } from '@/@types/broadcast';

const voiceTypeList: Record<string, string> = {
  'ko-KR-InJoonNeural' : '인준 (남성 목소리)',
  'ko-KR-SunHiNeural' : '선희 (여성 목소리)',
}

interface DetailReservationProps {
  isOpen: boolean
  onClose: ()=>void
  eventsData: Reservation
  handleModifyReserve:(e:any)=>void
}

const DetailReservation = ({isOpen, onClose, eventsData, handleModifyReserve}: DetailReservationProps) => {
  if (!eventsData) {
    return null; // Handle the case where eventsData is undefined
  }
  const {fileList, mutate} = useBroadcastAudioFileList()
  const {mutate: getReserve} = useBroadcastReservationList()
  const [isDeleteConfirmModal, setIsDeleteConfirmModal] = useState(false)

  useEffect(()=>{
    mutate()
  },[])

  const audioFile = fileList?.result?.filter((list)=> list.idx === eventsData?.audio_file_idx)

  const formatDateTime = (dateTime) => {
    const date = dayjs(dateTime, 'YYYYMMDDTHHmmss');
    const formattedDate = date.format('YYYY-MM-DD'); 
    const formattedTime = date.format('HH:mm'); 
    return { formattedDate, formattedTime };
  };

  const { formattedDate: startDate, formattedTime } = formatDateTime(eventsData?.start_at);
  const { formattedDate: endDate} = formatDateTime(eventsData?.end_at);

  const repeatType = eventsData?.repeat_type; 
  const repeatCount = eventsData?.repeat_count;
  const dayOfWeek = eventsData?.day_of_week;
  const weekOfMonth = eventsData?.week_of_month;
  const dayOfMonth = eventsData?.day_of_month;
  const weekOptions = ["첫째", "둘째", "셋째", "넷째", "다섯"]; 
  const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"]

  const getRepeatText = () => {
    if (repeatType === '일') {
      return '매일';
    }
    if (repeatType === '주') {
      return `매주 ${daysOfWeek[dayOfWeek]}`;
    }
    if (repeatType === '월') {
      if (dayOfMonth) {
        return `매월 ${dayOfMonth}일`;
      } 
      if (dayOfWeek !== undefined && weekOfMonth !== undefined) {
        return `매월 ${weekOptions[weekOfMonth - 1]} 주 ${daysOfWeek[dayOfWeek]}요일`;
      }
    }
    return '';
  };


  const getRepeatEndDate = () => {
    if (repeatCount) {
      return `${startDate}부터 반복 ${repeatCount}회`;
    }
    return `${startDate}부터 ${endDate}까지`;
  };

  const handleDeleteConfirm = () => {
    setIsDeleteConfirmModal(true)
  }

  const handleDeleteReserve = async() => {
    eventsData && await apiDeleteReserve({reserveIdx: eventsData.idx, broadcastType: eventsData.type})
    await getReserve()
    setIsDeleteConfirmModal(false)
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <h5 className='mb-5'>{`${eventsData?.type} 방송 세부 정보`}</h5>

     {eventsData?.type === '예약' ? 
      <div className='flex flex-col gap-4'>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <FaCheckSquare color='#00bc00' />
              <span>방송 제목</span> 
            </p>
            <div className='border-2 p-3 rounded-lg'>
              <p>{eventsData?.title}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <TbTarget />
              <span>송출 대상</span>
            </p>
            <div  className='border-2 p-3 rounded-lg'>
              <p>{eventsData?.target}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <FaRegCalendarAlt color='#bc6b6b' /> <span>예약 방송 날짜 및 시간</span>
            </p>
            <div  className='border-2 p-3 rounded-lg'>
              <p>[방송 시간] {formattedTime}</p>
              <p>[방송 날짜] {startDate}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <HiSpeakerWave color='skyblue' />
              <span>방송 내용 설정</span>
            </p>
            <div  className='flex gap-1 border-2 p-3 rounded-lg'>
              <p>[{eventsData?.device_control}]</p>
              <p>{audioFile && audioFile[0]?.audio_file_name}</p>
              <p>{eventsData?.device_control === 'TTS' && eventsData?.speaker_msg}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <BiBell color='#FFD700' />
              <span>방송 옵션</span>
            </p>
            <div className='border-2 p-3 rounded-lg'>
              <p>[시작 차임벨] {eventsData?.start_chime_option ? 'ON' : 'OFF'}</p>
              <p>[종료 차임벨] {eventsData?.end_chime_option ? 'ON' : 'OFF'}</p>
              <p>[반복 재생] {eventsData?.repeat ? `${eventsData.repeat_interval}분 간격으로 ${eventsData.repeat}회 반복` : '반복 없음'}</p>
              <p>[음성 타입] {voiceTypeList[eventsData?.voice_type] || '기본'}</p>
            </div>
          </div>
      </div>
      : <div className='flex flex-col gap-4'>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <FaCheckSquare  color='#00bc00'  />
              <span>방송 제목</span> 
            </p>
            <div className='border-2 p-3 rounded-lg'>
              <p>{eventsData?.title}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <TbTarget />
              <span>송출 대상</span>
            </p>
            <div  className='border-2 p-3 rounded-lg'>
              <p>{eventsData?.target}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <FaRegCalendarAlt  color='#bc6b6b' />
              <span> 정기 방송 날짜 및 시간</span>
            </p>
            <div  className='border-2 p-3 rounded-lg'>
              <p>[방송 시간] {formattedTime}</p>
              <p>[반복 설정] {getRepeatText()}</p>
              <p>[반복 종료] {getRepeatEndDate()}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <HiSpeakerWave color='skyblue' />
              <span>방송 내용 설정</span>
            </p>
            <div  className='flex gap-1 border-2 p-3 rounded-lg'>
              <p>[{eventsData?.device_control}]</p>
              <p>{audioFile && audioFile[0]?.audio_file_name}</p>
              <p>{eventsData?.device_control === 'TTS' && eventsData?.speaker_msg}</p>
            </div>
          </div>
          <div>
            <p className='flex items-center gap-1 text-[.9rem] font-bold mb-1'>
              <BiBell  color='#FFD700' />
              <span>방송 옵션</span>
            </p>
            <div className='border-2 p-3 rounded-lg'>
              <p>[시작 차임벨] {eventsData?.start_chime_option ? 'ON' : 'OFF'}</p>
              <p>[종료 차임벨] {eventsData?.end_chime_option ? 'ON' : 'OFF'}</p>
              <p>[반복 재생] {eventsData?.repeat ? `${eventsData.repeat_interval}분 간격으로 ${eventsData.repeat}회 반복` : '반복 없음'}</p>
              <p>[음성 타입] {voiceTypeList[eventsData?.voice_type] || '기본'}</p>
            </div>
          </div>
        </div>}

        <div className='flex justify-end gap-3 mt-5'>
          <Button size='sm' className='px-8 bg-[#edf0f6]' onClick={handleDeleteConfirm}>삭제</Button>
          <Button size='sm' className='px-8 bg-[#17a36f] dark:bg-[#17a36f] text-white' onClick={()=>{handleModifyReserve(eventsData)}}>수정</Button>
        </div>
        <DeleteConfirm show={isDeleteConfirmModal} title='' contents='예약/정기 일정을' onClose={()=>setIsDeleteConfirmModal(false)} onConfirm={handleDeleteReserve}  />
    </Dialog>
  )
}

export default DetailReservation





