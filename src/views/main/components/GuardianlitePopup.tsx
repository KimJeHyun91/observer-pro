import { useEffect, useState, useRef } from 'react';
import { MutateGuardianlitePopup, ObGuardianlitePopup } from '../types/guardianlite';
import { AiOutlineCloseSquare } from 'react-icons/ai';
import { ModalConfirmType, ModalNotifyType } from '@/@types/modal';
import { apiControlGuardianlite } from '@/services/ObserverService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import ModalConfirm from '../modals/ModalConfirm';
import ModalNotify from '../modals/ModalNotify';
import { AxiosError } from 'axios';

type Props = ObGuardianlitePopup & {
  close: ({ guardianlite_ip }: { guardianlite_ip?: string }) => void,
  mutate: ({
    ip,
    name,
    ch1,
    ch2,
    ch3,
    ch4,
    ch5,
    ch1_label,
    ch2_label,
    ch3_label,
    ch4_label,
    ch5_label,
    temper,
    status
  }: MutateGuardianlitePopup
  ) => void;
};

type ObjectProps = {
  width: number;
  height: number;
  top: number;
  left: number;
}

type GuardianliteChannel = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5';

const GUARDIAN_CHANNELS: GuardianliteChannel[] = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];

const defaultTheme = '#9EA3B2';
const eventTheme = '#DC4B41';
const popupBorderStyle = 'border-[4px] border-solid';

type controlType = {
  guardianlite_ip: string,
  id: string,
  password: string,
  channel: number,
  cmd: 'ON' | 'OFF' | '';
};

const GUARDIANLITE_POPUP_WIDTH = 437;
const GUARDIANLITE_POPUP_HEIGHT = 105;
const GUARDIANLITE_POPUP_INDICATION_LINE_HEIGHT = 43;

