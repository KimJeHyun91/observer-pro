import { ServiceType } from '@/@types/common';
import ArchiveStream from '@/components/common/camera/archiveStream';

type Props = {
  params: string;
  rewind?: number;
}

export default function ArchiveVideo({ params, rewind }: Props) {
  const paramsArr = params.split('/');
  const eventCameraId = paramsArr[0];
  const eventCameraIdArr = eventCameraId.split(':');
  const mainServiceName = eventCameraIdArr[0] as ServiceType;
  const vmsName = eventCameraIdArr[1];
  const cameraId = eventCameraIdArr[2];
  const serviceType = eventCameraIdArr[3];
  const startDateTime = paramsArr[1];
  const eventInfo = paramsArr[2];
  const eventName = eventInfo.split('&')[0];
  const location = eventInfo.split('&')[1];
  const occurDateTime = eventInfo.split('&')[2];
  return (
    <section className='w-full flex flex-col justify-between gap-2'>
      <div className='w-[40rem] h-[7.5rem] mx-auto bg-[#EBECEF] rounded-sm px-3 py-1.5 flex flex-col justify-around'>
        <div className='flex h-[1.75rem] w-full'>
          <p className='text-[#716E6E] text-lg w-1/6 font-semibold'>이벤트</p>
          <span className='rounded-[1px] bg-[#FFFFFF] w-5/6 text-xl flex items-center px-3'>{eventName}</span>
        </div>
        <div className='flex h-[1.75rem] w-full'>
          <p className='text-[#716E6E] text-lg w-1/6 font-semibold'>발생 위치</p>
          <span className='rounded-[1px] bg-[#FFFFFF] w-5/6 text-xl flex items-center px-3'>{location}</span>
        </div>
        <div className='flex h-[1.75rem] w-full'>
          <p className='text-[#716E6E] text-lg w-1/6 font-semibold'>발생 일시</p>
          <span className='rounded-[1px] bg-[#FFFFFF] w-5/6 text-xl flex items-center px-3'>{occurDateTime}</span>
        </div>
      </div>
      <div className='w-[40rem] h-[26rem] mx-auto'>
        <ArchiveStream
          main_service_name={mainServiceName}
          vms_name={vmsName}
          camera_id={cameraId}
          start_dateTime={startDateTime}
          service_type={serviceType}
          rewind={rewind}
        />
      </div>
    </section>
  );

}