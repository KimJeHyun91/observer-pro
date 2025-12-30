import { Button } from '@/components/ui';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ModalConfirmType } from '@/@types/modal';
import { useSOPStageList } from '@/utils/hooks/useSOPStageList';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import Loading from '@/components/shared/Loading';
import ModalConfirm from '@/views/main/modals/ModalConfirm';
import SOPStageSettingAdd from './SOPStageSettingAdd';
import SOPStageSettingModify from './SOPStageSettingModify';
import { useSOPList } from '@/utils/hooks/useSOPList';
import EditSOPDetailName from './EditSOPDetailName';
import { AddMode } from './SOPStageSetting';
import { apiRemoveSOPStage } from '@/services/ObserverService';
import { SOP } from '@/@types/main';

type Props = {
  selectedSOP: SOP;
  close: () => void;
};

type SelectedSOPStageIdx = number | null;
type ToRemoveSOPStage = {
  sop_idx: number;
  sop_stage: number;
};

export default function EditSOPDetail({
  selectedSOP: {
    idx,
    sop_name
  },
  close
}: Props) {
  const { socketService } = useSocketConnection();
  const { isLoading: isLoadingSOPStage, data: SOPStageData, error: errorSOPStage, mutate: mutateSOPStage } = useSOPStageList(idx);
  const { error: errorSOP, data: SOPData, mutate: mutateSOP } = useSOPList(idx);
  const [addMode, setAddMode] = useState<AddMode>({
    stage: null,
    enable: false
  });
  const toRemoveSOPStage = useRef<ToRemoveSOPStage | null>(null);
  const selectedSOPStageIdx = useRef<SelectedSOPStageIdx>(null);
  const [modifyMode, setModifyMode] = useState<boolean>(false);
  const [addStageMode, setAddStageMode] = useState<boolean>(false);
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');


  if (errorSOPStage) {
    console.error('SOP stage list error');
  };

  if (errorSOP) {
    console.error('SOP list error');
  };

  const SOPStageList = SOPStageData?.result;
  const SOPList = SOPData?.result;

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const handleShowRemoveSOPStageAllConfirm = (index: number) => {
    toRemoveSOPStage.current = {
      sop_idx: idx,
      sop_stage: index
    };
    const confirmMessage = `SOP ${index}단계를 삭제하시겠습니까?`
    setConfirmMsg(confirmMessage);
    toggleModalConfirm({
      show: true,
      title: `SOP ${index}단계 삭제`,
      type: 'delete'
    });
  };

  const updateSelectSOPStageIdx = (SOPStageIdx: number | null) => {
    selectedSOPStageIdx.current = SOPStageIdx;
  };

  const handleRemoveSOPStageAll = async () => {
    if (toRemoveSOPStage.current == null) {
      return;
    }
    try {
      await apiRemoveSOPStage({
        sopIdx: toRemoveSOPStage.current.sop_idx,
        sopStage: toRemoveSOPStage.current.sop_stage
      })
      toRemoveSOPStage.current = null;
      setConfirmMsg('');
      toggleModalConfirm({
        show: false,
        title: '',
        type: ''
      });
      if (addStageMode) {
        setAddStageMode(!addStageMode);
      };
    } catch (error) {
      console.error(error);
    };
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }

    const SOPStageSocket = socketService.subscribe('cm_sop_stage-update', (received) => {
      if (received.SOPStage.create && received.SOPStage.create.sop_idx === idx) {
        mutateSOPStage();
        mutateSOP();
      };
      if (received.SOPStage.modify && received.SOPStage.modify.sop_idx === idx) {
        mutateSOPStage();
      };
      if (received.SOPStage.remove && received.SOPStage.remove.sop_idx === idx) {
        mutateSOP();
        mutateSOPStage();
      };
    });

    return () => {
      SOPStageSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  useEffect(() => {
    if (SOPStageList?.length === 0 && close) {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SOPStageList])

  if (isLoadingSOPStage || !SOPStageList || !Array.isArray(SOPStageList) || !SOPList || !Array.isArray(SOPList)) {
    return (
      <section className='w-[45rem] max-h-[52.9375rem] bg-[#EBECEF] rounded mt-3 relative -left-1 p-3'>
        <Loading loading={isLoadingSOPStage} />
      </section>
    )
  } else if (SOPStageList && SOPStageList.length > 0 && SOPList && SOPList[0].count) {
    const stage = SOPList![0].count;
    const emptyArray = Array.from({ length: stage }, (v, i) => i + 1);

    return (
      <section className='w-[45rem] max-h-[52.9375rem] bg-[#EBECEF] rounded mt-3 relative -left-1 p-3'>
        <EditSOPDetailName
          idx={idx}
          sop_name={sop_name}
        />
        <div className='scroll-container overflow-x-hidden overflow-y-auto max-h-[40rem] gap-1'>
          {emptyArray.map((index) => (
            <div
              key={index}
              className='mt-2'
            >
              <div className='flex justify-around items-center w-full'>
                <p className='text-[#4A4A4A] w-[34.125rem] h-[2rem] pl-3 font-semibold bg-white border-[1px] border-[#D9DCE3] border-solid rounded-sm flex items-center'>SOP {index} 단계</p>
                <Button
                  className='w-[7.5rem] h-[1.75rem] border-2 border-solid border-[#D9DCE3] rounded-sm text-sm text-[#D76767] flex justify-center items-center'
                  onClick={() => handleShowRemoveSOPStageAllConfirm(index)}
                >
                  SOP {index}단계 삭제
                </Button>
              </div>
              <div className='w-full min-h-[5.625rem] border-[1px] border-solid border-[#D9DCE3] bg-white p-2 mt-2'>
                <div className='flex text-[#4A4A4A] justify-center'>
                  <div className={`w-[8.625rem] h-[1.625rem] bg-[#D9DCE3] mr-1.5 flex justify-center items-center font-semibold`}>목록</div>
                  <div className={`w-[32.1875rem] h-[1.625rem] bg-[#D9DCE3] flex justify-center items-center font-semibold`}>상세 내용</div>
                </div>
                <div className='flex flex-col justify-between ml-1 mt-1 scroll-container overflow-x-hidden overflow-y-auto max-h-[5rem] gap-1'>
                  {SOPStageList.filter((SOPStage) => SOPStage.sop_stage === index).map((SOPStage) => (
                    <Fragment
                      key={SOPStage.idx}
                    >
                      <SOPStageSettingModify
                        selectedSOPStageIdx={selectedSOPStageIdx.current}
                        idx={SOPStage.idx}
                        sop_stage_name={SOPStage.sop_stage_name}
                        sop_stage_description={SOPStage.sop_stage_description}
                        updateSelectSOPStageIdx={updateSelectSOPStageIdx}
                        setModifyMode={setModifyMode}
                      />
                    </Fragment>
                  ))}
                </div>
                <SOPStageSettingAdd
                  sopIdx={idx}
                  sopStage={index}
                  addMode={addMode}
                  selectedSOPStageIdx={selectedSOPStageIdx.current}
                  setAddMode={setAddMode}
                />
                <Button
                  disabled={addMode.enable || modifyMode}
                  className='text-[#647DB7] flex justify-center items-center m-auto border-2 border-[#D9DCE3] border-solid rounded-sm w-[40.875rem] h-[1.75rem] mt-2'
                  onClick={() => setAddMode({
                    stage: index,
                    enable: !addMode.enable
                  })}
                >
                  내용 추가
                </Button>
              </div>
            </div>
          ))
          }
          {addStageMode && (
            <div className='w-full min-h-[5.625rem] border-[1px] border-solid border-[#D9DCE3] bg-white p-2 mt-2'>
              <SOPStageSettingAdd
                sopIdx={idx}
                sopStage={stage + 1}
                addMode={addMode}
                selectedSOPStageIdx={selectedSOPStageIdx.current}
                setAddMode={setAddMode}
                addStageMode={addStageMode}
                setAddStageMode={setAddStageMode}
              >
                <div>
                  <div className='flex w-full h-[2rem] border-[1px] border-[#D9DCE3] border-solid bg-white rounded-sm items-center mb-2 justify-between'>
                    <p className='text-[#4A4A4A] pl-3 font-semibold'>{`SOP ${stage + 1} 단계`}</p>
                    <Button
                      className='h-[1.5rem] w-[3rem] border-2 border-solid border-[#D9DCE3] rounded-sm flex justify-center items-center mr-2'
                      onClick={() => setAddStageMode(!addStageMode)}
                    >
                      취소
                    </Button>
                  </div>
                  <div>
                    <div className='flex text-[#4A4A4A] justify-center'>
                      <div className={`w-[8.625rem] h-[1.625rem] bg-[#D9DCE3] mr-1.5 flex justify-center items-center font-semibold`}>목록</div>
                      <div className={`w-[32.1875rem] h-[1.625rem] bg-[#D9DCE3] flex justify-center items-center font-semibold`}>상세 내용</div>
                    </div>
                  </div >
                </div>
              </SOPStageSettingAdd>
              <Button
                disabled={addMode.enable || modifyMode}
                className='text-[#647DB7] flex justify-center items-center m-auto border-2 border-[#D9DCE3] border-solid rounded-sm w-[40.875rem] h-[1.75rem] mt-2'
                onClick={() => setAddMode({
                  stage: stage + 1,
                  enable: true
                })}
              >
                내용 추가
              </Button>
            </div>
          )}
          <Button
            disabled={addMode.enable || modifyMode}
            className='w-[42.375rem] h-[2.25rem] text-[#647DB7] flex justify-center items-center border-2 border-solid border-[#D9DCE3] rounded-sm mt-2'
            onClick={() => setAddStageMode(!addStageMode)}
          >
            SOP 단계 추가
          </Button>
          {modalConfirm.show && (
            <ModalConfirm
              modal={modalConfirm}
              toggle={toggleModalConfirm}
              confirm={handleRemoveSOPStageAll}
            // loading={loading}
            >
              <p>{confirmMsg}</p>
            </ModalConfirm>
          )}
        </div>
      </section>
    )
  }
};