export default function GuardianlitePopup({
  on_event,
  status,
  ip,
  id,
  password,
  name,
  ch1,
  ch2,
  ch3,
  ch4,
  ch5,
  ch1_label,
  ch2_label,
  ch3_label,
  ch4_label,
  ch5_label,
  temper,
  top_location,
  left_location,
  canvas_width,
  canvas_height,
  icon_width,
  icon_height,
  map_type,
  mutate,
  close
}: Props) {
  const { socketService } = useSocketConnection();
  const maxLeft = canvas_width - GUARDIANLITE_POPUP_WIDTH;
  const moveLeft = ((canvas_width * (parseFloat(left_location))) + (icon_width / 2)) > maxLeft;
  const moveBottom = ((canvas_height * (parseFloat(top_location))) + (icon_height / 2) - GUARDIANLITE_POPUP_HEIGHT - GUARDIANLITE_POPUP_INDICATION_LINE_HEIGHT) < 0;
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');
  const [modalNotify, setModalNotify] = useState<ModalNotifyType>({
    show: false,
    title: ''
  });
  const [failMsg, setFailMsg] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resetAction, setResetAction] = useState<boolean>(false);
  const ctlRef = useRef<controlType | null>(null);

  const positionStyle = () => {
    let left;
    let top;
    if (moveLeft) {
      left = map_type === 'outdoor' ? (canvas_width * (parseFloat(left_location)) - GUARDIANLITE_POPUP_WIDTH + (icon_width / 2)) : (canvas_width * (parseFloat(left_location)) - GUARDIANLITE_POPUP_WIDTH + (icon_width / 2));
    } else {
      left = map_type === 'outdoor' ? (canvas_width * (parseFloat(left_location))) : (canvas_width * (parseFloat(left_location)));
    }

    if (moveBottom) {
      top = (canvas_height * (parseFloat(top_location))) + icon_height;
    } else {
      top = (canvas_height * parseFloat(top_location)) + (icon_height / 2) - GUARDIANLITE_POPUP_HEIGHT - GUARDIANLITE_POPUP_INDICATION_LINE_HEIGHT;
    }
    return {
      top: `${top}px`,
      left: `${left}px`
    }
  }

  const createLeadLine = (objectProps: ObjectProps, popupElement: HTMLDivElement) => {

    // 지시선 컴포넌트 생성 함수
    const mapContainer = popupElement.parentElement;
    if (!mapContainer) {
      console.error('Popup element has no parent container.');
      return;
    }

    // 1. 객체와 팝업 요소의 위치 계산
    const { top: objTop, left: objLeft, width: objWidth, height: objHeight } = objectProps;
    const popupRect = popupElement.getBoundingClientRect();
    const containerRect = mapContainer.getBoundingClientRect();
    let startX;
    if (moveLeft) {
      startX = map_type === 'outdoor' ? objLeft : objLeft;
    } else {
      startX = map_type === 'outdoor' ? objLeft + (objWidth / 2) : objLeft + (objWidth / 2);
    }
    let startY;
    if (map_type === 'outdoor') {
      startY = objTop + objHeight - GUARDIANLITE_POPUP_INDICATION_LINE_HEIGHT;
    } else {
      startY = objTop + objHeight - GUARDIANLITE_POPUP_INDICATION_LINE_HEIGHT;
    }
    const endX = popupRect.left + popupRect.width / 2 - containerRect.left;
    const endY = popupRect.top - containerRect.top;

    // 중간점 계산 (지시선의 81% 지점)
    const midX = startX + (endX - startX) * 0.81;
    const midY = startY;

    // 지시선 크기 제한 (width: 151px, height: 44px 기준으로 제한)
    const maxWidth = 155;
    const maxHeight = 44;

    // 2. 첫 번째 직선 생성
    const leadLine1 = document.createElement('div');
    leadLine1.classList.add('guardianlite-leadLine1');
    const lineWidth1 = Math.min(Math.sqrt((midX - startX) ** 2 + (midY - startY) ** 2), maxWidth);
    const angle1 = Math.atan2(midY - startY, midX - startX) * (180 / Math.PI);

    leadLine1.style.position = 'absolute';
    leadLine1.style.width = `${lineWidth1}px`;
    leadLine1.style.height = '4px';
    leadLine1.style.backgroundColor = on_event ? eventTheme : defaultTheme;
    leadLine1.style.top = `${startY}px`;
    leadLine1.style.left = `${startX}px`;
    leadLine1.style.transformOrigin = '0 50%';
    leadLine1.style.transform = `rotate(${angle1}deg)`;
    leadLine1.style.zIndex = '10';

    // 3. 두 번째 직선 생성
    const leadLine2 = document.createElement('div');
    leadLine2.classList.add('guardianlite-leadLine2');
    const lineWidth2 = Math.min(Math.sqrt((endX - midX) ** 2 + (endY - midY) ** 2), maxHeight);
    const angle2 = Math.atan2(endY - midY, endX - midX) * (180 / Math.PI);

    leadLine2.style.position = 'absolute';
    leadLine2.style.width = `${lineWidth2}px`;
    leadLine2.style.height = '4px';
    leadLine2.style.backgroundColor = on_event ? eventTheme : defaultTheme;
    leadLine2.style.top = `${midY}px`;
    leadLine2.style.left = `${midX}px`;
    leadLine2.style.transformOrigin = '0 50%';
    leadLine2.style.transform = `rotate(${angle2}deg)`;
    leadLine2.style.zIndex = '10';

    // 3. 지시선 추가
    mapContainer.appendChild(leadLine1);
    mapContainer.appendChild(leadLine2);
  }

  const borderStyle = () => {
    if (on_event || !status) {
      return `border-[#DC4B41] ${popupBorderStyle}`;
    } else {
      return `border-[#9EA3B2] ${popupBorderStyle}`;
    }
  }

  const removeLeadLine = (mapContainer: HTMLElement) => {
    const leadLine1 = document.querySelector('.guardianlite-leadLine1')! as HTMLDivElement;
    const leadLine2 = document.querySelector('.guardianlite-leadLine2')! as HTMLDivElement;
    // 3. 지시선 추가
    if (mapContainer && leadLine1 && leadLine2) {
      mapContainer.removeChild(leadLine1);
      mapContainer.removeChild(leadLine2);
    }
  }

  const onChannelControl = (channel: GuardianliteChannel, cmd: 'ON' | 'OFF', label: string | null) => {
    ctlRef.current = {
      guardianlite_ip: ip,
      id,
      password,
      channel: parseInt(channel.slice(-1)),
      cmd
    }
    const confirmMessage = `${setChannelKorean(channel)}${label ? '(' + label + ')' : ''}의 전원을 ${channel === 'ch1' ? 'RESET' : cmd}하시겠습니까?`
    setConfirmMsg(confirmMessage);
    toggleModalConfirm({
      show: true,
      title: '가디언라이트 채널 제어',
      type: 'control'
    })
    function setChannelKorean(channel: GuardianliteChannel) {
      switch (channel) {
        case 'ch1':
          return '채널1';
          break;
        case 'ch2':
          return '채널2';
          break;
        case 'ch3':
          return '채널3';
          break;
        case 'ch4':
          return '채널4';
          break;
        case 'ch5':
          return '채널5';
          break;
        default:
          throw new Error(`unKnown channel error: ${channel}`)
      }
    }
  }

  const handleConfirm = async () => {
    if (ctlRef.current == null) {
      return;
    }
    setLoading(true);
    try {
      const result = await apiControlGuardianlite({
        guardianlite_ip: ctlRef.current.guardianlite_ip,
        id: ctlRef.current.id,
        password: ctlRef.current.password,
        channel: ctlRef.current.channel,
        cmd: ctlRef.current.cmd
      })
      if (!result.result) {
        setLoading(false);
        setFailMsg(result.message);
      }
      if (ctlRef.current.channel === 1) {
        setResetAction(true);
        setTimeout(() => {
          setResetAction(false);
        }, 2000)
      }
      setLoading(false);
      toggleModalConfirm({
        show: false,
        title: '',
        type: ''
      })
      ctlRef.current = null;
      setConfirmMsg('');
    } catch (error) {
      if (error instanceof AxiosError) {
        setLoading(false);
        setFailMsg(error.message || error.response?.data.message || '서버 에러로 인해 채널 제어에 실패했습니다.');
        toggleModalNotify({
          show: true,
          title: '가디언라이트 채널 제어'
        });
      }
      console.error(error);
    }
  }

  const getChannelInfo = (channel: GuardianliteChannel) => {
    switch (channel) {
      case 'ch1':
        return {
          channel: ch1,
          ch_label: ch1_label
        }
        break;
      case 'ch2':
        return {
          channel: ch2,
          ch_label: ch2_label
        }
        break;
      case 'ch3':
        return {
          channel: ch3,
          ch_label: ch3_label
        }
        break;
      case 'ch4':
        return {
          channel: ch4,
          ch_label: ch4_label
        }
        break;
      case 'ch5':
        return {
          channel: ch5,
          ch_label: ch5_label
        }
        break;
      default:
        throw new Error(`unKnown channel ${channel}`);
    }
  }

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    })
  };

  const toggleModalNotify = ({ show, title }: ModalNotifyType) => {
    setModalNotify({
      show,
      title
    })
  }

  useEffect(() => {
    const top = canvas_height * parseFloat(top_location);
    const left = canvas_width * parseFloat(left_location);
    const popup = document.querySelector('#guardianlite-popup')! as HTMLDivElement;
    popup.classList.add('active');
    const mapContainer = popup.parentElement! as HTMLElement;
    createLeadLine({ top, left, width: icon_width, height: icon_height }, popup);
    return () => {
      removeLeadLine(mapContainer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top_location, left_location, icon_width, icon_height])

  useEffect(() => {
    if (!socketService) {
      return;
    }

    const guardianliteSocket = socketService.subscribe('ob_guardianlites-update', (received) => {
      if (received?.popup) {
        const {
          guardianlite_ip,
          guardianlite_name,
          ch1,
          ch2,
          ch3,
          ch4,
          ch5,
          ch1_label,
          ch2_label,
          ch3_label,
          ch4_label,
          ch5_label,
          status,
          temper
        } = received.popup
        if (guardianlite_ip === ip) {
          mutate({
            ip: guardianlite_ip,
            name: guardianlite_name,
            ch1,
            ch2,
            ch3,
            ch4,
            ch5,
            ch1_label,
            ch2_label,
            ch3_label,
            ch4_label,
            ch5_label,
            status,
            temper
          })
        }
      }
    });
    return () => {
      guardianliteSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <>
      <div
        className={`absolute w-[27.3rem] h-[6.6rem] bg-white z-10 ${borderStyle()}`}
        id='guardianlite-popup'
        style={{
          top: positionStyle().top,
          left: positionStyle().left
        }}
      >
        <div className='flex justify-between items-center pr-1 border-b-2 border-b-[#E5E5E5]'>
          <span className='text-black font-semibold ml-1 text-[1.02rem] whitespace-nowrap overflow-x-hidden text-ellipsis'>{name}({ip})</span>
          <p>{temper ? `${temper}℃` : ''}</p>
          {/* {!status ? <span className='flex bg-[#F87171] text-white px-2 py-1 rounded-md gap-1'>연결 끊김 <AiOutlineExclamationCircle size={20} /></span> : ''} */}
          <AiOutlineCloseSquare color='#171719' className='cursor-pointer mr-1' size={25} onClick={() => close({ guardianlite_ip: ip })} />
        </div>
        <div className='flex'>
          {GUARDIAN_CHANNELS.map((channel) => {
            const chStatus = getChannelInfo(channel).channel;
            return (
              <div key={channel} className="bg-gray-50 rounded p-1" title={getChannelInfo(channel).ch_label!}>
                {(
                  <div className="text-center text-xs font-medium mb-1 bg-gray-200">
                    {`CH${channel.slice(2)}`}
                  </div>
                )}
                <div className="flex justify-center mb-1">
                  {channel !== 'ch1' ?
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${chStatus === 'ON' ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                    :
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${(chStatus === 'ON' && !resetAction) ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                  }
                </div>
                <div className="flex justify-center gap-1">
                  {channel !== 'ch1' ?
                    <>
                      <button
                        className={`px-2 py-0.5 rounded text-xs bg-gray-300 ${(chStatus === 'ON' || !status) ? 'text-gray-400' : 'text-gray-900'
                          }`}
                        disabled={chStatus === 'ON' || !status}
                        onClick={() => onChannelControl(channel, 'ON', getChannelInfo(channel).ch_label)}
                      >
                        ON
                      </button>
                      <button
                        className={`px-2 py-0.5 rounded text-xs bg-gray-300 ${(chStatus === 'OFF' || !status) ? 'text-gray-400' : 'text-gray-900'
                          }`}
                        disabled={chStatus === 'OFF' || !status}
                        onClick={() => onChannelControl(channel, 'OFF', getChannelInfo(channel).ch_label)}
                      >
                        OFF
                      </button>
                    </>
                    :
                    <button
                      className={`px-[18px] py-0.5 rounded text-xs bg-gray-300 ${(chStatus === 'OFF' || !status) ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      disabled={!status}
                      onClick={() => onChannelControl(channel, 'ON', getChannelInfo(channel).ch_label)}
                    >
                      RESET
                    </button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ModalConfirm
        modal={modalConfirm}
        toggle={toggleModalConfirm}
        confirm={handleConfirm}
        loading={loading}
      >
        <p>{confirmMsg}</p>
      </ModalConfirm>
      <ModalNotify
        modal={modalNotify}
        toggle={toggleModalNotify}
      >
        <p>{failMsg}</p>
      </ModalNotify>
    </>
  );
}