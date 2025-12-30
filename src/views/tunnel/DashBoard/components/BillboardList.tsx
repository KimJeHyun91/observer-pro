import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTunnelOutside, useBillboardInfo } from '@/utils/hooks/useTunnelArea';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

// 방향 아이콘
import up_arrow from '@/assets/styles/images/map/up_arrow.png';
import down_arrow from '@/assets/styles/images/map/down_arrow.png';

// LCS 아이콘
import downArrow from '@/assets/styles/images/LCS/down_arrow.png';
import leftArrow from '@/assets/styles/images/LCS/left_arrow.png';
import rightArrow from '@/assets/styles/images/LCS/right_arrow.png';
import noEntry from '@/assets/styles/images/LCS/no_entry.png';
import downArrowEffect from '@/assets/styles/images/LCS/down_arrow_Effect.gif';
import noEntryEffect from '@/assets/styles/images/LCS/no_entry_effect.gif';
import num30 from '@/assets/styles/images/LCS/30.png';
import num40 from '@/assets/styles/images/LCS/40.png';
import num50 from '@/assets/styles/images/LCS/50.png';
import num60 from '@/assets/styles/images/LCS/60.png';
import num70 from '@/assets/styles/images/LCS/70.png';
import num80 from '@/assets/styles/images/LCS/80.png';
import num90 from '@/assets/styles/images/LCS/90.png';

const LCSImgSrc = {
  "8001": downArrow,
  "8002": leftArrow,
  "8003": rightArrow,
  "8007": noEntry,
  "8006": downArrowEffect,
  "8008": noEntryEffect,
  "8009": num30,
  "8010": num40,
  "8011": num50,
  "8012": num60,
  "8013": num70,
  "8014": num80,
  "8015": num90,
} as const;

type BoardType = 'VMS' | 'LCS';

type BillboardItem = {
  idx: number;
  name?: string;
  ip?: string;
  port?: string;
  row?: string;
  col?: string;
  msg?: string;          // VMS: 줄바꿈 \n / LCS: 코드("8001"...), 'delete'
  color?: string;        // VMS: "red,yellow,green"
  direction?: string | null;
  type: BoardType;
};

/** 말줄임 유틸 (이모지/한글 안전: 코드포인트 기준) */
function truncateWithEllipsis(input: string | undefined | null, max = 12) {
  const s = (input ?? '').toString();
  if (!s) return { display: '', full: '' };
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join('') + '...' : s;
  return { display, full: s };
}

