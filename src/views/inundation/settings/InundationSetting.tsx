import { lazy, Suspense } from 'react'
import SettingsMenu from './InundationSettingsMenu';
import useResponsive from '@/utils/hooks/useResponsive'
import { useSettingsMenuStore } from '@/store/settingsStore';
// import Loading from '@/components/shared/Loading';

import InundationVmsSetting from './settingsGroup/InundationVmsSetting';

// const Vms = lazy(() => import('./settings/InundationVmsSetting'));
const BillboardMessage = lazy(() => import("./settingsGroup/InundationBillboardMessageSetting"));
const InundationCameraSetting = lazy(() => import("./settingsGroup/InundationCameraSetting"));
const SpeakerMessage = lazy(() => import("./settingsGroup/InundationSpeakerMessageSetting"));
const WaterlevelGauge = lazy(() => import("./settingsGroup/InundationWaterlevelGaugeSetting"));
const WaterlevelGaugeCrossingGate = lazy(() => import("./settingsGroup/InundationWaterlevelGaugeCrossingGateSetting"));
const WaterlevelGaugeThreshold = lazy(() => import("./settingsGroup/InundationWaterlevelGaugeThresholdSetting"));
const WaterlevelGroupMapping = lazy(() => import("./settingsGroup/InundationWaterlevelGroupMapping"));
const InundationEventType = lazy(() => import("./settingsGroup/InundationEventSettings"));

const InundationSetting = () => {
	const { currentMenuView } = useSettingsMenuStore();

	const { smaller, larger } = useResponsive();

	return (
		<div className="h-[700px] flex">
			<div className="flex flex-auto h-full">
				{larger.lg && (
					<div className="'w-[140px] xl:w-[140px]">
						<SettingsMenu />
					</div>
				)}
				<div className=" flex-1 py-1 ml-2">
					<Suspense fallback={<></>}>
					{/* <Suspense fallback={<Loading loading={true} className="w-full h-full flex items-center justify-center" />}> */}
						{currentMenuView === "vms" && <InundationVmsSetting />}
						{currentMenuView === "camera" && <InundationCameraSetting mainServiceName='inundation' />}
						{currentMenuView === "billboard_message" && <BillboardMessage />}
						{currentMenuView === "speaker_message" && <SpeakerMessage />}
						{currentMenuView === "waterlevel_gauge" && <WaterlevelGauge />}
						{currentMenuView === "waterlevel_gauge_crossinggate" && (<WaterlevelGaugeCrossingGate />)}
						{currentMenuView === "waterlevel_gauge_threshold" && <WaterlevelGaugeThreshold />}
						{currentMenuView === "waterlevel_group_mapping" && <WaterlevelGroupMapping />}
						{currentMenuView === "event_setting" && <InundationEventType />}
					</Suspense>
				</div>
			</div>
		</div>
	)
}

export default InundationSetting
