import React from 'react';
import { WaterLevelAutoControlResult } from '@/@types/inundation';

interface AutoControlResultPopupProps {
  result: WaterLevelAutoControlResult;
  isOpen: boolean;
  onClose: () => void;
}

const AutoControlResultPopup: React.FC<AutoControlResultPopupProps> = ({
  result,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <span className="text-green-500 text-xl">✓</span>
    ) : (
      <span className="text-red-500 text-xl">✗</span>
    );
  };

  const getStatusText = (success: boolean) => {
    return success ? '성공' : '실패';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            수위계 자동제어 결과
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{result.summary.total}</div>
              <div className="text-sm text-gray-600">전체 차단기</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{result.summary.success}</div>
              <div className="text-sm text-gray-600">제어 성공</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
              <div className="text-sm text-gray-600">제어 실패</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((result.summary.success / result.summary.total) * 100)}%
              </div>
              <div className="text-sm text-gray-600">성공률</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">수위계 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-500">IP 주소:</span>
              <div className="font-mono">{result.waterLevelIP}</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">현재 수위:</span>
              <div className="font-semibold text-blue-600">{result.currentWaterLevel}m</div>
            </div>
            <div>
              <span className="text-sm text-gray-500">임계치:</span>
              <div className="font-semibold text-red-600">{result.threshold}m</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            발생 시간: {formatTime(result.timestamp)}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">차단기 제어 결과</h3>
          <div className="space-y-3">
            {result.results.map((gate, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  gate.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(gate.success)}
                      <span className="font-semibold">{gate.gateName}</span>
                      <span className="text-sm text-gray-500">({gate.location})</span>
                    </div>
                    <div className="text-sm text-gray-600 font-mono">{gate.ip}</div>
                    {!gate.success && gate.error && (
                      <div className="text-sm text-red-600 mt-1">
                        오류: {gate.error}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      gate.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {getStatusText(gate.success)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(gate.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoControlResultPopup;
