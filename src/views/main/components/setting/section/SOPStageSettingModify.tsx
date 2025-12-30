import { Button } from '@/components/ui';
import { apiModifySOPStage, apiRemoveSOPStage } from '@/services/ObserverService';
import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';

type SelectedSOPStageIdx = number | null;

type Props = {
  idx: number;
  selectedSOPStageIdx: SelectedSOPStageIdx;
  sop_stage_name: string;
  sop_stage_description: string;
  updateSelectSOPStageIdx: (SOPStageIdx: number | null) => void;
  setModifyMode: Dispatch<SetStateAction<boolean>>;
};

export default function SOPStageSettingModify({
  idx,
  sop_stage_name,
  sop_stage_description,
  selectedSOPStageIdx,
  updateSelectSOPStageIdx,
  setModifyMode,
}: Props) {
  const [editStageName, setEditStageName] = useState<string | null>(null);
  const [editStageDescription, setEditStageDescription] = useState<string | null>(null);
  const handleChangeEditName = (e: ChangeEvent<HTMLInputElement>) => {
    setEditStageName(e.target.value);
  };

  const handleChangeEditDescription = (e: ChangeEvent<HTMLInputElement>) => {
    setEditStageDescription(e.target.value);
  };

  const resetEdit = () => {
    setEditStageName(null);
    setEditStageDescription(null);
    updateSelectSOPStageIdx(null);
    setModifyMode(false);
  };

  const handleSaveModifySOPStage = async (SOPStageIdx: number, SOPStageName: string, SOPStageDescription: string) => {
    try {
      if (SOPStageName === editStageName && SOPStageDescription === editStageDescription) {
        return;
      }
      const result = await apiModifySOPStage({
        idx: SOPStageIdx,
        sopStageName: editStageName || SOPStageName,
        sopStageDescription: editStageDescription || SOPStageDescription
      });
      if (result === 'OK') {
        resetEdit();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveSOPStage = async (SOPStageIdx: number) => {
    try {
      await apiRemoveSOPStage({
        idx: SOPStageIdx
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      key={idx}
      className='flex h-[1.625rem]'
    >
      <input
        required
        disabled={selectedSOPStageIdx !== idx}
        className={'w-[8.625rem] h-full bg-[#EDF0F6] mr-1.5 flex justify-center items-center pl-3'}
        value={editStageName ?? sop_stage_name}
        placeholder='입력하세요.'
        onChange={handleChangeEditName}
      />
      <div className='flex w-[31.9rem]'>
        <input
          required
          disabled={selectedSOPStageIdx !== idx}
          className={'w-[25.125rem] h-full bg-[#EDF0F6] flex justify-center items-center pl-3'}
          value={editStageDescription ?? sop_stage_description}
          placeholder='상세 내용을 입력하세요.'
          onChange={handleChangeEditDescription}
        />
        <div className='flex items-center gap-x-2 ml-2'>
          <Button
            disabled={selectedSOPStageIdx != null}
            className='w-[2.875rem] h-[1.375rem] border-[1.5px] border-solid border-[#D9DCE3] text-sm rounded-sm flex justify-center items-center text-[#D76767]'
            onClick={() => handleRemoveSOPStage(idx)}
          >
            삭제
          </Button>
          {selectedSOPStageIdx !== idx ? (
            <Button
              className='w-[2.875rem] h-[1.375rem] border-[1.5px] border-solid border-[#D9DCE3] text-sm rounded-sm flex justify-center items-center text-[#17A36F]'
              onClick={() => {
                updateSelectSOPStageIdx(idx);
                setModifyMode(true);
              }}
            >
              수정
            </Button>
          ) : (
            <Button
              className='w-[2.875rem] h-[1.375rem] border-[1.5px] border-solid border-[#D9DCE3] text-sm rounded-sm flex justify-center items-center text-[#17A36F]'
              disabled={!editStageName && !editStageDescription}
              onClick={() => handleSaveModifySOPStage(idx, sop_stage_name, sop_stage_description)}
            >
              저장
            </Button>
          )}
        </div>
      </div>
    </div>
  );

}