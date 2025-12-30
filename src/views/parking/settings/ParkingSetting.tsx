import { lazy, Suspense } from 'react'
import SettingsMenu from './ParkingSettingsMenu';
import { useParkingStore } from '@/store/parking/useParkingStore';
import Loading from '@/components/shared/Loading';

const ParkingVmsSetting = lazy(() => import("./settingsGroup/ParkingVmsSetting"));
const ParkingCameraSetting = lazy(() => import("./settingsGroup/ParkingCameraSetting"));
const ParkingSensorSetting = lazy(() => import("./settingsGroup/ParkingSensorSetting"));
const ParkingEventSettings = lazy(() => import("./settingsGroup/ParkingEventSettings"));

const ParkingSetting = () => {
	const { menuState } = useParkingStore(
		(state) => ({
			menuState: state.menuState
		})
	);

	return (
		<div className="flex flex-auto -mt-4 h-[750px] ">
			<div className="'w-[140px] xl:w-[140px]">
				<SettingsMenu/>
			</div>
			<div className="flex-1 p-2">
				<Suspense fallback={<Loading loading />}>
					{menuState.currentMenuView === "vms" && <ParkingVmsSetting />}
					{menuState.currentMenuView === "camera" && <ParkingCameraSetting />}
					{menuState.currentMenuView === "parking_sensor" && <ParkingSensorSetting />}
					{menuState.currentMenuView === "event_setting" && <ParkingEventSettings />}
				</Suspense>
			</div>
		</div>
	)
}

export default ParkingSetting
