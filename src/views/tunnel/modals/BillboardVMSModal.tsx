import { useState, useEffect, useRef } from 'react';
import CloseButton from '@/components/ui/CloseButton';
import { billboardInfo } from '@/@types/tunnel';
import { apiModifyVMSBillboard } from '@/services/TunnelService';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { useSessionUser } from "@/store/authStore";
import Spinner from '@/components/ui/Spinner'

type BillboardVMSModalProps = {
  vmsInfo: billboardInfo[];
  onClose: () => void;
};

// API 응답 타입(안전)
type ModifyResp = {
  message: string;
  lanes?: string[] | string;
};

export default function BillboardVMSModal({ vmsInfo: dataInfo, onClose }: BillboardVMSModalProps) {
  const [row, setRow] = useState<number[]>([]);
  const [col, setCol] = useState<number>();
  const [laneNum, setLaneNum] = useState<number[]>([]);
  const [selectLane, setSelectLane] = useState<number>(1);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');

  const [selectedColorsByIdx, setSelectedColorsByIdx] = useState<Record<number, Record<number, string>>>({});
  const [inputValuesByIdx, setInputValuesByIdx] = useState<Record<number, Record<number, string>>>({});
  const [laneMessagesByIdx, setLaneMessagesByIdx] = useState<Record<number, string>>({});
  const [laneColorsByIdx, setLaneColorsByIdx] = useState<Record<number, string>>({});

  const { user } = useSessionUser();

  // 기존 차선 미리보기 refs와 overflow 상태
  const previewTextRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [overflowingLines, setOverflowingLines] = useState<Record<number, boolean>>({});

  // 전체 미리보기용 refs와 overflow 상태
  const allPreviewRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [allOverflowingLines, setAllOverflowingLines] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLaneNum(Array.from({ length: dataInfo.length }, (_, i) => i + 1));
  }, [dataInfo]);

  useEffect(() => {
    const laneData = dataInfo[selectLane - 1];
    if (!laneData) return;

    const idx = laneData.idx;
    if (idx === undefined || idx === null) return;

    // 임시주석
    // const rowCount = parseInt(laneData.row, 10);

    // manufacturer === "D-Control"이면 row는 무조건 1단
    let rowCount = 1;
    if (laneData.manufacturer !== "D-Control") {
      rowCount = parseInt(laneData.row, 10);
    }
    
    const rows = Array.from({ length: rowCount }, (_, i) => i + 1);
    setRow(rows);

    const colCount = parseInt(laneData.col, 10);
    setCol(colCount);

    setInputValuesByIdx((prev) => {
      if (!prev[idx]) {
        const lines = laneData.msg ? laneData.msg.split('\n') : [];
        const initialInputs: Record<number, string> = {};
        rows.forEach((r, i) => {
          initialInputs[r] = lines[i] || '';
        });
        return { ...prev, [idx]: initialInputs };
      }
      return prev;
    });

    setSelectedColorsByIdx((prev) => {
      if (!prev[idx]) {
        const colorList = laneData.color ? laneData.color.split(',') : [];
        const initialColors: Record<number, string> = {};
        rows.forEach((r, i) => {
          initialColors[r] = colorList[i] || 'red';
        });
        return { ...prev, [idx]: initialColors };
      }
      return prev;
    });
  }, [selectLane, dataInfo]);

  useEffect(() => {
    const newMessages: Record<number, string> = {};

    for (const lane of dataInfo) {
      const idx = lane.idx;
      if (typeof idx !== 'number') continue;

      const inputs = inputValuesByIdx[idx];
      if (inputs) {
        const sortedLines = Object.entries(inputs)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, text]) => text.trimRight());

        newMessages[idx] = sortedLines.join('\n');
      }
    }

    setLaneMessagesByIdx(newMessages);
  }, [inputValuesByIdx, dataInfo]);

  useEffect(() => {
    const newColors: Record<number, string> = {};

    for (const lane of dataInfo) {
      const idx = lane.idx;
      if (typeof idx !== 'number') continue;

      const colorData = selectedColorsByIdx[idx];
      if (colorData) {
        const sortedColors = Object.entries(colorData)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, color]) => color);

        newColors[idx] = sortedColors.join(',');
      }
    }

    setLaneColorsByIdx(newColors);
  }, [selectedColorsByIdx, dataInfo]);

  // 차선별 미리보기 overflow 체크
  const checkOverflow = () => {
    if (selectLane <= 0) {
      setOverflowingLines({});
      return;
    }

    const laneData = dataInfo[selectLane - 1];
    if (!laneData || typeof laneData.idx !== 'number') {
      setOverflowingLines({});
      return;
    }

    const idx = laneData.idx;
    const newOverflow: Record<number, boolean> = {};

    row.forEach((lineNumber) => {
      const el = previewTextRefs.current[`${idx}-${lineNumber}`];
      if (el) {
        newOverflow[lineNumber] = el.scrollWidth > el.clientWidth;
      }
    });

    setOverflowingLines(newOverflow);
  };

  useEffect(() => {
    if (selectLane <= 0) return;
    setTimeout(checkOverflow, 100);
  }, [laneMessagesByIdx, selectLane, row]);

  // 전체 미리보기 overflow 체크 (selectLane === 0)
  useEffect(() => {
    if (selectLane !== 0) return;

    const newOverflow: Record<string, boolean> = {};

    dataInfo.forEach((lane) => {
      const idx = lane.idx;
      const rowCount = parseInt(lane.row, 10);
      for (let i = 0; i < rowCount; i++) {
        const key = `${idx}-${i + 1}`;
        const el = allPreviewRefs.current[key];
        if (el) {
          newOverflow[key] = el.scrollWidth > el.clientWidth;
        }
      }
    });

    setAllOverflowingLines(newOverflow);
  }, [dataInfo, selectLane]);

  const previewHeight = row.length <= 4 ? 220 : 220 + (row.length - 4) * 55;

  const handleColorSelect = (lineNumber: number, color: string) => {
    const idx = dataInfo[selectLane - 1]?.idx;
    if (typeof idx !== 'number') return;

    setSelectedColorsByIdx((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [lineNumber]: color,
      },
    }));
  };

  const getWeightedLength = (str: string): number => {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === ' ' || /[0-9!-/:-@[-{-~]/.test(char)) {
        length += 0.5;
      } else {
        length += 1;
      }
    }
    return length;
  };

  const onModify = async () => {
    const userId = user.userId ?? '';

    // lane 필드 포함해서 payload 구성
    const submitData: Record<
      string,
      { userId: string; ip: string; port: string; msg: string; color: string; lane: string; manufacturer: string; }
    > = {};

    try {
      // 인덱스로 차선 번호 계산
      for (const [i, laneObj] of dataInfo.entries()) {
        if (typeof laneObj.idx !== 'number') continue;

        const key = String(laneObj.idx);
        const finalMsg = laneMessagesByIdx[laneObj.idx] ?? (laneObj.msg ?? '');
        const finalColor = laneColorsByIdx[laneObj.idx] ?? (laneObj.color ?? '');
        const ip = String(laneObj.ip ?? '');
        const port = String(laneObj.port ?? '');
        const laneLabel = `${i + 1}차선`;
        const manufacturer = String(laneObj.manufacturer ?? '');

        // (선택) ip/port 필수 체크
        if (!ip || !port) {
          setMessage('전광판 IP 또는 Port 값이 비어 있습니다.');
          setIsAlertOpen(true);
          return; // 첫 에러에서 종료
        }

        submitData[key] = { userId, ip, port, msg: finalMsg, color: finalColor, lane: laneLabel, manufacturer: manufacturer };
      }

      setLoading(true);

      const res = (await apiModifyVMSBillboard(submitData)) as ModifyResp;

      if (res?.message === 'ok') {
        // lanes: string | string[] | undefined → 안전하게 배열로 정규화
        const lanesRaw: string[] = Array.isArray(res?.lanes)
          ? (res!.lanes as string[])
          : typeof res?.lanes === 'string'
            ? [res.lanes as string]
            : [];

        // 'n차선 …'에서 n 추출 후 1→N 순 정렬된 메시지로 합치기
        const laneByNum = new Map<number, string>();
        for (const s of lanesRaw) {
          const m = /^(\d+)차선/.exec(s);
          if (m) laneByNum.set(Number(m[1]), s);
        }

        const laneReport =
          lanesRaw.length > 0
            ? laneNum.map((n) => laneByNum.get(n) ?? `${n}차선 결과 없음`).join('\n')
            : '전광판 메시지가 수정되었습니다.';

        setMessage(laneReport);
        setIsAlertOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      {loading && (
        <div className="absolute w-[100vw] h-[100vh] border-gray-200 dark:border-gray-500 left-0 top-0 z-20">
          <Spinner size={50} className='absolute left-[47%] top-[42%]' />
        </div>
      )}
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[1244px] shadow-xl text-gray-800 relative">
        <CloseButton
          absolute
          className="ltr:right-4 rtl:left-6 top-3"
          onClick={onClose}
        />
        <h2 className="text-[17px] font-bold mb-2 border-b-2 pb-1">전광판 메시지 입력</h2>

        {/* 차선 선택 버튼 */}
        <span className="w-full h-[42px] flex gap-4 relative">
          {laneNum.map((lane) => (
            <div
              key={lane}
              onClick={() => {
                setSelectLane(lane);
                setIsPreviewMode(false);
              }}
              className={`w-[130px] h-full text-center leading-[42px] text-[20px] rounded-md cursor-pointer
                ${selectLane === lane
                  ? 'bg-[#EBECEF] text-[#647DB7] font-bold border-[2px] border-[#647DB7]'
                  : 'bg-[#EBECEF] text-[#8d8d8d] border-[2px] border-[#CFCFCF]'
                }`}
            >
              차선 {lane}
            </div>
          ))}
          <div
            className={`w-[130px] h-full bg-[#EBECEF] text-[#647DB7] text-[16px] cursor-pointer rounded-md font-semibold
              flex items-center justify-center absolute right-0
              ${isPreviewMode ? 'border-[2px] border-[#647DB7]' : 'border-[2px] border-transparent'}`}
            onClick={() => {
              setIsPreviewMode(true);
              setSelectLane(0);
            }}
          >
            전체 미리보기
          </div>
        </span>

        {/* 메시지 입력 화면 */}
        {selectLane > 0 && (
          <span className="block w-full min-h-[280px] bg-[#EBECEF] mt-2 rounded-sm py-3 relative">
            <ul className="w-full h-[28px] px-4 flex gap-3">
              <li className="w-[48px] h-[28px] bg-[#D2D7E0] text-center leading-[28px] text-[#616A79] font-medium">구분</li>
              <li className="w-[655px] h-[28px] bg-[#D2D7E0] text-center leading-[28px] text-[#616A79] font-medium">문구 입력</li>
              <li className="w-[139px] h-[28px] bg-[#D2D7E0] text-center leading-[28px] text-[#616A79] font-medium">글자색상</li>
              <li className="w-[285px] h-[28px] bg-[#D2D7E0] text-center leading-[28px] text-[#616A79] font-medium">{selectLane} 차선 미리보기</li>
            </ul>

            {row.map((lineNumber) => {
              const idx = dataInfo[selectLane - 1]?.idx;
              if (typeof idx !== 'number') return null;

              return (
                <ul key={lineNumber} className="px-4 h-[44px] mt-3 flex gap-3">
                  <li className="w-[48px] h-[44px] text-center leading-[48px] text-[21px] text-[#7B7B7B] font-semibold">
                    {lineNumber}단
                  </li>
                  <li>
                    <input
                      type="text"
                      value={inputValuesByIdx[idx]?.[lineNumber] || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        const weightedLength = getWeightedLength(newValue);
                        if (weightedLength <= (col ?? 0)) {
                          setInputValuesByIdx((prev) => ({
                            ...prev,
                            [idx]: {
                              ...prev[idx],
                              [lineNumber]: newValue,
                            },
                          }));
                        }
                      }}
                      placeholder={`최대 ${col ?? 0} 자 입력 가능`}
                      className="w-[655px] h-[44px] text-[17px] pl-3 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 rounded-sm"
                    />
                  </li>
                  <li className="w-[139px] h-[40px] mt-[2px] flex justify-between">
                    {['red', 'yellow', 'green'].map((color) => (
                      <div
                        key={color}
                        onClick={() => handleColorSelect(lineNumber, color)}
                        className={`w-[40px] h-[40px] bg-white rounded-md cursor-pointer relative
                          ${selectedColorsByIdx[idx]?.[lineNumber] === color ? 'border-[3px] border-[#4C31E5]' : 'border'}`}
                      >
                        <div
                          className={`w-[28px] h-[28px] rounded-sm absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]
                            ${color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'}`}
                        ></div>
                      </div>
                    ))}
                  </li>
                </ul>
              );
            })}

            {/* 오른쪽 미리보기 화면 */}
            {selectLane > 0 && (() => {
              const laneData = dataInfo[selectLane - 1];
              const idx = laneData?.idx;

              if (typeof idx !== 'number') return null;

              const messages = laneMessagesByIdx[idx] ? laneMessagesByIdx[idx].split('\n') : [];
              const colors = laneColorsByIdx[idx] ? laneColorsByIdx[idx].split(',') : [];

              return (
                <div
                  className="w-[285px] bg-black absolute right-4 top-[50px] border-[2px] border-[#4A4A4A] rounded-sm overflow-hidden"
                  style={{ height: previewHeight }}
                >
                  {messages.map((msg, i) => (
                    <span
                      key={i}
                      ref={(el) => {
                        if (typeof idx === 'number') {
                          previewTextRefs.current[`${idx}-${i + 1}`] = el;
                        }
                      }}
                      className={`block w-full h-[51px] text-center text-[34px] mt-[3px] whitespace-nowrap
                        ${colors[i] === 'yellow' ? 'text-yellow-500' : colors[i] === 'green' ? 'text-green-500' : 'text-red-500'}
                        ${overflowingLines[i + 1] ? 'scrolling-text' : ''}`}
                    >
                      {msg}
                    </span>
                  ))}
                </div>
              );
            })()}
          </span>
        )}

        {/* 전체 미리보기 화면 */}
        {selectLane === 0 && (
          <span className="block w-full min-h-[280px] bg-[#EBECEF] mt-2 rounded-sm py-3 relative">
            {/* 1~4차선 고정 제목 */}
            <ul className="w-full h-[28px] px-4 flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <li
                  key={num}
                  className="w-[285px] h-[28px] bg-[#D2D7E0] text-center leading-[28px] text-[#616A79] font-medium"
                >
                  {num}차선 미리보기
                </li>
              ))}
            </ul>

            {/* 차선별 미리보기 박스 */}
            <ul className="w-full px-4 flex gap-2 mt-2">
              {dataInfo.map((lane) => {
                const rowCount = parseInt(lane.row, 10);
                const height = rowCount <= 4 ? 220 : 220 + (rowCount - 4) * 55;
                const messages = lane.msg?.split('\n') || [];
                const colors = lane.color?.split(',') || [];

                return (
                  <li
                    key={lane.idx}
                    className="w-[285px] bg-black border-[2px] border-[#4A4A4A] rounded-sm mt-[10px] overflow-hidden"
                    style={{ height }}
                  >
                    {Array.from({ length: rowCount }, (_, i) => {
                      const key = `${lane.idx}-${i + 1}`;
                      return (
                        <span
                          key={i}
                          ref={(el) => {
                            allPreviewRefs.current[key] = el;
                          }}
                          className={`block w-full h-[51px] text-center text-[34px] mt-[3px] whitespace-nowrap
                            ${colors[i] === 'yellow'
                              ? 'text-yellow-500'
                              : colors[i] === 'green'
                                ? 'text-green-500'
                                : 'text-red-500'}
                            ${allOverflowingLines[key] ? 'scrolling-text' : ''}`}
                        >
                          {messages[i] || ''}
                        </span>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </span>
        )}

        {/* 하단 버튼 */}
        <span className="w-full h-[38px] mt-4 flex justify-end gap-8">
          <div
            className="w-[98px] h-[38px] bg-[#EBECEF] text-center leading-[38px] text-[17px] text-[#647DB7] font-semibold cursor-pointer rounded-sm"
            onClick={onModify}
          >
            저 장
          </div>
          <div
            className="w-[98px] h-[38px] bg-[#EBECEF] text-center leading-[38px] text-[17px] text-[#DA7F80] font-semibold cursor-pointer rounded-sm"
            onClick={onClose}
          >
            닫 기
          </div>
        </span>
      </div>
    </div>
  );
}
