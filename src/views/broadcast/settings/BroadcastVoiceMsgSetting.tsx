import { Button, Checkbox, ScrollBar } from '@/components/ui'
import React, { useEffect, useState } from 'react'
import { IoAddCircleOutline } from 'react-icons/io5'
import { GoXCircle } from 'react-icons/go'
import DeleteConfirm from '../modals/DeleteConfirm'
import { Controller, useForm } from 'react-hook-form'
import { apiAddSpeakerMacro, apiDeleteSpeakerMacro, apiModifySpeakerMacro } from '@/services/BroadcastService'
import { useBroadcastSpeakerMacroList } from '@/utils/hooks/useBroadcast'
import _ from 'lodash'
import axios from 'axios'


const items = [
    { id: 0, message: '차단기차다닉차단기차단기차단기' },
    { id: 1, message: '차단기기' },
    { id: 2, message: '차단기기기34' },
    { id: 4, message: '스피커스피커' },
]

type SpeakerMacroProps = {
    speaker_idx: number;
    speaker_msg:string
}

type AxisLists = {
    [key: number]: any;
  };

const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

const BroadcastVoiceMsgSetting = () => {
    const [editingRow, setEditingRow] = useState<number | null>(null)
    const { control, handleSubmit, setValue } = useForm()

    const [selectedRow, setSelectedRow] = useState<SpeakerMacroProps | null>(null)
    const [addVoiceMsg, setAddVoiceMsg] = useState(false)
    const [text, setText] = useState('')
    const [isDelete, setIsDelete] = useState(false)

    const {speakerList, mutate} = useBroadcastSpeakerMacroList()

    useEffect(()=>{
        mutate()
    },[speakerList])


    const sendAudioFile = async (fileName: string, audioContent:any) => {
        const encodedFileName = encodeURIComponent(fileName);

        const formData = new FormData();  
        
  
        const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
  
        formData.append('file', audioBlob, `${fileName}.mp3`);  
    
        try {
           
            // const response = await axios.post(
            //     '/axis-cgi/mediaclip.cgi',
            //     formData, 
            //     {
            //       params: {
            //         action: 'upload',
            //         media: 'audio',
            //         name: fileName, 
            //       },
            //       headers: {
            //         // 'Authorization': 'Basic ' + btoa('root:root'),
            //         'Content-Type': 'multipart/form-data'
            //       },
            //     }
            //   );
            //   console.log(response.data);

        //   console.log(response);
        } catch (error) {
          console.error(error);
        }
      };

    const generateSpeech = async (text:string) => {
        const apiKey = 'AIzaSyBMI7XJaMwtL_7-1MjUUnqsXT7tyTeAonM'
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      
        const body = JSON.stringify({
          input: { text: text }, 
          voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },  
          audioConfig: { audioEncoding: 'MP3' } 
        });
      
   
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
        
          },
          body: body,
        })
        const data = await response.json();

        const audioBase64 = data.audioContent;
    
        await sendAudioFile(text, audioBase64);
    
        // return data
    }

    // axis test     
   const [axisLists, setAxisLists] = useState<AxisLists | null>() 

    // useEffect(()=>{
    //     (async()=>{
    //         // axis 저장 된 스피커 리스트
    //         const response = await axios.post(
    //             `/axis-cgi/mediaclip2.cgi`,{
    //             apiVersion: '0.1',
    //             method:'getAllMetadata'
    //         },);
    //         setAxisLists(response.data.data);
    //   })()
       
    // },[speakerList])
       
  

    const handleEdit = (row: SpeakerMacroProps) => {
        setEditingRow(row.speaker_idx)
       
        setValue('message', row.speaker_msg)

    }

    const handleSave = async(values: any) => {

        try{
            if(!selectedRow) return
            const res = await apiModifySpeakerMacro({speakerMessage:values.message, speakerMessageIdx:selectedRow.speaker_idx})
            if(res.message === 'ok'){
                mutate()
            }
        }catch(err){
            console.log(err)
        }finally{
            setEditingRow(null)
        }
    
    }

    const handleClose = () => {
        setIsDelete(false)
    }


    const handleCheckboxChange = (item: SpeakerMacroProps) => {
        if (selectedRow?.speaker_idx === item.speaker_idx) {
            setSelectedRow(null);
        } else {
            setSelectedRow(item);
        }
    };

    // 해당 스피커 clip idx 추출
    const findKeyByAxisValue = ( clipValue: string) => {
        const key =axisLists &&  Object.entries(axisLists)?.find(([key, value]) => value.name === clipValue);
        return key ? key[0] : null; 
      };


    const handleSpeak = async(contents: string) => {
      
            if (!/[\p{L}]/u.test(contents)) {
                alert('ex 특수문자 지원 안됨')
                return
            }
            // const utterance = new SpeechSynthesisUtterance(contents)
            // window.speechSynthesis.speak(utterance)

            const selectedSpeakerIdx = findKeyByAxisValue( contents)
            console.log(selectedSpeakerIdx)
            // axis speaker
            // const response = await axios.get(
            //     '/axis-cgi/playclip.cgi',
            //     {
            //       params: {
            //         clip: selectedSpeakerIdx, // axis list 해당 key
            //         audiooutput: 1,
            //         volume: 10
            //       },
            //       headers: {
            //         // 'Authorization': 'Basic ' + btoa('root:root'),
            //         // 'Content-Type': 'multipart/form-data'
            //       },
            //     }
            //   );
            //   console.log(response);

            
        
    }
 
    const handleAddSpeakerMsg = async() => {

        try {
            const res = await apiAddSpeakerMacro({speakerMessage: text})
       
            if(res.message === "ok"){
             mutate()
             setAddVoiceMsg(false)
             generateSpeech(text)
            }
        } catch(err){
            console.log(err)
        }finally {
            setText('')
        }
      
    }

    const handleDeleteSpeakerMsg = async() => {
        try{
            if(!selectedRow)return
            const res = await apiDeleteSpeakerMacro({speakerMessageIdx:selectedRow.speaker_idx})
            mutate()
        }catch(err){
            console.log(err)
        }finally{
            setIsDelete(false)
        }
    }

    return (
        <div className="border rounded-lg">
            <div className="flex justify-between items-center px-3 py-3 border-b-2">
                <p className="font-bold">저장 문구</p>
                {!addVoiceMsg && (
                    <IoAddCircleOutline
                        className="cursor-pointer"
                        size={25}
                        onClick={() => setAddVoiceMsg(true)}
                    />
                )}
            </div>

            <ScrollBar className="max-h-[500px]">
                <div className="px-3">
                    {addVoiceMsg && (
                        <div className="bg-[#dde8f3] m-2">
                            <div className="flex justify-between items-center w-[%] mx-auto border border-b-slate-50">
                                <p className="font-bold py-2 ml-2">문구 추가</p>
                                <GoXCircle
                                    className="mr-2 cursor-pointer"
                                    size={20}
                                    color="red"
                                    onClick={() => setAddVoiceMsg(false)}
                                />
                            </div>
                            <div>
                                <textarea
                                    className="w-full resize-none focus:outline-none bg-[#dde8f3] pl-3 pt-2"
                                    rows={3}
                                    value={text}
                                    style={{ outline: 'none', resize: 'none' }}
                                    placeholder="추가할 문구를 입력하세요."
                                    onChange={(e)=> setText(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end items-center h-10 border border-t-slate-100 ">
                                <button className="w-[80px] h-[28px] mr-2  bg-[#17A36F] text-white  rounded hover:bg-[#80d8b8]"
                                    onClick={()=>{
                                        handleAddSpeakerMsg()
                                    }}>
                                    문구 저장
                                </button>
                            </div>
                        </div>
                    )}
                    {_.isEmpty(speakerList?.result) ? <div className='flex justify-center items-center mt-10'>등록된 음성 문구가 없습니다.</div> : speakerList?.result.map((item:{speaker_idx: number; speaker_msg: string}) => {
                
                        return (
                            <div
                                key={item.speaker_idx}
                                className="flex items-center p-2 pt-4"
                            >
                                <div className="w-[8%]">
                                    <input
                                        type="checkbox"
                                        className="w-[15px] h-[15px]"
                                        checked={selectedRow?.speaker_idx === item.speaker_idx}
                                        onChange={() => {
                                            handleCheckboxChange(item)
                                        }}
                                    />
                                </div>
                                <p className="w-[80%] mb-1">
                                    {/* {item.message} */}
                                    {editingRow === item.speaker_idx ? (
                                        <Controller
                                            name="message"
                                            control={control}
                                            defaultValue={item.speaker_msg}
                                            render={({ field }) => (
                                                <input
                                                    {...field}
                                                    className="border px-2 py-1 w-[170px] mt-1"
                                                />
                                            )}
                                        />
                                    ) : (
                                        item.speaker_msg
                                    )}
                                </p>
                                {/* <button
                                    className="w-[95px] h-[25px] border border-gray-200 bg-[#EDF0F6]"
                                    onClick={() => handleSpeak(item.speaker_msg)}
                                >
                                    미리듣기
                                </button> */}
                                {item.speaker_idx < items.length - 1 && (
                                    <hr className="my-2 border-t border-gray-300" />
                                )}
                            </div>
                        )
                    })}

              
                </div>
            </ScrollBar>
            <div className="flex justify-end items-center gap-2 mt-10 mb-5 pt-2  border-t-2">
                <button
                    type="submit"
                    className=" w-[100px] h-[34px] mt-2 bg-[#aeafb1] text-white px-4 py-2 rounded hover:bg-[#b0b3b9]"
                    onClick={() => setIsDelete(true)}
                >
                    삭제
                </button>
                {editingRow === 0 || editingRow ? (
                    <button
                        type="submit"
                        className=" w-[100px] h-[34px] mt-2 bg-[#17A36F] text-white px-4 py-2 mr-4 rounded hover:bg-[#80d8b8]"
                        onClick={handleSubmit(handleSave)}
                    >
                        수정 완료
                    </button>
                ) : (
                    <button
                        type="submit"
                        className=" w-[100px] h-[34px] mt-2 bg-[#17A36F] text-white px-4 py-2 mr-4 rounded hover:bg-[#80d8b8]"
                        onClick={() => selectedRow && handleEdit(selectedRow)}
                    >
                        수정
                    </button>
                )}
            </div>
            {isDelete && (
                <DeleteConfirm
                    show={isDelete}
                    title="문구"
                    contents="스피커 음성 문구"
                    onClose={handleClose}
                    onConfirm={handleDeleteSpeakerMsg}
                />
            )}
        </div>
    )
}

export default BroadcastVoiceMsgSetting



