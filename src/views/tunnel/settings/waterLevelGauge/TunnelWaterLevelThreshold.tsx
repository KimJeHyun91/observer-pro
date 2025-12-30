import React, { useState, useEffect } from 'react';
import { ScrollBar, Button, Input } from '@/components/ui';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useWaterLevelList } from '@/utils/hooks/useTunnelArea';
import { apiModifyWaterLevelThreshold } from '@/services/TunnelService';
import Spinner from '@/components/ui/Spinner'

interface ThresholdInputs {
  currentLevel: string;
  threshold: string;
}

export default function TunnelWaterLevelThreshold() {
  const { socketService } = useSocketConnection();

  const [alertOpen, setAlertOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedWaterlevel, setSelectedWaterlevel] = useState<number | null>(null);
  const [thresholdInputs, setThresholdInputs] = useState<ThresholdInputs>({
    currentLevel: '',
    threshold: ''
  });

  const { waterLevelList: wData, mutate } = useWaterLevelList();

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (socketService) {
      const unsubscribe = socketService.subscribe('tm_waterLevel-update', () => {
        mutate();
      });
      return () => {
        unsubscribe?.();
      };
    }
  }, [socketService, mutate]);


  const handleThresholdSave = async (waterLevelIdx: number) => {
    try {
      setLoading(true);
      const success = await apiModifyWaterLevelThreshold({
        waterLevelIdx,
        threshold: thresholdInputs.threshold
      });

      if (success) {
        setLoading(false);
        setErrorMessage('임계치가 설정되었습니다.');
        setSelectedWaterlevel(null);
        mutate(); // 데이터 갱신
      } else {
        setLoading(false);
        setErrorMessage('임계치 설정에 실패했습니다.');
      }
      setAlertOpen(true);
    } catch (error) {
      setLoading(false);
      setErrorMessage('임계치 설정 중 오류가 발생했습니다.');
      setAlertOpen(true);
    }
  };

  return (
    <div className="flex-1 h-full p-6">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-10">
          <Spinner size={50} />
        </div>
      )}
      <AlertDialog
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        message={errorMessage}
      />

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">임계치 설정</h3>
        <span className="text-sm text-gray-500">{new Date().toLocaleString()}</span>
      </div>

      <div className="border rounded-lg">
        <ScrollBar className="max-h-[500px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-sm p-3">수위계</th>
                <th className="text-left text-sm p-3">위치</th>
                <th className="text-left text-sm p-3">연동 차단기</th>
                <th className="text-left text-sm p-3">현재 수위</th>
                <th className="text-left text-sm p-3">설정 임계치</th>
                <th className="text-left text-sm p-3">동작</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(wData?.result) &&
                wData.result.map((waterlevel: any) => (
                  <React.Fragment key={waterlevel.idx}>
                    <tr className="border-t">
                      <td className="p-3 text-sm">{waterlevel.name}</td>
                      <td className="p-3 text-sm">{waterlevel.location}</td>
                      <td className="p-3 text-sm whitespace-pre-line">
                        {Array.isArray(waterlevel.outside_info) && waterlevel.outside_info.length > 0
                          ? waterlevel.outside_info.map((info: any) => info.outside_name).join(',\n')
                          : '-'}
                      </td>
                      <td className="p-3 text-sm">{waterlevel.curr_water_level}cm</td>
                      <td className="p-3 text-sm">{waterlevel.threshold}cm</td>
                      <td className="p-3 text-sm">
                        <Button
                          variant="solid"
                          size="sm"
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                          onClick={() => {
                            setSelectedWaterlevel(
                              selectedWaterlevel === waterlevel.idx ? null : waterlevel.idx
                            );
                            setThresholdInputs({
                              currentLevel: String(waterlevel.curr_water_level),
                              threshold: String(waterlevel.threshold)
                            });
                          }}
                        >
                          임계치 설정
                        </Button>
                      </td>
                    </tr>
                    {selectedWaterlevel === waterlevel.idx && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="p-0">
                          <div className="bg-gray-100 p-6 relative">
                            <div className="absolute top-2 right-2">
                              <button
                                onClick={() => setSelectedWaterlevel(null)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <h3 className="text-lg font-medium mb-4">임계치 설정</h3>
                            <div className="mb-3 text-red-500 text-sm">
                              *차단막 자동 연동 상태일 때 설정 수위보다 현재 수위가 높아질 경우, 차단기가 자동으로 닫힙니다.
                            </div>
                            <div className="space-y-4 mb-6">
                              <div className="flex justify-center items-center gap-2">
                                <span className="text-sm w-24 text-right">현재 수위</span>
                                <Input
                                  type="number"
                                  value={thresholdInputs.currentLevel}
                                  disabled
                                  className="w-32 bg-gray-200 rounded-lg"
                                  suffix="cm"
                                />
                              </div>
                              <div className="flex justify-center items-center gap-2">
                                <span className="text-sm w-24 text-right">임계 설정 수위</span>
                                <Input
                                  type="number"
                                  placeholder={String(waterlevel.threshold)}
                                  value={thresholdInputs.threshold}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (parseFloat(value) >= 0 || value === '') {
                                      setThresholdInputs((prev) => ({
                                        ...prev,
                                        threshold: value,
                                      }));
                                    }
                                  }}
                                  className="w-32 bg-gray-200 rounded-lg"
                                  suffix="cm"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                                size="sm"
                                variant="solid"
                                onClick={() => handleThresholdSave(waterlevel.idx)}
                              >
                                임계치 저장
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </ScrollBar>
      </div>
    </div>
  );
}