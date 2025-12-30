import { DeviceGroup } from '@/@types/broadcast';
import { Button, Dialog, Input, Menu, ScrollBar, Select, Switcher } from '@/components/ui'
import MenuGroup from '@/components/ui/Menu/MenuGroup';
import MenuItem from '@/components/ui/Menu/MenuItem'
import { useBroadcastArea, useBroadcastDeviceGroupList, useBroadcastSpeakerList } from '@/utils/hooks/useBroadcast';
import { useEffect, useRef, useState } from 'react';
import { TbBroadcastOff, TbBroadcast } from "react-icons/tb";
import MicStream from './MicStream';
import AudioFileSelector from './AudioFileSelector';
import TextToSpeech, { SpeakerList } from './TextToSpeech';
import _ from 'lodash';
import { ConfirmDialog } from '@/components/shared';
import ConfirmModal from '../ConfirmModal';
import { addBroadcast, apiDetailDeviceGroup, apiGetAreaInfo } from '@/services/BroadcastService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import dayjs from 'dayjs';
import { SingleValue } from 'react-select';
import { HiSpeakerWave } from 'react-icons/hi2';
import { FaBell } from "react-icons/fa";
import { MdOutlineRepeatOn } from "react-icons/md";
import { FaMicrophoneLines } from "react-icons/fa6";
import { PiDeviceTabletSpeakerFill } from "react-icons/pi";
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { AlertDialog } from '@/components/shared/AlertDialog';


interface LiveBroadcastProps {
    isOpen: boolean
    onClose: ()=>void
}

const menuList = [
  {id: 1, title: '마이크 송출'},
  {id: 2, title: '음원 선택'},
  {id: 3, title: 'TTS'},
]

