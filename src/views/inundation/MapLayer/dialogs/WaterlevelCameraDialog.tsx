import { Dialog } from '@/components/ui';
import 'leaflet/dist/leaflet.css';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import { CameraStreamProvider } from '@/context/cameraStreamContext';
import LiveStream from '@/components/common/camera/LiveStream';
import { apiGetWaterLevelCameraInfo } from '@/services/InundationService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import waterlevelImg from './waterlevel.png';

interface WaterlevelCameraDialogProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number } | undefined;
  waterlevel?: {
    water_level_name: string;
    water_level_location: string;
    curr_water_level?: string;
    threshold?: string;
    linked_status: boolean;
    water_level_idx: number;
  } | null;
}

interface CameraInfo {
  camera_name: string;
  camera_id: string;
  vms_name: string;
  camera_ip?: string;
  service_type: string;
}

export default function WaterlevelCameraDialog({ isOpen, onClose, waterlevel, position }: WaterlevelCameraDialogProps) {
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeWaterLevel, setRealTimeWaterLevel] = useState<string>('0');
  const { socketService } = useSocketConnection();

  useEffect(() => {
    const fetchCameraInfo = async () => {
      if (!waterlevel?.water_level_idx) return;
      
      setIsLoading(true);
      try {
        const response = await apiGetWaterLevelCameraInfo({ waterlevelIdx: waterlevel.water_level_idx });
        if (response.result && Array.isArray(response.result) && response.result.length > 0) {
          const waterlevelData = response.result[0] as any;
          
          if (waterlevelData.camera_name && waterlevelData.camera_id && waterlevelData.vms_name) {
            setCameraInfo({
              camera_name: waterlevelData.camera_name,
              camera_id: waterlevelData.camera_id,
              vms_name: waterlevelData.vms_name,
              camera_ip: waterlevelData.camera_ip,
              service_type: waterlevelData.service_type || 'inundation'
            });
          } else {
            console.log('카메라 정보 누락:', waterlevelData);
          }
        }
      } catch (error) {
        console.error('카메라 정보 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && waterlevel) {
      fetchCameraInfo();
    }
  }, [isOpen, waterlevel]);

  useEffect(() => {
    if (!socketService || !waterlevel?.water_level_idx) return;

    const handleWaterLevelUpdate = (data: any) => {
      const arr = Array.isArray(data) ? data : [data];
      const filteredLogs = arr.filter((log: any) => log.water_level_idx === waterlevel.water_level_idx);
      
      if (filteredLogs.length > 0) {
        const sortedLogs = filteredLogs.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestLog = sortedLogs[0];
        setRealTimeWaterLevel(latestLog.water_level || '0');
      }
    };

    const unsubscribe = socketService.subscribe('fl_water_level_log-update', handleWaterLevelUpdate);

    return () => {
      unsubscribe();
    };
  }, [socketService, waterlevel?.water_level_idx]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="bg-transparent"
      overlayClassName="bg-transparent"
      contentClassName="dialog-content-waterlevelCam"
      position={position}
      style={{
        overlay: {
          backgroundColor: 'transparent'
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-[27vw] shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold dark:text-white">
            {waterlevel?.water_level_name}
          </h2>
          {!waterlevel?.linked_status && 
          <div className="flex items-center bg-red-400 text-white px-2 py-1 rounded mr-10">
            <span>연결 끊김</span>
            <HiOutlineExclamationCircle className="ml-1" />
          </div>}
        </div>
        <div className="aspect-video bg-black rounded mb-4">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>카메라 정보 로딩 중...</p>
              </div>
            </div>
          ) : cameraInfo ? (
            <CameraStreamProvider>
              <LiveStream
                main_service_name="inundation"
                vms_name={cameraInfo.vms_name}
                camera_id={cameraInfo.camera_id}
                service_type={cameraInfo.service_type}
                area_name={waterlevel?.water_level_location}
                access_point={cameraInfo.camera_ip}
                camera_ip={cameraInfo.camera_ip}
              />
            </CameraStreamProvider>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p>연결된 카메라가 없습니다</p>
                <p className="text-sm mt-1">수위계와 연결된 카메라를 확인해주세요</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <p>위치: {waterlevel?.water_level_location}</p>
          <p>수위: {realTimeWaterLevel}m</p>
          <p>임계치: {waterlevel?.threshold}m</p>
          {cameraInfo && (
            <p>카메라: {cameraInfo.camera_name}</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}