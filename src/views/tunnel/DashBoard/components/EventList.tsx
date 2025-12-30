import React, { useCallback, useEffect, useState } from "react";
import "simplebar-react/dist/simplebar.min.css";
import { apiTunnelGetEventList } from "@/services/TunnelService";
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";
import event_icon from "@/assets/styles/images/event_icon.png";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

type TunnelEvent = {
  idx?: number;
  event_type_id?: number;
  description?: string;
  location?: string;
  event_occurrence_time?: string; // 'YYYYMMDDTHHmmss'
  severity_id?: number;
};

// 응답을 항상 TunnelEvent[]로 정규화
function normalizeEventList(res: unknown): TunnelEvent[] {
  if (Array.isArray(res)) return res as TunnelEvent[];

  if (res && typeof res === "object") {
    const r1 = (res as any).result;
    if (Array.isArray(r1)) return r1 as TunnelEvent[];
    if (r1 && Array.isArray(r1.result)) return r1.result as TunnelEvent[];
  }
  return [];
}

// 이벤트명 매핑
const getEventTypeName = (eventTypeId?: number) => {
  const eventTypes: Record<number, string> = {
    38: "위험 수위 감지(주의)",
    39: "위험 수위 감지(경계)",
    40: "위험 수위 감지(심각)",
    44: "위험 수위 감지(대피)",
    47: "차단기 자동제어"
  };
  return eventTypeId != null ? eventTypes[eventTypeId] ?? "Unknown" : "Unknown";
};

// 시간 포맷: 'YYYYMMDDTHHmmss'
const fmtDate = (ts?: string) => {
  if (!ts) return "-";
  return dayjs(ts, "YYYYMMDDTHHmmss").format("YYYY-MM-DD A hh:mm");
};

/** 말줄임 유틸 (이모지/한글 안전: 코드포인트 기준) */
function truncateWithEllipsis(input: string | undefined | null, max = 21) {
  const s = (input ?? "").toString();
  if (!s) return { display: "-", full: "-" };
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join("") + "..." : s;
  return { display, full: s };
}

export function EventList() {
  const [events, setEvents] = useState<TunnelEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { socketService } = useSocketConnection();

  // 오늘 포함 7일치 (오늘-6일 ~ 오늘) 조회
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = dayjs().subtract(6, "day").format("YYYY-MM-DD");
      const end = dayjs().format("YYYY-MM-DD");

      const raw = await apiTunnelGetEventList({
        start,
        end,
        startTime: "",
        endTime: "",
        eventType: "",
        deviceType: "",
        deviceName: "",
        location: "",
      });

      // 정규화 + 최신 순 정렬
      const list = normalizeEventList(raw).sort((a, b) => {
        const ta = a.event_occurrence_time ?? "";
        const tb = b.event_occurrence_time ?? "";
        return tb.localeCompare(ta);
      });

      setEvents(list);
    } catch (e) {
      console.error("이벤트 목록 조회 실패:", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 소켓으로 갱신 (채널명: tm_event-update)
  useEffect(() => {
    if (!socketService) return;

    const CHANNEL = "tm_event-update";
    const unsubscribe = socketService.subscribe(CHANNEL, () => {
      fetchEvents();
    });

    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, [socketService, fetchEvents]);

  return (
    <div className="w-full h-full bg-white rounded-md px-3 dark:bg-[#3F3F3F]">
      {/* header */}
      <div className="w-full h-[33px] border-b-2 border-[#616A79] pl-[4px]">
        <span className="h-full leading-[40px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white">
          이벤트 목록
        </span>
      </div>

      <div className="w-full h-[780px] overflow-y-auto overflow-x-hidden scroll-container">
        {/* 로딩 */}
        {loading && (
          <div className="w-full h-[120px] flex items-center justify-center text-[#A9A9A9]">
            불러오는 중...
          </div>
        )}

        {/* 비어있음 */}
        {!loading && events.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-[#A9A9A9] text-[18px]">
            표시할 이벤트가 없습니다.
          </div>
        )}

        {/* 리스트 */}
        {!loading &&
          events.map((ev, i) => {
            const { display: locDisplay, full: locFull } = truncateWithEllipsis(ev.location, 21);
            return (
              <span
                key={ev.idx ?? i}
                className="block w-full h-[65px] rounded-md bg-[#EBECEF] mt-[10px] relative dark:bg-[#1C1E23]"
              >
                <img
                  src={event_icon}
                  className="absolute left-[11px] top-1/2 -translate-y-1/2 w-[35px] h-[35px]"
                  alt="event"
                  draggable={false}
                />
                <ul className="w-[250px] h-[65px] absolute right-0">
                  <li className="h-[26px] leading-[30px] border-b-[1px] border-[#C6C6C7] pl-[10px] text-[12px] text-[#000000] font-bold dark:text-[#EBECEF]">
                    {getEventTypeName(ev.event_type_id)}
                  </li>
                  <li
                    className="h-[18px] leading-[18px] pl-[10px] text-[11px] text-[#000000] dark:text-[#EBECEF]"
                    title={locFull}
                  >
                    위치 : {locDisplay}
                  </li>
                  <li className="h-[18px] leading-[18px] pl-[10px] text-[11px] text-[#000000] dark:text-[#EBECEF]">
                    시간 : {fmtDate(ev.event_occurrence_time)}
                  </li>
                </ul>
              </span>
            );
          })}
      </div>
    </div>
  );
}

export default EventList;
