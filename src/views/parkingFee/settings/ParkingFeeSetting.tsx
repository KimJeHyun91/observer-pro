import { lazy, Suspense } from 'react'
import SettingsMenu from './ParkingFeeSettingsMenu';
import { useParkingFeeStore } from '@/store/parkingFee/useParkingFeeStore';

const ParkingFeeCrossingGateSetting = lazy(() => import("./settingsGroup/ParkingFeeCrossingGateSetting"));

const ParkingFeeSetting = () => {
	const { menuState } = useParkingFeeStore(
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
				<Suspense>
					{menuState.currentMenuView === "crossing_gate" && <ParkingFeeCrossingGateSetting />}
				</Suspense>
			</div>
		</div>
	)
}

export default ParkingFeeSetting
