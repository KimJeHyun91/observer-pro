import { Button, Input, ScrollBar } from '@/components/ui';
import { MdOutlineFileUpload } from 'react-icons/md';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { apiAddAudioFile, apiDeleteAudioFile, apiModifyAudioFile } from '@/services/BroadcastService';
import { useBroadcastAudioFileList } from '@/utils/hooks/useBroadcast';
import DeleteConfirm from '../modals/DeleteConfirm';

interface AudioFileList {
    audio_id: number;
    audio_file_name: string;
}

const BroadcastFileUploadSetting = () => {
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isDeleteFiles, setIsDeleteFiles] = useState(false);
  const [selectedFileForEdit, setSelectedFileForEdit] = useState<any | null>(null); 
  const [isEditMode, setIsEditMode] = useState(false);
  const { fileList, mutate } = useBroadcastAudioFileList();

  useEffect(() => {
    mutate();
  }, []);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const fileInputSubmit = async (e: ChangeEvent<HTMLInputElement>) => {
    const targetFile: any = e.target.files?.[0];

    const formData = new FormData();
    formData.append('file', targetFile);
    if (!targetFile) return;

    await apiAddAudioFile(formData);
    mutate();
  };

  const handleCheckboxChange = (event: any, value: any) => {
    if (event.target.checked) {
      setSelectedFiles((prev) => {
        const newSelectedFiles = [...prev, value];
    
        if (newSelectedFiles.length === 1) {
          setSelectedFileForEdit(fileList?.result.find((file: any) => file.idx === value));
        }
        return newSelectedFiles;
      });
    } else {
      setSelectedFiles((prev) => {
        const newSelectedFiles = prev.filter((item) => item !== value);
 
        if (selectedFileForEdit?.idx === value) {
          setSelectedFileForEdit(null);
        }
        return newSelectedFiles;
      });
    }
  };

  const handleDeletedFiles = async () => {
    try {
      const res = await apiDeleteAudioFile(selectedFiles);
      if (res.message === 'ok') {
        setIsDeleteFiles(false);
      }
      mutate();
    } catch (err) {
      console.log(err);
    }
  };

  const onSubmit = async () => {
    if (selectedFileForEdit) {
      try {
        await apiModifyAudioFile({ audioFileIdx: selectedFileForEdit.idx, audioFileName: selectedFileForEdit.audio_file_name });
        mutate();
        setSelectedFileForEdit(null);
        setIsEditMode(false); 
        setSelectedFiles([]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFileNameEditClick = () => {
    if (selectedFiles.length === 1) {
      setIsEditMode(!isEditMode);
    }
    if (isEditMode && selectedFileForEdit) {
      onSubmit();
    }
  };

  return (
    <div className="border rounded-lg">
      <div className="flex justify-between items-center px-3 py-3 border-b-2">
        <p className="font-bold">음원 파일 목록</p>
      </div>
      <div className="flex justify-center items-center px-3 py-5 m-2 bg-[#edf0f6] dark:bg-gray-500">
        <Button
          className="flex justify-center items-center cursor-pointer"
          onClick={handleButtonClick}
        >
          <p className="mr-2">음원 파일 업로드</p>
          <MdOutlineFileUpload size={20} />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={fileInputSubmit}
            accept=".mp3, .wav"
          />
        </Button>
      </div>

      <ScrollBar className="max-h-[350px] mx-3 mt-5">
        {fileList?.result.sort((a, b) => a.idx - b.idx)?.map((file: any) => {
          return (
            <div className="flex items-center justify-between p-3 border-b border-gray-300 mx-3" key={file?.idx}>
              <div className="flex items-center">          
                <input
                  type="checkbox"
                  className="w-[15px] h-[15px]"
                  checked={selectedFiles.includes(file.idx)}
                  onChange={(e) => handleCheckboxChange(e, file.idx)}
                />
                {isEditMode && selectedFileForEdit?.idx === file?.idx ? (
                  <div className="mt-2 mx-4">
                    <Input
                      type="text"
                      value={selectedFileForEdit?.audio_file_name}
                      onChange={(e) =>
                        setSelectedFileForEdit((prev: any) => ({
                          ...prev,
                          audio_file_name: e.target.value,
                        }))
                      }
                      className="w-[520px]"
                    />
                  </div>
                ) : (
                  <div className='flex w-[650px] justify-between items-center'>
                    <p className="ml-5">{file?.audio_file_name}</p>
                    <button
                      className="bg-[#efeff1] dark:bg-gray-500 px-2 py-1"
                      onClick={() => {
                        const audio = document.getElementById(`audio-${file.idx}`) as HTMLAudioElement;
                        if (audio) {
                          audio.play();
                        }
                      }}
                    >
                      미리듣기
                    </button>

                    <audio id={`audio-${file.idx}`} style={{ display: 'none' }}>
                      <source src={`http://${window.location.hostname}:4200/files/vb_audio/${file?.audio_file}`} type="audio/mp3" />
                    </audio>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </ScrollBar>

      <div className="flex justify-end items-center gap-2 mt-10 mb-5 pt-2 border-t-2">
        <button
          type="submit"
          className="w-[100px] h-[34px] mt-2 bg-[#aeafb1] text-white px-4 py-1 rounded hover:bg-[#b0b3b9]"
          onClick={() => setIsDeleteFiles(true)}
        >
          삭제
        </button>

        <Button
          type="button"
          className="w-[150px] h-[34px] mt-2 bg-[#17A36F] dark:bg-[#17a36f] text-white px-4 py-1 mr-4 rounded hover:bg-[#80d8b8]"
          disabled={selectedFiles.length !== 1} 
          onClick={handleFileNameEditClick}
        >
          {isEditMode ? '수정 완료' : '파일 이름 수정'}
        </Button>
      </div>

      <DeleteConfirm
        show={isDeleteFiles}
        title=""
        contents="음원파일"
        onClose={() => setIsDeleteFiles(false)}
        onConfirm={handleDeletedFiles}
      />
    </div>
  );
};

export default BroadcastFileUploadSetting;
