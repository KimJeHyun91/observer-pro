import { Button, Dialog, Input, MenuItem, ScrollBar, Select } from '@/components/ui'
import { MdCircle } from "react-icons/md";
import { PiSpeakerHigh } from "react-icons/pi";
import React, { useEffect, useState } from 'react'
import { useBroadcastAudioFileList, useBroadcastSpeakerMacroList } from '@/utils/hooks/useBroadcast';
import _ from 'lodash';
import { BroadcastAreaResponse } from '@/@types/broadcast';
import { FiAlertCircle } from "react-icons/fi";
import { TbBroadcast, TbBroadcastOff } from 'react-icons/tb';
import MenuGroup from '@/components/ui/Menu/MenuGroup';
import { SpeakerList } from './liveBroadcast/TextToSpeech';
import ConfirmModal from './ConfirmModal';
import { useCameras } from '@/utils/hooks/useCameras';
import LiveStream from '@/components/common/camera/LiveStream';
import { TbDeviceCctvOff } from "react-icons/tb";



const menuList = [
    // {id: 1, title: '마이크 송출'},
    {id: 2, title: '음원 선택'},
    {id: 3, title: 'TTS'},
  ]

// const fileList = [
//     {title: 'file_test_1.mp3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
//     {title: 'file_test_2.wav', url: 'https://www.soundhelix.com/examples/wav/SoundHelix-Song-1.wav'},

// ]
interface DetailDeviceProps {
    show: boolean
    onModalClose: () => void
    detailData: BroadcastAreaResponse
}

