import { useEffect } from 'react';
import { AiOutlineCloseSquare } from "react-icons/ai";
import LiveStream from '../camera/LiveStream';
import { ServiceType } from '@/@types/common';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { BiCctv } from 'react-icons/bi';
import { TbDeviceCctv } from 'react-icons/tb';
import LiveEventStream from '@/views/main/components/LiveEventStream';
import ArchiveStream from '../camera/archiveStream';

const defaultTheme = '#9EA3B2';
const eventTheme = '#DC4B41';
const popupBorderStyle = 'border-[4px] border-solid';
const cameraInfoStyle = 'pl-1 text-[#060606] font-semibold whitespace-nowrap overflow-hidden text-ellipsis';
const cameraInfoWrapperStyle = 'flex h-[1.25rem] justify-between items-center gap-y-1';
const cameraInfoLabelStyle = 'w-[20%] text-md';
const cameraInfoValueStyle = 'w-[80%] h-full bg-[#F7F7F7] rounded-sm text-md';

type Props = {
  on_event?: boolean;
  idx?: number | null;
  main_service_name?: ServiceType | '';
  vms_name?: string;
  camera_id?: string;
  name: string;
  ip: string;
  top_location: string;
  left_location: string;
  icon_width: number;
  icon_height: number;
  canvas_width: number;
  canvas_height: number;
  map_type: 'outdoor' | 'indoor';
  type: string | '';
  close: ({ main_service_name, vms_name, camera_id, idx }: { main_service_name?: ServiceType, vms_name?: string, camera_id?: string, idx?: number | null }) => void;
  service_type?: string | '';
  access_point?: string;
  startDateTime?: string;
  device_id?: string;
  device_name?: string | null;
};

type ObjectProps = {
  width: number;
  height: number;
  top: number;
  left: number;
};

// const POPUP_WIDTH = 300;
// const POPUP_HEIGHT = 258;
const POPUP_WIDTH = 450;
const POPUP_HEIGHT = 387;
const POPUP_INDICATION_LINE_HEIGHT = 56;

