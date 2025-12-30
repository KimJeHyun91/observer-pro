import React, { useEffect, useState, useRef } from 'react';
import BillboardVMSModal from '../modals/BillboardVMSModal';
import BillboardLCSModal from '../modals/BillboardLCSModal';
import { billboardInfo } from '@/@types/tunnel';
import { useBillboardInfo } from '@/utils/hooks/useTunnelArea';
import { useBillboardStore } from '@/store/tunnel/useBillboardStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

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

type Props = {
  outsideIdx: number;
};

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
  "8015": num90
};

const TunnelBillboard = ({ outsideIdx }: Props) => {
  const [isVmsModalOpen, setIsVmsModalOpen] = useState(false);
  const [isLcsModalOpen, setIsLcsModalOpen] = useState(false);
  const { billboardList: data, mutate } = useBillboardInfo(outsideIdx);
  const [vmsInfo, setVmsInfo] = useState<billboardInfo[]>([]);
  const [lcsInfo, setLcsInfo] = useState<billboardInfo[]>([]);
  const [selectBillboard, setSelectBillboard] = useState<'VMS' | 'LCS'>('VMS');
  const { isSettingUpdate, setIsSettingUpdate, isSettingDelete, setLcsMsgs } = useBillboardStore();
  const { socketService } = useSocketConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState('1차선 미리보기');

  // ref와 overflow 상태 (VMS 메시지 애니메이션용)
  const previewRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [overflowingLines, setOverflowingLines] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!socketService) return;
    const billboardSocket = socketService.subscribe('tm_billboard-update', () => mutate());
    return () => billboardSocket();
  }, [socketService, mutate]);

  useEffect(() => {
    if (isSettingUpdate || isSettingDelete) {
      mutate();
      setIsSettingUpdate(false);
    }

    const result = Array.isArray(data?.result) ? data.result : [];
    setVmsInfo(result.filter(item => item.type === 'VMS'));
    setLcsInfo(result.filter(item => item.type === 'LCS'));
  }, [data, isSettingUpdate, isSettingDelete, mutate, setIsSettingUpdate]);

  useEffect(() => {
    setSelected(vmsInfo.length > 0 ? '1차선 미리보기' : '');

  }, [vmsInfo]);

  useEffect(() => {
    setLcsMsgs(Array.isArray(lcsInfo) ? lcsInfo.map(item => item.msg ?? 'delete') : []);
  }, [lcsInfo, setLcsMsgs]);

  // 선택된 차선 인덱스 계산
  const options = vmsInfo.map((_, idx) => `${idx + 1}차선 미리보기`);
  const selectedIndex = options.indexOf(selected);

  // VMS 메시지 overflow 체크 및 애니메이션 조건 업데이트
  useEffect(() => {
    const newOverflow: Record<number, boolean> = {};
    const messages = (vmsInfo[selectedIndex]?.msg ?? '').split('\n');

    messages.forEach((_, i) => {
      const el = previewRefs.current[i];
      if (el) {
        newOverflow[i] = el.scrollWidth > el.clientWidth;
      }
    });

    setOverflowingLines(newOverflow);
  }, [vmsInfo, selectedIndex]);

  return (
    <>
      <div className="w-[302px] rounded bg-white border shadow p-4 pb-0 dark:bg-gray-800 dark:border-gray-600">
        <h4 className="text-lg text-gray-800 dark:text-white">전광판</h4>
        <div className="w-full h-[30px] mt-1 flex justify-between text-xl">
          {['VMS', 'LCS'].map(type => (
            <div
              key={type}
              className={`w-[47%] h-full border text-center leading-[28px] cursor-pointer rounded-md 
                ${selectBillboard === type ? 'bg-[#758CBF] text-white' : 'bg-[#C6C9D1] text-black'}`}
              onClick={() => setSelectBillboard(type as 'VMS' | 'LCS')}
            >
              {type}
            </div>
          ))}
        </div>
        
        {/* 등록 X 상태 */}
        {(selectBillboard === 'VMS' && vmsInfo.length === 0) || (selectBillboard === 'LCS' && lcsInfo.length === 0) ? (
          <div className='w-[268px] h-[218px] bg-[#EBECEF] mt-2 absolute z-10 border border-gray-400 text-[16px] text-[#A2ABB9] text-center leading-[210px] font-semibold'>
            등록된 {selectBillboard} 전광판이 없습니다.
          </div>
        ) : null}

        {/* VMS 영역 */}
        {selectBillboard === 'VMS' ? (
          <div className="w-full h-[175px] mt-2 overflow-hidden bg-[#EBECEF] rounded-md p-2 relative">
            <div className="w-full h-[22px] bg-[#D2D7E0] rounded-md relative cursor-pointer select-none">
              <span
                className="block w-full h-full text-center text-[15px] text-[#616A79] font-semibold leading-[23px]"
                onClick={() => setIsOpen(prev => !prev)}
              >
                {selected || '차선 선택'}
              </span>
              <div
                className={`w-0 h-0 absolute right-3 top-[50%] -translate-y-[50%] 
                border-x-[5px] border-x-transparent 
                ${isOpen ? 'border-b-[8px] border-b-white' : 'border-t-[8px] border-t-white'}`}
              />
              {isOpen && (
                <ul className="w-[200px] bg-white opacity-95 px-2 pb-2 rounded-md border-[2px] border-[#D4D8E1] absolute left-1/2 -translate-x-1/2 top-[120%] z-10">
                  {options.map((opt, idx) => (
                    <li
                      key={idx}
                      onClick={() => { setSelected(opt); setIsOpen(false); }}
                      className="w-full h-[24px] hover:bg-[#D2D7E0] text-center leading-[24px] text-[#616A79] rounded-md mt-1 cursor-pointer"
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 메시지 + 색상 처리 + 스크롤바 자동 */}
            <div className="w-full h-[132px] mt-1 bg-black border-[2px] border-[#4A4A4A] overflow-y-auto overflow-x-hidden custom-scroll scroll-container">
              {(vmsInfo[selectedIndex]?.msg ?? '')
                .split('\n')
                .map((line, i) => {
                  const color = (vmsInfo[selectedIndex]?.color ?? '').split(',')[i] ?? 'red';
                  return (
                    <span
                      key={i}
                      ref={(el) => {
                        previewRefs.current[i] = el;
                      }}
                      className={`block w-full h-[33px] text-center leading-[33px] text-[20px] whitespace-nowrap
                        ${overflowingLines[i] ? 'scrolling-text' : ''}`}
                      style={{ color }}
                    >
                      {line}
                    </span>
                  );
                })}
            </div>
          </div>
        ) : (
          // LCS 영역
          <div className="w-full h-[175px] mt-2 bg-[#EBECEF] rounded-md">
            <div className="w-full h-2/3 overflow-y-auto custom-scroll scroll-container">
              {lcsInfo.map((item, index) => (
                <div key={item.idx ?? index} className="w-full h-1/2 border-b-white border-2 relative">
                  <div className="text-[18px] font-bold absolute top-1/2 -translate-y-3 left-[56px]">
                    {index + 1}차선
                  </div>
                  {item.msg && item.msg !== 'delete' && (
                    <img
                      src={LCSImgSrc[item.msg as keyof typeof LCSImgSrc]}
                      className="w-[34px] h-[34px] absolute top-1/2 -translate-y-1/2 right-[56px]"
                      alt={`LCS Icon for ${item.msg}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="w-full h-1/3 border-b-white border-2 relative">
              <div className="text-[18px] font-bold absolute top-1/2 -translate-y-[12px] left-[60px]">방향</div>
              <div className="text-[18px] font-bold absolute top-1/2 -translate-y-[12px] right-[40px]">
                {lcsInfo[0]?.direction ?? ''}
              </div>
            </div>
          </div>
        )}

        <div
          className="w-full h-[34px] leading-[34px] border mt-2 border-[#dfdede] bg-[#C6C9D1] text-center cursor-pointer rounded-sm text-xl text-black font-bold"
          onClick={() => {
            if (selectBillboard === 'VMS') {
              vmsInfo.length > 0 ? setIsVmsModalOpen(true) : alert('VMS 전광판이 터널과 연결되어 있지 않습니다.');
            } else {
              lcsInfo.length > 0 ? setIsLcsModalOpen(true) : alert('LCS 전광판이 터널과 연결되어 있지 않습니다.');
            }
          }}
        >
          수정
        </div>
      </div>

      {isVmsModalOpen && <BillboardVMSModal vmsInfo={vmsInfo} onClose={() => setIsVmsModalOpen(false)} />}
      {isLcsModalOpen && <BillboardLCSModal lcsInfo={lcsInfo ?? null} onClose={() => setIsLcsModalOpen(false)} />}
    </>
  );
};

export default TunnelBillboard;
