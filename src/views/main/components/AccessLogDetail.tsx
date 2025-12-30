import { useEffect, useState } from 'react';
import { KeyedMutator } from 'swr';
import { FaRegCheckCircle, FaVideo } from 'react-icons/fa';
import { SlClose, SlLocationPin } from 'react-icons/sl'
import { ObDeviceType } from '@/@types/device';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AccessCtlLog } from '../types/accessCtl';
import { SelectedAccessLog } from './AccessLogDashboard';
import { formatDateTimeStringKorean } from '../service/formatDateTimeString';
import { Button } from '@/components/ui';
import dayjs from 'dayjs';

type Props = {
  accessLogData: AccessCtlLog[];
  mutateAccessLog: KeyedMutator<AccessCtlLog>;
  mode: 'map' | 'dashboard';
  selectAccessLog?: ({
    LogIDX,
    LogStatus,
    LogStatusName,
    LogPersonLastName,
    LogTitleName,
    LogDateTime,
    LogDoorName,
    userImage,
    camera_id
  }: SelectedAccessLog) => void,
  showOpenDialog: ({ title, width, height, params }: { title: string, width: number, height: number, params: string }) => void;
}

const CENTER_STYLE = 'flex items-center justify-center';

export default function AccessLogDetail({ accessLogData, mutateAccessLog, mode, selectAccessLog, showOpenDialog }: Props) {

  const { doors, error: errorDoor, mutate: mutateDoors } = useDoors();

  const { setCanvasMapState } = useCanvasMapStore();
  const { socketService } = useSocketConnection();

  if (errorDoor) {
    console.log('access door log hook error');
  };
  const [selectedAccessLogIDX, setSelectedAccessLogIDX] = useState<number | null>(null);

  const handleMoveToDoor = (LogDoorID: string) => {
    if (!doors) {
      return;
    }
    const findDoor = doors.find((door: ObDeviceType) => door.device_id === LogDoorID);
    if (!findDoor) {
      return;
    }
    const { outside_idx, inside_idx, inside_map_image_url, dimension_type } = findDoor;
    if (!outside_idx || !inside_idx) {
      return;
    }
    const current = useCanvasMapStore.getState();
    if (dimension_type === '3d') {
      setCanvasMapState({
        ...current,
        threeDModelId: outside_idx,
        floorIdx: inside_idx,
        mapImageURL: inside_map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${inside_map_image_url}` : null,
        mainServiceName: 'origin',
        is3DView: true
      });
    } else {
      setCanvasMapState({
        ...current,
        buildingIdx: outside_idx,
        floorIdx: inside_idx,
        mapImageURL: inside_map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${inside_map_image_url}` : null,
        mainServiceName: 'origin',
        is3DView: false
      });
    }
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const accessLogSocket = socketService.subscribe('ob_accessCtlLog', (received) => {
      if (received) {
        mutateAccessLog();
      }
    });

    const doorSocket = socketService.subscribe('ob_doors-update', (received) => {
      if (received) {
        mutateDoors();
      }
    });

    return () => {
      accessLogSocket();
      doorSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <>
      {
        accessLogData.map((accessLog) => (
          <li
            key={accessLog.LogIDX}
            className={
              `w-full flex items-center bg-[#EBECEF] dark:bg-[#313233] pl-3 pr-2 py-1.5 rounded-md mx-auto 
          ${mode === 'dashboard' && 'cursor-pointer'}
          ${selectedAccessLogIDX && (selectedAccessLogIDX === accessLog.LogIDX ? 'border-[#f0ec23] border-[2px] border-solid' : '')}
          `
            }
            style={{
              backgroundColor: accessLog.LogStatus === '30' ? '#990507d9' : ''
            }}
            onClick={() => {
              if (selectAccessLog) {
                selectAccessLog({
                  LogIDX: accessLog.LogIDX,
                  LogDateTime: accessLog.LogDateTime,
                  LogDoorName: accessLog.LogDoorName,
                  LogPersonLastName: accessLog.LogPersonLastName,
                  LogStatusName: accessLog.LogStatusName,
                  LogTitleName: accessLog.LogTitleName,
                  LogStatus: accessLog.LogStatus,
                  userImage: accessLog.LogPersonID ?
                    `http://${window.location.hostname}:4200/images/access_control_person/${accessLog.LogPersonID}.png` :
                    null,
                  camera_id: accessLog.camera_id
                });
                setSelectedAccessLogIDX(accessLog.LogIDX);
              }
            }}
          >
            <div className='w-[14%]'>
              {accessLog.LogStatus === '0' ? <FaRegCheckCircle color='#616A79' size={30} /> : <SlClose color='#D76767' size={30} />}
            </div>
            <div className='w-[86%] text-[#010101] dark:text-[#F5F5F5]'>
              {mode === 'map' && (
                <header className='flex relative'>
                  <h4
                    className='text-[0.8rem] mb-0'
                    style={{
                      color: accessLog.LogStatus === '30' ? '#FFDEAD' : ''
                    }}
                  >
                    {accessLog.LogStatusName}
                  </h4>
                  {(accessLog.camera_id && accessLog.camera_id.split(':')[1]) && (
                    <Button
                      className={`absolute left-56 top-0.5 w-6 bg-[#B1B5C0] p-1.5 h-5 rounded-sm ${CENTER_STYLE}`}
                      onClick={() => showOpenDialog({ title: '영상 다시보기', width: 680, height: 620, params: `${accessLog.camera_id}/${accessLog.LogDateTime}/${accessLog.LogStatusName}(${accessLog.LogPersonLastName})&${accessLog.LogDoorName}&${dayjs(accessLog.LogDateTime, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm:ss')}` })}
                    >
                      <FaVideo color='#fff' size={12} />
                    </Button>
                  )}
                </header>
              )}
              {mode === 'map' && <div className='w-[103%] bg-[#CCCCCD] h-[1px] mb-1' />}
              <div className='flex items-center justify-between'>
                <div
                  className='flex flex-col'
                  style={{
                    color: accessLog.LogStatus === '30' ? '#e1d8d8' : ''
                  }}
                >
                  <p className='text-[0.7rem]'>이름 : {accessLog.LogPersonLastName}</p>
                  <p className='text-[0.7rem]'>시간 : {formatDateTimeStringKorean(accessLog.LogDateTime!)}</p>
                  <p className='text-[0.7rem]'>출입위치 : {accessLog.LogDoorName}</p>
                </div>
                {mode === 'map' && (
                  <div
                    className='bg-[#909090] bg-gradient-to-br from-[#909090] to-[#6b6b6b] rounded-sm cursor-pointer'
                    onClick={() => handleMoveToDoor(accessLog.LogDoorID!)}
                  >
                    <SlLocationPin size={30} color='white' className='p-1' />
                  </div>
                )}
              </div>
            </div>
          </li >
        ))}

    </>
  )
}