import { useState } from 'react';
import { FaRegCheckCircle } from "react-icons/fa";
import { IoAlertCircleOutline } from "react-icons/io5";
import { BsArrowUpRightSquare, BsArrowDownLeftSquare } from "react-icons/bs";
import { EventInfo, SOPEvent, SOPPopup } from '@/@types/main';
import { Button } from '@/components/ui';
import { apiAckEvent } from '@/services/ObserverService';
import { useSessionUser } from '@/store/authStore';
import { formatDateTime } from '../../service/formatDateTimeString';
import { formatSeverityId } from '../../service/severity';
import CustomModal from '../../modals/CustomModal';
import ArchiveVideo from '../ArchiveVideo';
import dayjs from 'dayjs';
import SOPEventDetail from '../SOPEventDetail';
import { OpenDialog } from '@/@types/modal';

type Props = {
  event: EventInfo;
};

const BOX_STYLE = 'bg-[#EBECEF] dark:bg-[#313233] rounded-[5px] px-2 py-1.5 w-[19.625rem] py-1.5';
const CENTER_STYLE = 'flex items-center justify-center';

export default function EventListEventsDetail({
  event: {
    idx,
    event_name,
    is_acknowledge,
    location,
    event_occurrence_time,
    severity_id,
    device_type,
    acknowledge_user,
    camera_id,
    use_sop,
    sop_idx,
    main_service_name,
    event_type_id,
    outside_idx,
    inside_idx,
    map_image_url
  }
}: Props) {
  const { user: { userId } } = useSessionUser();
  const [SOPEvent, setSOPEvent] = useState<SOPEvent>({
    SOPIdx: null,
    eventIdx: null,
    eventName: null,
    occurDateTime: null,
    location: null,
    outsideIdx: null,
    insideIdx: null,
    eventTypeId: null,
    severityId: null,
    mapImageURL: null,
    eventCameraId: null,
    mainServiceName: 'origin',
  });
  const [fold, setFold] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<OpenDialog>({
    show: false,
    title: '',
    width: 0,
    height: 0,
    params: '',
    close: () => { }
  });
  const [SOPPopup, setSOPPopup] = useState<SOPPopup>({
    show: false,
    title: '',
    width: 1092,
    height: 780,
    SOP: true,
    close: () => { }
  });
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
      case 'guradianlite':
        return '가디언라이트';
        break;
      case 'pids':
        return 'PIDS';
        break;
      case 'acu':
        return 'ACU';
        break;
      case 'vms':
        return 'VMS';
        break;
      case 'guardianlite':
        return '가디언라이트';
        break;
      case 'waterlevel':
        return '수위계';
        break;
      case null:
        return '알 수 없음';
      default:
        throw new Error(`unKnown deviceType: ${deviceType}`);
        break;
    };
  };

  const handleCloseSOPPopup = () => {
    setSOPPopup({
      show: false,
      title: '',
      width: 1092,
      height: 780,
      SOP: true,
      close: () => { }
    });
    setSOPEvent({
      SOPIdx: null,
      eventIdx: null,
      eventName: null,
      occurDateTime: null,
      location: null,
      outsideIdx: null,
      insideIdx: null,
      eventTypeId: null,
      severityId: null,
      mapImageURL: null,
      eventCameraId: null,
      mainServiceName: 'origin',
    });
  };

  const ackEvent = async () => {
    if (userId == null) {
      return;
    }
    if (use_sop === false || sop_idx == null) {
      try {
        return await apiAckEvent({
          idxArray: [{
            idx
          }],
          userId
        });
      } catch (error) {
        console.error(error);
      };
    }

    if (sop_idx && event_occurrence_time && event_name && severity_id && main_service_name) {

      setSOPEvent({
        SOPIdx: sop_idx,
        eventIdx: idx,
        eventName: event_name,
        occurDateTime: event_occurrence_time,
        location,
        outsideIdx: outside_idx,
        insideIdx: inside_idx,
        eventTypeId: event_type_id,
        severityId: severity_id,
        mapImageURL: map_image_url,
        eventCameraId: camera_id,
        mainServiceName: main_service_name
      });

      setSOPPopup((prev) => ({
        ...prev,
        show: true,
        title: 'SOP 이벤트 알림',
        close: handleCloseSOPPopup
      }));
      return;
    }

  };

  const closeOpenDialog = () => {
    setOpenDialog({
      show: false,
      title: '',
      width: 0,
      height: 0,
      params: '',
      close: () => { }
    });
  };

  const showOpenDialog = ({ title, width, height, params }: { title: string, width: number, height: number, params: string }) => {
    setOpenDialog({
      show: true,
      title,
      width,
      height,
      params,
      close: closeOpenDialog
    });
  };

  return (
    <div className={`flex flex-col ${BOX_STYLE} ${boxHeight} justify-between`}>
      <div className='flex'>
        <div className='w-[3rem] flex items-center'>
          {is_acknowledge ? (
            <FaRegCheckCircle color='#616A79' className='w-[2rem] h-[2rem]' />
          )
            : (
              <IoAlertCircleOutline color='#D76767' className='w-[2rem] h-[2rem]' />
            )
          }
        </div>
        <div className='flex flex-col'>
          <div className='flex w-[16.125rem] h-[1.5rem]'>
            <div className='w-full flex justify-between'>
              <h5 className='text-sm text-black font-semibold line whitespace-nowrap overflow-x-hidden text-ellipsis' title={event_name}>{event_name}</h5>
              <div className='flex justify-between items-center gap-x-1.5 mr-1'>
                {camera_id && (
                  <Button
                    className={`w-[3.43rem] h-[0.875rem] bg-[#B1B5C0] rounded-sm text-white text-[0.55rem] ${CENTER_STYLE}`}
                    onClick={() => showOpenDialog({ title: '영상 다시보기', width: 680, height: 620, params: `${camera_id}/${event_occurrence_time}/${event_name}&${location}&${dayjs(event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm:ss')}` })}
                  >이벤트 영상</Button>
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
          <div className='border-[1px] border-solid border-[#C8C8C8] w-[16.125rem] my-0.5' />
          <div className='flex flex-col text-black dark:text-[#F3F3F3] max-h-[4.2rem] font-semibold text-[0.58rem]'>
            <p>발생 일시 : {formatDateTime(event_occurrence_time)}</p>
            <p>발생 장소 : {location}</p>
            {!fold && <p>중요도 : {formatSeverityId(severity_id)}</p>}
            {!fold && <p>장치 종류 : {formatDeviceType(device_type)}</p>}
            {(!fold && is_acknowledge) && <p>확인자 : {acknowledge_user}</p>}
          </div>
        </div>
      </div>
      {!fold && (
        <Button
          className={`w-[18.875rem] h-[1rem] border-[1px] border-[#E0E0E0] rounded-[3px] bg-white ${CENTER_STYLE} mx-auto relative -left-1`}
          disabled={is_acknowledge}
          onClick={ackEvent}
        >
          <FaRegCheckCircle color='#17A36F' />
          <p className='text-[#000000] ml-3 text-[0.55rem] dark:text-[#F5F5F5]'>이벤트 확인 처리</p>
        </Button>
      )}
      {openDialog.show && (
        <CustomModal
          show={openDialog.show}
          title={openDialog.title}
          width={openDialog.width}
          height={openDialog.height}
          contentClassName={'rounded-md border-2 border-[#D9DCE3] px-0 py-3'}
          titleClassName='px-4 py-1'
          close={openDialog.close}
        >
          <div className='bg-[#EDF0F6] w-full h-0.5 my-2' />
          <ArchiveVideo
            params={openDialog.params}
          />
        </CustomModal>
      )}
      {(SOPPopup.show && SOPEvent.SOPIdx) && (
        <CustomModal
          show={SOPPopup.show}
          title={SOPPopup.title}
          width={SOPPopup.width}
          height={SOPPopup.height}
          SOP={SOPPopup.show}
          contentClassName={'rounded-[4px] border-2 border-[#D9DCE3] p-0'}
          close={handleCloseSOPPopup}
        >
          <SOPEventDetail
            SOPIdx={SOPEvent.SOPIdx}
            eventName={SOPEvent.eventName}
            eventIdx={SOPEvent.eventIdx}
            occurDateTime={SOPEvent.occurDateTime}
            location={SOPEvent.location}
            outsideIdx={SOPEvent.outsideIdx}
            insideIdx={SOPEvent.insideIdx}
            eventTypeId={SOPEvent.eventTypeId}
            severityId={SOPEvent.severityId}
            mapImageURL={SOPEvent.mapImageURL}
            eventCameraId={SOPEvent.eventCameraId}
            mainServiceName={SOPEvent.mainServiceName}
            mode={'dashboard'}
            close={handleCloseSOPPopup}
          />
        </CustomModal>
      )}
    </div >
  );

}