// src/components/map/BoundaryLayerSigungu.tsx
import { GeoJSON, Pane, useMap } from 'react-leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
// @ts-ignore
import polylabel from 'polylabel'
import area from '@turf/area'
import { polygon as turfPolygon } from '@turf/helpers'
import mapBoundaryLayerControl from '@/assets/styles/images/map/mapBoundaryLayerControl.png'
import { apiGetSigunguBoundaryControl, apiSetSigunguBoundaryControl } from '@/services/CommonService'

/** 마우스오버 툴팁을 보여줄 최대 줌(해당 줌 이하에서만 표시됨). 예: 10 이하면 시군구 이름 툴팁 표시 */
const TOOLTIP_MAX_ZOOM = 10

/** 행정구역 코드(SIG_CD) 앞 2자리를 시도명으로 매핑하기 위한 표 */
const SIDO_BY_PREFIX: Record<string, string> = {
  '11': '서울특별시', '26': '부산광역시', '27': '대구광역시', '28': '인천광역시', '29': '광주광역시',
  '30': '대전광역시', '31': '울산광역시', '36': '세종특별자치시',
  '41': '경기도', '42': '강원특별자치도', '43': '충청북도', '44': '충청남도',
  '45': '전라북도', '46': '전라남도', '47': '경상북도', '48': '경상남도',
  '50': '제주특별자치도'
}

/** 시도별 폴리곤 채우기 색상 */
const SIDO_COLOR: Record<string, string> = {
  '강원특별자치도': '#D4EC96',
  '경기도': '#EDAC71',
  '경상북도': '#E0C1E3',
  '경상남도': '#C596CD',
  '충청북도': '#828FCE',
  '충청남도': '#9CBAE3',
  '전라북도': '#D2CC80',
  '전라남도': '#B4AE4D',
  '제주특별자치도': 'red',
  '서울특별시': '#F1D953',
  '인천광역시': '#60B089',
  '대전광역시': '#4C8FC8',
  '대구광역시': '#F990AC',
  '광주광역시': '#88A020',
  '부산광역시': '#AC5386',
  '울산광역시': '#F0C385',
  '세종특별자치시': '#B0BAB9'
}

/** 시도명에 대응하는 채우기 색상 반환(미정의 시 회색 톤) */
const colorBySido = (sido: string) => SIDO_COLOR[sido] || '#d1d5db'

/**
 * 축과 평행한 외곽 BBox(지도의 전체 경계를 나타내는 사각형)에 해당하는 피처를 필터링하기 위한 판별.
 * - 일부 GeoJSON에는 데이터의 전체 extents를 나타내는 사각형이 포함될 수 있는데, 지도에 그리면 화면을 가려서 제외.
 * - 첫 번째 외곽 링의 좌표가 위도 2종/경도 2종만 반복되면 축정렬 사각형으로 판단.
 */
function isAxisAlignedRectangle(feature: any): boolean {
  const geom = feature?.geometry
  if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return false
  const getOuterRing = (): number[][] | null =>
    geom.type === 'Polygon' ? (geom.coordinates?.[0] ?? null) : (geom.coordinates?.[0]?.[0] ?? null)
  const ring = getOuterRing()
  if (!ring || ring.length < 4) return false
  const lats = new Set<number>(), lngs = new Set<number>()
  for (const [lng, lat] of ring) {
    // 소수점 4자리 반올림하여 동일성 비교(미세한 오차 무시)
    lats.add(+lat.toFixed(4)); lngs.add(+lng.toFixed(4))
  }
  return lats.size <= 2 && lngs.size <= 2
}

/** 피처에서 시도명 추출(UPPER_KOR_NM/CTP_KOR_NM 우선, 없으면 SIG_CD 앞 2자리 기반 매핑) */
function getSidoFromFeature(f: any): string {
  const direct = f?.properties?.CTP_KOR_NM || f?.properties?.UPPER_KOR_NM
  if (direct) return String(direct)
  const sigcd: string | undefined = f?.properties?.SIG_CD
  const pfx = sigcd?.slice(0, 2)
  return (pfx && SIDO_BY_PREFIX[pfx]) ? SIDO_BY_PREFIX[pfx] : ''
}