export function BillboardList() {
  // 개소 리스트 + mutate (소켓으로 최신화)
  const { outsideList, mutate: outsideMutate } = useTunnelOutside();

  const [selectedBoard, setSelectedBoard] = useState<{ idx: number; type: BoardType } | null>(null);
  const selectedOutsideIdx = selectedBoard?.idx ?? -1;

  // 선택된 개소의 전광판 목록 + mutate (소켓으로 최신화)
  const { billboardList: billboardData, mutate: billboardMutate } = useBillboardInfo(selectedOutsideIdx);

  // 소켓 연결
  const { socketService } = useSocketConnection();

  // VMS 전용 셀렉트
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const selectRef = useRef<HTMLDivElement | null>(null);

  // VMS 줄 넘침 체크
  const lineRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [overflowing, setOverflowing] = useState<Record<number, boolean>>({});

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // 좌측 "미리보기" 클릭
  const handleSelect = (idx: number, type: BoardType) => {
    setSelectedBoard(prev => (prev && prev.idx === idx && prev.type === type ? null : { idx, type }));
  };

  // 선택 변경 시 데이터 리패치(보수용)
  useEffect(() => {
    if (selectedBoard?.idx) billboardMutate();
  }, [selectedBoard?.idx, selectedBoard?.type, billboardMutate]);

  // ✅ 소켓 구독: 서버 푸시 시 최신 데이터로 갱신
  useEffect(() => {
    if (!socketService) return;

    // 전광판 데이터 변경
    const offBillboard = socketService.subscribe('tm_billboard-update', () => {
      billboardMutate();
    });

    // 에리어(아웃사이드) 리스트 변경
    const offAreaList = socketService.subscribe?.('tm_areaList-update', () => {
      outsideMutate();
      if (selectedOutsideIdx > 0) billboardMutate();
    });

    return () => {
      try { offBillboard && offBillboard(); } catch {}
      try { offAreaList && offAreaList(); } catch {}
    };
  }, [socketService, billboardMutate, outsideMutate, selectedOutsideIdx]);

  // 응답 안전 추출 & 분리
  const dataList: BillboardItem[] = useMemo(
    () => (Array.isArray(billboardData?.result) ? (billboardData.result as BillboardItem[]) : []),
    [billboardData]
  );
  const vmsList = useMemo(() => dataList.filter(b => b.type === 'VMS'), [dataList]);
  const lcsList = useMemo(() => dataList.filter(b => b.type === 'LCS'), [dataList]);

  // VMS 옵션/선택
  const vmsOptions = useMemo(() => vmsList.map((_, i) => `${i + 1}차선 미리보기`), [vmsList]);
  const selectedIndex = useMemo(() => {
    const i = vmsOptions.indexOf(selectedOption);
    return i >= 0 ? i : 0;
  }, [vmsOptions, selectedOption]);

  const currentVms = vmsList[selectedIndex];
  const rowCount = useMemo(() => parseInt(currentVms?.row ?? '0', 10) || 0, [currentVms?.row]);
  const msgLines = useMemo(() => (currentVms?.msg ?? '').split('\n'), [currentVms?.msg]);
  const colorLines = useMemo(() => (currentVms?.color ?? '').split(',').map(s => s.trim()), [currentVms?.color]);

  // 선택 변경 시 셀렉트 초기화
  useEffect(() => {
    if (!selectedBoard) {
      setSelectedOption('');
      setIsOpen(false);
      return;
    }
    if (selectedBoard.type === 'VMS') {
      setSelectedOption(vmsOptions[0] ?? '');
    } else {
      setSelectedOption('');
      setIsOpen(false);
    }
  }, [selectedBoard?.type, selectedBoard?.idx, vmsOptions]);

  const colorClass = (c?: string) => {
    switch ((c || '').toLowerCase()) {
      case 'yellow': return 'text-yellow-500';
      case 'green':  return 'text-green-500';
      case 'red':    return 'text-red-500';
      default:       return 'text-red-500';
    }
  };

  // 줄 길이 초과 여부 계산 → 애니메이션 클래스 토글
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const next: Record<number, boolean> = {};
      for (let i = 0; i < rowCount; i++) {
        const el = lineRefs.current[i];
        if (el) next[i] = el.scrollWidth > el.clientWidth;
      }
      setOverflowing(next);
    });
    return () => cancelAnimationFrame(id);
  }, [rowCount, msgLines, selectedIndex]);

  return (
    <div className='w-full h-full px-3 select-none dark:bg-[#3F3F3F]'>
      {/* header */}
      <div className='w-full h-[33px] border-b-2 border-[#616A79] pl-[4px]'>
        <span className='h-full leading-[40px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white'>전광판 미리보기</span>
      </div>

      <div className="w-full h-[312px] mt-[9px] flex justify-between">
        {/* 좌측 리스트 */}
        <div className="w-[206px] h-full bg-[#EBECEF] rounded-md py-[8px] overflow-y-auto overflow-x-hidden scroll-container dark:bg-[#1B1D22]">
          {Array.isArray(outsideList?.result) && outsideList.result.map((item: any, idx: number) => {
            const isVMSSelected = selectedBoard?.idx === item.idx && selectedBoard?.type === 'VMS';
            const isLCSSelected = selectedBoard?.idx === item.idx && selectedBoard?.type === 'LCS';

            // outside_name 9자 초과 말줄임 + 툴팁
            const { display: outsideDisplay, full: outsideFull } = truncateWithEllipsis(item.outside_name, 9);
            // location 17자 초과 말줄임 + 툴팁
            const { display: locationDisplay, full: locationFull } = truncateWithEllipsis(item.location, 17);

            return (
              <ul
                key={idx}
                className="w-[190px] h-[108px] ml-[8px] rounded-md bg-white px-[9px] pt-[9px] mb-[8px] dark:bg-[#3F3F3F]"
              >
                <li className="h-[17px] flex gap-1 items-center ">
                  <span
                    className="h-full leading-[17px] text-[#000000] text-[14px] block dark:text-white"
                    title={outsideFull}
                  >
                    {outsideDisplay} {item.direction}
                  </span>
                  <img
                    src={item.direction === '상행' ? up_arrow : down_arrow}
                    className="w-[12px] h-[14px]"
                    draggable={false}
                    alt=""
                  />
                </li>

                {/* 위치 (17자 초과 시 말줄임 + 툴팁) */}
                <li
                  className="block w-full h-[14px] text-[11px] leading-[14px] text-[#000000] mt-[5px] dark:text-white"
                  title={locationFull}
                >
                  {locationDisplay}
                </li>

                <li className="mt-[5px] w-full h-[22px] flex items-center justify-between">
                  <span className="block w-[120px] h-[22px] bg-[#EBECEF] rounded-sm text-[11px] text-[#000000] leading-[22px] pl-[11px] dark:text-white dark:bg-[#1B1D22]">
                    VMS 전광판
                  </span>
                  <span
                    className={`block w-[42px] h-[20px] text-[9px] leading-[20px] text-center border border-[#D2D7E0] cursor-pointer ${isVMSSelected ? 'bg-[#758CBF] text-white dark:border-none' : 'bg-[#EBECEF] text-[#000000] dark:bg-[#707885] dark:border-none dark:text-white'}`}
                    onClick={() => handleSelect(item.idx, 'VMS')}
                  >
                    미리보기
                  </span>
                </li>
                <li className="mt-[6px] w-full h-[22px] flex items-center justify-between">
                  <span className="block w-[120px] h-[22px] bg-[#EBECEF] rounded-sm text-[11px] text-[#000000] leading-[22px] pl-[11px] dark:text-white dark:bg-[#1B1D22]">
                    LCS 전광판
                  </span>
                  <span
                    className={`block w-[42px] h-[20px] text-[9px] leading-[20px] text-center border border-[#D2D7E0] cursor-pointer ${isLCSSelected ? 'bg-[#758CBF] text-white dark:border-none' : 'bg-[#EBECEF] text-[#000000] dark:bg-[#707885] dark:border-none dark:text-white'}`}
                    onClick={() => handleSelect(item.idx, 'LCS')}
                  >
                    미리보기
                  </span>
                </li>
              </ul>
            );
          })}
        </div>

        {/* 오른쪽 영역 */}
        {selectedBoard ? (
          <div className="w-[317px] h-full bg-[#EBECEF] rounded-md p-3 dark:bg-[#1B1D22]">
            {/* VMS */}
            {selectedBoard.type === 'VMS' ? (
              (() => {
                const vmsList = dataList.filter(b => b.type === 'VMS');
                if (vmsList.length === 0) {
                  return (
                    <div className="w-full h-full bg-[#EBECEF] rounded-md flex items-center justify-center text-[#A9A9A9] text-[18px] dark:bg-[#1B1D22]">
                      전광판 미등록
                    </div>
                  );
                }
                return (
                  <span className="flex flex-col w-full h-full justify-between">
                    {/* 커스텀 셀렉트 */}
                    <div ref={selectRef} className="w-full h-[29px] bg-[#D2D7E0] rounded-md relative select-none dark:bg-[#3F3F3F]">
                      <button
                        type="button"
                        disabled={vmsOptions.length === 0}
                        onClick={() => setIsOpen(prev => !prev)}
                        className={`w-full h-full text-center text-[14px] font-semibold leading-[29px] cursor-pointer dark:text-white
                        ${vmsOptions.length === 0 ? 'text-[#9AA0AB] cursor-not-allowed' : 'text-[#616A79]'}`}
                      >
                        {selectedOption || (vmsOptions.length ? '차선 선택' : '전광판 미등록')}
                      </button>
                      <div
                        className={`w-0 h-0 absolute right-3 top-1/2 -translate-y-1/2 border-x-[5px] border-x-transparent 
                        ${isOpen ? 'border-b-[8px] border-b-white' : 'border-t-[8px] border-t-white'} ${vmsOptions.length === 0 ? 'opacity-40' : ''}`}
                      />
                      {isOpen && vmsOptions.length > 0 && (
                        <ul
                          className="w-[250px] bg-white opacity-95 px-2 pb-2 rounded-md border-[2px] border-[#D4D8E1]
                          absolute left-1/2 -translate-x-1/2 top-[115%] z-10 shadow-sm"
                          role="listbox"
                          aria-label="VMS 차선 선택"
                        >
                          {vmsOptions.map((opt, idx) => (
                            <li
                              key={idx}
                              role="option"
                              aria-selected={selectedOption === opt}
                              onClick={() => { setSelectedOption(opt); setIsOpen(false); }}
                              className={`w-full h-[26px] text-center leading-[26px] text-[14px] text-[#616A79] rounded-md mt-1 cursor-pointer
                              hover:bg-[#D2D7E0] ${selectedOption === opt ? 'bg-[#E6E9EF] font-semibold' : ''}`}
                            >
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* VMS 미리보기 */}
                    <ul className="w-full h-[253px] bg-black border-2 border-[#4A4A4A] mt-2 pt-[10px] overflow-y-auto overflow-x-hidden scroll-container">
                      {Array.from({ length: rowCount }, (_, i) => {
                        const text = msgLines[i] ?? '';
                        const color = colorLines[i] ?? 'red';
                        return (
                          <li key={i} className="w-full h-[55px]">
                            <span
                              ref={(el) => { lineRefs.current[i] = el; }}
                              className={`block w-full h-[55px] text-center leading-[55px] text-[25px] font-bold whitespace-nowrap
                              ${colorClass(color)} ${overflowing[i] ? 'scrolling-text' : ''}`}
                            >
                              {text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </span>
                );
              })()
            ) : (
              // LCS
              (() => {
                const lcsList = dataList.filter(b => b.type === 'LCS');
                if (lcsList.length === 0) {
                  return (
                    <div className="w-full h-full bg-[#EBECEF] rounded-md flex items-center justify-center text-[#A9A9A9] text-[18px] dark:bg-[#1B1D22]">
                      전광판 미등록
                    </div>
                  );
                }
                return (
                  <ul className="w-full h-full flex flex-col gap-[9.4px]">
                    {lcsList.map((item, index) => {
                      const src =
                        item.msg && item.msg !== 'delete'
                          ? LCSImgSrc[item.msg as keyof typeof LCSImgSrc]
                          : undefined;
                      return (
                        <li key={item.idx ?? index} className="w-full h-[50px] bg-white py-2 rounded-md relative dark:bg-[#3F3F3F]">
                          <div className="w-[65%] h-full border-r-2 border-[#EBECEF] text-center leading-[37px] text-[18px] text-[#4E4A4A] font-semibold dark:text-white">
                            {index + 1}차선
                          </div>
                          {src && (
                            <img
                              src={src}
                              className="absolute right-[30px] top-1/2 -translate-y-1/2"
                              alt={`LCS Icon ${item.msg}`}
                              draggable={false}
                            />
                          )}
                        </li>
                      );
                    })}
                    {/* 방향 (데이터 있을 때만) */}
                    <li className="w-full h-[50px] bg-white py-2 rounded-md flex dark:bg-[#3F3F3F]">
                      <div className="w-[65%] h-full border-r-2 border-[#EBECEF] text-center leading-[37px] text-[18px] text-[#4E4A4A] font-semibold dark:text-white">
                        방 향
                      </div>
                      <div className="w-[35%] h-full text-center leading-[37px] text-[15px] text-[#4E4A4A] font-[500] dark:text-white">
                        {lcsList[0]?.direction ?? ''}
                      </div>
                    </li>
                  </ul>
                );
              })()
            )}
          </div>
        ) : (
          <div className="w-[317px] h-full bg-[#EBECEF] rounded-md text-center leading-[317px] text-[18px] text-[#A9A9A9] dark:bg-[#1B1D22]">
            전광판을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}

export default BillboardList;
