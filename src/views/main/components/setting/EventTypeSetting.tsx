import { Fragment, useEffect, useState } from 'react';
// eslint-disable-next-line import/named
import { Button, ScrollBar, Select } from '@/components/ui';
import { useEventTypeList } from '@/utils/hooks/useEventTypes';
import ModalConfirm from '../../modals/ModalConfirm';
import { ModalConfirmType } from '@/@types/modal';
import { apiModifyEventType } from '@/services/ObserverService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import EventTypeIcon from '@/components/common/eventTypeIcon';
import { useSOPList } from '@/utils/hooks/useSOPList';
import Loading from '@/components/shared/Loading';
import { severityColor } from '../../service/severity';

type EventList = {
  event_type: string;
  event_type_id: number;
  service_type: string;
  severity: string;
  severity_color: string;
  severity_id: 0 | 1 | 2 | 3;
  use_event_type: boolean;
  use_popup: boolean;
  use_warning_board: boolean;
  use_sop: boolean;
  sop_idx: number | null;
};

const severityType = [
  { label: 'info', value: 0 },
  { label: 'minor', value: 1 },
  { label: 'major', value: 2 },
  { label: 'critical', value: 3 }
];

type ModifyEventTypData = {
  id: number;
  severity_id: number;
  use_warning_board: boolean;
  use_popup: boolean;
  use_event_type: boolean;
  use_sop: boolean;
  sop_idx: number | null;
};