const DetailDevice = ({show, onModalClose, detailData}: DetailDeviceProps) => {
    const [selectedMenu, setSelectedMenu] = useState<string>('음원 선택')
    const [selectedFile, setSelectedFile] = useState<any>({});
    const [selectedTTS, setSelectedTTS] = useState<SpeakerList | null>(null); 
    const {speakerList} = useBroadcastSpeakerMacroList()
    const [text, setText] = useState('')
    const [isConfirmOpen, setIsConfirmOpen] = useState(false)
    const [isOnAir, setIsOnAir] = useState(false)
    const {cameras, mutate} = useCameras('broadcast')
    const {fileList, mutate: getFileLists} = useBroadcastAudioFileList()

    useEffect(()=>{
        mutate()
        getFileLists()
    },[])
    const filteredData = cameras?.filter((cameraList: any) => cameraList.camera_idx === detailData.camera_idx);

    const convertSpeakerOptions = (speakerList: {speaker_idx:number; speaker_msg:string}[]) => {
        
        return speakerList.map((msg:{speaker_idx:number; speaker_msg:string}) => ({
            value: msg.speaker_idx || '',
            label: msg.speaker_msg || '',
            id: msg.speaker_msg || 0
        }));
    };

    const handleFileSelect = (file:any) => {
        setSelectedFile((prev:any) => (prev?.idx === file.idx ? null : file)); 
    };

       const handleTTSSelect = (speaker: SpeakerList) => {
         if (selectedTTS?.speaker_idx === speaker.speaker_idx) {
           setSelectedTTS(null);
         } else {
           setSelectedTTS(speaker); 
         }
       };

    const handleTTSInputSelect = () => {
    if (selectedTTS?.speaker_idx === 'input') {
        setSelectedTTS(null);
    } else {
        setSelectedTTS({ speaker_idx: 'input', speaker_msg: text }); 
    }
    };

    const handleConfirmLiveBroadcast = () => {
       if(selectedMenu === '음원 선택' && _.isEmpty(selectedFile)){
        return alert('음원 파일을 선택해주세요.')
        }else if(selectedMenu === 'TTS' && _.isEmpty(selectedTTS)){
        return alert('TTS 문구를 선택해주세요.')
        }else if(selectedMenu === 'TTS' && selectedTTS && _.isEmpty(selectedTTS?.speaker_msg)){
        return alert('TTS 문구를 입력해주세요.')
        }
        setIsConfirmOpen(true)
        setIsOnAir(true)
    }

      // 방송 시작 버튼 클릭
      const handleStartLiveBroadcast = () => {
        if(isOnAir){
          setIsConfirmOpen(false)
          setIsOnAir(true)

            if(detailData?.speaker_status === 'OFF'){
                return alert('스피커 상태를 확인해 주세요.')
            }
            // 방송 시작 api 
            console.log({
              "스피커 ip": detailData?.speaker_ip,
              "방송종류": selectedMenu,
              "contents": selectedMenu === '마이크 송출' ? 'mic' : selectedMenu === '음원 선택' ? selectedFile : selectedTTS
            })
        }else{
            setIsConfirmOpen(false)
          setIsOnAir(false)
        }
      }

  return (
    <>
     <Dialog isOpen={show} onClose={onModalClose} width={1200} height={850}>
        <div className='p-1'>
        <div className='flex items-center pb-2 gap-2'>
            <h5 className='font-semibold text-lg text-gray-700'>개소</h5>
            <div className='flex gap-2 flex-wrap'>
                {!_.isEmpty(detailData?.group_names) && 
                detailData?.group_names?.map((group, index) => {
                    if(!group) return
                    return (
                        <span 
                            key={index} 
                            className='bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-medium shadow-md hover:bg-blue-600 transition-all duration-200'
                        >
                            {group}
                        </span>
                    );
                }) }
            </div>

        </div>
        <div className='bg-gray-200 rounded-lg p-2 mb-2'>
            <p className='font-bold'>개소 이름</p>
            <p>{detailData.outside_name ?? "??"}</p>
        </div>
        <div className='flex gap-2'>
            <div className='w-[50%]'>
            <div className='bg-gray-200 rounded-lg p-2  h-[500px] mb-2'>
                <div className='flex justify-between items-center  border-2 border-b-slate-50 py-1 mb-3 '>
                    <div className='flex gap-2'>
                      <p className='font-bold'>카메라</p>
                     {filteredData && filteredData[0]?.camera_ip && <p className='font-semibold'>({filteredData[0]?.camera_ip})</p>}
                    </div>
                   {filteredData && !filteredData[0]?.linked_status && filteredData[0]?.camera_ip 
                    && <div className='flex items-center p-1 px-3 bg-[#d76767] text-white rounded-2xl'>
                        <p className='mr-1 text-xs'>연결끊김</p>
                        <FiAlertCircle size={18} />
                    </div>}
                </div>
                <div className='h-[430px]'>
                   {_.isEmpty(filteredData) ? 
                     <div className='flex flex-col justify-center items-center h-[100%] rounded-lg bg-[#d5d7dc]'>
                        <TbDeviceCctvOff size={50} className='' color='#a5a5a5'/>
                        <p className='mt-3 font-semibold text-lg text-gray-400'>카메라를 등록하세요.</p>
                     </div>
                   :
                   <div className='h-[100%] bg-black'>
                    <LiveStream
                            main_service_name={'broadcast'}
                            vms_name={filteredData && filteredData[0]?.vms_name}
                            camera_id={filteredData && filteredData[0]?.camera_id}
                            service_type={filteredData && filteredData[0]?.service_type}
                        />
                    </div>}
                </div>
            </div>
                <div className='w-[100%] bg-gray-200 rounded-lg p-2 '>
                <div className='flex items-center justify-between font-bold mb-2 border-2 border-b-slate-50 py-1'>
                    <p className=''>{`가디언라이트 (${detailData.guardianlite_ip})`}</p>
                    <div className='flex items-center p-1 px-3 bg-[#d76767] text-white rounded-2xl'>
                        <p className='mr-1 text-xs'>연결끊김 </p>
                        <FiAlertCircle size={18} />
                    </div>
                </div>
                <div className='flex items-center justify-around h-[90px] bg-white rounded-sm'>
                <div className=''>
                    <div className='flex justify-center items-center h-[20px] bg-gray-200  text-xs mb-1' >CH 1</div>
                    <div className='flex justify-center '>
                        <MdCircle color='green' size={20} />
                    </div>
                    <div className='text-xs mt-1'>
                        <button className='w-[30px] bg-gray-200 mr-1 '>ON</button>
                        <button className='w-[30px] bg-gray-200'>OFF</button>
                    </div>
                </div>


                <div className=''>
                    <div className='flex justify-center items-center h-[20px] bg-gray-200  text-xs mb-1' >CH 2</div>
                    <div className='flex justify-center '>
                        <MdCircle color='green' size={20} />
                    </div>
                    <div className='text-xs mt-1'>
                        <button className='w-[30px] bg-gray-200 mr-1 '>ON</button>
                        <button className='w-[30px] bg-gray-200'>OFF</button>
                    </div>
                </div>

                <div className=''>
                    <div className='flex justify-center items-center h-[20px] bg-gray-200  text-xs mb-1' >CH 3</div>
                    <div className='flex justify-center '>
                        <MdCircle color='green' size={20} />
                    </div>
                    <div className='text-xs mt-1'>
                        <button className='w-[30px] bg-gray-200 mr-1 '>ON</button>
                        <button className='w-[30px] bg-gray-200'>OFF</button>
                    </div>
                </div>

                <div className=''>
                    <div className='flex justify-center items-center h-[20px] bg-gray-200  text-xs mb-1' >CH 4</div>
                    <div className='flex justify-center '>
                        <MdCircle color='green' size={20} />
                    </div>
                    <div className='text-xs mt-1'>
                        <button className='w-[30px] bg-gray-200 mr-1 '>ON</button>
                        <button className='w-[30px] bg-gray-200'>OFF</button>
                    </div>
                </div>

                <div className=''>
                    <div className='flex justify-center items-center h-[20px] bg-gray-200  text-xs mb-1' >CH 5</div>
                    <div className='flex justify-center '>
                        <MdCircle color='green' size={20} />
                    </div>
                    <div className='text-xs mt-1'>
                        <button className='w-[30px] bg-gray-200 mr-1 '>ON</button>
                        <button className='w-[30px] bg-gray-200'>OFF</button>
                    </div>
                </div>

                </div>
            </div>
             
                </div>

                <div className='w-[50%] bg-gray-200 rounded-lg p-2'>
                <div className='flex justify-between items-center font-bold  border-2 border-b-slate-50 py-1'>
                    <div className='flex gap-2'>
                        <p className=''>스피커</p>
                        {detailData?.speaker_ip && <p className='font-semibold'>({detailData?.speaker_ip})</p>}
                    </div>
                    {detailData?.speaker_ip && detailData?.speaker_statue === 'OFF' 
                        && <div className='flex items-center p-1 px-3 bg-[#d76767] text-white rounded-2xl'>
                        <p className='mr-1 text-xs'>연결끊김</p>
                        <FiAlertCircle size={18} />
                    </div>}
                 </div>
                 <div className='flex flex-col p-2 '>
                    <div className={`${isOnAir ? 'bg-[#17a36f] text-white' : 'bg-[#dcdfe5]'} flex justify-center items-center w-[100%] p-2 border-2 border-gray-300`}>
                       {isOnAir ?  <TbBroadcast size={43} />  : <TbBroadcastOff size={43}  />}
                        <p className='text-2xl font-bold ml-3'>{isOnAir ? '방송 중' :'대기 중'}</p>
                    </div>
                    
                    <div className='flex flex-col mt-3 bg-white rounded-md'>
                        <div className='bg-[#b6bbc4]  p-1 mx-2 mt-2 text-center font-bold'>송출기 제어</div>
                        {/* menu */}
                        <div className='flex flex-col mt-1'>
                        <div className='flex flex-col '>
                            <div className='flex justify-around p-2 gap-2 border-b-2 border-gray-300 mx-2'>
                            {menuList.map((menu)=>{
                                const eventKey = menu.title
                                return <MenuGroup key={menu.id} label='' className='mb-1'>
                                        <MenuItem 
                                            key={eventKey}
                                            className={`${selectedMenu === eventKey && 'bg-[#d9dce3]' }  flex justify-center w-[120px] `}
                                            eventKey={eventKey}
                                            isActive={selectedMenu === eventKey}
                                            onSelect={()=>setSelectedMenu(eventKey)}
                                            >
                                            {menu.title}
                                        </MenuItem>
                                     </MenuGroup>
                            })}
                            </div>
                            <div className=''>
                                {/* {selectedMenu === '마이크 송출' && <div className='w-[100%] h-[300px] p-2'>
                                        <div>실시간 음원 송출</div>
                                    </div>} */}
                                {selectedMenu === '음원 선택' && 
                                    <ScrollBar className='h-[300px] p-2 pl-2'>
                                        <div className='flex flex-col gap-1 p-3'>
                                            {fileList?.result?.map((file: any)=>{
                                                const isChecked = selectedFile?.idx === file.idx;  
                                                return (
                                                <div key={file.idx} className='flex gap-5'>
                                                    <input
                                                    type='checkbox'
                                                    className='w-[15px]'
                                                    checked={isChecked} 
                                                    onChange={() => handleFileSelect(file)}
                                                    />
                                                    <div>
                                                    <p className={`${selectedFile?.idx === file.idx ? 'bg-[#e3e9f7]' : 'bg-[#f6f6f6]'} w-[400px] p-1`}>{file.audio_file_name}</p>
                                                    </div>
                                                </div>
                                                );
                                            })}

                                        </div>
                                    </ScrollBar>}
                                {selectedMenu === 'TTS' && 
                                 <ScrollBar className='h-[300px] p-3 '>
                                 <div className='flex flex-col gap-1'>
                                   <div className='flex  gap-5 p-1'>
                                     <input
                                       type='checkbox'
                                       className='w-[15px]'
                                       checked={selectedTTS?.speaker_idx === 'input'}
                                       onChange={handleTTSInputSelect} 
                                     />
                                     <div className={` `}>
                                      <input placeholder='TTS 문구 직접 입력' className='w-[415px] h-[35px] p-2'  value={text} onChange={(e)=> setText(e.target.value)} />
                                     </div>
                                   </div>
                                   {speakerList?.result.map((speaker: SpeakerList)=>{
                                             const isChecked = selectedTTS?.speaker_idx === speaker.speaker_idx;  
                                            return (
                                              <div key={speaker.speaker_idx} className={`flex gap-5 p-1`}>
                                                <input
                                                  type='checkbox'
                                                  className='w-[15px]'
                                                  checked={isChecked} 
                                                  onChange={() => handleTTSSelect(speaker)}
                                                />
                                                <div className={`${selectedTTS?.speaker_idx === speaker.speaker_idx ? 'bg-[#e3e9f7]' : 'bg-[#f6f6f6]'} p-1 px-2`}>
                                                  <p>저장된 TTS 문구</p>
                                                  <p className={`w-[400px] font-bold`}>{speaker.speaker_msg}</p>
                                                </div>
                                              </div>
                                            );
                                       })}
                                 </div>
                               </ScrollBar>}
                            </div>
                        </div>
                       
                    </div>

                    </div>
                    <div className='flex justify-center gap-10 mt-5  '>
                        <Button className='bg-[#17a36f] w-[200px] h-[80px] text-white text-2xl p-1  rounded-md' onClick={handleConfirmLiveBroadcast} disabled={isOnAir} >방송 시작</Button>
                        <Button className={`${isOnAir ? 'bg-red-400' : 'bg-[#cfd0d4]'}  w-[200px] h-[80px] rounded-md text-white p-1 text-2xl`} onClick={()=>{setIsConfirmOpen(true); setIsOnAir(false)}} disabled={!isOnAir} >방송 종료</Button>
                        </div>
                 </div>
         
                </div>
             
            </div>
            <div className='flex flex-col gap-2 '>
           </div>
        </div>
        <ConfirmModal show={isConfirmOpen} isBtnColor={isOnAir ? 'bg-[#17a36f]' : 'bg-red-400'} contents={isOnAir ? '실시간 방송을 시작하시겠습니까?' : '방송을 종료하시겠습니까?'} buttonName={isOnAir ? "방송 시작" : '방송 종료'}
            onClose={()=>{
                if(isOnAir){
                setIsOnAir(false)
                setIsConfirmOpen(false)
                }else{
                setIsOnAir(true)
                setIsConfirmOpen(false)
                }
            }} 
                onConfirm={handleStartLiveBroadcast} />
     </Dialog>   
    </>
  )
}

export default DetailDevice
