import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useWaterlevelLiveStore } from '@/store/Inundation/useWaterlevelLiveStore';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { getLevelStatus } from '../../Detail/components/water-level-utils';

export function WaterLevelChart() {
	const [chartData, setChartData] = useState<ApexOptions['series']>([]);
	const { waterlevelGaugeList, getWaterlevelGaugeList } = useSettingsStore();
	const { socketService } = useSocketConnection();
	const chartRef = useRef<any>(null);
	
	// 실시간 수위 데이터 구독
	const waterlevels = useWaterlevelLiveStore(state => state.waterlevels);

	const calculateYAxisRange = useMemo(() => {
		if (!waterlevelGaugeList?.length) return { min: 0, max: 10 };

		const allValues = [];
		
		waterlevelGaugeList.forEach(gauge => {
			const liveData = waterlevels[`idx_${gauge.water_level_idx}`] || waterlevels[gauge.water_level_ip];
			const currentLevel = liveData ? liveData.value : parseFloat(gauge.curr_water_level || '0');
			const threshold = parseFloat(gauge.threshold || '0');
			
			allValues.push(currentLevel, threshold);
		});

		const minValue = Math.min(...allValues);
		const maxValue = Math.max(...allValues);
		
		const padding = (maxValue - minValue) * 0.1;
		const calculatedMin = Math.max(0, minValue - padding);
		const calculatedMax = maxValue + (padding * 2);

		return {
			min: Math.floor(calculatedMin),
			max: Math.ceil(calculatedMax)
		};
	}, [waterlevelGaugeList, waterlevels]);

	// 실시간 데이터와 DB 데이터를 결합하여 차트 데이터 생성
	const updateChartData = useMemo(() => {
		if (!waterlevelGaugeList?.length) return [];

		const currentLevels = {
			name: '현재 수위',
			data: waterlevelGaugeList.map(gauge => {
				// 실시간 데이터가 있으면 사용, 없으면 DB 데이터 사용
				const liveData = waterlevels[`idx_${gauge.water_level_idx}`] || waterlevels[gauge.water_level_ip];
				if (liveData) {
					return liveData.value;
				}
				return parseFloat(gauge.curr_water_level || '0');
			}),
		};
		const thresholds = {
			name: '임계치',
			data: waterlevelGaugeList.map(gauge => parseFloat(gauge.threshold || '0')),
		};

		return [thresholds, currentLevels];
	}, [waterlevelGaugeList, waterlevels]);

	useEffect(() => {
		setChartData(updateChartData);

		if (chartRef.current?.chart) {
			requestAnimationFrame(() => {
				// Y축 범위도 함께 업데이트
				chartRef.current.chart.updateOptions({
					yaxis: {
						min: calculateYAxisRange.min,
						max: calculateYAxisRange.max,
						labels: {
							formatter: (val) => val.toFixed(1),
							style: { fontSize: '12px', colors: '#666', fontFamily: 'monaco' },
						},
					}
				});
				chartRef.current.chart.updateSeries(updateChartData, true);
			});
		}
	}, [updateChartData, calculateYAxisRange]);

	useEffect(() => {
		if (socketService) {
			const handleWaterLevelUpdate = () => {
				getWaterlevelGaugeList();
			};

			const unsubscribe = socketService.subscribe('fl_water_level_log-update', handleWaterLevelUpdate);

			return () => {
				unsubscribe();
			};
		}
	}, [socketService, getWaterlevelGaugeList]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case '대피': return '#9333ea';
			case '심각': return '#ef4444';
			case '경계': return '#f97316';
			case '주의': return '#eab308';
			case '관심': return '#3b82f6';
			default: return '#22c55e';
		}
	};

	const createAnnotations = (): ApexOptions['annotations'] => {
		const annotations: ApexOptions['annotations'] = { points: [] };
		if (!waterlevelGaugeList) return annotations;

		waterlevelGaugeList.forEach((gauge) => {
			// 실시간 데이터가 있으면 사용, 없으면 DB 데이터 사용
			const liveData = waterlevels[`idx_${gauge.water_level_idx}`] || waterlevels[gauge.water_level_ip];
			const currentLevel = liveData ? liveData.value : parseFloat(gauge.curr_water_level || '0');
			const threshold = parseFloat(gauge.threshold || '0');
			const status = getLevelStatus(currentLevel, threshold);

			if (['대피', '심각', '경계', '주의'].includes(status.text)) {
				const backgroundColor = getStatusColor(status.text);
				annotations.points?.push({
					x: gauge.water_level_name,
					y: currentLevel,
					marker: { size: 0 },
					label: {
						borderColor: backgroundColor,
						borderWidth: 1,
						borderRadius: 5,
						text: `🚨${status.text}`,
						position: 'top',
						offsetY: -10,
						style: {
							background: backgroundColor,
							color: '#ffffff',
							fontSize: '14px',
							fontFamily: 'monaco',
							fontWeight: 'bold',
							cssClass: 'custom-label',
						},
					},
				});
			}
		});

		return annotations;
	};

	const chartOptions: ApexOptions = {
		chart: {
			type: 'bar',
			stacked: false,
			toolbar: { show: false },
			background: 'transparent',
			fontFamily: 'monaco',
			animations: { enabled: true, dynamicAnimation: { enabled: true, speed: 350 } },
		},
		plotOptions: {
			bar: {
				horizontal: false,
				columnWidth: '70%',
				borderRadius: 0,
			},
		},
		dataLabels: {
			enabled: true,
			offsetY: -20,
			style: { fontSize: '12px', colors: ['#3e3d3d'], fontFamily: 'monaco' },
			formatter: (val: number) => val.toFixed(1),
		},
		annotations: createAnnotations(),
		grid: {
			borderColor: '#f1f1f1',
			xaxis: { lines: { show: false } },
		},
		xaxis: {
			categories: waterlevelGaugeList?.map(gauge => gauge.water_level_name) || [],
			labels: {
				style: { fontSize: '12px', colors: '#666', fontFamily: 'monaco' },
				rotate: -45,
				trim: true,
			},
			axisBorder: { show: true, color: '#f1f1f1' },
		},
		yaxis: {
			min: calculateYAxisRange.min,
			max: calculateYAxisRange.max,
			labels: {
				formatter: (val) => val.toFixed(1), // 소수점 1자리까지 표시
				style: { fontSize: '12px', colors: '#666', fontFamily: 'monaco' },
			},
		},
		legend: {
			position: 'top',
			horizontalAlign: 'right',
			labels: { colors: '#666' },
			fontFamily: 'monaco',
		},
		colors: ['#60A5FA', '#7C3AED'], 
		tooltip: { 
			enabled: true, 
			y: {
				formatter: (val) => `${val.toFixed(2)}m`
			}
		},
	};

	return (
		<div className="w-full h-full bg-gray-100 rounded-md shadow mt-2">
			<Chart
				ref={chartRef}
				options={chartOptions}
				series={chartData}
				type="bar"
				height="100%"
				width="100%"
			/>
		</div>
	);
}

export default WaterLevelChart;