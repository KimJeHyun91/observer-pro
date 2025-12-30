import React, { useState, useEffect, useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { getThresholdLevels } from "./water-level-utils";
import { useWaterlevelLiveStore } from '@/store/Inundation/useWaterlevelLiveStore';
import { apiGetTargetWaterlevelLog } from '@/services/inundationService';

interface WaterlevelChartProps {
  waterlevelIp: string;
  threshold: string;
  waterlevelIdx?: number;
}

const WaterlevelChart: React.FC<WaterlevelChartProps> = ({ threshold = "0", waterlevelIdx, waterlevelIp }) => {
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { updateWaterlevel } = useWaterlevelLiveStore();

  const waterlevel = useWaterlevelLiveStore(state => {
    if (waterlevelIdx && typeof waterlevelIdx === 'number') {
      const key = `idx_${waterlevelIdx}`;
      const found = state.waterlevels[key];
      if (found && found.history && found.history.length > 0) {
        return found;
      }
      
      const foundByValue = Object.values(state.waterlevels).find((wl: any) => 
        wl.water_level_idx === waterlevelIdx && wl.history && wl.history.length > 0
      );
      if (foundByValue) {
        return foundByValue;
      }
    }
    
    if (waterlevelIp) {
      const foundByIp = state.waterlevels[waterlevelIp];
      if (foundByIp && foundByIp.history && foundByIp.history.length > 0) {
        return foundByIp;
      }
    }
    
    return null;
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (!waterlevelIdx || initialDataLoaded) return;
      
      try {
        setIsLoading(true);
        const response = await apiGetTargetWaterlevelLog(waterlevelIdx);
        if (response.result && Array.isArray(response.result) && response.result.length > 0) {
          const recentLogs = response.result.slice(0, 20).reverse(); // 최근 20개 데이터
          recentLogs.forEach((log: any, index) => {
            if (log.water_level_value && log.created_at) {
              const value = parseFloat(log.water_level_value);
              const timestamp = log.created_at;
              
              if (!isNaN(value) && value >= 0) {
                updateWaterlevel(
                  `idx_${waterlevelIdx}`,
                  value,
                  timestamp,
                  waterlevelIdx
                );
                if (waterlevelIp) {
                  updateWaterlevel(
                    waterlevelIp,
                    value,
                    timestamp,
                    waterlevelIdx
                  );
                }
              } 
            } else {
              console.warn(`[Chart] 데이터 필드 누락:`, log);
            }
          });
          
          setInitialDataLoaded(true);
        } 
      } catch (error) {
        console.error(`[WaterlevelChart] 초기 데이터 로드 실패:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [waterlevelIdx, waterlevelIp, initialDataLoaded, updateWaterlevel]);

  const history = waterlevel?.history || [];
  const hasData = history.length > 0;
  
  const validHistory = useMemo(() => {
    return history.filter(h => 
      h.value !== null && 
      h.value !== undefined && 
      !isNaN(h.value) && 
      h.value >= 0 &&
      h.timestamp
    );
  }, [history]);
  
  const seriesData = useMemo(() => [{
    name: "수위",
    data: validHistory.length > 0 ? validHistory.map(h => h.value) : [0]
  }], [validHistory]);
  
  const categories = useMemo(() => {
    if (validHistory.length > 0) {
      return validHistory.map(h => {
        try {
          const date = new Date(h.timestamp);
          if (isNaN(date.getTime())) {
            return '시간 오류';
          }
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        } catch (error) {
          return '시간 오류';
        }
      });
    }
    return ['데이터 없음'];
  }, [validHistory]);

  const validThreshold = parseFloat(threshold || "0");
  const levels = useMemo(() => getThresholdLevels(validThreshold), [validThreshold]);

  const calculateYAxisRange = useMemo(() => {
    if (validHistory.length === 0) {
      // 데이터가 없을 때는 임계치 기반으로 설정
      return {
        min: 0,
        max: Math.max(validThreshold * 1.2, 3)
      };
    }

    const values = validHistory.map(h => h.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    const allValues = [...values, validThreshold];
    const overallMin = Math.min(...allValues);
    const overallMax = Math.max(...allValues);
    
    const range = overallMax - overallMin;
    const padding = Math.max(range * 0.2, 0.5); 
    
    return {
      min: Math.max(0, overallMin - padding * 0.5),
      max: overallMax + padding
    };
  }, [validHistory, validThreshold]);

  const options = useMemo<ApexOptions>(() => ({
    chart: {
      type: "line",
      zoom: { enabled: false },
      height: "100%",
      parentHeightOffset: 0,
      animations: { enabled: true, dynamicAnimation: { enabled: true, speed: 350 } },
      redrawOnWindowResize: true,
      redrawOnParentResize: true,
      toolbar: { show: false },
    },
    colors: ["#22C55E"],
    stroke: { width: 2 },
    xaxis: {
      categories: categories,
      labels: { 
        style: { colors: "#64748B", fontSize: "8px" },
        rotate: -30,
        maxHeight: 40,
        trim: false,
        hideOverlappingLabels: true
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: calculateYAxisRange.min,
      max: calculateYAxisRange.max,
      tickAmount: 5,
      labels: {
        style: { colors: "#64748B", fontSize: "10px" },
        formatter: (value) => value ? `${value.toFixed(1)} m` : '0.0 m',
      },
    },
    grid: { 
      borderColor: "#E2E8F0", 
      strokeDashArray: 5,
      padding: { top: 10, right: 10, bottom: 15, left: 10 }
    },
    dataLabels: {
      enabled: true,
      offsetY: -10,
      style: { fontSize: "10px", colors: ["#666"] },
      formatter: (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return '';
        return `${Number(val).toFixed(1)} m`;
      },
    },
    annotations: {
      yaxis: [
        { y: levels.attention, borderColor: "#22C55E", fillColor: "#22C55E", opacity: 0.2, label: { style: { color: "#22C55E" } } },
        { y: levels.caution, borderColor: "#3B82F6", fillColor: "#3B82F6", opacity: 0.2, label: { style: { color: "#3B82F6" } } },
        { y: levels.warning, borderColor: "#EAB308", fillColor: "#EAB308", opacity: 0.2, label: { style: { color: "#EAB308" } } },
        { y: levels.severe, borderColor: "#F97316", fillColor: "#F97316", opacity: 0.2, label: { style: { color: "#F97316" } } },
        { y: levels.danger, borderColor: "#EF4444", fillColor: "#EF4444", opacity: 0.2, label: { style: { color: "#EF4444" } } },
      ],
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${val.toFixed(2)}m`
      }
    }
  }), [categories, validThreshold, levels, calculateYAxisRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-sm mb-2">데이터 로딩 중...</div>
          <div className="text-xs">잠시만 기다려주세요</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden flex flex-col p-2">
      {hasData ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <Chart options={options} series={seriesData} type="line" height="100%" width="100%" />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-sm mb-2">실시간 데이터 없음</div>
            <div className="text-xs">수위계 연결 상태를 확인해주세요</div>
            <div className="text-xs mt-1">waterlevelIdx: {waterlevelIdx}</div>
            <div className="text-xs">waterlevelIp: {waterlevelIp}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterlevelChart;