import { ScrollBar } from "@/components/ui";
import { useSettingsStore } from "@/store/Inundation/useSettingsStore";

export function ThresholdList() {
	const { waterlevelGaugeList } = useSettingsStore();

	return (
		<div className="h-full flex flex-col">
			<div className="grid grid-cols-3 gap-1 p-2 font-medium text-sm border-b">
				<div>수위계</div>
				<div className="text-right">설정 임계치</div>
				<div className="text-right">현재 수위</div>
			</div>

			<div className="flex-1 overflow-hidden">
				<ScrollBar className="h-full">
					<div className="space-y-1 p-2">
						{waterlevelGaugeList.map((gauge) => (
							<div
								key={gauge.water_level_idx}
								className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-700 p-2 rounded"
							>
								<div>
									<div className="text-sm">{gauge.water_level_name}</div>
									<div className="text-xs text-gray-500">{gauge.water_level_location}</div>
								</div>
								<div className="text-right self-center mr-4">
									<span className="text-gray-500">{parseFloat(gauge.threshold || '').toFixed(1)}M</span>
								</div>
								<div className="text-right self-center mr-4">
									<span className="text-blue-500">{parseFloat(gauge.curr_water_level || '').toFixed(1)}M</span>
								</div>
							</div>
						))}
					</div>
				</ScrollBar>
			</div>

			<div className="text-right text-xs text-gray-400 p-2 border-t">
				{new Date().toLocaleString()}
			</div>
		</div>
	);
}