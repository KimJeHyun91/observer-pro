import { useEffect, useMemo, useRef, useState } from "react";
import "simplebar-react/dist/simplebar.min.css";
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";

// 방향 아이콘
import up_arrow from "@/assets/styles/images/map/up_arrow.png";
import down_arrow from "@/assets/styles/images/map/down_arrow.png";

import error_icon from "@/assets/styles/images/error_icon.png";
import select_icon from "@/assets/styles/images/select_icon.png";

import { useDeviceList } from "@/utils/hooks/useTunnelArea";

/** API row 타입 (콘솔 스샷 기준) */
type DeviceRow = {
  idx: number;
  outside_name: string;             // 터널명
  direction: string | null;         // "상행" | "하행"
  barrier_ip?: string | null;       // 차단기 IP
  billboard_list?: string | null;   // "이름/IP/linked\n..."
  camera_list?: string | null;      // "
  water_level_list?: string | null; // "
};

type Item = { name: string; ip: string; linked?: boolean };

/** deviceList가 {message, result} 인 경우를 포함해 항상 배열로 정규화 */
function normalizeDeviceRows(data: any): DeviceRow[] {
  if (Array.isArray(data)) return data as DeviceRow[];
  if (data && Array.isArray(data.result)) return data.result as DeviceRow[];
  if (data && data.result && Array.isArray(data.result.result)) return data.result.result as DeviceRow[];
  return [];
}

/** "이름/IP/linked" 한 줄 파싱 */
function parseLine(line: string): Item | null {
  if (!line) return null;
  const parts = line.split("/");
  if (parts.length < 3) return null;
  const [name, ip, linkedRaw] = parts;
  const s = (linkedRaw ?? "").trim().toLowerCase();
  const truthy = new Set(["true", "t", "1", "y", "yes"]);
  const falsy  = new Set(["false", "f", "0", "n", "no"]);
  const linked = truthy.has(s) ? true : falsy.has(s) ? false : undefined;
  return { name: (name ?? "").trim(), ip: (ip ?? "").trim(), linked };
}

/** 멀티라인 → 아이템 배열 */
function parseList(str?: string | null): Item[] {
  if (!str) return [];
  return str
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter((x): x is Item => !!x);
}

/** 높이 자동 측정형 Collapsible (max-h 없이 부드럽게) */
function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setH(el.scrollHeight);
    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener("resize", measure);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div style={{ height: open ? h : 0 }} className="overflow-hidden transition-[height] duration-300 ease-in-out">
      <div ref={ref}>{children}</div>
    </div>
  );
}

/** 말줄임 유틸 (이모지/한글 안전: 코드포인트 기준) */
function truncateWithEllipsis(input: string | null | undefined, max = 20) {
  const s = (input ?? "").toString();
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join("") + "..." : s;
  return { display, full: s };
}

