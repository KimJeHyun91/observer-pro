import React, { useEffect, useMemo, useState } from "react";
import ScrollBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { FaSearch } from 'react-icons/fa';

import { useWaterLevelList } from '@/utils/hooks/useTunnelArea';
import { waterLevelRequest } from '@/@types/tunnel';
import WaterLevelChart from './WaterLevelChart';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

/* -----------------------------------------------------------
   리스트 + 검색 + 통계 + 오른쪽 차트 영역
----------------------------------------------------------- */

// 글자수 기준 말줄임 (이모지/한글 안전)
function truncateWithEllipsis(input: string | undefined | null, max = 14) {
  const s = (input ?? '').toString();
  if (!s) return { display: '-', truncated: false, full: '' };
  const chars = [...s]; // 코드포인트 단위 분해
  const truncated = chars.length > max;
  const display = truncated ? chars.slice(0, max).join('') + '...' : s;
  return { display, truncated, full: s };
}

export function WaterLevelList() {
  // ✅ mutate도 함께 받아와서 실시간 갱신에 사용
  const { waterLevelList: wData, mutate } = useWaterLevelList();
  // ✅ 소켓 서비스
  const { socketService } = useSocketConnection();

  // 검색 상태
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 선택된 outside_idx (outside_info[0].idx 사용)
  const [selectedOutsideIdx, setSelectedOutsideIdx] = useState<number | null>(null);

  // result 배열 안전 추출
  const list = useMemo(() => {
    return Array.isArray(wData?.result) ? (wData.result as waterLevelRequest[]) : [];
  }, [wData]);

  // outside_info가 있고, linked_status가 true(또는 1)인 것만
  const filteredData = useMemo(() => {
    return list.filter((item: any) =>
      Array.isArray(item.outside_info) &&
      item.outside_info.length > 0 &&
      Boolean(item.linked_status)
    );
  }, [list]);

  // ✅ 소켓 이벤트 수신 시 리스트 최신화
  useEffect(() => {
    if (!socketService) return;
    const unsubWater = socketService.subscribe('tm_waterLevel-update', () => {
      mutate();
    });
    const unsubArea = socketService.subscribe('tm_areaList-update', () => {
      mutate();
    });
    return () => {
      unsubWater?.();
      unsubArea?.();
    };
  }, [socketService, mutate]);

  // ✅ 선택된 수위계가 삭제되었는지 감시
  useEffect(() => {
    if (selectedOutsideIdx == null) return;
    const stillExists = filteredData.some(
      (item: any) => item.outside_info?.[0]?.idx === selectedOutsideIdx
    );
    if (!stillExists) {
      setSelectedOutsideIdx(null);
    }
  }, [filteredData, selectedOutsideIdx]);

  // 임계치 구간
  const getThresholdLevels = (threshold: number) => ({
    danger: threshold * 0.90,
    severe: threshold * 0.80,
    warning: threshold * 0.70,
    caution: threshold * 0.50,
    attention: threshold * 0.30,
  });

  const getLevelStatus = (level: number, threshold: number) => {
    if (!threshold || threshold === 0) {
      return { text: '안전', color: '#40A640' };
    }
    const lv = getThresholdLevels(threshold);
    if (level > lv.danger) return { text: '대피', color: '#7952BF' };
    if (level === lv.danger) return { text: '심각', color: '#E6393E' };
    if (level >= lv.severe) return { text: '심각', color: '#E6393E' };
    if (level >= lv.warning) return { text: '경계', color: '#FCA421' };
    if (level >= lv.caution) return { text: '주의', color: '#FBDB4F' };
    if (level >= lv.attention) return { text: '관심', color: '#203CEF' };
    return { text: '안전', color: '#40A640' };
  };

  // 검색어 확정 시 리스트 필터
  const searchedList = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return filteredData;
    return filteredData.filter((item: any) => (item.name ?? '').toLowerCase().includes(kw));
  }, [filteredData, searchKeyword]);

  // 단계별 개수 집계
  const stats = useMemo(() => {
    const acc = {
      total: 0,
      evac: 0,
      severe: 0,
      warning: 0,
      caution: 0,
      attention: 0,
      safe: 0,
    };

    const arr = filteredData ?? [];
    acc.total = arr.length;

    arr.forEach((item: any) => {
      const level = Number(item.curr_water_level ?? 0);
      const threshold = Number(item.threshold ?? 0);
      const { text } = getLevelStatus(level, threshold);

      switch (text) {
        case '대피': acc.evac++; break;
        case '심각': acc.severe++; break;
        case '경계': acc.warning++; break;
        case '주의': acc.caution++; break;
        case '관심': acc.attention++; break;
        default: acc.safe++; break;
      }
    });

    return acc;
  }, [filteredData]);

  return (
    <div className='w-full h-full bg-white rounded-md px-3 dark:bg-[#3F3F3F]'>
      {/* header */}
      <div className='w-full h-[33px] border-b-2 border-[#616A79] pl-[4px]'>
        <span className='h-full leading-[40px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white'>수위계</span>
      </div>

      <ul className="w-full h-[387px] mt-[9px] flex justify-between">
        {/* 왼쪽 통계 */}
        <li className='w-[132px] h-full flex flex-col justify-between'>
          {[
            { label: '전체', color: '#797979', value: stats.total },
            { label: '대피', color: '#7952BF', value: stats.evac },
            { label: '심각', color: '#E6393E', value: stats.severe },
            { label: '경계', color: '#FCA421', value: stats.warning },
            { label: '주의', color: '#FBDB4F', value: stats.caution },
            { label: '관심', color: '#203CEF', value: stats.attention },
            { label: '안정', color: '#40A640', value: stats.safe },
          ].map((item, idx) => (
            <ol key={idx} className={`w-[132px] h-[46px] border-[2px] border-[${item.color}] rounded-md`}>
              <li className="w-[128px] h-[18px]" style={{ backgroundColor: item.color, color: '#fff', textAlign: 'center', lineHeight: '18px', fontSize: '10px' }}>{item.label}</li>
              <li className="w-[128px] text-center font-bold text-[16px]" style={{ color: item.color }}>{item.value}</li>
            </ol>
          ))}
        </li>

        {/* 가운데 리스트 */}
        <li className='w-[268px] h-full bg-[#EBECEF] rounded-md py-[9px] dark:bg-[#1B1D22]'>
          {/* 검색창 */}
          <div className="w-[252px] max-w-md relative mb-[10px] ml-[8px]">
            <input
              type="text"
              className="w-full h-[30px] pl-4 pr-10 py-3 rounded-full bg-white text-gray-800 focus:outline-none dark:bg-[#3F3F3F] dark:text-white"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchKeyword(searchInput);
                }
              }}
            />
            <button
              type="button"
              aria-label="검색"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#616A79]"
              onClick={() => setSearchKeyword(searchInput)}
            >
              <FaSearch className="cursor-pointer dark:text-white" />
            </button>
          </div>

          <div className="w-[268px] h-[330px] overflow-y-auto overflow-x-hidden">
            {searchedList.map((item: any, idx) => {
              const level = Number(item.curr_water_level ?? 0);
              const threshold = Number(item.threshold ?? 0);
              const { color } = getLevelStatus(level, threshold);
              const outsideIdx = item.outside_info?.[0]?.idx;
              const isActive = outsideIdx === selectedOutsideIdx;

              // 이름 14자, 위치 18자 처리
              const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(item.name, 14);
              const { display: locDisplay,  full: locFull  } = truncateWithEllipsis(item.location, 18);

              return (
                <div
                  key={item.idx ?? idx}
                  className="w-[252px] h-[75px] bg-white rounded-md ml-[8px] mb-[10px] relative dark:bg-[#3F3F3F]"
                >
                  <span className="block w-[10px] h-full rounded-l-md" style={{ backgroundColor: color }}></span>

                  {/* 이름 (기본 브라우저 툴팁만 사용) */}
                  <span
                    className="absolute top-[10px] left-[23px] text-[#4A4A4A] font-semibold text-[14px] dark:text-white"
                    title={nameFull}
                  >
                    {nameDisplay}
                  </span>

                  <span className="absolute w-[170px] h-[2px] rounded-md bg-[#EBECEF] top-[31px] left-[20px]"></span>

                  {/* IP */}
                  <span className="absolute text-[#4A4A4A] text-[12px] top-[37px] left-[25px] dark:text-white">
                    {item.ip ?? '-'}
                  </span>

                  {/* location (18자 초과 말줄임 + 브라우저 툴팁) */}
                  <span
                    className="absolute text-[#4A4A4A] text-[12px] top-[55px] left-[25px] dark:text-white"
                    title={locFull}
                  >
                    {locDisplay}
                  </span>

                  {/* 버튼 */}
                  <button
                    type="button"
                    className={`absolute text-center leading-[35px] text-[9px] w-[50px] h-[35px] border border-[#D2D7E0] rounded-sm top-[20px] right-[5px] cursor-pointer
                    ${isActive ? 'bg-[#758CBF] text-white font-bold dark:border-none' : 'bg-[#EBECEF] text-[#4A4A4A] dark:bg-[#707885] dark:text-white dark:border-none'}`}
                    onClick={() => {
                      if (!outsideIdx) return;
                      setSelectedOutsideIdx(isActive ? null : Number(outsideIdx));
                    }}
                  >
                    차트 확인
                  </button>
                </div>
              );
            })}
            {searchedList.length === 0 && (
              <div className="w-[252px] ml-[8px] mt-[3px] text-[14px] text-[#616A79] dark:text-white">검색 결과가 없습니다.</div>
            )}
          </div>
        </li>

        {/* 오른쪽 차트 */}
        <li className='w-[734px] h-full bg-[#EBECEF] rounded-md p-[10px] dark:bg-[#1B1D22]'>
          <span className="text-[15px] block font-semibold text-[#4E4A4A] pl-[5px] mt-[5px] dark:text-white">
            수위 차트 확인
          </span>
          <div className="w-full h-[330px] rounded-md bg-white mt-[10px] p-[8px] dark:bg-[#3F3F3F]">
            {selectedOutsideIdx ? (
              <WaterLevelChart outsideIdx={selectedOutsideIdx} />
            ) : (
              <div className="w-full h-full text-center leading-[342px] text-[18px] text-[#B6BBC4] dark:text-white">
                수위계를 선택하세요.
              </div>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}

export default WaterLevelList;
