import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { Button } from '@/components/ui';
import { apiCreateSOPStage } from '@/services/ObserverService';
import { AddMode } from './SOPStageSetting';

type Props = {
  sopIdx: number;
  sopStage: number;
  children?: ReactNode;
  addMode: AddMode;
  setAddMode: Dispatch<SetStateAction<AddMode>>;
  selectedSOPStageIdx: number | null;
  addStageMode?: boolean;
  setAddStageMode?: Dispatch<SetStateAction<boolean>>;
}

export default function SOPStageSettingAdd({
  sopIdx,
  sopStage,
  children,
  addMode,
  setAddMode,
  addStageMode,
  setAddStageMode
}: Props) {

  const [addStageName, setAddStageName] = useState<string | null>(null);
  const [addStageDescription, setAddStageDescription] = useState<string | null>(null);

  const handleChangeAddName = (e: ChangeEvent<HTMLInputElement>) => {
    setAddStageName(e.target.value);
  };

  const handleChangeAddDescription = (e: ChangeEvent<HTMLInputElement>) => {
    setAddStageDescription(e.target.value);
  };

  const resetEditInput = () => {
    setAddStageName(null);
    setAddStageDescription(null);
    setAddMode({
      stage: sopStage,
      enable: false
    });
    if (addStageMode && setAddStageMode) {
      setAddStageMode(!addStageMode);
    };
  };

  const handleCreateSOPStage = async (sopStage: number) => {
    try {
      if (addStageName == null || addStageDescription == null) {
        return;
      }
      const result = await apiCreateSOPStage({
        sopIdx,
        sopStage,
        sopStageName: addStageName,
        sopStageDescription: addStageDescription
      });
      if (result === 'Created') {
        resetEditInput();
      }
    } catch (error) {
      console.error(error);
    };
  };
  return (
    <div>
      {children}
      {(addMode.stage === sopStage && addMode.enable) && (
        <div className='flex justify-between ml-1 mt-1'>
          <input
            required
            className={'w-[8.625rem] h-[1.625rem] bg-[#EDF0F6] mr-1.5 flex justify-center items-center pl-3'}
            value={addStageName || ''}
            placeholder='입력하세요.'
            onChange={handleChangeAddName}
          />
          <div className='flex justify-between w-[32.1875rem]'>
            <input
              required
              className={'w-[25.125rem] h-[1.625rem] bg-[#EDF0F6] flex justify-center items-center pl-2'}
              value={addStageDescription || ''}
              placeholder='상세 내용을 입력하세요.'
              onChange={handleChangeAddDescription}
            />
            <div className='flex items-center gap-x-2'>
              <Button
                className='w-[2.875rem] h-[1.375rem] border-[1.5px] border-solid border-[#D9DCE3] text-sm rounded-sm flex justify-center items-center text-[#B3B3B3]'
                onClick={() => {
                  resetEditInput();
                }}
              >
                취소
              </Button>
              <Button
                className='w-[2.875rem] h-[1.375rem] border-[1.5px] border-solid border-[#D9DCE3] text-sm rounded-sm flex justify-center items-center text-[#17A36F]'
                disabled={!addStageName || !addStageDescription}
                onClick={() => handleCreateSOPStage(sopStage)}
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}