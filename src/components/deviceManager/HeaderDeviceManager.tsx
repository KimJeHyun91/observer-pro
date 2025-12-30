import MaintenancePopUp from '@/components/deviceManager/MaintenancePopUp'
import UserPopUp from '@/components/deviceManager/UserPopUp'
import UserAlarmUserAlarmPopUp from '@/components/deviceManager/UserAlarmPopUp'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
import device_manager_icon from '@/assets/styles/images/device_manager_icon.png'
import device_manager_icon_dark from '@/assets/styles/images/device_manager_icon_dark.png'

export default function HeaderDeviceManager() {
  const [showMaintenancePopUp, setShowMaintenancePopUp] = useState(false)
  const [showUserPopUp, setShowUserPopUp] = useState(false)
  const [showUserAlarmPopUp, setShowUserAlarmPopUp] = useState(false)
  const [alarmList, setAlarmList] = useState([])

  const { socketService } = useSocketConnection();

  useEffect(() => {
    if (!socketService) return;
    const deviceManagerSocket = socketService.subscribe('prm_notification-update', (received) => {
      if (received) {
        setAlarmList(received.products);
        setShowUserAlarmPopUp(true);
      }
    })
    return () => deviceManagerSocket();
  }, [socketService])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setShowMaintenancePopUp(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex items-center mr-2 cursor-pointer">
      {/* 라이트 모드 아이콘 */}
      {/* <img
        src={device_manager_icon}
        alt="장치관리"
        className="w-[17px] h-[17px] translate-y-[1px] block dark:hidden"
        onClick={() => setShowUserPopUp(true)}
      /> */}
      {/* 다크 모드 아이콘 */}
      <img
        src={device_manager_icon_dark}
        alt="장치관리(다크)"
        className="w-[17px] h-[17px] translate-y-[1px] hidden dark:block"
        onClick={() => setShowUserPopUp(true)}
      />

      {showMaintenancePopUp && <MaintenancePopUp onClose={() => setShowMaintenancePopUp(false)} />}
      {showUserPopUp && (
        <UserPopUp
          onClose={() => setShowUserPopUp(false)}
          sortColum="installationDate"
        />
      )}
      {showUserAlarmPopUp && (
        <UserAlarmUserAlarmPopUp
          onClose={() => setShowUserAlarmPopUp(false)}
          alarmList={alarmList}
        />
      )}
    </div>
  );
}