export default function DevicePopup({
  on_event = false,
  idx,
  main_service_name,
  vms_name,
  camera_id,
  name,
  ip,
  top_location,
  left_location,
  canvas_width,
  canvas_height,
  icon_width,
  icon_height,
  map_type,
  type,
  close,
  service_type,
  access_point,
  startDateTime,
  device_id,
  device_name
}: Props) {
  const { buildingName, floorName } = useCanvasMapStore();
  const maxLeft = canvas_width - POPUP_WIDTH;
  const moveLeft = (canvas_width * (parseFloat(left_location)) + (icon_width / 2)) > maxLeft;
  const moveLeftPIDS = (canvas_width * parseFloat(left_location)) > maxLeft;
  const EXTRA_TOP_SPACE = 40;
  const moveBottom = ((canvas_height * parseFloat(top_location)) + 25 - POPUP_HEIGHT - POPUP_INDICATION_LINE_HEIGHT) + EXTRA_TOP_SPACE < 0;
  const moveBottomPIDS = ((canvas_height * parseFloat(top_location)) - POPUP_HEIGHT - POPUP_INDICATION_LINE_HEIGHT) < 0;
  const overCanvasWidth: boolean = canvas_width < ((canvas_width * (parseFloat(left_location))) + icon_width);
  const overCanvasHeight: boolean = canvas_height < ((canvas_height * (parseFloat(top_location))) + icon_height);
  const borderStyle = () => {
    if (on_event) {
      return `border-[#DC4B41] ${popupBorderStyle}`;
    } else {
      return `border-[#9EA3B2] ${popupBorderStyle}`;
    }
  }

  const adjustPopupWidth = () => {
    if (overCanvasWidth) {
      return {
        popupLeft: icon_width / 2,
        indicationLineLeft: -(icon_width)
      }
    } else {
      return {
        popupLeft: icon_width / 2,
        indicationLineLeft: -icon_width / 2
      }
    }
  }

  const adjustPopupHeight = () => {
    if (overCanvasHeight) {
      return {
        popupTop: -icon_height / 2,
        indicationLineTop: -icon_height / 2
      }
    } else {
      return {
        popupTop: 0,
        indicationLineTop: 0
      }
    }
  };

  const positionStyle = () => {
    if (type === 'pids') {
      return positionStylePIDS();
    } else {
      return positionStyleDefault();
    }
  }

  const positionStyleDefault = () => {
    let left;
    let top;
    if (moveLeft) {
      left = map_type === 'outdoor' ?
        ((canvas_width * (parseFloat(left_location))) - POPUP_WIDTH + icon_width / 2 + adjustPopupWidth().popupLeft)
        :
        (main_service_name && main_service_name === 'parking') ?
          (canvas_width * (parseFloat(left_location))) - POPUP_WIDTH + icon_width
          :
          ((canvas_width * (parseFloat(left_location))) - POPUP_WIDTH + icon_width);
    } else {
      left = map_type === 'outdoor' ?
        (canvas_width * (parseFloat(left_location)))
        :
        (main_service_name && main_service_name === 'parking') ?
          (canvas_width * (parseFloat(left_location)))
          :
          ((canvas_width * (parseFloat(left_location))))
    }

    if (moveBottom) {
      // top = (canvas_height * (parseFloat(top_location))) + icon_height - 10;
      top = (canvas_height * (parseFloat(top_location))) + POPUP_INDICATION_LINE_HEIGHT;
    } else {
      top = (canvas_height * (parseFloat(top_location))) + icon_height - POPUP_HEIGHT - POPUP_INDICATION_LINE_HEIGHT + adjustPopupHeight().popupTop;
    }
    return {
      top: `${top}px`,
      left: `${left}px`
    }
  }

  const calculateLeadLine = (startX: number, startY: number, endX: number, endY: number) => {

    // 중간점 계산 (지시선의 81% 지점)
    const midX = startX + (endX - startX) * 0.81;
    const midY = startY;

    // 지시선 크기 제한 (width: 118px, height: 46px 기준으로 제한)
    const maxWidth = 118;
    const maxHeight = (moveBottom && type !== 'pids') ? 70 : 46;

    // 2. 첫 번째 직선 생성
    const leadLine1 = document.createElement('div');
    leadLine1.classList.add(on_event ? 'leadLine1-event' : 'leadLine1');
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
    leadLine2.classList.add(on_event ? 'leadLine2-event' : 'leadLine2');
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

    return {
      leadLine1,
      leadLine2
    };
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
      startX = map_type === 'outdoor' ?
        objLeft + (objWidth / 2) + adjustPopupWidth().indicationLineLeft
        :
        objLeft + objWidth / 2;
    } else {
      startX = objLeft + (objWidth / 2)
    }

    let startY;
    if (map_type === 'outdoor') {
      // startY = objTop + (objHeight / 2) - 15 + adjustPopupHeight().indicationLineTop;
      startY = objTop + (objHeight / 2) - 1 + adjustPopupHeight().indicationLineTop;
    } else {
      // startY = objTop + (objHeight / 2) - 18 + adjustPopupHeight().indicationLineTop;
      startY = objTop + (objHeight / 2) - 1 + adjustPopupHeight().indicationLineTop;
    }

    const endX = popupRect.left + popupRect.width * (moveLeft ? 0.64 : 0.36) - containerRect.left;
    const endY = popupRect.top - containerRect.top;

    const { leadLine1, leadLine2 } = calculateLeadLine(startX, startY, endX, endY);

    // 3. 지시선 추가
    mapContainer.appendChild(leadLine1);
    mapContainer.appendChild(leadLine2);
  }

  const positionStylePIDS = () => {
    let left;
    let top;
    if (moveLeftPIDS) {
      left = ((canvas_width * (parseFloat(left_location))) - POPUP_WIDTH)
    } else {
      left = (canvas_width * (parseFloat(left_location)))
    }
    if (moveBottomPIDS) {
      top = (canvas_height * (parseFloat(top_location))) + POPUP_INDICATION_LINE_HEIGHT - 22;
    } else {
      top = (canvas_height * (parseFloat(top_location))) - POPUP_HEIGHT - POPUP_INDICATION_LINE_HEIGHT + 10;
    }
    return {
      top: `${top}px`,
      left: `${left}px`
    }
  }

  const createLeadLinePIDS = (objectProps: ObjectProps, popupElement: HTMLDivElement) => {
    // 지시선 컴포넌트 생성 함수

    const mapContainer = popupElement.parentElement;
    if (!mapContainer) {
      console.error('Popup element has no parent container.');
      return;
    }

    // 1. 객체와 팝업 요소의 위치 계산
    const { top: objTop, left: objLeft } = objectProps;

    const popupRect = popupElement.getBoundingClientRect();
    const containerRect = mapContainer.getBoundingClientRect();

    const startX = objLeft;
    const startY = objTop - 5;
    const endX = popupRect.left + popupRect.width * (moveLeftPIDS ? 0.7 : 0.3) - containerRect.left;
    // const endX = popupRect.left + popupRect.width / 2 - containerRect.left;
    const endY = popupRect.top - containerRect.top;

    const { leadLine1, leadLine2 } = calculateLeadLine(startX, startY, endX, endY);

    // 3. 지시선 추가
    mapContainer.appendChild(leadLine1);
    mapContainer.appendChild(leadLine2);
  }

  const removeLeadLine = (mapContainer: HTMLElement) => {
    const leadLine1 = document.querySelector(on_event ? '.leadLine1-event' : '.leadLine1')! as HTMLDivElement;
    const leadLine2 = document.querySelector(on_event ? '.leadLine2-event' : '.leadLine2')! as HTMLDivElement;
    // 3. 지시선 추가
    if (mapContainer && leadLine1 && leadLine2) {
      mapContainer.removeChild(leadLine1);
      mapContainer.removeChild(leadLine2);
    }
  }

  const getDevice = () => {
    switch (type) {
      case 'camera':
        return {
          type: '카메라',
          name: service_type === 'mgist' ? `${camera_id}.${name}(${vms_name})` : name
        }
        break;
      case 'door':
        return {
          type: '출입문',
          name
        }
        break;
      case 'ebell':
        return {
          type: '비상벨',
          name
        }
        break;
      case 'pids':
        return {
          type: 'PIDS',
          name
        };
        break;
      default:
        throw new Error(`unKnown device type: ${type}`)
    }
  };

  const closePopup = () => {
    if (type === 'camera' && main_service_name && vms_name && camera_id) {
      close({
        main_service_name,
        vms_name,
        camera_id
      });
    } else {
      close({ idx });
    };
  };

  const setNameLabel = () => {
    if (startDateTime != null) {
      return '출입자';
    };
    if (type === 'door') {
      return `${getDevice().type} ${on_event ? '이름' : 'ID'}`;
    };
    return `${getDevice().type} IP`;
  }

  useEffect(() => {
    const top = canvas_height * parseFloat(top_location);
    const left = canvas_width * parseFloat(left_location);
    const popupClassNmae = on_event ? '#device-popup-event' : '#device-popup';
    const popup = document.querySelector(popupClassNmae)! as HTMLDivElement;
    popup.classList.add('active');
    const mapContainer = popup.parentElement! as HTMLElement;
    if (type === 'pids') {
      createLeadLinePIDS({ top, left, width: icon_width, height: icon_height }, popup);
    } else {
      createLeadLine({ top, left, width: icon_width, height: icon_height }, popup);
    }
    return () => {
      removeLeadLine(mapContainer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top_location, left_location, icon_width, icon_height])

  const popupClassNmae = on_event ? 'device-popup-event' : 'device-popup';

  return (
    <div
      className={`absolute w-[28.125rem] h-[24.1875rem] rounded-md ${borderStyle()} bg-[#F7F7F7] z-10`}
      id={popupClassNmae}
      style={{
        top: positionStyle().top,
        left: positionStyle().left
      }}
    >
      <div className={`w-full h-[1.875rem] ${on_event ? `bg-[#DC4B41]` : `bg-[#9EA3B2]`} flex items-center justify-between`}>
        <title className='text-white flex pl-2 font-semibold text-[0.8rem] text-lg'>{getDevice().type}</title>
        <AiOutlineCloseSquare color='#fff' className='pl-2 cursor-pointer' size={36} onClick={closePopup} />
      </div>
      <div className='h-[calc(100%-1.875rem)] p-1'>
        <div className='flex flex-col justify-around h-full'>
          <div className='w-[27.125rem] h-[5.25rem] rounded-md flex flex-col justify-between bg-[#D5D7DD] p-1.5'>
            <div className={`${cameraInfoWrapperStyle}`}>
              <span className={`${cameraInfoLabelStyle} ${cameraInfoStyle}`}>{on_event ? '이벤트' : getDevice().type} 이름</span>
              <p className={`${cameraInfoValueStyle} ${cameraInfoStyle}`}>{getDevice().name}</p>
            </div>
            <div className={`${cameraInfoWrapperStyle}`}>
              <span className={`${cameraInfoLabelStyle} ${cameraInfoStyle}`}>{setNameLabel()}</span>
              <p className={`${cameraInfoValueStyle} ${cameraInfoStyle}`}>{type !== 'door' ? ip : on_event ? device_name : device_id}</p>
            </div>
            <div className={`${cameraInfoWrapperStyle}`}>
              <span className={`${cameraInfoLabelStyle} ${cameraInfoStyle}`}>{getDevice().type} 위치</span>
              <p className={`${cameraInfoValueStyle} ${cameraInfoStyle}`}>{buildingName ?? '실외'} {floorName}</p>
            </div>
          </div>
          <div className='w-[27.125rem] h-[15.2578125rem]'>
            {(main_service_name && vms_name != null && camera_id) ? (
              on_event ?
                <LiveEventStream
                  main_service_name={main_service_name}
                  vms_name={vms_name}
                  camera_id={camera_id}
                  service_type={service_type}
                  access_point={access_point}
                  camera_ip={ip}
                />
                :
                // 출입 로그 자동 팝업
                (startDateTime && vms_name != null) ?
                  <ArchiveStream
                    main_service_name={main_service_name}
                    vms_name={vms_name}
                    camera_id={camera_id}
                    service_type={service_type}
                    start_dateTime={startDateTime}
                    rewind={3}
                  />
                  :
                  <LiveStream
                    main_service_name={main_service_name}
                    vms_name={vms_name}
                    camera_id={camera_id}
                    service_type={service_type}
                    access_point={access_point}
                    camera_ip={ip}
                  />
            )
              :
              <div className='flex w-full h-full justify-center items-center'>
                <div className='h-full flex flex-col justify-evenly'>
                  <span className='self-center'>
                    {map_type === 'outdoor' ? <BiCctv size={40} /> : <TbDeviceCctv size={40} />}
                  </span>
                  <span>연동 설정된 카메라가 없습니다.</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}