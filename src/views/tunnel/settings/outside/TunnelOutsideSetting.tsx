import React, { useEffect, useState } from 'react';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { useTunnelOutsideAutomatic } from '@/utils/hooks/useTunnelArea';
import { apiModifyOutsideAutomatic } from '@/services/TunnelService';

export default function TunnelOutsideSetting() {
  const [isLinked, setIsLinked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; msg: string; color:'blue'|'red' }>({ open: false, msg: '',color:'blue' });

  // 서버 값 동기화
  const { automatic, mutate } = useTunnelOutsideAutomatic();
  useEffect(() => {
    if (typeof automatic?.result === 'boolean') {
      setIsLinked(automatic.result);
    }
  }, [automatic?.result]);

  const handleToggle = async () => {
    if (isSaving) return;
    const next = !isLinked;

    // UI 업데이트
    setIsLinked(next);
    setIsSaving(true);
    try {
      const res = await apiModifyOutsideAutomatic({ automatic: next });

      if (!res.result) {
        // 실패 → 롤백
        setIsLinked(!next);
        setAlert({
          open: true,
          msg: '차단막 연동에 실패했습니다.',
          color:'red'
        });
        return;
      } else {
        setAlert({
          open: true,
          msg: '차단막 연동에 성공했습니다.',
          color:'blue'
        });
        // 성공 → 필요 시 재검증
        await mutate?.(); // SWR/React Query 같은 훅이면 최신값 재조회

      }

    } catch (e: any) {
      setIsLinked(!next); // 롤백
      setAlert({ open: true, msg: '요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' , color:'red'});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">차단막 설정</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          ℹ️
          <div>
            <p className="text-sm font-medium text-blue-800">
              차단막 연동 시 자동제어가 자동으로 활성화됩니다
            </p>
            <p className="text-xs text-blue-700 mt-1">
              수위계 임계치 초과 시 이벤트가 발생하면, 연동된 차단막에 대해 자동으로 차단막이 제어됩니다.
            </p>
            <p className="text-xs text-red-500 mt-1">
              모든 차단막 등록 후 차단막 연동을 해야합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-3 mb-3 h-[50px] flex items-center">
        <label
          className={`relative inline-flex items-center ${isSaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isLinked}
            onChange={handleToggle}
            disabled={isSaving}
            aria-checked={isLinked}
            aria-label="차단막 자동 연동"
          />
          <div className="w-[60px] h-[25px] bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
          <div className="absolute left-0.5 top-[2px] w-[21px] h-[21px] bg-white rounded-full transition-transform peer-checked:translate-x-[34px]"></div>
        </label>
        <span
          className={`ml-3 text-sm font-bold translate-y-[1px] translate-x-3 ${isLinked ? 'text-blue-500' : 'text-gray-700'
            }`}
        >
          {isLinked ? '차단막 자동 연동' : '차단막 수동 연동'}
          {isSaving && <span className="ml-2 text-xs text-gray-500">(저장 중)</span>}
        </span>
      </div>

      <AlertDialog
        isOpen={alert.open}
        onClose={() => setAlert({ open: false, msg: '', color:alert.color})}
        message={alert.msg}
        status={alert.color}
      />
    </div>
  );
}
