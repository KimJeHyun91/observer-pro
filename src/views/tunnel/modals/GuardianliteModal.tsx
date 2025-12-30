import React, { useState, useEffect, useCallback, memo } from 'react';
import CloseButton from '@/components/ui/CloseButton';
import { useGuardianliteInfo } from '@/utils/hooks/useTunnelArea';
import { apiModifyGuardianliteLabel, apiModifyGuardianliteChannel } from '@/services/TunnelService';
import { AlertDialog } from '@/components/shared/AlertDialog';

type GuardianliteModalProps = {
  guardianLightIp: string;
  onClose: () => void;
};

type ChannelHeaderProps = {
  label: string;
  editable: boolean;
  onCommit: (v: string) => void; // 부모에 최종 반영
};

type GLRow = {
  ch1?: 'ON' | 'OFF'; ch1_label?: string;
  ch2?: 'ON' | 'OFF'; ch2_label?: string;
  ch3?: 'ON' | 'OFF'; ch3_label?: string;
  ch4?: 'ON' | 'OFF'; ch4_label?: string;
  ch5?: 'ON' | 'OFF'; ch5_label?: string;
};

const MAX_LABEL_CHARS = 5;

/** 개별 채널 라벨 입력: 로컬 state로 즉시 반응, 부모 반영은 onBlur/저장 시 */
const ChannelHeader = memo(function ChannelHeader({
  label,
  editable,
  onCommit,
}: ChannelHeaderProps) {
  const [local, setLocal] = useState(label);

  useEffect(() => setLocal(label), [label]);

  if (!editable) {
    const safe = label ?? '';
    const display = safe.length > MAX_LABEL_CHARS ? `${safe.slice(0, MAX_LABEL_CHARS)}...` : safe;

    return (
      <div
        className="w-full h-[28px] bg-white text-center leading-[28px] px-2"
        title={safe} // hover 시 전체 라벨 표시
      >
        {display}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit((local ?? '').trim())}
      className="
        w-full h-[28px] bg-white text-center leading-[28px]
        outline-none border border-transparent focus:border-[#CAD4E9] px-2
      "
    />
  );
});

export default function GuardianliteModal({ guardianLightIp, onClose }: GuardianliteModalProps) {
  const { guardianliteInfo, mutate } = useGuardianliteInfo(guardianLightIp);

  const [isLabelChange, setIsLabelChange] = useState(false);
  const [saving, setSaving] = useState(false);            // 라벨 저장중
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');

  // 채널별 제어 로딩 상태 (중복 클릭 방지)
  const [pending, setPending] = useState<Record<number, boolean>>({});

  // 응답 상태 판단
  const hasMessageKey =
    guardianliteInfo != null &&
    typeof guardianliteInfo === 'object' &&
    Object.prototype.hasOwnProperty.call(guardianliteInfo, 'message');

  const isLoading = !hasMessageKey;
  const isFail = hasMessageKey && (guardianliteInfo as any).message !== 'ok';

  // ---- 서버 데이터 파싱 (정상일 때만 값 있음) -------------------------------
  const data: GLRow | null =
    !isFail &&
      guardianliteInfo &&
      (guardianliteInfo as any).message === 'ok' &&
      Array.isArray((guardianliteInfo as any).result)
      ? ((guardianliteInfo as any).result[0] as GLRow)
      : null;

  // 라벨 / 상태 로컬 상태 (UI 반응 빠르게)
  const [labels, setLabels] = useState<string[]>(['CH1', 'CH2', 'CH3', 'CH4', 'CH5']);
  const [states, setStates] = useState<Array<'ON' | 'OFF'>>(['OFF', 'OFF', 'OFF', 'OFF', 'OFF']);

  // 편집 중에는 서버 갱신으로 라벨을 덮어쓰지 않음
  useEffect(() => {
    if (!data) return;
    setStates([
      data.ch1 ?? 'OFF',
      data.ch2 ?? 'OFF',
      data.ch3 ?? 'OFF',
      data.ch4 ?? 'OFF',
      data.ch5 ?? 'OFF',
    ]);
    if (!isLabelChange) {
      setLabels([
        data.ch1_label || 'CH1',
        data.ch2_label || 'CH2',
        data.ch3_label || 'CH3',
        data.ch4_label || 'CH4',
        data.ch5_label || 'CH5',
      ]);
    }
  }, [data, isLabelChange]);

  // 라벨 커밋(blur/저장 시에만 부모 state 변경)
  const commitLabel = useCallback((idx: number, v: string) => {
    setLabels((prev) => {
      const next = [...prev];
      next[idx] = v || `CH${idx + 1}`;
      return next;
    });
  }, []);

  // 채널 제어 (CH1은 ON만 허용)
  const sendChannelCmd = useCallback(
    async (idx: number, cmd: 'ON' | 'OFF') => {
      if (idx === 0 && cmd === 'OFF') return; // CH1 OFF 금지
      if (pending[idx]) return;               // 중복 클릭 방지

      const channel = String(idx + 1);
      const prev = states[idx];

      // 낙관적 업데이트 + 로딩 마킹
      setPending((p) => ({ ...p, [idx]: true }));
      setStates((prevArr) => {
        const next = [...prevArr];
        next[idx] = cmd;
        return next;
      });
      setErrorMsg(null);

      try {
        const resp = await apiModifyGuardianliteChannel({
          guardianlite_ip: guardianLightIp,
          channel,
          cmd,
        });

        const ok = resp?.message === 'ok';
        setMessage(ok ? '채널 제어에 성공하였습니다.' : '채널 제어에 실패하였습니다.');
        setIsAlertOpen(true);

        await mutate(); // 최신값 동기화 (선택)
      } catch (err: any) {
        // 실패 → 롤백
        setStates((arr) => {
          const next = [...arr];
          next[idx] = prev;
          return next;
        });
        setErrorMsg(err?.message || '채널 제어 중 오류가 발생했습니다.');
      } finally {
        setPending((p) => {
          const { [idx]: _, ...rest } = p;
          return rest;
        });
      }
    },
    [guardianLightIp, mutate, pending, states]
  );

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      const resp = await apiModifyGuardianliteLabel({
        guardianlite_ip: guardianLightIp,
        ch1_label: labels[0],
        ch2_label: labels[1],
        ch3_label: labels[2],
        ch4_label: labels[3],
        ch5_label: labels[4],
      });

      const ok = resp?.message === 'ok';
      setMessage(ok ? '채널명 수정에 성공하였습니다.' : '채널명 수정에 실패하였습니다.');
      setIsAlertOpen(true);


      await mutate();            // 서버 최신값 갱신
      setIsLabelChange(false);   // 편집 종료
    } catch (err: any) {
      setErrorMsg(err?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!data) return;
    // 라벨/상태 모두 서버 값으로 롤백
    setLabels([
      data.ch1_label || 'CH1',
      data.ch2_label || 'CH2',
      data.ch3_label || 'CH3',
      data.ch4_label || 'CH4',
      data.ch5_label || 'CH5',
    ]);
    setStates([
      data.ch1 ?? 'OFF',
      data.ch2 ?? 'OFF',
      data.ch3 ?? 'OFF',
      data.ch4 ?? 'OFF',
      data.ch5 ?? 'OFF',
    ]);
    setIsLabelChange(false);
    setErrorMsg(null);
  };

  // LED 색상
  const ledClass = (s: 'ON' | 'OFF') => (s === 'ON' ? 'bg-green-500' : 'bg-red-500');

  // 버튼 스타일(활성/비활성)
  const onBtnClass = (active: boolean, disabled?: boolean) =>
    `w-[51px] h-full text-center leading-[28px] ${active ? 'bg-[#CAD4E9] font-bold' : 'bg-white text-[#A6A6A6]'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  const offBtnClass = (active: boolean, disabled?: boolean) =>
    `w-[51px] h-full text-center leading-[28px] ${active ? 'bg-[#CAD4E9] font-bold' : 'bg-white text-[#A6A6A6]'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />

      {/* 로딩/실패/정상 UI 분기 */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-6 w-[420px] shadow-xl text-gray-800 relative">
          <CloseButton absolute className="ltr:right-4 rtl:left-6 top-2" onClick={onClose} />
          <div className="py-4 text-center text-[14px]">가디언 라이트 연결 확인 중…</div>
        </div>
      ) : isFail ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-2 pb-4 w-[480px] h-[170px] shadow-xl text-gray-800 relative">
          <CloseButton absolute className="ltr:right-4 rtl:left-6 top-2" onClick={onClose} />
          <h2 className="text-[17px] font-bold mb-2 mt-1 border-b-2">가디언라이트</h2>
          <div className="py-8 text-center w-[432px] h-[100px] bg-[#EBECEF] text-[15px] font-medium leading-[40px] text-[#A2ABB9] border border-gray-400 absolute top-[60px] dark:bg-[#1B1D22]">
            가디언 라이트 연결에 실패하였습니다.
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-2 pb-3 w-[680px] shadow-xl text-gray-800 relative">
          <CloseButton absolute className="ltr:right-4 rtl:left-6 top-2" onClick={onClose} />
          <h2 className="text-[17px] font-bold mb-2 mt-1 border-b-2">가디언라이트</h2>

          <div className="flex justify-end w-full h-[24px]">
            {isLabelChange ? (
              <div className="flex">
                <button
                  type="button"
                  disabled={saving}
                  className={`w-[62px] h-[24px] text-center rounded-sm text-white font-medium pt-[1px] ${saving ? 'bg-[#17A36F]/60 cursor-not-allowed' : 'bg-[#17A36F]'
                    }`}
                  onClick={handleSave}
                >
                  {saving ? '저장중…' : '저장'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className={`w-[62px] h-[24px] text-center rounded-sm text-[#616A79] font-medium pt-[1px] ml-2 ${saving ? 'bg-[#D2D7E0]/60 cursor-not-allowed' : 'bg-[#D2D7E0]'
                    }`}
                  onClick={handleCancel}
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-[98px] h-[24px] text-center bg-[#D2D7E0] rounded-sm text-[#616A79] pt-[1px] font-medium"
                onClick={() => setIsLabelChange(true)}
              >
                채널명 변경
              </button>
            )}
          </div>

          {errorMsg && <div className="mt-2 text-sm text-red-600">{errorMsg}</div>}

          <ul className="w-full h-[114px] bg-[#EBECEF] mt-2 flex justify-between items-center px-2">
            {/* CH1 (RESET: 항상 ON 명령만) */}
            <li className="w-[110px] h-[92px] flex flex-col items-center justify-between">
              <ChannelHeader
                label={labels[0]}
                editable={isLabelChange}
                onCommit={(v) => commitLabel(0, v)}
              />
              <div className={`w-[24px] h-[24px] rounded-[50%] ${ledClass(states[0])}`} />
              <button
                type="button"
                className={`w-full h-[28px] text-center leading-[28px] font-semibold ${pending[0]
                  ? 'bg-[#D2D7E0]/60 text-[#616A79] cursor-not-allowed'
                  : 'bg-[#D2D7E0] text-[#616A79] cursor-pointer'
                  }`}
                onClick={() => sendChannelCmd(0, 'ON')}
                disabled={!!pending[0]}
                title="RESET (ON 명령)"
              >
                RESET
              </button>
            </li>

            {/* CH2~CH5 (ON/OFF 버튼 + LED) */}
            {[1, 2, 3, 4].map((idx) => (
              <li key={idx} className="w-[110px] h-[92px] flex flex-col items-center justify-between">
                <ChannelHeader
                  label={labels[idx]}
                  editable={isLabelChange}
                  onCommit={(v) => commitLabel(idx, v)}
                />
                <div className={`w-[24px] h-[24px] rounded-[50%] ${ledClass(states[idx])}`} />
                <span className="w-full h-[28px] flex justify-between">
                  <button
                    type="button"
                    className={onBtnClass(states[idx] === 'ON', pending[idx])}
                    onClick={() => sendChannelCmd(idx, 'ON')}
                    disabled={!!pending[idx]}
                  >
                    ON
                  </button>
                  <button
                    type="button"
                    className={offBtnClass(states[idx] === 'OFF', pending[idx])}
                    onClick={() => sendChannelCmd(idx, 'OFF')}
                    disabled={!!pending[idx]}
                  >
                    OFF
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