const LiveBroadcast = ({isOpen, onClose}: LiveBroadcastProps) => {
   const {areaList, mutate: getArea} = useBroadcastArea()
   const {speakerList, mutate: getSpeaker} = useBroadcastSpeakerList()
   const {groupList, mutate} = useBroadcastDeviceGroupList()
   const { socketService } = useSocketConnection()
   const [broadcastStatus, setBroadcastStatus] = useState<string>()
   const { reserveBroadcastStatus } = useBroadcastStore(state => ({reserveBroadcastStatus: state.reserveBroadcastStatus}));
   const siteId = useBroadcastStore((state) => state.siteId);

  useEffect(()=>{
    if (!socketService) {
      return;
    }

    const reserveSocket = socketService.subscribe('vb_broadcast-update', (received) => {
      if (received) {
        setBroadcastStatus(received.broadcastStatus.status)
      }
    })

   

    return () => {
      reserveSocket();
    }

  },[socketService, broadcastStatus])


    useEffect(()=>{
      mutate()
      getSpeaker()
    },[])

   const activeSpeakers = speakerList?.result?.filter(speaker => speaker.speaker_status === 'ON').map(speaker => speaker.speaker_ip);

    // 개소 선택
    const [isAllSelected, setIsAllSelected] = useState(true); // 전체 개소 선택 여부
    const [isGroupSelected, setIsGroupSelected] = useState(false); // 그룹 선택 여부
    const [selectedGroups, setSelectedGroups] = useState<number[]>([]); // 선택된 그룹 목록

    // menu 선택
    const [selectedMenu, setSelectedMenu] = useState<string>('음원 선택')
    
    const [selectedFile, setSelectedFile] = useState<any>({}); // 음성 파일 선택
    const [selectedTTS, setSelectedTTS] = useState<SpeakerList | null>(null); 
    const [selectedTTSVoice, setSelectedTTSVoice] = useState<string>('ko-KR-InJoonNeural')
    const [repeatInterval, setRepeatInterval] = useState<number>(15)
    const [repeatCount, setRepeatCount] = useState<number>(0)
    const [isRepeatEnabled ,setIsRepeatEnabled] = useState(false)
    const [isStartChimeEnabled, setIsStartChimeEnabled] = useState(false)
    const [isEndChimeEnabled, setIsEndChimeEnabled] = useState(false)
    const [isLiveBroadcastConfirmOpen, setIsLiveBroadcastConfirmOpen] = useState(false)
    const [isOnAir, setIsOnAir] = useState(false)
    const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
    const [alertDialogMessage, setAlertDialogMessage] = useState<string>('');
 
    // 전체 개소 선택 
    const handleAllSelect = () => {
      setIsAllSelected(true);
      setIsGroupSelected(false);
      setSelectedGroups([]); 
    };

    // 그룹 선택 
    const handleGroupSelect = () => {
      setIsGroupSelected(true);
      setIsAllSelected(false);
    };


    const handleGroupCheck = (groupIdx: number) => {
      setSelectedGroups((prevSelectedGroups) =>
        prevSelectedGroups.includes(groupIdx)
          ? prevSelectedGroups.filter((id) => id !== groupIdx)
          : [...prevSelectedGroups, groupIdx]
      );
    };

    const [areaInfoResults, setAreaInfoResults] = useState<any>()

    const handleConfirmLiveBroadcast = async() => {
      if (isGroupSelected && _.isEmpty(selectedGroups)) {
        setAlertDialogMessage('송출 대상을 선택해주세요.');
        setIsAlertDialogOpen(true);
        return;
      } else if (selectedMenu === '음원 선택' && _.isEmpty(selectedFile)) {
        setAlertDialogMessage('음원 파일을 선택해주세요.');
        setIsAlertDialogOpen(true);
        return;
      } else if (selectedMenu === 'TTS' && _.isEmpty(selectedTTS)) {
        setAlertDialogMessage('TTS 문구를 선택해주세요.');
        setIsAlertDialogOpen(true);
        return;
      } else if (selectedMenu === 'TTS' && selectedTTS && _.isEmpty(selectedTTS?.speaker_msg)) {
        setAlertDialogMessage('TTS 문구를 입력해주세요.');
        setIsAlertDialogOpen(true);
        return;
      } else if (_.isEmpty(siteId)) {
        setAlertDialogMessage('등록된 스피커가 없습니다.');
        setIsAlertDialogOpen(true);
        return;
      }
      const outsideIdxSet = new Set<number>();

      if(isAllSelected){
       const res = await getArea()
       if(res.message === 'ok'){
        setAreaInfoResults(res.result)
       }
      }else {
        await Promise.all(
          selectedGroups.map(async (group: number) => {
            const res = await apiDetailDeviceGroup({ groupIdx: group });
            if (res.message === 'ok') {
              res.result?.forEach((el) => outsideIdxSet.add(el.outside_idx));
            }
          })
        );
      
        const outsideIdxArray = Array.from(outsideIdxSet);

        const areaInfoResults = await Promise.all(
          outsideIdxArray.map(async (idx) => {
            const res = await apiGetAreaInfo({ idx });
            return res.result;
          })
        );
      
        setAreaInfoResults(areaInfoResults); 
      } 
      
    
      setIsLiveBroadcastConfirmOpen(true);
      setIsOnAir(true);
    }

    const activeTransmitterIds = areaList?.result
      ?.filter(area => area.speaker_status === 'ON')
      ?.map(area => area.outside_site_transmitter_id);


    // 방송 시작 버튼 클릭
    const handleStartLiveBroadcast = () => {
      if(isOnAir){
        setIsLiveBroadcastConfirmOpen(false)
        setIsOnAir(true)
        // areaInfoResults.map((el)=>{
        //   // 스피커 송출 api
        //   console.log(el.speaker_ip)
        // })
        addBroadcast({
          // siteId: areaList?.result[0]?.outside_site_id,
          siteId,
          messageType: selectedMenu === '음원 선택' ? 'FILE' : "TTS",
          ...(selectedMenu === '음원 선택' ? {url: selectedFile.audio_file_url} : {audioText: selectedTTS?.speaker_msg, voiceType: selectedTTSVoice }),
          startChimeOption: isStartChimeEnabled,
          endChimeOption: isEndChimeEnabled,
          repeat: isRepeatEnabled ? repeatCount : 0,
          repeatInterval: isRepeatEnabled ? repeatInterval : 0,
          targets: activeTransmitterIds
        })
          // console.log({isAllSelected, isGroupSelected, selectedGroups, selectedMenu, })
          // console.log({'송출대상': isAllSelected ? 'ALL' : selectedGroups, 
          //   "방송종류": selectedMenu,
          //   "contents": selectedMenu === '마이크 송출' ? 'mic' : selectedMenu === '음원 선택' ? selectedFile : selectedTTS?.speaker_msg
          // })
      }else{
        setIsLiveBroadcastConfirmOpen(false)
        setIsOnAir(false)
        setAreaInfoResults([])
      }
    }

    const handleModalClose = () => {
      onClose()
      setIsAllSelected(true)
      setIsGroupSelected(false)
      setSelectedGroups([])
      setSelectedMenu('음원 선택')
      setIsOnAir(false)
      setIsStartChimeEnabled(false)
      setIsEndChimeEnabled(false)
      setIsRepeatEnabled(false)
      setRepeatInterval(0)
      setRepeatCount(0)
      setSelectedTTSVoice('ko-KR-InJoonNeural')
      setSelectedFile({})
      setSelectedTTS(null)
    }

  return (
    <>
    <Dialog isOpen={isOpen} onClose={handleModalClose}>
      <h5 className='mb-5'>실시간 방송</h5>
  
        <div className=''>
            <div className={`${broadcastStatus === 'Started' ? 'bg-[#17a36f] text-white' : broadcastStatus === 'Ready' ? 'bg-yellow-400 text-white' : 'bg-[#dcdfe5]'} flex justify-center items-center h-[55px] gap-5 mb-5`}>
               {broadcastStatus === 'Started' ? <TbBroadcast size={43} /> : broadcastStatus === 'Ready' ? <TbBroadcast size={43} /> : <TbBroadcastOff size={43} />}
                <p className='text-3xl font-light'>
                  {broadcastStatus === 'Started' ? '방송 중' : broadcastStatus === 'Ready' ? '준비 중' : '대기 중'}
                </p>
            </div>

            {/* 전시회 제외 대상 */}
            {/* <div className='h-[60%]  mt-5 mb-1 p-3'>
                    <div className='flex justify-center items-center h-[35px] font-bold bg-[#d9dce3]'>송출 대상 선택</div>
              

                    <ScrollBar className='h-[160px] p-2'>
                        <div className='flex items-center mb-2'>
                          <input
                            className='mr-1'
                            type='radio'
                            checked={isAllSelected}
                            onChange={handleAllSelect}
                          />
                          <p>전체 개소</p>
                        </div>
                        <div className='flex items-center'>
                          <input
                            className='mr-1'
                            type='radio'
                            checked={isGroupSelected}
                            onChange={handleGroupSelect}
                          />
                          <p>그룹 선택</p>
                        </div>

                        <div className='bg-gray-100 mt-2'>
                          {isGroupSelected && 
                           ( _.isEmpty(groupList?.result) ? <div className='h-[70px] text-center pt-3'>
                              <p>생성된 그룹이 없습니다.</p>
                              <p>(개소 그룹화에서 그룹을 추가해주세요.)</p>
                             </div>
                             : groupList?.result?.map((group: DeviceGroup) => (
                              <div key={group.group_idx} className="flex items-center ml-5 p-1">
                                <input
                                  className='mr-3'
                                  type='checkbox'
                                  checked={selectedGroups.includes(group.group_idx)}
                                  onChange={() => handleGroupCheck(group.group_idx)}
                                />
                                <p className='w-[200px]'>{group.group_name}</p>
                                <p>개소 {group.outside_count}개</p>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollBar> */}
            
                {/* <div className='flex flex-wrap gap-2 border-2 border-gray-300 p-2'>
                  <div className='w-[120px] flex justify-center items-center bg-[#d9dce3] p-1'>
                    <p>방송 송출 대상</p>
                  </div>
              
                  {isAllSelected ? <div> <p  className='bg-[#eff1f6] p-1'>전체 개소</p></div> 
                    : selectedGroups.length > 0 ? (
                      selectedGroups.map((groupIdx) => {
                        const group = groupList.result.find((item: DeviceGroup) => item.group_idx === groupIdx);
                        return (
                          <p key={groupIdx} className='bg-[#eff1f6] p-1'>{group?.group_name}</p>
                        );
                      })
                    ) : (
                      <p className='bg-[#eff1f6] p-1'>개소를 선택해 주세요.</p>
                  )}
              
              </div> */}
          {/* </div> */}
           

         <div className='flex flex-col gap-2'>
          {/* 전시 제외 대상 */}
            {/* <div className='flex gap-2'>
            <div className='w-[25%] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 p-1'>
              <HiSpeakerWave color='skyblue' size={18} />
              <p className='text-[.9rem] font-bold dark:text-white'>송출 대상</p>
            </div>

              <div className='flex flex-1  gap-5 p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white'>
                <div className='flex items-center gap-2'>
                  <input
                    className="w-4 h-4"
                    type='radio'
                    checked={isAllSelected}
                    onChange={handleAllSelect}
                  />
                  <label>전체 개소</label>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    className="w-4 h-4"
                    type='radio'
                    checked={isGroupSelected}
                    onChange={handleGroupSelect}
                  />
                  <label>그룹 선택</label>
                </div>
              </div>
            </div>
              {isGroupSelected && 
                    ( _.isEmpty(groupList?.result) ? <div className='h-[70px] text-center pt-3'>
                    <p>생성된 그룹이 없습니다.</p>
                    <p>(개소 그룹화에서 그룹을 추가해주세요.)</p>
                    </div>
                    : groupList?.result?.map((group: DeviceGroup) => (
                    <div key={group.group_idx} className="flex items-center ml-5 p-1">
                      <input
                      className="w-4 h-4"
                      type='checkbox'
                      checked={selectedGroups.includes(group.group_idx)}
                      onChange={() => handleGroupCheck(group.group_idx)}
                      />
                      <p className='w-[200px]'>{group.group_name}</p>
                      <p>개소 {group.outside_count}개</p>
                    </div>
                    ))
                  )} */}
          {/* 방송 선택 */}
            {/* <div className='flex gap-2'>
            <div className='w-[25%] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 p-1'>
              <HiSpeakerWave color='skyblue' size={18} />
              <p className='text-[.9rem] font-bold dark:text-white'>송출 대상</p>
            </div>

            <div className='flex flex-1 gap-5 p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white'>
              <div className='flex items-center gap-2'>
              <input
              className="w-4 h-4"
              type='radio'
              checked={isAllSelected}
              onChange={handleAllSelect}
              />
              <label>전체 개소</label>
              </div>
              <div className='flex items-center gap-2'>
              <input
              className="w-4 h-4"
              type='radio'
              checked={isGroupSelected}
              onChange={handleGroupSelect}
              />
              <label>그룹 선택</label>
              </div>
            </div>
            </div>
            {isGroupSelected && 
            (_.isEmpty(groupList?.result) ? (
              <div className='h-[70px] text-center pt-3'>
                <p>생성된 그룹이 없습니다.</p>
                <p>(개소 그룹화에서 그룹을 추가해주세요.)</p>
              </div>
            ) : (
              groupList?.result?.map((group: DeviceGroup) => (
                <div key={group.group_idx} className="flex items-center ml-5 p-1">
                <input
                className="w-4 h-4"
                type='checkbox'
                checked={selectedGroups.includes(group.group_idx)}
                onChange={() => handleGroupCheck(group.group_idx)}
                />
                <p className='w-[200px] ml-3'>{group.group_name}</p>
                <p>개소 {group.outside_count}개</p>
              </div>
              ))
            )
            )}
            */}

            <div className='flex gap-2'>
            <div className='w-[25%] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 p-1'>
              <HiSpeakerWave color='skyblue' size={18} />
              <p className='text-[.9rem] font-bold dark:text-white'>방송 선택</p>
            </div>
          
            <div className="flex flex-1 gap-5 p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white">
              <div className="flex items-center gap-2">
              <input 
                type="radio"
                id="audioFile"
                name="broadcastType"
                value="음원 선택"
                checked={selectedMenu === '음원 선택'}
                onChange={(e) => setSelectedMenu(e.target.value)}
                className="w-4 h-4"
              />
              <label htmlFor="audioFile">음원 파일</label>
              </div>

              <div className="flex items-center gap-2">
              <input
                type="radio" 
                id="tts"
                name="broadcastType"
                value="TTS"
                checked={selectedMenu === 'TTS'}
                onChange={(e) => setSelectedMenu(e.target.value)}
                className="w-4 h-4"
              />
              <label htmlFor="tts">TTS</label>
              </div>
            </div>
            </div>

          {/* 음성 선택 */}
           {selectedMenu === 'TTS' && <div className='flex gap-2'>
              <div className='w-[25%] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1'>
                <FaMicrophoneLines color='#705e78' size={18} />
                <p className='text-[.9rem] font-bold'>음성 선택</p>
              </div>
              <div className="flex flex-1 gap-5 p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white">
                
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
              <div className='w-[120px] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1'>
                <FaBell color='#FFD700' size={18} />
                <p className='text-[.9rem] font-bold'>방송 옵션</p>
              </div>
              <div className='flex flex-1 flex-col gap-3 p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white'>
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

           
         
           <div className='flex gap-2'>
            <div className='w-[120px] flex justify-center items-center gap-1 bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1'>
              <MdOutlineRepeatOn size={18} />
              <p className='text-[.9rem] font-bold'>반복설정</p>
            </div>
            <div className='flex flex-1 flex-col gap-2  p-3 bg-[#f6f6f6] dark:bg-gray-500 dark:text-white'>
             <div className='flex items-center gap-5 '>
               <div className='flex items-center gap-2'>
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

               <div className='flex items-center gap-2 '>
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

             <div className='flex items-center gap-2 ml-5'>
              간격 <Input 
                 size='xs'
                 className='w-[70px] bg-white'
                 type='number'
                 placeholder=''
                 disabled={!isRepeatEnabled}
                 onChange={(e)=>setRepeatInterval(Number(e.target.value))}
               /> 분 
              횟수 <Input
                 size='xs'
                 className='w-[70px] bg-white'
                 type='number'
                 placeholder=''
                 disabled={!isRepeatEnabled}
                 onChange={(e)=>setRepeatCount(Number(e.target.value))}
               /> 회
             </div>
           </div>
           </div>
           {/* 음원 or TTS 선택 */}
           <div className='flex flex-col gap-2'>
              <div className='w-full flex  items-center gap-1 bg-[#ebecef] dark:bg-gray-500 dark:text-white p-1 pl-5'>
                <PiDeviceTabletSpeakerFill  color='#4A90E2' size={18} />
                <p className='text-[.9rem] font-bold'>{selectedMenu === '음원 선택' ? '음원 선택' : 'TTS 선택'}</p>
              </div>
            <div className="border-2 border-gray-200 rounded-lg p-1 dark:bg-gray-500 dark:border-none">
              {selectedMenu === '음원 선택' && <AudioFileSelector selectedFile={selectedFile} setSelectedFile={setSelectedFile} />}
              {selectedMenu === 'TTS' && <TextToSpeech selectedTTS={selectedTTS} setSelectedTTS={setSelectedTTS} />}
            </div>
            </div>
          </div>
          {/* 방송 시작 여부 버튼 */}
           <div className='flex justify-center gap-5 mt-5'>
            <Button className='w-full h-[60px] bg-[#17a36f] dark:bg-[#17a36f] text-white text-xl rounded-lg' onClick={handleConfirmLiveBroadcast} disabled={broadcastStatus === 'Started' || broadcastStatus === 'Ready' || reserveBroadcastStatus === 'Started'} >방송 시작</Button>
            {/* <Button className={`${isOnAir ? 'bg-red-400' : 'bg-[#cfd0d4]'} w-[180px] h-[60px] rounded-none text-white text-xl`} onClick={()=>{setIsLiveBroadcastConfirmOpen(true); setIsOnAir(false)}} disabled={!isOnAir}>방송 종료</Button> */}
           </div>
        </div>
    </Dialog>
    <ConfirmModal show={isLiveBroadcastConfirmOpen} isBtnColor={isOnAir ? 'bg-[#17a36f]' : 'bg-red-400'} contents={isOnAir ? '실시간 방송을 시작하시겠습니까?' : '방송을 종료하시겠습니까?'} buttonName={isOnAir ? "방송 시작" : '방송 종료'} onClose={()=>{
        if(isOnAir){
          setIsOnAir(false)
          setIsLiveBroadcastConfirmOpen(false)
        }else{
          setIsOnAir(true)
          setIsLiveBroadcastConfirmOpen(false)
        }
      }} 
       onConfirm={handleStartLiveBroadcast} />
    <AlertDialog isOpen={isAlertDialogOpen} message={alertDialogMessage} onClose={()=> setIsAlertDialogOpen(false)} />
    </>
  )
}

export default LiveBroadcast




