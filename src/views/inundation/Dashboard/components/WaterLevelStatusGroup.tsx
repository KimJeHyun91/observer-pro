import ScrollBar from 'simplebar-react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useMemo } from 'react';
import { useWaterlevelLiveStore } from '@/store/Inundation/useWaterlevelLiveStore';
import { getLevelStatus } from '../../Detail/components/water-level-utils';
import 'simplebar-react/dist/simplebar.min.css';

export function WaterLevelStatusGroup() {
	const { waterlevelGaugeList } = useSettingsStore();
	// 실시간 수위 데이터 구독
	const waterlevels = useWaterlevelLiveStore(state => state.waterlevels);

	const getStatusCounts = useMemo(() => {
		const total = waterlevelGaugeList.length;
		const counts = {
			danger: 0,    // 대피
			severe: 0,    // 심각
			warning: 0,   // 경계
			caution: 0,   // 주의
			attention: 0, // 관심
			safety: 0     // 안전
		};

		waterlevelGaugeList.forEach(gauge => {
			const liveData = waterlevels[`idx_${gauge.water_level_idx}`] || waterlevels[gauge.water_level_ip];
			const currentLevel = liveData ? liveData.value : parseFloat(gauge.curr_water_level || '0');
			const threshold = parseFloat(gauge.threshold || '0');

			if (isNaN(currentLevel) || isNaN(threshold)) {
				counts.safety++;
				return;
			}
			const status = getLevelStatus(currentLevel, threshold);
			switch (status.text) {
				case '대피':
					counts.danger++;
					break;
				case '심각':
					counts.severe++;
					break;
				case '경계':
					counts.warning++;
					break;
				case '주의':
					counts.caution++;
					break;
				case '관심':
					counts.attention++;
					break;
				default:
					counts.safety++;
					break;
			}
		});

		return { total, ...counts };
	}, [waterlevelGaugeList, waterlevels]);

	return (
		<div className="flex gap-2 h-full">
			<div className="flex flex-col w-20 p-1 shrink-0 h-full">
				<div className="flex flex-col gap-1 h-full">
					<div className="flex-1 flex flex-col bg-gray-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">전체</div>
						<div className="text-lg font-bold">{getStatusCounts.total}</div>
					</div>
					<div className="flex-1 flex flex-col bg-purple-600 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">대피</div>
						<div className="text-lg font-bold">{getStatusCounts.danger}</div>
					</div>
					<div className="flex-1 flex flex-col bg-red-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">심각</div>
						<div className="text-lg font-bold">{getStatusCounts.severe}</div>
					</div>
					<div className="flex-1 flex flex-col bg-orange-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">경계</div>
						<div className="text-lg font-bold">{getStatusCounts.warning}</div>
					</div>
					<div className="flex-1 flex flex-col bg-yellow-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">주의</div>
						<div className="text-lg font-bold">{getStatusCounts.caution}</div>
					</div>
					<div className="flex-1 flex flex-col bg-blue-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">관심</div>
						<div className="text-lg font-bold">{getStatusCounts.attention}</div>
					</div>
					<div className="flex-1 flex flex-col bg-green-500 text-white rounded text-center justify-center">
						<div className="text-xs font-medium">안전</div>
						<div className="text-lg font-bold">{getStatusCounts.safety}</div>
					</div>
				</div>
			</div>

			<div className="flex-1 min-h-0 bg-gray-100 rounded mt-1 dark:text-white dark:bg-[#737373]">
				<ScrollBar className="h-full">
					<div className="p-2">
						<div className="text-sm font-medium mb-2">수위계 목록</div>
						<div className="space-y-2">
							{waterlevelGaugeList.map((gauge) => {
								const liveData = waterlevels[`idx_${gauge.water_level_idx}`] || waterlevels[gauge.water_level_ip];
								const currentLevel = liveData ? liveData.value : parseFloat(gauge.curr_water_level || '0');
								const threshold = parseFloat(gauge.threshold || '0');
								const status = getLevelStatus(currentLevel, threshold);

								let colorClass;
								switch (status.text) {
									case '대피':
										colorClass = 'bg-purple-600';
										break;
									case '심각':
										colorClass = 'bg-red-500';
										break;
									case '경계':
										colorClass = 'bg-orange-500';
										break;
									case '주의':
										colorClass = 'bg-yellow-500';
										break;
									case '관심':
										colorClass = 'bg-blue-500';
										break;
									default:
										colorClass = 'bg-green-500';
										break;
								}

								return (
									<div key={gauge.water_level_idx}
										className="flex items-center gap-2 bg-white rounded"
									>
										<div className={`${colorClass} w-1 h-12 rounded-l`} />
										<div className="flex-1">
											<div className="font-medium dark:text-gray-800">{gauge.water_level_name}</div>
											<div className="text-sm text-gray-500">{gauge.water_level_location}</div>
											<div className="text-xs text-gray-400">
												수위: {currentLevel.toFixed(1)}m / 임계치: {threshold.toFixed(1)}m
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</ScrollBar>
			</div>
		</div>
	);
}