import React, { useEffect, useMemo } from "react";
import "simplebar-react/dist/simplebar.min.css";
import { useDeviceList } from "@/utils/hooks/useTunnelArea";
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";
import error_icon from "@/assets/styles/images/error_icon.png";

/** API row 타입 */
type DeviceRow = {
  idx: number;
  outside_name: string;
  direction: string | null;
  barrier_ip?: string | null;
  billboard_list?: string | null;
  camera_list?: string | null;
  water_level_list?: string | null;
};

type Item = { name: string; ip: string; linked?: boolean };

function normalizeDeviceRows(data: any): DeviceRow[] {
  if (Array.isArray(data)) return data as DeviceRow[];
  if (data && Array.isArray(data.result)) return data.result as DeviceRow[];
  if (data && data.result && Array.isArray(data.result.result)) return data.result.result as DeviceRow[];
  return [];
}

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

function parseList(str?: string | null): Item[] {
  if (!str) return [];
  return str
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseLine)
    .filter((x): x is Item => !!x);
}

/** 말줄임 유틸 (코드포인트 안전) */
function truncateWithEllipsis(input: string | undefined | null, max = 13) {
  const s = (input ?? "").toString();
  if (!s) return { display: "-", full: "" };
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join("") + "..." : s;
  return { display, full: s };
}

type ErrorCard = {
  key: string;
  category: "수위계" | "전광판" | "카메라";
  name: string;
  ip: string;
  outside: string;
  direction: string | null;
};

export function NetworkErrorList() {
  const { deviceList, mutate } = useDeviceList();
  const { socketService } = useSocketConnection() as any;

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
        mutate();
      })
    );

    return () => {
      unsubs.forEach((off: any) => { try { typeof off === "function" && off(); } catch {} });
    };
  }, [socketService, mutate]);

  const rows = useMemo(() => normalizeDeviceRows(deviceList), [deviceList]);

  // ✅ linked=false 인 수위계/전광판/카메라만 수집 (차단기 포함 X)
  const errorItems = useMemo<ErrorCard[]>(() => {
    const list: ErrorCard[] = [];
    const dedup = new Set<string>();

    for (const r of rows) {
      const waters = parseList(r.water_level_list);
      const boards = parseList(r.billboard_list);
      const cams   = parseList(r.camera_list);

      const pushItem = (category: ErrorCard["category"], it: Item) => {
        if (it.linked !== false) return;
        const key = `${category}|${r.outside_name}|${r.direction}|${it.name}|${it.ip}`;
        if (dedup.has(key)) return;
        dedup.add(key);
        list.push({
          key,
          category,
          name: it.name,
          ip: it.ip,
          outside: r.outside_name,
          direction: r.direction ?? null,
        });
      };

      waters.forEach((w) => pushItem("수위계", w));
      boards.forEach((b) => pushItem("전광판", b));
      cams.forEach((c) => pushItem("카메라", c));
    }

    // 표시 순서: 수위계 → 전광판 → 카메라
    const order = new Map([
      ["수위계", 0],
      ["전광판", 1],
      ["카메라", 2],
    ] as const);

    return list.sort((a, b) => {
      const oa = order.get(a.category) ?? 99;
      const ob = order.get(b.category) ?? 99;
      if (oa !== ob) return oa - ob;
      const ad = `${a.outside}|${a.direction ?? ""}|${a.name}`;
      const bd = `${b.outside}|${b.direction ?? ""}|${b.name}`;
      return ad.localeCompare(bd, "ko");
    });
  }, [rows]);

  return (
    <div className="w-full h-full bg-white rounded-md px-3 dark:bg-[#3F3F3F]">
      {/* header */}
      <div className="w-full h-[33px] border-b-2 border-[#616A79] pl-[4px] relative">
        <span className="h-full leading-[40px] text-[15px] text-[#4E4A4A] font-semibold dark:text-white">
          네트워크 장애 장치
        </span>
        <img src={error_icon} className="absolute right-2 top-[13px]" />
      </div>

      {/* 리스트 */}
      <ul className="w-full h-[320px] px-2 pt-[10px] overflow-y-auto overflow-x-hidden scroll-container">
        {errorItems.length === 0 && (
          <li className="w-full h-[40px] rounded-md bg-[#EBECEF] flex items-center justify-center text-[12px] font-bold text-[#6B7280] dark:bg-[#1B1D22] dark:text-white">
            장애 장치가 없습니다.
          </li>
        )}

        {errorItems.map((it) => {
          const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(it.name, 13);
          const { display: outsideDisplay, full: outsideFull } = truncateWithEllipsis(it.outside, 7);
          return (
            <li key={it.key} className="w-full h-[40px] rounded-md bg-[#EBECEF] relative mb-[8px] dark:bg-[#1B1D22]">
              {/* 상단: 카테고리 >> 이름 (이름 말줄임 + 툴팁) */}
              <div className="absolute top-[5px] left-[10px] text-[#D76767] text-[11px] font-bold">
                {it.category} <span className="mx-[2px]">{">>"}</span>{" "}
                <span title={nameFull}>{nameDisplay || "-"}</span>
              </div>
              {/* 하단: IP + (터널/방향) (터널명 말줄임 + 툴팁) */}
              <div className="absolute top-[22px] left-[11px] text-[11px] dark:text-white">
                {it.ip || "-"} &nbsp;·&nbsp; <span title={outsideFull}>{outsideDisplay}</span> {it.direction ?? ""}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default NetworkErrorList;