/** 피처에서 시군구명 추출(SIG_KOR_NM 또는 name) */
const getSigunguFromFeature = (f: any) => f?.properties?.SIG_KOR_NM || f?.properties?.name || ''

/** 피처 식별자(ID) 추출: SIG_CD가 있으면 사용, 없으면 "시도|시군구" 조합 */
function getIdFromFeature(f: any): string {
  const id = f?.properties?.SIG_CD
  if (id && String(id).trim() !== '') return String(id)
  return `${getSidoFromFeature(f)}|${getSigunguFromFeature(f)}`
}

/**
 * 폴리곤 내부의 시각적 중심 반환
 * - polylabel(폴리곤 내부의 라벨 위치 계산 라이브러리) 사용
 * - MultiPolygon의 경우 가장 넓은 폴리곤을 선택하여 중심 계산
 */
function getVisualCenter(feature: any): L.LatLngExpression | null {
  const geom = feature?.geometry
  if (!geom) return null
  if (geom.type === 'Polygon') {
    const p = polylabel(geom.coordinates, 1.0)
    return [p[1], p[0]]
  }
  if (geom.type === 'MultiPolygon') {
    let bestPoly: number[][][] | null = null
    let bestA = -Infinity
    for (const poly of geom.coordinates as number[][][][]) {
      try {
        // turf로 면적을 계산하여 가장 큰 폴리곤 선택
        const feat = turfPolygon(poly as unknown as number[][][])
        const a = area(feat)
        if (a > bestA) { bestA = a; bestPoly = poly as unknown as number[][][] }
      } catch {}
    }
    if (bestPoly) {
      const p = polylabel(bestPoly, 1.0)
      return [p[1], p[0]]
    }
  }
  return null
}

/**
 * 실제 GeoJSON 레이어를 그리는 컴포넌트
 * - selectedIds(Set)에 포함된 시군구만 필터링하여 지도에 표시
 * - 마우스오버 시(줌이 낮을 때) 시도/시군구명을 중앙 툴팁으로 표출
 */