type SelectSOPOption = {
  label: string;
  value: number | null;
};
export default function EventTypeSetting() {
  const { eventTypeList, mutate: mutateEventTypes } = useEventTypeList();
  const { socketService } = useSocketConnection();
  const { isLoading, data, error, mutate: mutateSOPList } = useSOPList();
  const sortedEventTypeList: EventList[] = eventTypeList?.result.sort((a: EventList, b: EventList) => a.event_type_id - b.event_type_id);
  const [modifyEventTypData, setModifyEventTypeData] = useState<ModifyEventTypData | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string>('');
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const handleSetConfirmMsg = (name: string, type: 'severity_id' | 'use_warning_board' | 'use_popup' | 'use_event_type' | 'use_sop', value: boolean | number) => {
    let result: string = name;
    switch (type) {
      case 'severity_id':
        result += '의 중요도를 ';
        break;
      case 'use_warning_board':
        result += '의 워닝보드를 ';
        break;
      case 'use_popup':
        result += '의 팝업을 ';
        break;
      case 'use_event_type':
        result += '의 활성화를 ';
        break;
      case 'use_sop':
        result += '의 SOP를 ';
        break;
      default:
        break;
    }
    switch (value) {
      case 0:
        result += 'info로 설정하시겠습니까?';
        break;
      case 1:
        result += 'minor로 설정하시겠습니까?'
        break;
      case 2:
        result += 'major로 설정하시겠습니까?'
        break;
      case 3:
        result += 'critical로 설정하시겠습니까?'
        break;
      case true:
        result += 'ON으로 설정하시겠습니까?';
        break;
      case false:
        result += 'OFF로 설정하시겠습니까?';
        break;
      default:
        break;
    }
    return setConfirmMsg(result);
  }

  const handleConfirmModifyEventType = async () => {
    if (modifyEventTypData == null) {
      return;
    }
    const result = await apiModifyEventType({ ...modifyEventTypData, main_service_name: 'origin' })
    if (result.message === 'ok') {
      toggleModalConfirm({
        show: false,
        title: '',
        type: ''
      });
      setConfirmMsg('');
      setModifyEventTypeData(null);
    }
  };

  const handleChangeSOP = async ({
    id,
    severity_id,
    use_warning_board,
    use_popup,
    use_event_type,
    use_sop,
    sop_idx
  }: ModifyEventTypData) => {
    try {
      await apiModifyEventType({
        id,
        severity_id,
        use_warning_board,
        use_popup,
        use_event_type,
        use_sop,
        sop_idx,
        main_service_name: 'origin'
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (error) {
    console.error('get SOP List error');
  };

  const SOPOptions: SelectSOPOption[] = data ? [{ label: '선택 안 함', value: 0 }].concat(data.result.map((SOP) => ({ label: SOP.sop_name, value: SOP.idx, }))) : [{ label: '선택 안 함', value: null }];

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const eventTypeSocket = socketService.subscribe('ob_event_types-update', (received) => {
      if (received) {
        mutateEventTypes();
      }
    });
    const SOPSocket = socketService.subscribe('cm_sop-update', (received) => {
      if (received) {
        mutateSOPList();
      };
    });
    return () => {
      eventTypeSocket();
      SOPSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <>
      <ScrollBar className="max-h-[700px] ">
        <table className="min-w-full table-auto">
          <thead className='br-[#EBECEF]'>
            <tr className='z-50'>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50"></th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">이벤트</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">중요도</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">활성화</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">워닝보드</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">팝업</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer z-50">SOP</th>
            </tr>
          </thead>
          <tbody className='bg-[#EBECEF] mt-2'>
            {sortedEventTypeList?.map((event: EventList) => {
              const selectedOption = severityType.find(option => option.value === event.severity_id);
              return (
                <Fragment key={event.event_type_id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-center">
                      <div
                        className={`w-[36px] h-[36px] rounded-sm flex justify-center items-center`}
                        style={{
                          backgroundColor: severityColor(event.severity_id)
                        }}
                      >
                        <EventTypeIcon eventTypeId={event.event_type_id} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center dark:text-[#4E4A4A]">{event.event_type}</td>
                    <td className='flex items-center h-[4rem]'>
                      <Select
                        size="xs"
                        options={severityType}
                        value={selectedOption}
                        styles={{
                          control: () => ({
                            backgroundColor: severityColor(event.severity_id)
                          }),
                          singleValue: () => ({
                            color: '#fff'
                          })
                        }}
                        className='w-[6.875rem] h-[1.5rem] text-[0.65rem]'
                        placeholder="Select severity type"
                        onChange={(newValue) => {
                          if (newValue?.value != null) {
                            setModifyEventTypeData({
                              id: event.event_type_id,
                              severity_id: newValue.value,
                              use_warning_board: event.use_warning_board,
                              use_popup: event.use_popup,
                              use_event_type: event.use_event_type,
                              use_sop: event.use_sop,
                              sop_idx: event.sop_idx
                            });
                            handleSetConfirmMsg(event.event_type, 'severity_id', newValue.value);
                            toggleModalConfirm({
                              show: true,
                              title: '이벤트 중요도 설정',
                              type: 'modify'
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        className={event.use_event_type ? 'bg-[#769ad5] text-white' : 'bg-white'}
                        onClick={() => {
                          setModifyEventTypeData({
                            id: event.event_type_id,
                            severity_id: event.severity_id,
                            use_warning_board: !event.use_event_type ? event.use_warning_board : false,
                            use_popup: !event.use_event_type ? event.use_popup : false,
                            use_event_type: !event.use_event_type,
                            use_sop: !event.use_event_type ? event.use_sop : false,
                            sop_idx: event.sop_idx
                          });
                          handleSetConfirmMsg(event.event_type, 'use_event_type', !event.use_event_type);
                          toggleModalConfirm({
                            show: true,
                            title: '이벤트 활성화',
                            type: 'modify'
                          });
                        }}
                      >
                        {event.use_event_type ? 'ON' : 'OFF'}
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        className={event.use_warning_board ? 'bg-[#769ad5] text-white' : 'bg-white'}
                        onClick={() => {
                          if (event.use_event_type) {
                            setModifyEventTypeData({
                              id: event.event_type_id,
                              severity_id: event.severity_id,
                              use_warning_board: !event.use_warning_board,
                              use_popup: event.use_popup,
                              use_event_type: event.use_event_type,
                              use_sop: event.use_sop,
                              sop_idx: event.sop_idx
                            });
                            handleSetConfirmMsg(event.event_type, 'use_warning_board', !event.use_warning_board);
                            toggleModalConfirm({
                              show: true,
                              title: '이벤트 워닝보드 설정',
                              type: 'modify'
                            });
                          }
                        }}
                      >
                        {event.use_warning_board ? 'ON' : 'OFF'}
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        className={event.use_popup ? 'bg-[#769ad5] text-white' : 'bg-white'}
                        disabled={event.event_type_id === 20}
                        onClick={() => {
                          if (event.use_event_type) {
                            setModifyEventTypeData({
                              id: event.event_type_id,
                              severity_id: event.severity_id,
                              use_warning_board: event.use_warning_board,
                              use_popup: !event.use_popup,
                              use_event_type: event.use_event_type,
                              use_sop: event.use_sop,
                              sop_idx: event.sop_idx
                            });
                            handleSetConfirmMsg(event.event_type, 'use_popup', !event.use_popup);
                            toggleModalConfirm({
                              show: true,
                              title: '이벤트 팝업 설정',
                              type: 'modify'
                            });
                          }
                        }}
                      >
                        {event.use_popup ? 'ON' : 'OFF'}
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        className={event.use_sop ? 'bg-[#769ad5] text-white' : 'bg-white'}
                        disabled={event.event_type_id === 20}
                        onClick={() => {
                          if (event.use_event_type) {
                            setModifyEventTypeData({
                              id: event.event_type_id,
                              severity_id: event.severity_id,
                              use_warning_board: event.use_warning_board,
                              use_popup: event.use_popup,
                              use_event_type: event.use_event_type,
                              use_sop: !event.use_sop,
                              sop_idx: event.sop_idx
                            });
                            handleSetConfirmMsg(event.event_type, 'use_sop', !event.use_sop);
                            toggleModalConfirm({
                              show: true,
                              title: '이벤트 SOP 설정',
                              type: 'modify'
                            });
                          }
                        }}
                      >
                        {event.use_sop ? 'ON' : 'OFF'}
                      </Button>
                    </td>
                  </tr>
                  {event.use_sop && (
                    !isLoading ? (
                      <tr>
                        <td></td>
                        <td></td>
                        <td colSpan={5} className='w-[29.25rem]'>
                          <div className='w-[29.25rem] h-0.5 bg-white mb-2' />
                          <div className='flex flex-col justify-start bg-white w-[29.25rem] rounded-sm px-3 py-1.5 h-[4.1875rem] mx-auto'>
                            <p className='text-[#4E4A4A] font-semibold px-0.5 mb-0.5 flex justify-start pl-3'>SOP 선택</p>
                            <Select
                              className="w-[27.875rem] h-[1.5rem] text-[0.85rem] mx-auto cursor-pointer"
                              styles={{
                                singleValue: () => ({
                                  color: '#4E4A4A',
                                })
                              }}
                              options={SOPOptions}
                              value={SOPOptions.find((SOP) => SOP.value === event.sop_idx)}
                              size='xxs'
                              placeholder="해당 이벤트에 설정할 SOP 절차를 선택하세요."
                              onChange={(e) => handleChangeSOP({
                                id: event.event_type_id,
                                severity_id: event.severity_id,
                                use_warning_board: event.use_warning_board,
                                use_popup: event.use_popup,
                                use_event_type: event.use_event_type,
                                use_sop: event.use_sop,
                                sop_idx: e?.value || null
                              })}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                      :
                      <tr>
                        <td></td>
                        <td></td>
                        <td colSpan={5} className='w-[29.25rem]'>
                          <Loading loading={isLoading} />
                        </td>
                      </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </ScrollBar>
      <ModalConfirm
        modal={modalConfirm}
        toggle={toggleModalConfirm}
        confirm={handleConfirmModifyEventType}
      >
        <p>{confirmMsg}</p>
      </ModalConfirm>
    </>
  );
}