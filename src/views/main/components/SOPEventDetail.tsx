import { useEffect, useRef, useState } from 'react';
import { LuMapPin } from "react-icons/lu";
import { IoCheckmarkCircleOutline, IoClose } from "react-icons/io5";
import { GiPlainCircle } from "react-icons/gi";
import EventTypeIcon from '@/components/common/eventTypeIcon';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { formatSeverityId, severityColor } from '../service/severity';
import { formatDateTime } from '../service/formatDateTimeString';
import SOPArchiveStream from './SOPArchiveStream';
import { ServiceType } from '@/@types/common';
import { Button } from '@/components/ui';
import { ModalConfirmType } from '@/@types/modal';
import ModalConfirm from '../modals/ModalConfirm';
import { apiAckEvent, apiCreateFalseAlarm } from '@/services/ObserverService';
import { useSessionUser } from '@/store/authStore';
import CustomModal from '../modals/CustomModal';
import FalseAlarmSettingEvent from './FalseAlarmSettingEvent';
import { useSOPList } from '@/utils/hooks/useSOPList';
import { useSOPStageList } from '@/utils/hooks/useSOPStageList';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

type Props = {
  SOPIdx: number;
  eventIdx: number | null;
  eventName: string | null;
  occurDateTime: string | null;
  location: string | null;
  outsideIdx: number | null;
  insideIdx: number | null;
  dimensionType?: string | null;
  eventTypeId: number | null;
  severityId: 0 | 1 | 2 | 3 | null;
  mapImageURL: string | null;
  eventCameraId: string | null;
  mainServiceName: ServiceType;
  mode?: 'dashboard' | 'map';
  close: () => void;
};

type FalseAlarmModal = {
  show: boolean;
  title: string;
  width: number;
  height: number;
};

export type FalseAlram = {
  idx: number | null;
  type: string | null;
};

const EVENT_DESCRIPTION_TYPE = 'text-[#B3B3B3] dark:text-[#4E4A4A] text-sm';

