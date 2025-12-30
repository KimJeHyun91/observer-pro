import React, { useEffect, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useWaterLevelLog } from '@/utils/hooks/useTunnelArea';
import { useWaterLevelStore } from '@/store/tunnel/useWaterLevelStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

type Props = {
  outsideIdx: number;
};

type WaterLevelLogItem = {
  created_at: string;
  water_level: number | string;
};

const WaterGaugeChart: React.FC<Props> = ({ outsideIdx }) => {
  const { socketService } = useSocketConnection();
  const { waterLevelLog, mutate } = useWaterLevelLog(outsideIdx);
  const { addWaterLevelControlIn, setAddWaterLevelControlIn } = useWaterLevelStore();
  const chartRef = useRef<any>(null);

  const [waterLevelList, setWaterLevelList] = useState<number[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentWaterLevel, setCurrentWaterLevel] = useState(0);
  const [currentState, setCurrentState] = useState<{
    text: string;
    color: string;
    hexColor: string;
  }>({ text: '안전', color: 'bg-green-600', hexColor: '#22C55E' });

  const buildCategories = () => {
    const now = new Date();
    const roundedMin = Math.floor(now.getMinutes() / 5) * 5;
    const end = new Date(now);
    end.setMinutes(roundedMin, 0, 0);

    const cats = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(end);
      d.setMinutes(end.getMinutes() - 5 * (6 - i));
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });

    setCategories(cats);
  };

  const buildWaterLevelList = () => {
    const rawList: number[] = Array.isArray(waterLevelLog?.result)
      ? (waterLevelLog.result as WaterLevelLogItem[])
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((item) => Number(item.water_level))
      : [];

    const padded =
      rawList.length >= 7
        ? rawList.slice(-7)
        : Array(7 - rawList.length).fill(0).concat(rawList);

    setWaterLevelList(padded);
    setCurrentWaterLevel(padded[6]);
  };

  useEffect(() => {
    setAddWaterLevelControlIn(waterLevelLog?.existControlIn ?? false);
  }, [waterLevelLog]);

  useEffect(() => {
    buildWaterLevelList();
    setCurrentState(getLevelStatus(currentWaterLevel, waterLevelLog?.threshold));
  }, [waterLevelLog, addWaterLevelControlIn, currentWaterLevel]);

  useEffect(() => {
    buildCategories();
    mutate();
  }, [addWaterLevelControlIn]);

  useEffect(() => {
    if (!socketService) return;
    const waterLevelSocket = socketService.subscribe('tm_waterLevel-update', (received) => {
      if (received) mutate();
    });
    return () => {
      waterLevelSocket();
    };
  }, [socketService]);

  useEffect(() => {
    const now = new Date();
    const sec = now.getSeconds();
    const min = now.getMinutes();
    const remMinutes = 5 - (min % 5);
    const msUntilNext = remMinutes * 60 * 1000 - sec * 1000;

    const t1 = setTimeout(() => {
      buildCategories();
      mutate();
      buildWaterLevelList();
      setCurrentState(getLevelStatus(currentWaterLevel, waterLevelLog?.threshold));

      const t2 = setInterval(() => {
        buildCategories();
        mutate();
        buildWaterLevelList();
        setCurrentState(getLevelStatus(currentWaterLevel, waterLevelLog?.threshold));
      }, 5 * 60 * 1000);

      if (chartRef.current) {
        chartRef.current._waterlevelInterval = t2;
      }
    }, msUntilNext);

    return () => {
      clearTimeout(t1);
      if (chartRef.current?._waterlevelInterval) {
        clearInterval(chartRef.current._waterlevelInterval);
      }
    };
  }, [mutate]);

  const getThresholdLevels = (threshold: number) => ({
    danger: threshold * 0.90,
    severe: threshold * 0.80,
    warning: threshold * 0.70,
    caution: threshold * 0.50,
    attention: threshold * 0.30,
  });

  const getLevelStatus = (level: number, threshold: number) => {
    if (threshold === 0) {
      return { text: '안전', color: 'bg-green-600', hexColor: '#22C55E' };
    }
    const levels = getThresholdLevels(threshold);
    if (level > levels.danger) return { text: '대피', color: 'bg-purple-600', hexColor: '#9333EA' };
    if (level === levels.danger) return { text: '심각', color: 'bg-red-500', hexColor: '#EF4444' };
    if (level >= levels.severe) return { text: '심각', color: 'bg-red-500', hexColor: '#EF4444' };
    if (level >= levels.warning) return { text: '경계', color: 'bg-orange-500', hexColor: '#F97316' };
    if (level >= levels.caution) return { text: '주의', color: 'bg-yellow-500', hexColor: '#EAB308' };
    if (level >= levels.attention) return { text: '관심', color: 'bg-blue-500', hexColor: '#3B82F6' };
    return { text: '안전', color: 'bg-green-600', hexColor: '#22C55E' };
  };

  const series = [{ name: '수위(cm)', data: waterLevelList }];

  const options: ApexOptions = {
    chart: {
      id: 'water-level-chart',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      background: 'transparent',
      redrawOnWindowResize: true,
    },
    xaxis: {
      categories,
      labels: { style: { fontSize: '10px' } },
    },
    yaxis: {
      min: 0,
      max: 30,
      labels: {
        formatter: (val: number) => `${val}cm`,
        style: { fontSize: '10px' },
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    colors: ['#3182CE'],
    grid: {
      show: true,
      borderColor: '#e0e0e0',
      padding: { right: 0, bottom: 0 },
    },
    tooltip: { y: { formatter: (val: number) => `${val} cm` } },
  };

  return (
    <>
      {addWaterLevelControlIn ? (
        <div className="w-full bg-[#f5f5f5] dark:bg-gray-700 p-4 border dark:border-gray-600 rounded shadow flex flex-col gap-4">
          <div className="flex justify-between items-center relative">
            <h4 className="font-bold text-xl text-gray-900 dark:text-white">수위계</h4>
            <div className={`text-sm ${currentState.color} text-white px-3 py-2 rounded font-semibold`}>
              현재 상태: {currentState.text}
            </div>
            {waterLevelLog?.link === false && (
              <div className="absolute w-[92px] h-[20px] pl-[8px] leading-[20px] text-white bg-[#D76767] left-[70px] top-[7px] rounded-md">
                연결 끊김
                <HiOutlineExclamationCircle className="absolute top-[3px] right-[6px]" />
              </div>
            )}
          </div>
          <div className="flex gap-4 h-[100%]">
            <div className="flex-1 items-center bg-white dark:bg-gray-800 border dark:border-gray-600 rounded shadow flex text-gray-400 dark:text-gray-300 text-sm">
              <Chart
                ref={chartRef}
                options={options}
                series={series}
                type="line"
                height="100%"
                width="215%"
              />
            </div>
            <div className="w-[100px] flex flex-col text-xs text-white text-center overflow-hidden rounded">
              {[
                { label: '대피', color: 'bg-purple-500' },
                { label: '심각', color: 'bg-red-500' },
                { label: '경계', color: 'bg-orange-400' },
                { label: '주의', color: 'bg-yellow-400' },
                { label: '관심', color: 'bg-blue-500' },
                { label: '안전', color: 'bg-green-600' },
              ].map(({ label, color }, idx, arr) => (
                <div
                  key={label}
                  className={`flex items-center justify-center h-[16.7%] ${color} ${
                    idx === 0 ? 'rounded-t' : idx === arr.length - 1 ? 'rounded-b' : ''
                  }`}
                  title={label}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full bg-[#f5f5f5] dark:bg-gray-700 p-4 border dark:border-gray-600 rounded shadow flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-xl text-gray-900 dark:text-white">수위계</h4>
          </div>
          <div className="w-full h-[203px] border border-gray-400 bg-[#EBECEF] text-center leading-[200px] text-[16px] text-[#A2ABB9] font-semibold">
            등록된 제어반 수위계가 없습니다.
          </div>
        </div>
      )}
    </>
  );
};

export default WaterGaugeChart;
