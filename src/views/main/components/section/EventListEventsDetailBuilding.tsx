import { useState } from 'react';
import { FaRegCheckCircle } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";
import { BsArrowUpRightSquare, BsArrowDownLeftSquare } from "react-icons/bs";
import { EventInfo } from '@/@types/main';
import { Button } from '@/components/ui';
import { apiAckEvent } from '@/services/ObserverService';
import { useSessionUser } from '@/store/authStore';
import { SlLocationPin } from 'react-icons/sl';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useEventArchiveContext } from '../../context/eventArchiveContext';
import { formatDateTime } from '../../service/formatDateTimeString';
import { formatSeverityId } from '../../service/severity';
import { useSOPEventStore } from '@/store/main/SOPEventStore';

type Props = {
  event: EventInfo;
};

const BOX_STYLE = 'bg-white dark:bg-[#313233] rounded-[5px] px-2 py-1.5 w-[21rem] py-1.5';
const CENTER_STYLE = 'flex items-center justify-center';

export default function EventListEventsDetailBuilding({
  event: {
    idx,
    event_name,
    camera_id,
    is_acknowledge,
    location,
    event_occurrence_time,
    severity_id,
    event_type_id,
    acknowledge_user,
    outside_idx,
    inside_idx,
    device_type,
    map_image_url,
    sop_idx,
    use_sop,
    main_service_name
  }
}: Props) {
  const { user: { userId } } = useSessionUser();
  const { setCanvasMapState, is3DView } = useCanvasMapStore();
  const { setSOPEventState } = useSOPEventStore();
  const eventArchiveContext = useEventArchiveContext();
  const [fold, setFold] = useState<boolean>(false);
  const boxHeight = fold ? 'h-[4.125rem]' : 'h-[8.125rem]';

  const formatDeviceType = (deviceType: string | null) => {
    switch (deviceType) {
      case 'door':
        return '출입문';
        break;
      case 'camera':
        return '카메라';
        break;
      case 'ebell':
        return '비상벨';
        break;
      case 'guardianlite':
        return '가디언라이트';
        break;
      case 'pids':
        return 'PIDS';
        break;
      case null:
        return '알 수 없음';
      default:
        throw new Error(`unKnown serviceType: ${deviceType}`);
        break;
    };
  };

  const ackEvent = async () => {
    if (userId == null) {
      return;
    }
    if (use_sop && sop_idx && main_service_name) {
      setSOPEventState({
        SOPIdx: sop_idx,
        eventIdx: idx,
        eventName: event_name,
        eventCameraId: camera_id,
        eventTypeId: event_type_id,
        outsideIdx: outside_idx,
        insideIdx: inside_idx,
        location,
        mainServiceName: main_service_name,
        mapImageURL: map_image_url,
        occurDateTime: event_occurrence_time,
        severityId: severity_id,
      })
      return;
    }
    try {
      const result = await apiAckEvent({
        idxArray: [{
          idx
        }],
        userId
      });
      console.log(result);
    } catch (error) {
      console.error(error);
    };
  };

  const handleMoveToDevice = (outsideIdx: number, insideIdx: number, mapImageURL: string) => {
    let outsideName: string = '';
    let insideName: string = '';
    if (location) {
      outsideName = location.split(' ')[0];
    } else {
      insideName = location.split(' ')[1];
    };
    const current = useCanvasMapStore.getState();
    if (is3DView) {
      setCanvasMapState({
        ...current,
        threeDModelId: outsideIdx,
        floorIdx: insideIdx,
        buildingName: outsideName,
        floorName: insideName,
        mainServiceName: 'origin',
        mapImageURL: `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}`
      });
    } else {
      setCanvasMapState({
        ...current,
        buildingIdx: outsideIdx,
        floorIdx: insideIdx,
        buildingName: outsideName,
        floorName: insideName,
        mainServiceName: 'origin',
        mapImageURL: `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}`
      });
    }

  };

  return (
    <div className={`flex flex-col ${BOX_STYLE} ${boxHeight} justify-between`}>
      <div className='flex'>
        <div className='w-[4rem] flex items-center mr-2'>
          {is_acknowledge ? (
            <FaRegCheckCircle color='#616A79' className='w-[2.5rem] h-[2.5rem]' />
          )
            : (
              <IoAlertCircleOutline color='#D76767' className='w-[2.5rem] h-[2.5rem]' />
            )
          }
        </div>
        <div className='flex flex-col'>
          <div className='flex w-[17rem] h-[1.5rem]'>
            <div className='w-full flex justify-between'>
              <h5 className='text-sm text-black font-semibold line whitespace-nowrap overflow-x-hidden text-ellipsis' title={event_name}>{event_name}</h5>
              <div className='flex justify-between items-center gap-x-1.5 mr-1'>
                {camera_id && (
                  <Button
                    className={`w-[3.43rem] h-[0.875rem] bg-[#B1B5C0] rounded-sm text-white text-[0.55rem] ${CENTER_STYLE}`}
                    onClick={() => eventArchiveContext?.handleUpdateEventDetail({
                      occurDateTime: event_occurrence_time,
                      location,
                      eventName: event_name,
                      eventCameraId: camera_id
                    })}
                  >
                    이벤트 영상
                  </Button>
                )}
                <div className={`w-[0.875rem] h-[0.875rem] ${CENTER_STYLE} rounded-sm p-0.5 cursor-pointer bg-[#B1B5C0]`}>
                  {fold ? (
                    <BsArrowUpRightSquare
                      color='white'
                      size={30}
                      onClick={() => setFold(false)}
                    />) :
                    (
                      <BsArrowDownLeftSquare
                        color='white'
                        size={30}
                        onClick={() => setFold(true)}
                      />
                    )}
                </div>
              </div>
            </div>
          </div>
          {/* 경계선 */}
          <div className='border-[1px] border-solid border-[#C8C8C8] w-[17rem] my-0.5' />
          <div className='flex justify-between'>
            <div className='flex flex-col text-black dark:text-[#F5F5F5] max-h-[4.2rem] font-semibold text-[0.58rem]'>
              <p>발생 일시 : {formatDateTime(event_occurrence_time)}</p>
              <p>발생 장소 : {location}</p>
              {!fold && <p>중요도 : {formatSeverityId(severity_id)}</p>}
              {!fold && <p>장치 종류 : {formatDeviceType(device_type)}</p>}
              {(!fold && is_acknowledge) && <p>확인자 : {acknowledge_user}</p>}
            </div>
            {!fold &&
              <div
                className='bg-[#909090] bg-gradient-to-br from-[#909090] to-[#6b6b6b] rounded-sm cursor-pointer h-[2rem] relative top-5'
                onClick={() => handleMoveToDevice(outside_idx, inside_idx, map_image_url! as string)}
              >
                <SlLocationPin size={30} color='white' className='p-1' />
              </div>
            }
          </div>

        </div>
      </div>
      {!fold && (
        <Button
          className={`w-[20rem] h-[1rem] border-[1px] border-[#E0E0E0] rounded-[3px] bg-white ${CENTER_STYLE} mx-auto relative`}
          disabled={is_acknowledge}
          onClick={ackEvent}
        >
          <FaRegCheckCircle color='#17A36F' />
          <p className='text-[#000000] dark:text-[#F5F5F5] ml-3 text-[0.55rem]'>이벤트 확인 처리</p>
        </Button>
      )}
    </div >
  );

}