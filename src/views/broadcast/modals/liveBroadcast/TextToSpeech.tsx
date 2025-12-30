import React, { useEffect, useState } from 'react'
import { Input, ScrollBar } from '@/components/ui';
import { useBroadcastSpeakerMacroList } from '@/utils/hooks/useBroadcast';

export type SpeakerList = {
  speaker_idx: number | null
  speaker_msg: string
  type?: string
}

interface TextToSpeechProps  {
  selectedTTS: SpeakerList | null;
  setSelectedTTS:(d: SpeakerList | null) => void
}

const TextToSpeech = ({selectedTTS, setSelectedTTS}: TextToSpeechProps) => {
   const {speakerList, mutate} = useBroadcastSpeakerMacroList()
   const [text, setText] = useState('')

   useEffect(()=>{
    mutate()
   },[])

   useEffect(()=>{
    if(!selectedTTS?.speaker_idx){
      if(selectedTTS?.type === 'reserve') return

      setSelectedTTS((prev) => ({
        ...prev,
        speaker_idx: null,
        speaker_msg: text,
        type: prev?.type || 'reserve',  
      }));
      // setSelectedTTS({ speaker_idx: null, speaker_msg: text }); 
    }
   },[text])

  
   const handleTTSSelect = (speaker: SpeakerList) => {
     if (selectedTTS?.speaker_idx === speaker.speaker_idx) {
       setSelectedTTS(null);
     } else {
       setSelectedTTS(speaker); 
     }
   };
 

  return (
    <ScrollBar className='h-[150px]  pl-5'>
      <div className='flex flex-col gap-3'>
        <div className='flex  gap-5 p-1'>
          <input
            type='checkbox'
            className='w-[15px]'
            checked={!selectedTTS?.speaker_idx}
            onChange={() => setSelectedTTS({ speaker_idx: null, speaker_msg: text })}
          />
          <div className={`w-[395px] `}>
           <Input 
             placeholder='TTS 문구 직접 입력' 
             value={selectedTTS?.type === 'reserve' && selectedTTS?.speaker_idx === null ? selectedTTS?.speaker_msg : text} 
             onChange={(e) => {
               if (selectedTTS?.type === 'reserve') {
                 setSelectedTTS({...selectedTTS, speaker_msg: e.target.value})
               } else {
                 setText(e.target.value)
               }
             }}
           />
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
                     <div className={`${selectedTTS?.speaker_idx === speaker.speaker_idx ? 'bg-[#e3e9f7]' : 'bg-[#f6f6f6]'} p-1 px-2 dark:bg-gray-800 rounded-md`}>
                       <p>저장된 TTS 문구</p>
                       <p className={` w-[380px] font-bold`}>{speaker.speaker_msg}</p>
                     </div>
                   </div>
                 );
            })}
      </div>
    </ScrollBar>
  )
}

export default TextToSpeech