function SigunguLayer({ data, selectedIds }: { data: any; selectedIds: Set<string> }) {
  const map = useMap()
  const hoverTipRef = useRef<L.Tooltip | null>(null)
  // 선택 ID 변경에 따른 강제 재마운트를 위해 key를 구성(리액트 GeoJSON 최적화 대응)
  const selectedKey = Array.from(selectedIds).sort().join('|')

  // 줌 변경 시 툴팁 노출 정책 반영: TOOLTIP_MAX_ZOOM 초과 시 기존 툴팁 제거
  useEffect(() => {
    const onZoomEnd = () => {
      if (map.getZoom() > TOOLTIP_MAX_ZOOM && hoverTipRef.current) {
        map.removeLayer(hoverTipRef.current)
        hoverTipRef.current = null
      }
    }
    map.on('zoomend', onZoomEnd)
    return () => { map.off('zoomend', onZoomEnd) }
  }, [map])

  // 각 피처의 스타일(테두리/채우기 색/투명도 등)
  const style = (feature: any): L.PathOptions => ({
    color: '#333',
    weight: 1,
    fillColor: colorBySido(getSidoFromFeature(feature)),
    fillOpacity: 0.45,
  })

  // 피처별 이벤트 바인딩
  const onEach = (feature: any, layer: L.Layer) => {
    // 축과 평행한 외곽 BBox는 완전 투명 + 비상호작용 처리(지도 덮는 사각형 제거)
    if (isAxisAlignedRectangle(feature) && layer instanceof L.Path) {
      layer.setStyle({ opacity: 0, fillOpacity: 0, interactive: false } as any)
      return
    }
    if (!(layer instanceof L.Path)) return

    const name = getSigunguFromFeature(feature)
    const sido = getSidoFromFeature(feature)

    // 마우스오버: 줌이 충분히 낮을 때만(<= TOOLTIP_MAX_ZOOM) 중앙에 상시(permanent) 툴팁 생성
    layer.on('mouseover', () => {
      if (map.getZoom() > TOOLTIP_MAX_ZOOM) {
        if (hoverTipRef.current) { map.removeLayer(hoverTipRef.current); hoverTipRef.current = null }
        return
      }
      // 강조: 테두리 두껍게/채우기 진하게
      layer.setStyle({ weight: 2, fillOpacity: 0.6 })

      // 폴리곤 시각적 중앙 계산 → 없으면 폴리곤 바운드 센터 또는 지도 중심 대체
      const center =
        getVisualCenter(feature) ||
        (layer as any)?.getCenter?.() ||
        ((layer instanceof L.Polygon || layer instanceof L.Polyline)
          ? (layer as L.Polygon).getBounds().getCenter()
          : map.getCenter())

      // 기존 툴팁 제거 후 새로 추가(중복 방지)
      if (hoverTipRef.current) { map.removeLayer(hoverTipRef.current); hoverTipRef.current = null }

      const tip = L.tooltip({
        permanent: true,            // 항상 표시(마우스 위치가 아닌 중앙 고정)
        direction: 'center',
        className: 'boundary-tooltip', // 커스텀 스타일링을 위한 클래스
        opacity: 1,
        pane: 'sigungu-tooltips',   // 전용 Pane에 그려서 지오메트리 위로 오도록 설정
      }).setLatLng(center as any)
        .setContent(name ? `${sido} ${name}` : sido || '')
        .addTo(map)

      hoverTipRef.current = tip
    })

    // 마우스아웃: 스타일 원복 + 툴팁 제거
    layer.on('mouseout', () => {
      layer.setStyle(style(feature))
      if (hoverTipRef.current) { map.removeLayer(hoverTipRef.current); hoverTipRef.current = null }
    })
  }

  // 선택된 ID만 필터링하여 그리도록 설정
  const featureFilter = (f: any) => {
    if (isAxisAlignedRectangle(f)) return false
    const id = getIdFromFeature(f)
    return !!id && selectedIds.has(id)
  }

  return (
    // 시군구 폴리곤을 그리는 Pane (지도 상 여러 레이어의 z-index 관리)
    <Pane name="sigungu-boundaries" style={{ zIndex: 640 }}>
      <GeoJSON
        key={selectedKey}              // 선택 변경 시 강제 재마운트
        data={data}                    // 전체 GeoJSON
        filter={featureFilter}         // 선택된 ID만 렌더
        style={style}                  // 스타일 함수
        onEachFeature={onEach}         // 이벤트 바인딩
      />
    </Pane>
  )
}

/**
 * 시군구 경계 표시 컨트롤 + 레이어를 관리하는 상위 컴포넌트
 * - 패널에서 시도/시군구 선택 → 선택된 시군구만 지도에 렌더
 * - 서버와 선택 상태 동기화(증감 Delta 전송)
 * - 로컬 스토리지에 패널 열림/닫힘 상태 저장
 */