export default function SOPEventDetail({
  SOPIdx,
  eventIdx,
  eventName,
  occurDateTime,
  location,
  outsideIdx,
  insideIdx,
  dimensionType,
  eventTypeId,
  severityId,
  mapImageURL,
  eventCameraId,
  mainServiceName,
  mode,
  close
}: Props) {
  const { socketService } = useSocketConnection();
  const { data: SOPStageData } = useSOPStageList(SOPIdx);
  const { data: SOPData } = useSOPList(SOPIdx);
  const SOPList = SOPData?.result;
  const SOP_Stage = SOPStageData?.result;
  const { setCanvasMapState } = useCanvasMapStore();
  const { user: { userId } } = useSessionUser();
  const [ackCount, setAckCount] = useState<number>(0);
  const [isAck, setIsAck] = useState<boolean>(false);
  const [isFalseAlarm, setIsFalseAlarm] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState<string>('');
  const [falseAlarmModal, setFalseAlarmModal] = useState<FalseAlarmModal>({
    show: false,
    title: '',
    width: 390,
    height: 464
  });
  const [falseAlarmValue, setFalseAlramValue] = useState<FalseAlram>({
    idx: null,
    type: null
  });
  const falseAlarmIdx = useRef<number | null>(null);

  const handleAllAck = () => {
    if (SOPList && SOPList[0] == null) {
      return;
    };
    setIsAck((prev) => !prev);
  };

  const toggleConfirm = ({ show, title, type }: ModalConfirmType) => {
    setConfirmClear({
      show,
      title,
      type
    });
  };

  const updateFalseAlarm = (idx: number | null, type: string) => {
    setFalseAlramValue({
      idx,
      type
    });
  };

  const clearSOPEvent = async () => {

    if (userId == null || eventIdx == null) {
      return;
    }
    let newFalseAlarmIdx;
    if (falseAlarmValue.type && falseAlarmValue.idx == null) {
      const result = await apiCreateFalseAlarm({
        type: falseAlarmValue.type
      });
      if (result && Array.isArray(result) && result[0]) {
        updateFalseAlarm(result[0].idx, falseAlarmValue.type);
        newFalseAlarmIdx = result[0].idx;
      };
    }

    try {
      const result = await apiAckEvent({
        idxArray: [{ idx: eventIdx }],
        userId: userId,
        falseAlarmIdx: newFalseAlarmIdx || falseAlarmIdx.current,
        ackCount,
        isSOP: true
      });
      if (result === 'OK') {
        toggleConfirm({
          show: false,
          title: '',
          type: ''
        });
        close();
      };
    } catch (error) {
      console.error(error);
    };
  };

  const toggleIsFalseAlarm = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.datatype === 'falseAlarmValue') {
      return;
    };
    if (target.tagName === 'svg' && target.getAttribute('values') === 'rmFalseAlaramValue') {
      return;
    };
    setIsFalseAlarm((prev) => !prev);
    setFalseAlarmModal({
      show: true,
      title: '오탐 처리 설정',
      width: 390,
      height: 464
    });
  };

  const cancelNewFalseAlarm = (falseAlarmValue: FalseAlram) => {
    if (falseAlarmValue.type) {
      setFalseAlramValue({
        idx: null,
        type: null
      });
    }
  }

  const closeFalseAlarmModal = () => {
    setFalseAlarmModal({
      show: false,
      title: '',
      width: 390,
      height: 464
    });
  };

  useEffect(() => {
    if (falseAlarmValue.idx) {
      falseAlarmIdx.current = falseAlarmValue.idx;
    };
  }, [falseAlarmValue.idx]);

  useEffect(() => {
    if (!socketService) {
      return;
    };

    const SOPSocket = socketService.subscribe('ob_events-SOP', (received) => {
      if (received == null || received.SOPEvent == null) {
        return;
      };

      if (received.SOPEvent.eventIdx && received.SOPEvent.isAck && received.SOPEvent.eventIdx === eventIdx) {
        close();
      };
    });

    return () => {
      SOPSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  if (SOPList && Array.isArray(SOPList) && SOPList[0] && SOP_Stage && eventName && occurDateTime && eventTypeId && severityId) {
    const stage = SOPList[0].count;
    const StageArray = Array.from({ length: stage }, (v, i) => i + 1);
    return (
      <>
        <section className='p-4'>
          <div className='flex justify-between items-center'>
            <div className='flex items-center'>
              <div
                className={`w-[62px] h-[62px] rounded-sm flex justify-center items-center`}
                style={{
                  backgroundColor: severityColor(severityId)
                }}
              >
                <EventTypeIcon eventTypeId={eventTypeId} size={52} />
              </div>
              <p className='text-[#4E4A4A] text-lg font-bold ml-2 dark:text-[#F5F5F5]'>{location ?? '실외'} {eventName}</p>
            </div>
            <LuMapPin
              className={`p-2.5 bg-[#B6BBC4] rounded border-[1px] border-[#C6D0E6] cursor-pointer ${mode === 'dashboard' ? 'bg-[#EDEEF1] dark:bg-[#333333] cursor-no-drop' : ''}`}
              size={50}
              color='white'

              onClick={() => {
                if (outsideIdx == null || insideIdx == null || !location || mode === 'dashboard') {
                  return;
                };
                const current = useCanvasMapStore.getState();
                if (dimensionType === '2d') {
                  setCanvasMapState({
                    ...current,
                    buildingIdx: outsideIdx,
                    floorIdx: insideIdx,
                    buildingName: location.split(' ')[0],
                    floorName: location.split(' ')[1],
                    mainServiceName: 'origin',
                    mapImageURL: mapImageURL ? `http://${window.location.hostname}:4200/images/${outsideIdx === 0 ? 'buildingplan' : 'floorplan'}/${mapImageURL}` : `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
                    is3DView: false
                  });
                } else {
                  setCanvasMapState({
                    ...current,
                    threeDModelId: outsideIdx,
                    floorIdx: insideIdx,
                    buildingName: location.split(' ')[0],
                    floorName: location.split(' ')[1],
                    mainServiceName: 'origin',
                    mapImageURL: mapImageURL ? `http://${window.location.hostname}:4200/images/${outsideIdx === 0 ? 'buildingplan' : 'floorplan'}/${mapImageURL}` : `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
                    is3DView: true
                  });
                }
              }}
            />
          </div>
          <div className='w-[65.875rem] border-2 border-[#EDF0F6] mx-auto my-3' />
          <section className='w-full h-[2.25rem] rounded-sm bg-[#EBECEF] flex items-center'>
            <div className='w-[29%] flex justify-center'>
              <span className={EVENT_DESCRIPTION_TYPE}>발생 이벤트</span>
              <div className='w-[1px] h-[22px] bg-[#FFFFFF] mx-3' />
              <p title={eventName} className='text-[#4E4A4A] font-semibold overflow-hidden whitespace-nowrap text-ellipsis'>{eventName}</p>
            </div>
            <div className='w-[29%] flex justify-center'>
              <span className={EVENT_DESCRIPTION_TYPE}>위치</span>
              <div className='w-[1px] h-[22px] bg-[#FFFFFF] mx-3' />
              <p title={location ?? '실외'} className='text-[#4E4A4A] font-semibold overflow-hidden whitespace-nowrap text-ellipsis max-w-[10rem]'>{location ?? '실외'}</p>
            </div>
            <div className='w-[24%] flex justify-center'>
              <span className={EVENT_DESCRIPTION_TYPE}>발생 날짜/시간</span>
              <div className='w-[1px] h-[22px] bg-[#FFFFFF] mx-1.5' />
              <p className='text-[#4E4A4A] font-semibold'>{formatDateTime(occurDateTime)}</p>
            </div>
            <div className='w-[18%] flex justify-center'>
              <span className={EVENT_DESCRIPTION_TYPE}>이벤트 중요도</span>
              <div className='w-[1px] h-[22px] bg-[#FFFFFF] mx-3' />
              <p style={{ color: `${severityColor(severityId)}` }} className='font-semibold'>{formatSeverityId(severityId)}</p>
            </div>
          </section>
          <section className='flex my-3 h-[30.4375rem] justify-between'>
            <div className='w-[44.375rem] h-full rounded-sm border-[1px] border-[#B6BBC4]'>
              <div className='w-full h-[1.625rem] bg-[#B6BBC4] text-white dark:text-[#4e4a5a] flex items-center pl-4 text-wthie font-semibold '>
                실시간 CCTV
              </div>
              <div className='bg-[#000000] w-full h-[28.8125rem]'>
                {eventCameraId && (
                  <SOPArchiveStream
                    main_service_name={mainServiceName}
                    vms_name={eventCameraId.split(':')[1]}
                    camera_id={eventCameraId.split(':')[2]}
                    service_type={eventCameraId.split(':')[3]}
                    start_datetime={occurDateTime}
                  />
                )}
              </div>
            </div>
            <div className='w-[20.25rem] h-full rounded-sm bg-[#EBECEF] pb-2'>
              <div className='w-full h-[1.625rem] bg-[#B6BBC4] flex items-center pl-2.5 text-whtie font-semibold dark:text-[#4E4A4A]'>
                SOP 상황 처리 절차
              </div>
              <div className='border-[1px] border-[#C6C9D0] rounded-sm bg-white w-[19.75rem] h-[1.5rem] flex justify-center items-center mx-auto mt-2 mb-2.5'>
                <p className='text-[#D76767] font-semibold'>{SOPList[0].sop_name}</p>
              </div>
              <ul className='h-[22.85rem] scroll-container overflow-x-hidden overflow-y-auto'>
                {StageArray.map((stage, index) => (
                  <li
                    key={index}
                    className='mb-2'
                  >
                    <h5
                      className='text-xs h-[1.25rem] border-[1px] border-[#C6C9D0] rounded-sm bg-white w-[19.75rem] flex justify-center items-center mx-auto mb-1.5 dark:text-[#4E4A4A]'>
                      SOP {index + 1}단계
                    </h5>
                    <div className='flex bg-white rounded-sm w-[18.75rem] h-[5.6rem] items-center mx-auto py-1.5 px-2 justify-between'>
                      <div className='w-5/6 h-full flex flex-col scroll-container overflow-x-hidden overflow-y-auto'>
                        {SOP_Stage.filter((stageDetail) => stageDetail.sop_stage === stage).map((stageDetail) => (
                          <div
                            key={stageDetail.idx}
                            className='w-full flex flex-col justify-between mb-1.5'
                          >
                            <div className='flex h-[1.375rem] items-center justify-between'>
                              <span
                                className='w-[5rem] text-[13px] text-[#8F97A4] whitespace-nowrap overflow-y-hidden overflow-x-hidden text-ellipsis'
                                title={stageDetail.sop_stage_name}
                              >
                                {stageDetail.sop_stage_name}
                              </span>
                              <span
                                className='w-[8.875rem] bg-[#EDF0F6] rounded-[1px] text-sm text-[#4E4A4A] h-full flex items-center pl-2.5 whitespace-nowrap overflow-y-hidden overflow-x-hidden text-ellipsis'
                                title={stageDetail.sop_stage_description}
                              >
                                {stageDetail.sop_stage_description}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className='w-1/6 flex justify-center ml-1.5'>
                        <Button
                          className='w-[2.25rem] h-[1.75rem] rounded-sm border-[1px] border-[#E0E0E0] bg-[#769AD5] text-white flex justify-center items-center dark:bg-[#343638] dark:hover:bg-[#404345]'
                          disabled={falseAlarmValue.idx != null || stage > ackCount + 1}
                          onClick={() => setAckCount(stage !== ackCount ? stage : stage -= 1)}
                        >
                          {(stage === ackCount + 1 && falseAlarmValue.idx == null) ? '확인' : (stage > ackCount + 1 || falseAlarmValue.idx) ? '대기' : '완료'}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className='bg-[#F7F7F7] w-[18.625rem] h-0.5 mx-auto my-1.5' />
              <Button
                className='flex justify-center w-[18.75rem] h-[1.625rem] items-center border-[1px] border-[#D76767] rounded-sm mx-auto dark:bg-[#343638] dark:hover:bg-[#404345]'
                disabled={falseAlarmValue.idx != null}
                onClick={handleAllAck}
              >
                <IoCheckmarkCircleOutline
                  size={25}
                  color='#D76767'
                  className='mr-2.5'
                />
                <p className='text-sm text-[#505050] dark:text-[#F5F5F5] font-semibold'>{!isAck ? 'SOP 상황 전체 완료 처리' : 'SOP 상황 전체 확인 취소'}</p>
              </Button>
            </div>
          </section>
          <div className='w-full bg-[#EDF0F6] h-[2px] border-[1px] border-[#D9DCE3]' />
          <div className='flex py-4 justify-end'>
            <Button
              className='w-[10.625rem] h-[2.375rem] rounded-sm flex justify-center items-center bg-[#EDF0F6]'
              onClick={(e) => toggleIsFalseAlarm(e)}
            >
              <div className='flex'>
                <div className='bg-[#D9DCE3] rounded-[50%] p-1.5' >
                  <GiPlainCircle
                    className='w-2 h-2'
                    color={falseAlarmValue.type ? '#769AD5' : '#FFFFFF'}
                  />
                </div>
                <p className='ml-2'>오탐</p>
              </div>
              {falseAlarmValue.type && (
                <div className='flex'>
                  <p className='ml-2 max-w-[3rem] text-sm overflow-hidden text-ellipsis' title={falseAlarmValue.type! as string}>{falseAlarmValue.type}</p>
                  <div
                    className='bg-[#D9DCE3] rounded-[50%] p-1.5'
                    onClick={() => cancelNewFalseAlarm(falseAlarmValue)}
                  >
                    <IoClose
                      className='w-3 h-3'
                      values='rmFalseAlaramValue'
                      color={'#FFFFFF'}
                    />
                  </div>
                </div>
              )}
            </Button>
            <Button
              className={`w-[10.625rem] h-[2.375rem] rounded-sm border-[1px] border-[#D2D2D2] ml-4 ${(falseAlarmValue.idx == null && ackCount < SOPList[0].count) ? 'bg-[#DBDDE3]' : 'bg-[#17A36F] dark:bg-[#17A36F] text-[#ECECEC]'}`}
              disabled={falseAlarmValue.type == null && (!isAck && ackCount < SOPList[0].count)}
              onClick={() => {
                setConfirmMsg('해당 SOP 이벤트를 종료 하시겠습니까?');
                toggleConfirm({
                  show: true,
                  title: 'SOP 이벤트 종료',
                  type: 'control'
                });
              }}
            >
              이벤트 종료
            </Button>
          </div>
        </section>
        {confirmClear.show && (
          <ModalConfirm
            modal={confirmClear}
            toggle={toggleConfirm}
            confirm={clearSOPEvent}
          >
            <p className='dark:text-[#F5F5F5]'>{confirmMsg}</p>
          </ModalConfirm>
        )}
        {falseAlarmModal.show && (
          <CustomModal
            show={falseAlarmModal.show}
            title={falseAlarmModal.title}
            width={falseAlarmModal.width}
            height={falseAlarmModal.height}
            contentClassName={'rounded-md border-2 border-[#D9DCE3] px-0 py-2'}
            titleClassName={'text-lg px-3 py-2'}
            close={closeFalseAlarmModal}
          >
            <div className='w-full h-0.5 bg-[#A7ACB5] border-2 border-[#D9DCE3]' />
            <FalseAlarmSettingEvent
              updateFalseAlarm={updateFalseAlarm}
              close={closeFalseAlarmModal}
            />
          </CustomModal>
        )}
      </>
    );
  };
};