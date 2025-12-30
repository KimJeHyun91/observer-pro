import { ScrollBar } from '@/components/ui'
import { useBroadcastAudioFileList } from '@/utils/hooks/useBroadcast'
import _ from 'lodash'
import React, { useEffect, useState } from 'react'

// 무료 파일 테스트
// https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
// https://www.soundhelix.com/examples/wav/SoundHelix-Song-1.wav

// const fileList = [
//     {title: 'file_test_1.mp3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
//     {title: 'file_test_2.wav', url: 'https://www.soundhelix.com/examples/wav/SoundHelix-Song-1.wav'},
// ]

interface AudioFileSelectorProps {
    selectedFile: any
    setSelectedFile: (d:any)=>void
}

const AudioFileSelector = ({selectedFile, setSelectedFile}: AudioFileSelectorProps) => {
  const {fileList, mutate} = useBroadcastAudioFileList()

  useEffect(()=>{
    mutate()
  },[])

    const handleFileSelect = (file:any) => {
        setSelectedFile((prev:any) => (prev?.idx === file.idx ? null : file)); 
    };
    

  return (
    <ScrollBar className='h-[150px] p-2 pl-5'>
        <div className='flex flex-col gap-3 '>
            {_.isEmpty(fileList?.result) ? (
                <div className='flex justify-center items-center h-[120px]'>
                  등록된 음원파일이 없습니다.
                </div>
            ) : (
              fileList?.result?.map((file: any) => {
                const isChecked = selectedFile?.idx === file.idx;
                return (
                  <div key={file.url} className='flex gap-5'>
                    <input
                      type='checkbox'
                      className='w-[15px]'
                      checked={isChecked}
                      onChange={() => handleFileSelect(file)}
                    />
                    <div>
                      <p className={`${selectedFile?.idx === file.idx ? 'bg-[#e3e9f7]' : 'bg-[#f6f6f6]'} w-[380px] p-1 px-2 dark:bg-gray-800 rounded-md`}>{file.audio_file_name}</p>
                    </div>
                  </div>
                );
              })
            )}

        </div>
    </ScrollBar>
  )
}

export default AudioFileSelector