export default function BoundaryLayerSigungu({
  url,                 // GeoJSON URL
  initialSido = 'ALL', // 초기 시도 필터(ALL = 전체)
  restrictSidoList,    // 특정 시도만 노출 제한(선택적)
}: {
  url: string
  initialSido?: string | 'ALL'
  restrictSidoList?: string[]
}) {
  const [data, setData] = useState<any | null>(null) // 지도에 그릴 GeoJSON

  // UI 목록/선택 관련 상태
  type Item = { id: string; name: string; sido: string; label: string }
  const [allSido, setAllSido] = useState<string[]>([])                 // 전체 시도 목록
  const [grouped, setGrouped] = useState<Record<string, Item[]>>({})   // 시도별 시군구 목록
  const [allItems, setAllItems] = useState<Item[]>([])                 // 전체 시군구 일람
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())           // 현재 선택 집합
  const [serverSelectedIds, setServerSelectedIds] = useState<Set<string> | null>(null) // 서버에서 받은 초기 선택 집합
  const [sidoFilter, setSidoFilter] = useState<string | 'ALL'>(initialSido)        // 패널의 시도 필터

  // ── 패널 열림/닫힘 상태를 라우트별로 localStorage에 저장(리로드 시 상태 유지)
  const routeKey =
    typeof window !== 'undefined' ? (window.location.pathname.split('/')[1] || 'default') : 'default'
  const PANEL_OPEN_KEY = `sigungu_panel_open:${routeKey}`
  const [panelOpen, setPanelOpen] = useState<boolean>(() => {
    // SSR 환경 대비 + localStorage 접근 보호
    if (typeof window === 'undefined') return true
    try {
      const saved = localStorage.getItem(PANEL_OPEN_KEY)
      return saved === null ? true : saved === 'true' // 기본값: 열림
    } catch {
      return true
    }
  })
  const setPanelOpenPersist = (next: boolean) => {
    setPanelOpen(next)
    try { localStorage.setItem(PANEL_OPEN_KEY, String(next)) } catch {}
  }

  // 컨트롤 루트/재열기 버튼 영역 참조(지도 클릭/스크롤 전파 차단용)
  const controlRef = useRef<HTMLDivElement | null>(null)
  const reopenRef  = useRef<HTMLDivElement | null>(null)

  // 패널이 열릴 때 컨트롤에서 지도 이벤트로의 전파를 막아 지도 이동/확대 축소가 되지 않도록 함
  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current)
      L.DomEvent.disableScrollPropagation(controlRef.current)
    }
    if (reopenRef.current) {
      L.DomEvent.disableClickPropagation(reopenRef.current)
      L.DomEvent.disableScrollPropagation(reopenRef.current)
    }
  }, [panelOpen])

  /** 1) 서버에서 선택(true)된 시군구 목록을 받아 초기 선택값 구성 */
  useEffect(() => {
    apiGetSigunguBoundaryControl<any>()
      .then((res) => {
        const ids = new Set<string>(
          (res?.result ?? [])
            .filter((r: any) => r?.selected === true && r?.sigungu_cd)
            .map((r: any) => String(r.sigungu_cd))
        )
        setServerSelectedIds(ids)
      })
      .catch(() => setServerSelectedIds(new Set()))
  }, [])

  /** 2) GeoJSON을 로드하여 색인/정렬 후 상태 구성 (제주 제외) */
  useEffect(() => {
    let alive = true
    fetch(url)
      .then(r => r.json())
      .then(json => {
        if (!alive) return

        // 제주특별자치도 제외(요건에 따른 필터링)
        const filteredFeatures = (json?.features ?? []).filter((f: any) => getSidoFromFeature(f) !== '제주특별자치도')

        setData({ ...json, features: filteredFeatures })

        // 시도/시군구 색인 구성
        const sidoSet = new Set<string>()
        const items: Item[] = []
        const grp: Record<string, Item[]> = {}

        for (const f of filteredFeatures) {
          const sido = getSidoFromFeature(f)
          const sig  = getSigunguFromFeature(f)
          if (!sido || !sig) continue
          const id = getIdFromFeature(f)
          items.push({ id, name: sig, sido, label: `${sido} ${sig}` })
          if (!grp[sido]) grp[sido] = []
          grp[sido].push({ id, name: sig, sido, label: `${sido} ${sig}` })
          sidoSet.add(sido)
        }

        // 시도 목록/정렬
        const allSidoList = Array.from(sidoSet).sort((a, b) => a.localeCompare(b, 'ko'))

        // 시도별 시군구 중복 제거 + 이름순 정렬
        for (const k of Object.keys(grp)) {
          grp[k] = Array.from(new Set(grp[k].map(i => i.id)))
            .map(id => items.find(x => x.id === id)!)
            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        }

        // 전체 아이템: 시도 → 시군구 순 정렬
        const sortedItems = items.sort((a, b) =>
          a.sido === b.sido ? a.name.localeCompare(b.name, 'ko') : a.sido.localeCompare(b.sido, 'ko')
        )

        // restrictSidoList가 있으면 해당 시도만 노출
        const finalSido = restrictSidoList?.length ? allSidoList.filter(s => restrictSidoList.includes(s)) : allSidoList

        setAllSido(finalSido)
        setGrouped(grp)
        setAllItems(sortedItems)

        // 서버 초기 선택값이 도착해 있다면 그것을 적용, 아니면 빈 선택
        setSelectedIds(
          serverSelectedIds
            ? new Set(sortedItems.map(i => i.id).filter(id => serverSelectedIds.has(id)))
            : new Set()
        )
      })
      .catch(err => console.error('Sigungu GeoJSON 로드 에러:', err))
    return () => { alive = false }
  }, [url, restrictSidoList, serverSelectedIds])

  /** 3) 서버 초기 선택값이 뒤늦게 도착했을 때 allItems 준비 이후 동기화 */
  useEffect(() => {
    if (!serverSelectedIds || allItems.length === 0) return
    setSelectedIds(new Set(allItems.map(i => i.id).filter(id => serverSelectedIds.has(id))))
  }, [serverSelectedIds, allItems])

  /**
   * 4) 선택 상태 변경 감지 → 서버로 Delta(추가/제거)만 전송
   * - 서버 적용 실패 시 이전 상태로 롤백
   */
  const didInitRef = useRef(false)
  const prevSelectedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    // 최초 마운트 시에는 이전 상태만 저장하고 전송하지 않음
    if (!didInitRef.current) {
      prevSelectedRef.current = new Set(selectedIds)
      didInitRef.current = true
      return
    }
    const prev = prevSelectedRef.current
    const next = selectedIds
    const added   = [...next].filter(id => !prev.has(id))
    const removed = [...prev].filter(id => !next.has(id))
    if (added.length === 0 && removed.length === 0) return

    // 서버 스키마에 맞춰 delta payload 구성
    const payload = [
      ...added.map(id => ({ sigungu_cd: id, selected: true })),
      ...removed.map(id => ({ sigungu_cd: id, selected: false })),
    ]

    ;(async () => {
      try {
        await apiSetSigunguBoundaryControl({ items: payload })
        // 성공 시 현재 상태를 이전 상태로 고정
        prevSelectedRef.current = new Set(next)
      } catch {
        // 실패 시 이전 상태로 롤백
        setSelectedIds(new Set(prev))
      }
    })()
  }, [selectedIds])

  /** 패널 시도 필터에 따라 표시할 항목(시군구) 집합 계산 */
  const visibleItems: Item[] = useMemo(() => (
    sidoFilter === 'ALL' ? allItems : (grouped[sidoFilter] ?? [])
  ), [sidoFilter, allItems, grouped])

  /** 체크 동작들(단건 토글/보이는 것 전체/전체 전체) */
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const checkAll = () => setSelectedIds(prev => {
    const next = new Set(prev); for (const it of visibleItems) next.add(it.id); return next
  })
  const uncheckAll = () => setSelectedIds(prev => {
    const next = new Set(prev); for (const it of visibleItems) next.delete(it.id); return next
  })
  const checkAllGlobal = () => setSelectedIds(new Set(allItems.map(i => i.id)))
  const uncheckAllGlobal = () => setSelectedIds(new Set())

  return (
    <>
      {/* 시군구 툴팁을 위한 전용 Pane: 상위로 뜨도록 z-index 및 포인터 이벤트 비활성화 */}
      <Pane name="sigungu-tooltips" style={{ zIndex: 660, pointerEvents: 'none' }} />

      {/* 좌하단 패널(열림 상태) */}
      {panelOpen && (
        <div className="leaflet-bottom leaflet-left z-[99999] pointer-events-auto">
          <div
            ref={controlRef}
            className="leaflet-control bg-white rounded-lg shadow-md min-w=[300px] max-h-[420px] overflow-hidden px-2 dark:bg-[#141414]"
          >
            {/* 헤더: 제목 + 닫기(X) */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 dark:border-[#3F3F3F]">
              <strong className="text-[13px] text-gray-700 mt-[8px] ml-[2px] dark:text-[#EBECEF]">시군구 표시 설정</strong>
              <button
                onMouseDown={(e) => e.stopPropagation()}    // 지도 이동 방지(이벤트 전파 차단)
                onClick={() => setPanelOpenPersist(false)}  // 닫기 + 상태 저장
                title="닫기"
                className="text-gray-500 text-lg mr-1 mt-1 dark:text-[#3F3F3F]"
              >
                ✕
              </button>
            </div>

            {/* 전체 선택/해제 버튼(전 시도/시군구 대상) */}
            <div className="flex items-center px-1 py-2">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={checkAllGlobal}
                className="h-7 px-2 border border-r-0 border-gray-200 bg-white text-gray-700 text-[12px] hover:bg-[#F5F5F5]
                dark:bg-[#3F3F3F] dark:text-[#E0E0E0] dark:border-[#141414] dark:hover:bg-[#28292A]"
              >
                전체 선택
              </button>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={uncheckAllGlobal}
                className="h-7 px-2 border border-gray-200 bg-white text-gray-700 text-[12px] hover:bg-[#F5F5F5]
                dark:bg-[#3F3F3F] dark:text-[#E0E0E0] dark:border-[#141414] dark:hover:bg-[#28292A]"
              >
                전체 해제
              </button>
            </div>

            <div className="w-full h-[300px]">
              {/* 시도 드롭다운 + 해당 시도 전체 선택/해제 */}
              <div className="flex items-center gap-2 px-3 py-2 border-[1px] border-b-0 border-[#EBECEF] dark:border-[#3F3F3F]">
                <span className="text-[12px] text-gray-500 dark:text-[#E0E0E0]">시도</span>
                <select
                  value={sidoFilter}
                  onChange={(e) => setSidoFilter(e.target.value as any)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="h-[28px] w-[130px] px-2 border border-gray-200 bg-white text-[12px] text-gray-900 outline-none
                  dark:bg-[#3F3F3F] dark:text-[#EBECEF] dark:border-none"
                >
                  <option value="ALL">전체</option>
                  {allSido.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="flex-1" />

                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={checkAll}
                  className="h-[28px] px-2 border border-gray-200 bg-gray-50 text-gray-700 text-[12px] hover:bg-gray-100
                  dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none"
                >
                  시도 선택
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={uncheckAll}
                  className="h-[28px] px-2 border border-gray-200 bg-gray-50 text-gray-700 text-[12px] hover:bg-gray-100
                  dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none"
                >
                  시도 해제
                </button>
              </div>

              {/* 시군구 체크박스 목록(스크롤) */}
              <div className="px-3 pt-2 pb-3 h-[242px] overflow-y-auto scroll-container border-[1px] border-[#EBECEF] dark:border-[#3F3F3F]">
                {visibleItems.length > 0 ? (
                  visibleItems.map((it) => (
                    <label
                      key={it.id}
                      onMouseDown={(e) => e.stopPropagation()}  // 목록 클릭해도 지도에 이벤트 전파 안 되도록
                      className="flex items-center gap-2 py-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleOne(it.id)}
                        className="h-3 w-3 rounded border-gray-300 text-blue-400 focus:ring-0 focus:outline-none hover:bg-transparent dark:accent-gray-400"
                      />
                      {/* 시도 색상을 작은 박스로 표시(범례 역할) */}
                      <span className="inline-block w-3 h-3 rounded-[3px] border border-gray-400" style={{ background: colorBySido(it.sido) }} />
                      <span className="text-[13px] text-gray-900 select-none dark:text-[#EBECEF]">{it.label}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-gray-400 text-[12px]">시군구 목록 로딩 중…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 패널이 닫힌 경우 좌하단에 플로팅 재열기 버튼 표시 */}
      {!panelOpen && (
        <div className="leaflet-bottom leaflet-left" style={{ zIndex: 100000, pointerEvents: 'auto' }}>
          <div
            ref={reopenRef}
            className="leaflet-control"
            style={{ background: 'transparent', border: 'none', boxShadow: 'none', margin: '0 0 12px 9px' }}
          >
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPanelOpenPersist(true)}
              title="시군구 패널 열기"
            >
              <img
                src={mapBoundaryLayerControl}
                alt="시군구 패널 열기"
                style={{ width: 36, height: 36, pointerEvents: 'none' }}
              />
            </button>
          </div>
        </div>
      )}

      {/* 실제 지도 위에 선택된 시군구만 그리는 레이어 */}
      {data && <SigunguLayer data={data} selectedIds={selectedIds} />}
    </>
  )
}
