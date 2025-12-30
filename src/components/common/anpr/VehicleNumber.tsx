import { useSessionUser } from '@/store/authStore';
import { useSettings } from '@/utils/hooks/useSettings';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect } from 'react';
import { FaCarOn } from "react-icons/fa6";

export default function VehicleNumber() {
  const { user } = useSessionUser();
  const { socketService } = useSocketConnection();
  const { setting, mutate, error, modify } = useSettings('ANPR 차량번호 검출');
  const isAdmin = user?.userId === 'admin00' && user?.userRole === 'admin';

  if (error) {
    console.error('get anpr vehicle number setting error');
  };

  const showDetectedVehicleNum = setting?.[0]?.setting_value;

  const handleModifyAnprDetectVehicleNum = () => {
    if (showDetectedVehicleNum == null) {
      return;
    };
    const settingValue = showDetectedVehicleNum === 'unuse' ? 'use' : showDetectedVehicleNum === 'use' ? 'unuse' : showDetectedVehicleNum;
    modify(settingValue);
  }

  useEffect(() => {
    if (!socketService) return;

    const anprVehicleNumberSocket = socketService.subscribe('cm_settings-update', (received) => {
      if (!received) return;
      if (received.settingName === 'ANPR 차량번호 검출') {
        mutate();
      }
    });
    return () => anprVehicleNumberSocket();
  }, [socketService, mutate]);

  return (
    <div
      className='flex items-center mr-2 cursor-pointer'
      onClick={handleModifyAnprDetectVehicleNum}
    >
      {isAdmin && (
        <FaCarOn size={20} color={`${showDetectedVehicleNum === 'use' ? '#17A36F' : '#404040'}`} />
      )}
    </div>
  );
}