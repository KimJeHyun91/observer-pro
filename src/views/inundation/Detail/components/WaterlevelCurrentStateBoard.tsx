import React, { useState, useEffect } from 'react';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { getLevelStatus, getThresholdLevels } from './water-level-utils';

interface WaterlevelCurrentStateBoardProps {
	waterlevelIdx?: number;
	threshold?: string;
	currentWaterLevel?: string;
}

const WaterlevelCurrentStateBoard: React.FC<WaterlevelCurrentStateBoardProps> = React.memo(({
	threshold = '0',
	currentWaterLevel: initialWaterLevel = '0',
	waterlevelIdx,
}) => {
	const [errorMessage, setErrorMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [currentWaterLevel, setCurrentWaterLevel] = useState(initialWaterLevel);

	const { socketService } = useSocketConnection();

	useEffect(() => {
		setCurrentWaterLevel(initialWaterLevel);
	}, [initialWaterLevel]);

	const validateThreshold = (value: number): number => {
		if (!value || value <= 0 || isNaN(value)) {
			return 0;
		}
		return value;
	};

	const validateWaterLevel = (value: number): number => {
		const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
		if (!numValue || isNaN(numValue) || numValue < 0) {
			return 0;
		}
		return numValue;
	};

	const transformThreshold = parseFloat(threshold || '0');
	const transformCurrentWaterLevel = parseFloat(currentWaterLevel || '0');

	const validThreshold = validateThreshold(transformThreshold);
	const validWaterLevel = validateWaterLevel(transformCurrentWaterLevel);

	const levels = getThresholdLevels(validThreshold);
	const status = getLevelStatus(validWaterLevel, validThreshold);

	const alertStatuses = ['대피', '심각', '경계'];
	const isBlinking = alertStatuses.includes(status.text);

	useEffect(() => {
		if (socketService && waterlevelIdx) {
			const handleWaterLevelUpdate = (data: any) => {
				const filteredLogs = data.filter((log: { water_level_idx: number }) => {
					return log.water_level_idx === waterlevelIdx;
				});
				
				
				if (filteredLogs.length > 0) {
					const sortedLogs = filteredLogs.sort(
						(a: { created_at: string | number | Date }, b: { created_at: string | number | Date }) =>
							new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
					const latestLog = sortedLogs[0];
					setCurrentWaterLevel(latestLog.water_level || '0');
				} 
			};

			const unsubscribe = socketService.subscribe('fl_water_level_log-update', (data) => {
				handleWaterLevelUpdate(data);
			});

			return () => {
				unsubscribe();
			};
		}
	}, [socketService, waterlevelIdx]);

	if (isLoading) {
		return <div className="text-center">로딩 중...</div>;
	}

	if (errorMessage) {
		return <div className="text-center text-red-500">{errorMessage}</div>;
	}

	return (
		<div className="flex justify-between gap-2 mt-2 mb-2">
			<div
				className={`flex-1 border-4 rounded-lg p-2 text-white ${status.color} ${isBlinking ? 'animate-blinkBorder' : ''}`}
				style={{ borderStyle: 'solid' }}
			>
				<div className="text-3xl font-bold text-center mb-2 mt-5">{status.text}</div>
				<div className="text-xl text-center">수위: {validWaterLevel.toFixed(1)}m</div>
			</div>

			<div className="flex flex-col text-xs">
				<div className="flex items-center">
					<div className="bg-purple-600 text-white px-1.5 py-0.5 rounded w-full text-center">
						대피: {levels.danger.toFixed(1)}m 초과
					</div>
				</div>
				<div className="flex items-center">
					<div className="bg-red-500 text-white px-1.5 py-0.5 rounded w-full text-center">
						심각: {levels.severe.toFixed(1)}m ~ {levels.danger.toFixed(1)}m
					</div>
				</div>
				<div className="flex items-center">
					<div className="bg-orange-500 text-white px-1.5 py-0.5 rounded w-full text-center">
						경계: {levels.warning.toFixed(1)}m ~ {(levels.severe - 0.1).toFixed(1)}m
					</div>
				</div>
				<div className="flex items-center">
					<div className="bg-yellow-500 text-white px-1.5 py-0.5 rounded w-full text-center">
						주의: {levels.caution.toFixed(1)}m ~ {(levels.warning - 0.1).toFixed(1)}m
					</div>
				</div>
				<div className="flex items-center">
					<div className="bg-blue-500 text-white px-1.5 py-0.5 rounded w-full text-center">
						관심: {levels.attention.toFixed(1)}m ~ {(levels.caution - 0.1).toFixed(1)}m
					</div>
				</div>
				<div className="flex items-center">
					<div className="bg-green-500 text-white px-1.5 py-0.5 rounded w-full text-center">
						안전: {levels.attention.toFixed(1)}m 미만
					</div>
				</div>
			</div>
		</div>
	);
});

export default WaterlevelCurrentStateBoard;