export function DeviceList() {
  const { deviceList, mutate } = useDeviceList();

  // 셀렉트(터널/장치)
  const [selectedType, setSelectedType] = useState<"터널" | "장치">("터널");
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  // 터널별 오픈 상태
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => normalizeDeviceRows(deviceList), [deviceList]);
  
  const { socketService } = useSocketConnection();

  useEffect(() => {
    if (!socketService || typeof socketService.subscribe !== "function") return;

    const CHANNELS = [
      "ob_cameras-update",
      "tm_areaList-update",
      "tm_waterLevel-update",
      "tm_billboard-update",
    ] as const;

    const unsubs = CHANNELS.map((ch) =>
      socketService.subscribe(ch, () => {
        mutate(); // 이벤트 들어올 때마다 새로고침
      })
    );

    return () => {
      unsubs.forEach((off) => {
        try { typeof off === "function" && off(); } catch {}
      });
    };
  }, [socketService, mutate]);

  useEffect(() => {
    const m: Record<string, boolean> = {};
    rows.forEach((r) => { m[r.outside_name] = true; });
    setOpenMap((prev) => ({ ...m, ...prev }));
  }, [rows]);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /** -------- 터널 모드: rows → 터널명으로 그룹 (같은 방향도 row별 섹션으로 모두 노출) -------- */
  type Section = {
    id: string | number;
    title: string;
    icon: string;
    data: { barrierIp?: string | null; waters: Item[]; boards: Item[]; cams: Item[] };
  };

  const tunnelGrouped = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const r of rows) {
      const key = r.outside_name;
      if (!map.has(key)) map.set(key, []);

      const dir = (r.direction || "").toLowerCase();
      const icon =
        dir.includes("상") || dir.includes("up")
          ? up_arrow
          : dir.includes("하") || dir.includes("down")
          ? down_arrow
          : up_arrow;

      map.get(key)!.push({
        id: r.idx ?? `${key}-${r.direction ?? ""}-${Math.random()}`,
        title: `${key} ${r.direction ?? ""}`.trim(),
        icon,
        data: {
          barrierIp: r.barrier_ip ?? null,
          waters: parseList(r.water_level_list),
          boards: parseList(r.billboard_list),
          cams: parseList(r.camera_list),
        },
      });
    }

    const sortDir = (t: string) => (t.includes("상행") ? 0 : t.includes("하행") ? 1 : 2);

    return Array.from(map.entries()).map(([name, sections]) => ({
      name,
      sections: sections.sort((a, b) => sortDir(a.title) - sortDir(b.title)),
    }));
  }, [rows]);

  /** -------- 장치 모드: 모든 터널의 장비를 카테고리별로 수집 -------- */
  const deviceGrouped = useMemo(() => {
    const barrier: Item[] = [];
    const waters: Item[]  = [];
    const boards: Item[]  = [];
    const cams: Item[]    = [];

    for (const r of rows) {
      // 차단기: 이름이 없으니 터널명으로 구분되게 표기
      if (r.barrier_ip) {
        barrier.push({ name: `${r.outside_name} 차단기`, ip: r.barrier_ip });
      }
      waters.push(...parseList(r.water_level_list));
      boards.push(...parseList(r.billboard_list));
      cams.push(...parseList(r.camera_list));
    }

    return {
      // 요청 순서: 차단기 → 수위계 → 전광판 → 카메라
      order: ["차단기", "수위계", "전광판", "카메라"] as const,
      data: {
        차단기: barrier,
        수위계: waters,
        전광판: boards,
        카메라: cams,
      } as Record<"차단기" | "수위계" | "전광판" | "카메라", Item[]>,
    };
  }, [rows]);

  /** 장치 모드: 카테고리별 오픈 상태 */
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({
    차단기: true,
    수위계: true,
    전광판: true,
    카메라: true,
  });

  /** 공통: 카드(항목) 렌더 */
  const renderItemLi = (
    category: "차단기" | "수위계" | "전광판" | "카메라",
    item: Item,
    key?: string | number
  ) => {
    const showError = category !== "차단기" && item.linked === false; // linked=false일 때만 아이콘

    // 🔹 이름 20글자 초과 시 말줄임 + 툴팁
    const hasName = !!item.name;
    const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(item.name ?? "", 20);

    return (
      <li
        className="w-full h-[65px] bg-[#EBECEF] rounded-md mb-1 dark:bg-[#1B1D22]"
        key={key ?? `${category}-${item.name}-${item.ip}-${Math.random()}`}
      >
        <div className="w-full h-[26px] pl-[20px] border-b border-[#C8C8C8] leading-[28px] font-semibold text-[#4E4A4A] mb-[2px] relative dark:text-white">
          {category}
          {showError && <img src={error_icon} className="absolute right-2 top-[5px]" />}
        </div>
        <div className="w-full h-[15px] text-[11px] pl-[20px] leading-[20px] text-[#4E4A4A] dark:text-white">
          이름 :{" "}
          <span title={hasName ? nameFull : undefined}>
            {hasName ? nameDisplay : "-"}
          </span>
        </div>
        <div className="w-full h-[15px] text-[11px] pl-[20px] leading-[20px] text-[#4E4A4A] dark:text-white">
          장치 IP : {item.ip || "-"}
        </div>
      </li>
    );
  };

  /** 터널 모드: 섹션 렌더 */
  const renderTunnelSection = (section: Section) => {
    const { title, icon, data } = section;
    const list: JSX.Element[] = [];

    // 🔹 섹션 타이틀 20자 초과 시 말줄임 + 툴팁
    const { display: titleDisplay, full: titleFull } = truncateWithEllipsis(title, 20);

    // 장비 순서: 차단기 → 수위계 → 전광판 → 카메라
    if (data.barrierIp) list.push(renderItemLi("차단기", { name: "차단기", ip: data.barrierIp || "" }));
    data.waters.forEach((w, i) => list.push(renderItemLi("수위계", w, `w-${i}-${w.name}-${w.ip}`)));
    data.boards.forEach((b, i) => list.push(renderItemLi("전광판", b, `b-${i}-${b.name}-${b.ip}`)));
    data.cams.forEach((c, i)   => list.push(renderItemLi("카메라", c,   `c-${i}-${c.name}-${c.ip}`)));

    if (list.length === 0) return null;

    return (
      <span className="w-full block" key={section.id}>
        <div className="w-full h-[24px] bg-white mt-[8px] pl-[20px] flex items-center gap-1 dark:bg-[#3F3F3F]">
          <span
            className="text-[#4E4A4A] text-[12px] font-semibold leading-[25px] dark:text-white"
            title={titleFull}
          >
            {titleDisplay}
          </span>
          <img src={icon} className="w-[12px] h-[14px]" />
        </div>
        <ul className="block w-full h-auto bg-white p-2 mt-[6px] rounded-md dark:bg-[#3F3F3F]">{list}</ul>
      </span>
    );
  };

  return (
    <div className="w-[328px] h-full bg-white rounded-md px-3 dark:bg-[#3F3F3F]">
      {/* header */}
      <div className="w-full h-[33px] border-b-2 border-[#616A79] flex items-center justify-between">
        <span className="pl-[4px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white">장치 목록</span>

        {/* 셀렉트: 터널 / 장치 */}
        <div className="relative" ref={typeRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={typeOpen}
            onClick={() => setTypeOpen((v) => !v)}
            className="relative h-[24px] w-[60px] rounded-full pl-[13px] bg-[#EBECEF] text-[12px] leading-[25px] font-semibold text-[#4E4A4A] flex gap-1 dark:bg-black dark:text-white"
          >
            {selectedType}
            <img
              src={select_icon}
              alt=""
              className={`w-[10px] h-[8px] absolute right-2 top-[8px] transition-transform ${typeOpen ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {typeOpen && (
            <ul
              role="listbox"
              className="absolute right-0 mt-1 w-[96px] rounded-md bg-white border border-[#D4D8E1] shadow-md z-10 dark:bg-gray-700 dark:border-black"
            >
              {(["터널", "장치"] as const).map((opt) => (
                <li
                  key={opt}
                  role="option"
                  aria-selected={selectedType === opt}
                  onClick={() => {
                    setSelectedType(opt);
                    setTypeOpen(false);
                  }}
                  className={`px-3 py-2 text-[12px] text-center cursor-pointer hover:bg-[#F3F4F6] hover:dark:bg-gray-800 ${
                    selectedType === opt ? "text-[#111827] font-semibold dark:text-white" : "text-[#4E4A4A] dark:text-white"
                  }`}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* content */}
      <div className="w-full h-[770px] overflow-y-auto overflow-x-hidden scroll-container mt-[10px]">
        {selectedType === "터널" ? (
          <div className="w-full h-auto bg-[#EBECEF] p-2 rounded-md mb-2 dark:bg-[#1B1D22]">
            {tunnelGrouped.length === 0 && (
              <div className="text-[13px] text-[#6B7280] py-4 text-center font-bold dark:text-white ">데이터가 없습니다.</div>
            )}

            {tunnelGrouped.map(({ name, sections }) => {
              const open = !!openMap[name];
              const toggle = () => setOpenMap((m) => ({ ...m, [name]: !m[name] }));
              const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(name, 20);

              return (
                <div key={name} className="mb-2">
                  {/* 터널 토글 헤더 */}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    className="w-full h-[24px] bg-white text-[#4E4A4A] font-semibold leading-[24px] pl-[10px] pr-8 relative flex items-center justify-between rounded-sm dark:bg-[#3F3F3F] dark:text-white"
                  >
                    <span title={nameFull}>{nameDisplay}</span>
                    <img
                      src={select_icon}
                      alt=""
                      className={`absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 ${
                        open ? "rotate-0" : "rotate-180"
                      }`}
                    />
                  </button>

                  <Collapsible open={open}>
                    {sections.map((sec) => renderTunnelSection(sec))}
                  </Collapsible>
                </div>
              );
            })}
          </div>
        ) : (
          // ===== 장치 모드 =====
          <div className="w-full h-auto bg-[#EBECEF] p-2 rounded-md mb-2 dark:bg-[#1B1D22]">
            {deviceGrouped.order.map((cat) => {
              const isOpen = categoryOpen[cat];
              const toggle = () => setCategoryOpen((m) => ({ ...m, [cat]: !m[cat] }));
              const items = deviceGrouped.data[cat];

              return (
                <div key={cat} className="mb-2">
                  {/* 카테고리 헤더 (우측 삼각형 토글) */}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={isOpen}
                    className="w-full h-[24px] bg-white text-[#4E4A4A] font-semibold leading-[24px] px-[10px] relative flex items-center justify-between rounded-sm dark:bg-[#3F3F3F] dark:text-white"
                  >
                    <span>{cat}</span>
                    <img
                      src={select_icon}
                      alt=""
                      className={`absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 ${
                        isOpen ? "rotate-0" : "rotate-180"
                      }`}
                    />
                  </button>

                  <Collapsible open={isOpen}>
                    <ul className="block w-full h-auto bg-white p-2 mt-[6px] rounded-md dark:bg-[#3F3F3F]">
                      {items.length === 0 && (
                        <li className="w-full h-[42px] bg-[#F5F6F8] rounded-md mb-1 flex items-center px-3 text-[12px] text-[#777] font-bold dark:bg-[#1B1D22] dark:text-white">
                          데이터 없음
                        </li>
                      )}
                      {items.map((it, i) => renderItemLi(cat, it, `${cat}-${i}-${it.name}-${it.ip}`))}
                    </ul>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceList;
