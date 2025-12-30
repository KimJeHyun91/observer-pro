import { useCallback, useEffect, useRef, useState } from "react";
import { useAreaStore } from "@/store/Inundation/useAreaStore";
import { FaSearch, FaCrosshairs } from "react-icons/fa";
import { Select } from "@/components/ui";
import { apiSetPresetPosition } from '@/services/InundationService';

interface PtzControlProps {
  cameraId: string;
  isDetailView?: boolean;
  vmsName: string;
  mainServiceName: string;
}

type Direction = "up" | "down" | "left" | "right" | "zoomin" | "zoomout" | "focusin" | "focusout" | "stop";

const MIN_INTERVAL = 250;

export default function PtzControl({ cameraId, isDetailView, mainServiceName, vmsName }: PtzControlProps) {
  const [presetList, setPresetList] = useState([]);

  if (!isDetailView) return null;

  const mouseDownTimeRef = useRef<number | null>(null);
  const mouseUpTimeoutRef = useRef<number | null>(null);
  const { ptzCameraControl, cameraPresetList, getCameraPreset } = useAreaStore();

  useEffect(() => {
    if (cameraId && vmsName && mainServiceName) {
      getCameraPreset({ cameraId, vmsName, mainServiceName });
    } 
  }, [cameraId, vmsName, mainServiceName, getCameraPreset]);

  useEffect(() => {
    if (cameraPresetList && typeof cameraPresetList === 'object' && Object.keys(cameraPresetList).length > 0) {
      const presetOptions = Object.entries(cameraPresetList).map(([key, value]) => {
        return {
          value: key,  // 키 값(0, 1)을 프리셋 번호로 사용
          label: `${value}`  // 값('1', '2')을 표시용으로 사용
        };
      });

      setPresetList(presetOptions);
    } else {
      setPresetList([]);
    }
  }, [cameraPresetList]);

  const handleSelectPreset = (option) => {
    if (!option) return;

    try {
      const presetData = {
        cameraId,
        vmsName,
        mainServiceName,
        presetNumber: option.value
      };

      apiSetPresetPosition(presetData);
    } catch (error) {
      console.error('프리셋 설정 오류:', error);
    }
  }

  const handlePtzStart = useCallback(
    async (direction: Direction) => {
      mouseDownTimeRef.current = Date.now();
      if (mouseUpTimeoutRef.current) {
        clearTimeout(mouseUpTimeoutRef.current);
      }

      try {
        await ptzCameraControl({
          cameraId,
          direction,
          vmsName,
          mainServiceName,
          mode: "continuous",
          eventType: "mousedown",
        });
      } catch (error) {
        console.error("PTZ Start Error:", error);
      }
    },
    [cameraId, ptzCameraControl]
  );

  const handlePtzStop = useCallback(
    async (direction: Direction) => {
      if (!mouseDownTimeRef.current) return;

      const timeDiff = Date.now() - mouseDownTimeRef.current;

      try {
        if (timeDiff < MIN_INTERVAL) {
          mouseUpTimeoutRef.current = setTimeout(async () => {
            await ptzCameraControl({
              cameraId,
              direction,
              vmsName,
              mainServiceName,
              mode: "continuous",
              eventType: "mouseup",
            });
          }, MIN_INTERVAL - timeDiff);
        } else {
          await ptzCameraControl({
            cameraId,
            direction,
            vmsName,
            mainServiceName,
            mode: "continuous",
            eventType: "mouseup",
          });
        }
      } catch (error) {
        console.error("PTZ Stop Error:", error);
      }
    },
    [cameraId, ptzCameraControl]
  );

  return (
    <div className="absolute top-[23%] right-16">
      <div className="flex items-center space-x-4 mb-3">
        <Select
          className="flex-1"
          size="sm"
          placeholder="프리셋"
          onChange={(option) => handleSelectPreset(option)}
          options={presetList}
          isClearable
          noOptionsMessage={() => '없음'}
        />
      </div>

      <div className="relative flex items-center justify-center rounded-full bg-gray-100 border-2 border-gray-200 w-28 h-28 shadow-md dark:bg-gray-400">
        <button
          className="absolute top-[-1px] left-1/2 transform -translate-x-1/2 text-gray-500 dark:text-gray-600 dark:hover:text-gray-800 hover:text-gray-600 text-2xl transition-colors duration-200"
          onMouseDown={() => handlePtzStart("up")}
          onMouseUp={() => handlePtzStop("up")}
        >▲</button>

        <button
          className="absolute bottom-[-1px] left-1/2 transform -translate-x-1/2 text-gray-500 dark:text-gray-600 dark:hover:text-gray-800 hover:text-gray-600 text-2xl transition-colors duration-200"
          onMouseDown={() => handlePtzStart("down")}
          onMouseUp={() => handlePtzStop("down")}
        >▼</button>

        <button
          className="absolute left-[-1px] top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-600 dark:hover:text-gray-800 hover:text-gray-600 text-2xl transition-colors duration-200"
          onMouseDown={() => handlePtzStart("left")}
          onMouseUp={() => handlePtzStop("left")}
        >◀</button>

        <button
          className="absolute right-[-1px] top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-600 dark:hover:text-gray-800 hover:text-gray-600 text-2xl transition-colors duration-200"
          onMouseDown={() => handlePtzStart("right")}
          onMouseUp={() => handlePtzStop("right")}
        >▶</button>

        <button
          className="absolute inset-1/3.2 text-gray-600 hover:text-gray-800 rounded-xl w-13 h-10 flex items-center justify-center text-md font-bold bg-gray-200/50 transition-colors duration-200 shadow-sm"
          onMouseDown={() => handlePtzStart("stop")}
          onMouseUp={() => handlePtzStop("stop")}
        >STOP</button>
      </div>

      <div className="flex flex-col gap-1 mt-4">
        <div className="flex items-center justify-between bg-gray-100 px-1 py-1 rounded-md shadow-md dark:bg-gray-400">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded w-7 h-6 flex items-center justify-center transition-colors duration-200"
            onMouseDown={() => handlePtzStart("zoomout")}
            onMouseUp={() => handlePtzStop("zoomout")}
          >-</button>
          <FaSearch className="text-gray-600 text-sm" />
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded w-7 h-6 flex items-center justify-center transition-colors duration-200"
            onMouseDown={() => handlePtzStart("zoomin")}
            onMouseUp={() => handlePtzStop("zoomin")}
          >+</button>
        </div>

        <div className="flex items-center justify-between bg-gray-100 px-1 py-1 rounded-md shadow-md dark:bg-gray-400">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded w-7 h-6 flex items-center justify-center transition-colors duration-200"
            onMouseDown={() => handlePtzStart("focusout")}
            onMouseUp={() => handlePtzStop("focusout")}
          >-</button>
          <FaCrosshairs className="text-gray-600 text-sm" />
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded w-7 h-6 flex items-center justify-center transition-colors duration-200"
            onMouseDown={() => handlePtzStart("focusin")}
            onMouseUp={() => handlePtzStop("focusin")}
          >+</button>
        </div>
      </div>
    </div>
  );
}
