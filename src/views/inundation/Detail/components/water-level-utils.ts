export const getThresholdLevels = (threshold: number) => {
	return {
		danger: threshold * 0.90,    // 대피: 90%
		severe: threshold * 0.84,    // 심각: 84%
		warning: threshold * 0.78,   // 경계: 78%
		caution: threshold * 0.70,   // 주의: 70%
		attention: threshold * 0.66, // 관심: 66%
	};
};

export const getLevelStatus = (currentLevel: number, threshold: number) => {
	if (threshold === 0) {
		return { text: '안전', color: 'bg-green-500', hexColor: '#22C55E' };
	}

	const levels = getThresholdLevels(threshold);

	if (currentLevel > levels.danger) return { text: '대피', color: 'bg-purple-600', hexColor: '#9333EA' };
	if (currentLevel === levels.danger) return { text: '심각', color: 'bg-red-500', hexColor: '#EF4444' };
	if (currentLevel >= levels.severe) return { text: '심각', color: 'bg-red-500', hexColor: '#EF4444' };
	if (currentLevel >= levels.warning) return { text: '경계', color: 'bg-orange-500', hexColor: '#F97316' };
	if (currentLevel >= levels.caution) return { text: '주의', color: 'bg-yellow-500', hexColor: '#EAB308' };
	if (currentLevel >= levels.attention) return { text: '관심', color: 'bg-blue-500', hexColor: '#3B82F6' };
	return { text: '안전', color: 'bg-green-500', hexColor: '#22C55E' };
};