import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Button, ScrollBar, Select } from '@/components/ui'
import EventTypeIcon from '@/components/common/eventTypeIcon';
import { ConfirmDialog } from '@/components/shared';
import { useTunnelEventTypeList } from '@/utils/hooks/useTunnelArea'
import { apiTunnelEventModify }  from '@/services/TunnelService'
import Loading from '@/components/shared/Loading';
import { AlertDialog } from '@/components/shared/AlertDialog';

type EventList = {
  event_type: string
  event_type_id: number
  service_type: string
  severity: string
  severity_color: string
  severity_id: number
  use_event_type: boolean
  use_popup: boolean
  use_warning_board: boolean
}

const severityType = [
  { label: 'info', value: 0, },
  { label: 'minor', value: 1 },
  { label: 'major', value: 2 },
  { label: 'critical', value: 3 }
]


const TunnelEventSetting = () => {

  const [isDataReady, setIsDataReady] = useState(false);
  const { eventTypeList, mutate } = useTunnelEventTypeList();
  const [eventSeverities, setEventSeverities] = useState<Record<string, number>>({});
  const [eventState, setEventState] = useState<Record<number, { use_warning_board: boolean; use_popup: boolean; use_event_type: boolean }>>({});
  const [confirmdialogIsOpen, setConfirmdialogIsOpen] = useState(false);
  const [severityChange, setSeverityChange] = useState<{
    eventId: number;
    newSeverityId: number;
  } | null>(null);
  const sortedEventTypeList: EventList[] = eventTypeList?.result.sort((a: EventList, b: EventList) => a.event_type_id - b.event_type_id) || [];
  const [confirmDialogContents, setConfirmDialogContents] = useState<JSX.Element | null>(null);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState<string>('');
  const [targetEvent, setTargetEvent] = useState<EventList | null>(null);
  const [stateChange, setStateChange] = useState<{
    eventId: number;
    key: 'use_warning_board' | 'use_popup' | 'use_event_type';
    newState: boolean;
  } | null>(null);
  const keyToMessage: Record<'use_warning_board' | 'use_popup' | 'use_event_type', string> = {
    use_warning_board: '워닝보드',
    use_popup: '팝업',
    use_event_type: '활성화',
  };
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogIsOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (eventTypeList?.result) {
      const initialSeverities = eventTypeList.result.reduce((acc: Record<number, number>, event: EventList) => {
        acc[event.event_type_id] = event.severity_id;
        return acc;
      }, {});

      const initialStates = eventTypeList.result.reduce((acc: Record<number, { use_warning_board: boolean; use_popup: boolean; use_event_type: boolean }>, event: EventList) => {
        acc[event.event_type_id] = {
          use_warning_board: event.use_warning_board,
          use_popup: event.use_popup,
          use_event_type: event.use_event_type,
        };
        return acc;
      }, {});

      setEventSeverities(initialSeverities);
      setEventState(initialStates);
      setIsDataReady(true);
    }
  }, [eventTypeList]);

  const severityBgColor = (severity: number) => {
    switch (severity) {
      case 0:
        return '#A7AAB1';
      case 1:
        return '#408F34';
      case 2:
        return '#E7BD42';
      case 3:
        return '#DB5656';
      default:
        break;
    }
  };

  const showConfirmDialog = (title: string, contents: JSX.Element) => {
    setConfirmDialogTitle(title);
    setConfirmDialogContents(contents);
    setConfirmdialogIsOpen(true);
  };

  const toggleStateRequest = (event: EventList, key: 'use_warning_board' | 'use_popup' | 'use_event_type') => {
    const message = keyToMessage[key];
    const newState = !eventState[event.event_type_id]?.[key];

    setStateChange({ eventId: event.event_type_id, key, newState });
    setTargetEvent(event);
    showConfirmDialog(
      '상태 변경',
      <span>
        <span className="font-bold text-blue-700 text-[15px]">{`'${event.event_type}'`}</span> ({message}) 상태를 변경하시겠습니까?
      </span>
    );
  };

  const severityChangeRequest = (event: EventList, newSeverityId: number) => {
    setSeverityChange({ eventId: event.event_type_id, newSeverityId });
    setTargetEvent(event);
    showConfirmDialog(
      '중요도 변경',
      <span>
        <span className="font-bold text-blue-700 text-[15px]">{`'${event.event_type}'`}</span> 의 (중요도) 상태를 변경하시겠습니까?
      </span>
    );
  };

  const severityTypeIcon = (severityId: number): 'info' | 'warning' | 'danger' => {
    const keyToState: Record<number, 'info' | 'warning' | 'danger'> = {
      0: 'info',
      1: 'info',
      2: 'warning',
      3: 'danger',
    };
    return keyToState[severityId] || 'info';
  };

  const onDialogClose = () => {
    reset();
  };

  const onDialogOk = async () => {
    try {
      if (severityChange) {
        const data = {
          eventTypeId: targetEvent?.event_type_id,
          severityId: severityChange.newSeverityId,
          useWarningBoard: targetEvent?.use_warning_board,
          usePopup: targetEvent?.use_popup,
          useEventType: targetEvent?.use_event_type,
        }

        const res = await apiTunnelEventModify(data);

        if (res.message === 'ok') {
          setErrorMessage(`중요도 상태 변경에 성공했습니다.`);
          mutate();
          reset();
          setIsOpen(true);
          return;
        }

        setErrorMessage(`중요도 상태 변경에 실패했습니다. 다시 시도해주세요.`);
        reset();
        setIsOpen(true);
      }

      if (stateChange) {
        const { eventId, key, newState } = stateChange;

        const updatedEventState = {
          ...eventState[eventId],
          [key]: newState,
        };

        const data = {
          eventTypeId: targetEvent?.event_type_id,
          severityId: targetEvent?.severity_id,
          useWarningBoard: updatedEventState?.use_warning_board,
          usePopup: updatedEventState?.use_popup,
          useEventType: updatedEventState?.use_event_type,
        };

        const res = await apiTunnelEventModify(data);

        if (res.message === 'ok') {
          setErrorMessage(`${keyToMessage[key]} 상태 변경에 성공했습니다.`);
          mutate();
          reset();
          setIsOpen(true);
          return;
        }

        setErrorMessage(`${keyToMessage[key]} 상태 변경에 실패했습니다. 다시 시도해주세요.`);
        reset();
        setIsOpen(true);
      }
    } catch (error) {
      setErrorMessage(`상태 변경에 실패했습니다. 다시 시도해주세요. ${error}`);
    }
  };

  const reset = () => {
    setConfirmdialogIsOpen(false);
    setSeverityChange(null);
    setTargetEvent(null);
    setConfirmDialogContents(null);
    setStateChange(null);
    setConfirmDialogTitle('');
  }

  if (!isDataReady) {
    return <Loading loading={true} />;
  }

  return (
    <>
      <ScrollBar className="max-h-[680px] h-[680px] ml-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="z-50">
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer"></th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer dark:text-black">이벤트</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer dark:text-black">중요도</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer dark:text-black">워닝보드</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer dark:text-black">팝업</th>
              <th className="sticky top-0 bg-gray-50 py-2 px-4 z-50 cursor-pointer dark:text-black">활성화</th>
            </tr>
          </thead>

          <tbody>
            {sortedEventTypeList?.map((event: EventList) => {
              return (
                <tr key={event.event_type_id} className="hover:bg-gray-50 dark:hover:bg-gray-500">
                  <td className="px-4 py-2 text-center">
                    <div
                      className={`w-[36px] h-[36px] rounded-sm flex justify-center items-center`}
                      style={{
                        backgroundColor: (() => {
                          switch (eventSeverities[event.event_type_id]) {
                            case 0:
                              return '#A7AAB1';
                            case 1:
                              return '#408F34';
                            case 2:
                              return '#E7BD42';
                            case 3:
                              return '#DB5656';
                            default:
                              return '#FFFFFF';
                          }
                        })()
                      }}
                    >
                      <EventTypeIcon eventTypeId={event.event_type_id} />
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center dark:text-white ">{event.event_type}</td>
                  <td className="px-4 py-2 text-center">
                    <Select
                      className="max-w-[121px] menuBoxZindex"
                      size="xs"
                      options={severityType}
                      value={severityType.find(
                        (item) =>
                          item.value ===
                          eventSeverities[event.event_type_id]
                      )}
                      styles={{
                        control: () => ({
                          backgroundColor: severityBgColor(event.severity_id),
                          color: '#fff'
                        }),
                        singleValue: () => ({
                          color: '#fff'
                        }),
                      }}
                      classNames={{
                        control: (state) => {
                          let classes = 'select-control bg-gray-100 cursor-pointer';

                          if (state.isDisabled) {
                            classes += ' opacity-50 cursor-not-allowed';
                          }
                          if (state.isFocused) {
                            classes += ' select-control-focused ring-1 ring-primary border-primary bg-transparent';
                          }

                          return classes;
                        },
                      }}
                      placeholder="중요도를 선택해주세요."
                      onChange={(option) => {
                        if (option) {
                          severityChangeRequest(event, option.value);
                        }
                      }}

                    />
                  </td>
                  {/* 워닝보드 버튼 */}
                  <td className="px-4 py-2 text-center">
                    <Button
                      className={`w-[70px] 
                          ${eventState[event.event_type_id]?.use_warning_board
                          ? 'bg-[#769ad5] text-white dark:bg-[#737373] '
                          : 'bg-white '}`
                      }

                      onClick={() =>
                        toggleStateRequest(event, 'use_warning_board')
                      }
                    >
                      {eventState[event.event_type_id]?.use_warning_board
                        ? 'ON'
                        : 'OFF'}
                    </Button>
                  </td>
                  {/* 팝업 버튼 */}
                  <td className="px-4 py-2 text-center">
                    <Button
                      className={`w-[70px] 
                        ${eventState[event.event_type_id]?.use_popup
                          ? 'bg-[#769ad5] text-white dark:bg-[#737373] '
                          : 'bg-white '}`
                      }
                      onClick={() => toggleStateRequest(event, 'use_popup')}
                    >
                      {eventState[event.event_type_id]?.use_popup
                        ? 'ON'
                        : 'OFF'}
                    </Button>
                  </td>
                  {/* 활성화 버튼 */}
                  <td className="px-4 py-2 text-center">
                    <Button
                      className={`w-[70px] 
                      ${eventState[event.event_type_id]?.use_event_type
                          ? 'bg-[#769ad5] text-white dark:bg-[#737373] '
                          : 'bg-white'}`
                      }
                      onClick={() =>
                        toggleStateRequest(event, 'use_event_type')
                      }
                    >
                      {eventState[event.event_type_id]?.use_event_type
                        ? 'ON'
                        : 'OFF'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollBar>

      <ConfirmDialog
        isOpen={confirmdialogIsOpen}
        type={severityChange ? severityTypeIcon(severityChange.newSeverityId) : 'info'}
        title={confirmDialogTitle}
        cancelText="취소"
        confirmText="확인"
        onCancel={onDialogClose}
        onConfirm={onDialogOk}
      >
        {confirmDialogContents}
      </ConfirmDialog>

      <AlertDialog
        isOpen={dialogIsOpen}
        message={errorMessage}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export default TunnelEventSetting
