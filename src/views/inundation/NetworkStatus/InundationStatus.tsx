import { useNetworkStatusStore } from '@/store/Inundation/useNetworkStatusStore';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useDebouncedDevicesStatus } from '@/utils/hooks/useDebouncedDevicesStatus';

interface DeviceState {
  connected: string;
  disconnected: string;
}

interface GateState {
  opened: number;
  closed: number;
  disconnected: number;
  unknown: number;
}

export default function EventStatus() {
  const { socketService } = useSocketConnection();
  const devicesStatusCount = useNetworkStatusStore((state) => state.devicesStatusCount);
  const [realTimeGateList, setRealTimeGateList] = useState([]);
  const [gateCurrentStates, setGateCurrentStates] = useState<GateState>({
    opened: 0,
    closed: 0,
    disconnected: 0,
    unknown: 0,
  });
  const [deviceStatus, setDeviceStatus] = useState<DeviceState>({
    connected: '0',
    disconnected: '0',
  });
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { getCrossinggateList, crossingGateList } = useSettingsStore();
  const debouncedGetDevicesStatusCount = useDebouncedDevicesStatus();

  const calculateGateStates = useCallback((gateList) => {
    let opened = 0;
    let closed = 0;
    let disconnected = 0;
    let unknown = 0;

    gateList.forEach((gate) => {
      if (gate.linked_status === false) {
        disconnected++;
      } else if (gate.crossing_gate_status === undefined || gate.crossing_gate_status === null) {
        unknown++;
      } else {
        if (gate.crossing_gate_status === true) {
          opened++;
        } else {
          closed++;
        }
      }
    });

    return {
      opened: Math.max(0, opened),
      closed: Math.max(0, closed),
      disconnected: Math.max(0, disconnected),
      unknown: Math.max(0, unknown),
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await debouncedGetDevicesStatusCount();
      await getCrossinggateList();
    };
    fetchData();
  }, [debouncedGetDevicesStatusCount, getCrossinggateList]);

  // crossingGateList가 변경되면 realTimeGateList 업데이트
  useEffect(() => {
    if (crossingGateList && crossingGateList.length > 0) {
      setRealTimeGateList([...crossingGateList]);
    }
  }, [crossingGateList]);

  // 디바이스 상태 업데이트
  useEffect(() => {
    if (devicesStatusCount && devicesStatusCount.length > 0) {
      setDeviceStatus({
        connected: devicesStatusCount[0]?.connected || '0',
        disconnected: devicesStatusCount[0]?.disconnected || '0',
      });
    }
  }, [devicesStatusCount]);

  useEffect(() => {
    if (realTimeGateList && realTimeGateList.length > 0) {
      setGateCurrentStates(calculateGateStates(realTimeGateList));
    }
  }, [realTimeGateList, calculateGateStates]);

  useEffect(() => {
    if (!socketService) return;

    const handleSetGate = (eventData) => {
      // realTimeGateList 즉시 업데이트
      setRealTimeGateList(prevList => {
        const updatedList = prevList.map(gate => {
          if (gate.crossing_gate_ip === eventData.ipaddress) {
            const updatedGate = {
              ...gate,
              crossing_gate_status: eventData.crossing_gate_status !== undefined
                ? eventData.crossing_gate_status
                : (eventData.status === true ? true : eventData.status === false ? false : gate.crossing_gate_status),
              linked_status: eventData.linked_status !== undefined
                ? eventData.linked_status
                : (eventData.cmd === 'disconnect' ? false : gate.linked_status)
            };
            
            return updatedGate;
          }
          return gate;
        });
        
        return updatedList;
      });

      setTimeout(() => {
        getCrossinggateList().catch(error => {
          console.error('[EventStatus] 게이트 목록 동기화 실패:', error);
        });
      }, 1000);
    };

    const handleCrossingGateUpdate = () => {
      getCrossinggateList();
    };

    const handleDeviceUpdate = async (eventType) => {
      try {
        await debouncedGetDevicesStatusCount();
      } catch (error) {
        console.error(`[EventStatus] ${eventType} 상태 업데이트 중 오류:`, error);
      }
    };

    // 이벤트 리스너 등록
    const unsubscribeSetGate = socketService.subscribe('setGate', handleSetGate);
    const unsubscribeCrossingGateUpdate = socketService.subscribe('fl_crossingGates-update', handleCrossingGateUpdate);
    const unsubscribeCameraBatchUpdate = socketService.subscribe('fl_cameras-update', () => handleDeviceUpdate('카메라'));
    const unsubscribeBillboardUpdate = socketService.subscribe('fl_billboards-update', () => handleDeviceUpdate('전광판'));
    const unsubscribeWaterLevelUpdate = socketService.subscribe('fl_waterlevels-update', () => handleDeviceUpdate('수위계'));
    const unsubscribeSpeakerUpdate = socketService.subscribe('fl_speakers-update', () => handleDeviceUpdate('스피커'));

    return () => {
      unsubscribeSetGate();
      unsubscribeCrossingGateUpdate();
      unsubscribeCameraBatchUpdate();
      unsubscribeBillboardUpdate();
      unsubscribeWaterLevelUpdate();
      unsubscribeSpeakerUpdate();
    };
  }, [socketService, getCrossinggateList, debouncedGetDevicesStatusCount]);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div
      className="w-[520px] p-1 relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showTooltip && (
        <div
          className="absolute bg-gray-50 border border-gray-200 text-xs px-3 py-2 rounded z-[1000]"
          style={{
            left: '50%',
            top: '100%',
            marginTop: '10px',
            transform: 'translateX(-50%) scale(2)',
            transformOrigin: 'top center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="mb-2">
            <div className="font-semibold mb-1">장치 상태</div>
            <div className="flex items-center gap-3 ml-2">
              <div className="flex items-center gap-1">
                <span className="text-blue-500">정상:</span>
                <span className="text-blue-500 font-medium">{deviceStatus.connected}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">연결끊김:</span>
                <span className="text-red-500 font-medium">{deviceStatus.disconnected}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1">차단기 상태</div>
            <div className="flex items-center gap-3 ml-2">
              <div className="flex items-center gap-1">
                <span className="text-blue-500">열림:</span>
                <span className="text-blue-500 font-medium">{gateCurrentStates.opened}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">닫힘:</span>
                <span className="text-red-500 font-medium">{gateCurrentStates.closed}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">연결끊김:</span>
                <span className="text-gray-500 font-medium">{gateCurrentStates.disconnected}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#0e1163]">알수없음:</span>
                <span className="text-[#0e1163] font-medium">{gateCurrentStates.unknown}</span>
              </div>
            </div>
          </div>
          <div
            className="absolute w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-50"
            style={{
              left: '50%',
              top: '-6px',
              transform: 'translateX(-50%)',
              filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.05))',
            }}
          />
        </div>
      )}
      <div className="flex text-xs border border-gray-300 rounded-md overflow-hidden font-semibold px-1">
        <div className="flex items-center px-2 bg-gray-50 border-r border-gray-200 font-medium">
          장치
          <br />
          상태
        </div>
        <div className="flex items-center gap-2 px-2 py-1 border-r border-gray-200">
          <span className="text-blue-500">정상</span>
          <span className="text-blue-500 font-medium">{deviceStatus.connected}</span>
          <span className="text-red-500">연결끊김</span>
          <span className="text-red-500 font-medium">{deviceStatus.disconnected}</span>
        </div>
        <div className="flex items-center px-2 bg-gray-50 border-r border-gray-200 font-medium text-center py-1">
          차단기
          <br />
          상태
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-blue-500">열림</span>
          <span className="text-blue-500 font-medium">{gateCurrentStates.opened}</span>
          <span className="text-red-500">닫힘</span>
          <span className="text-red-500 font-medium">{gateCurrentStates.closed}</span>
          <span className="text-gray-500">연결끊김</span>
          <span className="text-gray-500 font-medium">{gateCurrentStates.disconnected}</span>
          <span className="text-[#0e1163]">알수없음</span>
          <span className="text-[#0e1163] font-medium">{gateCurrentStates.unknown}</span>
        </div>
      </div>
    </div>
  );
}