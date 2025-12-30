import { lazy, Suspense } from 'react'
import SettingsMenu from './OriginSettingsMenu';
import { useSettingStore } from '@/store/main/useSettingStore';
import Loading from '@/components/shared/Loading';

const VmsSetting = lazy(() => import("./setting/VmsSetting"));
const CameraSetting = lazy(() => import("./setting/CameraSetting"));
const EventTypeSetting = lazy(() => import("./setting/EventTypeSetting"));
const SOPSetting = lazy(() => import("./setting/SOPProcedureSetting"));
const FalseAlarmSetting = lazy(() => import("./setting/FalseAlarmSetting"));
const AccessCtlSetting = lazy(() => import("./setting/AccessCtlSetting"));
const AccessPersonSetting = lazy(() => import("./setting/AccessPersonSetting"));
const EbellSetting = lazy(() => import("./setting/EbellSetting"));
const PIDSSetting = lazy(() => import("./setting/PIDSSetting"));

const ParkingSetting = () => {
  const { menuState } = useSettingStore(
    (state) => ({
      menuState: state.menuState
    })
  );

  return (
    <div className="flex flex-auto -mt-4 h-[750px] ">
      <div className="'w-[140px] xl:w-[140px]">
        <SettingsMenu />
      </div>
      <div className="flex-1 p-2">
        <Suspense fallback={<Loading loading />}>
          {menuState.currentMenuView === "vms" && <VmsSetting />}
          {menuState.currentMenuView === "camera" && <CameraSetting mainServiceName='origin' />}
          {menuState.currentMenuView === "event" && <EventTypeSetting />}
          {menuState.currentMenuView === "sop-1" && <SOPSetting />}
          {menuState.currentMenuView === "sop-2" && <FalseAlarmSetting />}
          {menuState.currentMenuView === "accessCtl" && <AccessCtlSetting />}
          {menuState.currentMenuView === "accessCtl-sms" && <AccessPersonSetting />}
          {menuState.currentMenuView === "ebell" && <EbellSetting />}
          {menuState.currentMenuView === "PIDS" && <PIDSSetting />}
        </Suspense>
      </div>
    </div>
  )
}

export default ParkingSetting
