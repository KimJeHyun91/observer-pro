import ArchiveStream from '@/components/common/camera/archiveStream';
import { useEventArchiveContext } from '../context/eventArchiveContext';
import { formatDateTimeStringKorean } from '../service/formatDateTimeString';
import { useEffect } from 'react';

export default function EventArchiveBuildingDashboard() {

  const eventArchiveContext = useEventArchiveContext();
  const occurDateTime = eventArchiveContext?.occurDateTime;
  const location = eventArchiveContext?.location;
  const eventName = eventArchiveContext?.eventName;
  const eventCameraId = eventArchiveContext?.eventCameraId;

  useEffect(() => {
    return () => {
      eventArchiveContext?.handleUpdateEventDetail({
        occurDateTime: '',
        location: '',
        eventName: '',
        eventCameraId: ''
      });
    };
  }, [])

  return (
    <section className='rounded-sm bg-[#EBECEF] dark:bg-[#272829] w-[22.3125rem] h-[41.5%] ml-2 p-2'>
      <h6 className='text-md pl-3 flex items-center pt-1'>CCTV 영상</h6>
      <div className='w-[calc(100%-0.5rem)] mx-auto h-0.5 relative bg-[#616A79] my-1' />
      <div className='flex flex-col justify-around h-[calc(100%-2rem)]'>
        <div className='rounded-sm bg-black p-2 min-h-[9.125rem] h-[calc(100%-6rem)]'>
          {(eventCameraId && occurDateTime) && (
            <ArchiveStream
              main_service_name={'origin'}
              vms_name={eventCameraId.split(':')[1]}
              camera_id={eventCameraId.split(':')[2]}
              start_dateTime={occurDateTime}
            />
          )}
        </div>
        <div className='rounded-[3px] bg-white dark:bg-[#313233] p-2 h-[4.6875rem] flex flex-col text-xs'>
          <div className='flex'>
            <span className='w-1/4 text-[#9198A3]'>이벤트 종류</span>
            {eventName && <p className='w-3/4 text-black dark:text-[#F5F5F5]' >{eventName}</p>}
          </div>
          <div className='flex'>
            <span className='w-1/4 text-[#9198A3]'>발생 시간</span>
            {occurDateTime && <p className='w-3/4 text-black dark:text-[#F5F5F5]'>{formatDateTimeStringKorean(occurDateTime)}</p>}
          </div>
          <div className='flex'>
            <span className='w-1/4 text-[#9198A3]'>발생 위치</span>
            {location && <p className='w-3/4 text-black dark:text-[#F5F5F5]'>{location}</p>}
          </div>
          <div className='flex'>
            <span className='w-1/4 text-[#9198A3]'>카메라 정보</span>
            {eventCameraId && <p className='w-3/4 text-black dark:text-[#F5F5F5]'>{eventCameraId}</p>}
          </div>
        </div>
      </div>
    </section>
  );

}