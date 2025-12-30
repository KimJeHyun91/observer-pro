import { useEffect, useMemo, useState } from "react";
import "simplebar-react/dist/simplebar.min.css";
import { useWaterLevelList } from "@/utils/hooks/useTunnelArea";
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";

/** 말줄임 유틸 (이모지/한글 안전: 코드포인트 기준) */
function truncateWithEllipsis(input: string | undefined | null, max = 17) {
  const s = (input ?? "").toString();
  if (!s) return { display: "", full: "" };
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join("") + "..." : s;
  return { display, full: s };
}

export function WaterLevelThresholdList() {
  const { waterLevelList: wData, mutate } = useWaterLevelList();
  const { socketService } = useSocketConnection();

  // 마지막 갱신 시각
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 공통 갱신 함수: mutate 호출 후 갱신 시각 기록
  const fetchAndMark = () => {
    const ret = mutate();
    if (ret && typeof (ret as any).then === "function") {
      (ret as Promise<any>).finally(() => setLastUpdated(new Date()));
    } else {
      setLastUpdated(new Date());
    }
  };

  // 0) 첫 렌더 때도 헤더에 시간 보이도록 세팅 (표시는 5분 내림 포맷)
  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  // 1) 소켓 이벤트로 갱신
  useEffect(() => {
    if (!socketService) return;
    const unsubscribe = socketService.subscribe("tm_waterLevel-update", () => {
      fetchAndMark();
    });
    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  // 2) 매 5분 경계(:00, :05, :10, ...)에 맞춰 갱신
  useEffect(() => {
    const FIVE_MIN = 5 * 60 * 1000;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const startInterval = () => {
      fetchAndMark(); // 경계 시각 도달 시 즉시 한 번
      intervalId = window.setInterval(() => {
        fetchAndMark();
      }, FIVE_MIN);
    };

    const remainder = Date.now() % FIVE_MIN;
    if (remainder === 0) {
      startInterval();
    } else {
      timeoutId = window.setTimeout(() => {
        startInterval();
      }, FIVE_MIN - remainder);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // outside_info가 0개 초과 + link_status === true 인 것만
  const connectedList = useMemo(() => {
    const arr = Array.isArray(wData?.result) ? wData.result : [];
    return arr.filter((item: any) => {
      const hasOutside = Array.isArray(item.outside_info) && item.outside_info.length > 0;
      const linkOk =
        item?.linked_status === true ||
        (Array.isArray(item.outside_info) &&
          item.outside_info.some((o: any) => o?.linked_status === true));
      return hasOutside && linkOk;
    });
  }, [wData]);

  // 임계치 비율 테이블
  const getThresholdLevels = (threshold: number) => ({
    danger: threshold * 0.9,
    severe: threshold * 0.8,
    warning: threshold * 0.7,
    caution: threshold * 0.5,
    attention: threshold * 0.3,
  });

  // 현재 수위 상태/색상
  const getLevelStatus = (level: number, threshold: number) => {
    if (!threshold || threshold === 0) return { text: "안전", color: "#40A640" };
    const lv = getThresholdLevels(threshold);
    if (level > lv.danger) return { text: "대피", color: "#7952BF" };
    if (level >= lv.severe) return { text: "심각", color: "#E6393E" };
    if (level >= lv.warning) return { text: "경계", color: "#FCA421" };
    if (level >= lv.caution) return { text: "주의", color: "#d4b93e" };
    if (level >= lv.attention) return { text: "관심", color: "#dfbe2e" };
    return { text: "안전", color: "#40A640" };
  };

  // "YYYY.MM.DD AM 03 : 40" 포맷 (분은 5분 단위로 내림)
  const formatAmPm = (d: Date) => {
    const pad2 = (n: number) => n.toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());

    const hours24 = d.getHours();
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const h12 = hours24 % 12 || 12; // 0시 → 12
    const hh = pad2(h12); // "03"처럼 2자리

    const minute = d.getMinutes();
    const minute5 = Math.floor(minute / 5) * 5; // 41 → 40
    const min = pad2(minute5);

    return `${yyyy}.${mm}.${dd} ${ampm} ${hh} : ${min}`;
  };

  return (
    <div className="w-full h-full bg-white rounded-md px-3 dark:bg-[#3F3F3F]">
      {/* header */}
      <div className="w-full h-[33px] border-b-2 border-[#616A79] pl-[4px] flex items-center justify-between">
        <span className="h-full leading-[40px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white">
          임계치 목록
        </span>
        <span className="text-[12px] h-full leading-[40px] text-[#616A79] translate-y-[1px] dark:text-white">
          {lastUpdated ? formatAmPm(lastUpdated) : "마지막 갱신: -"}
        </span>
      </div>

      {/* ✅ 연결된 수위계가 있을 때만 보이는 라벨 */}
      {connectedList.length > 0 && (
        <div className="w-full h-[20px] relative">
          <span className="text-[10px] text-[#4E4A4A] absolute right-[54px] top-[4px] font-semibold dark:text-white">
            설정 임계치
          </span>
          <span className="text-[10px] text-[#4E4A4A] absolute right-[6px] top-[4px] font-semibold dark:text-white">
            현재 수위
          </span>
        </div>
      )}

      <div className="w-full h-[300px] overflow-y-auto overflow-x-hidden scroll-container">
        {connectedList.map((item: any) => {
          const thresholdNum = Number(item?.threshold ?? 0);
          const levelNum = Number(item?.curr_water_level ?? 0);
          const { color } = getLevelStatus(levelNum, thresholdNum);

          // 이름 17자 초과 말줄임 + 툴팁 (fallback 포함)
          const rawName = item.name || `수위계 ${item.idx}`;
          const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(rawName, 17);

          return (
            <div
              key={item.idx}
              className="w-full h-[54px] border-b-[1px] border-[#ccc] mb-2"
            >
              <span className="w-full h-[42px] flex justify-between items-center px-2">
                <div className="w-[215px] h-[42px] bg-[#EBECEF] rounded-sm pt-[6px] pl-[5px] dark:bg-[#1B1D22]">
                  <div
                    className="w-full h-[16px] text-[13px] leading-[16px] font-semibold text-[#4E4A4A] dark:text-white"
                    title={nameFull}
                  >
                    {nameDisplay}
                  </div>
                  <div className="text-[10px] mt-[3px] pl-[3px] dark:text-white">
                    {item.ip}
                  </div>
                </div>

                {/* 설정 임계치 */}
                <div className="w-[36px] h-[36px] bg-[#EBECEF] rounded-sm text-[12px] text-center leading-[36px] font-bold text-[#9BC6E6] dark:bg-[#1B1D22]">
                  {Number.isFinite(thresholdNum) && thresholdNum > 0 ? `${thresholdNum}cm` : "-"}
                </div>

                {/* 현재 수위: 상태 기반 색상 */}
                <div
                  className="w-[36px] h-[36px] bg-[#EBECEF] rounded-sm text-[12px] text-center leading-[36px] font-bold dark:bg-[#1B1D22]"
                  style={{ color }}
                >
                  {Number.isFinite(levelNum) ? `${levelNum}cm` : "-"}
                </div>
              </span>
            </div>
          );
        })}

        {connectedList.length === 0 && (
          <div className="w-full h-full flex  justify-center text-[#A9A9A9] text-[18px] leading-[341px]">
            연결된 수위계가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default WaterLevelThresholdList;
