import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { apiCallInitialMapPosition, apiSetInitialMapPosition } from '@/services/InundationService';
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';
import { DialogState } from '@/@types/inundation';
import { FaBookmark } from "react-icons/fa";
import ReactDOMServer from 'react-dom/server';
import { ConfirmDialog } from '../shared';
// ajy 클러스터 사용 위해 추가
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import tunnel_cluster_icon from '@/assets/styles/images/map/tunnel_cluster_icon.png'

// 일반지도/위성지도 아이콘
import basic_map_icon_black from '@/assets/styles/images/map/basic_map_icon_black.png'
import basic_map_icon_white from '@/assets/styles/images/map/basic_map_icon_white.png'
import satellite_map_icon_black from '@/assets/styles/images/map/satellite_map_icon_black.png'
import satellite_map_icon_white from '@/assets/styles/images/map/satellite_map_icon_white.png'

// 시군구 경계
import BoundaryLayerSigungu from '@/components/map/BoundaryLayerSigungu'

function MapReadyNotifier({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [50, 64],
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface MarkerData {
  speaker_name: string;
  broadcast_device: any;

  id: string;
  position: [number, number];
  name: string;
  address?: string;
  type: 'area' | 'waterlevel' | 'broadcast' | 'broadcast_devices' | 'tunnel';

  gateStatus?: boolean;
  gateLinkedStatus?: boolean;

  // ✅ 객체 또는 string/number 모두 허용 (API 다양성 수용)
  waterlevel?:
  | {
    curr_water_level?: string;
    threshold?: string;
    water_level_idx?: number;
    water_level_name?: string;
  }
  | string
  | number;

  speaker_status?: string;
  barrier_status?: boolean;
  barrier_direction?: string;
  camera_ip?: string;

  billboard_lcs_idx?: number | null;
  billboard_vms_idx?: number | null;

  billboard_idx_list_lcs?: (string | number)[];
  billboard_idx_list_vms?: (string | number)[];

  guardianLightIp?: string;
  guardianlite_ip?: string;

  location?: string | null;
}

export interface ContextMenuData {
  x: number;
  y: number;
  latlng: L.LatLng;
}

export interface MarkerMenuData extends ContextMenuData {
  camera_ip: any;
  markerId: string | null;
}

interface BaseMapLayerProps {
  markers?: MarkerData[];
  onMarkerClick: (marker: MarkerData, position?: { x: number; y: number }) => void;
  onMapClick?: (coordinates: { lat: number; lng: number }) => void;
  onContextMenu: (data: ContextMenuData) => void;
  onMarkerContextMenu?: (data: MarkerMenuData) => void;
  onMarkerDragEnd?: (markerId: string, newPosition: [number, number], type: string) => void;
  contextMenuContent?: React.ReactNode;
  markerMenuContent?: React.ReactNode;
  children?: React.ReactNode;
  getMarkerIcon: (
    type: string,
    gateStatus: boolean,
    gateLinkedStatus: boolean,
    waterlevel?: {
      curr_water_level?: string;
      threshold?: string;
    },
    broadcast_device?: {
      device_name?: string;
      device_status?: boolean;
    },
    speaker_status?: boolean,
    barrier_status?: boolean,
    barrier_direction?: string,
    id?: string | number
  ) => L.Icon<L.IconOptions> | L.DivIcon;
  customIcons?: {
    waterlevel: L.DivIcon;
  }
  isContextMenuOpen?: boolean;
  onContextMenuClose?: () => void;
  isDraggingEnabled?: boolean;
  draggedMarkerId?: string | null;
  showDialog?: (config: Partial<DialogState>) => void;
  onMapReady?: (map: L.Map) => void;
}

function BaseMapLayer({
  markers = [],
  onMarkerClick,
  onMapClick,
  onContextMenu,
  onMarkerContextMenu,
  contextMenuContent,
  markerMenuContent,
  onMarkerDragEnd,
  getMarkerIcon,
  children,
  isContextMenuOpen,
  onContextMenuClose,
  isDraggingEnabled = false,
  draggedMarkerId = null,
  showDialog,
  onMapReady,
}: BaseMapLayerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [markerMenu, setMarkerMenu] = useState<MarkerMenuData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(12);
  const [isInitialPositionLoaded, setIsInitialPositionLoaded] = useState(false);


  const { isAdmin } = useCheckOperatorPermission();

  const handleMarkerDragEnd = (e: L.DragEndEvent, marker: MarkerData) => {
    e.target.setLatLng(e.target.getLatLng());

    const newPosition = e.target.getLatLng();
    const newLatLng: [number, number] = [newPosition.lat, newPosition.lng];

    if (onMarkerDragEnd) {
      onMarkerDragEnd(marker.id, newLatLng, marker.type);
    }
  };

  const clearMenuStates = useCallback(() => {
    setContextMenu(null);
    setMarkerMenu(null);
  }, []);

  const clearAllStates = useCallback(() => {
    clearMenuStates();
    onContextMenuClose?.();
  }, [clearMenuStates, onContextMenuClose]);

  useEffect(() => {
    if (!isContextMenuOpen) {
      clearMenuStates();
    }
  }, [isContextMenuOpen, clearMenuStates]);

  // 마을 방송 임시 초기 위치
  const initialLocation = markers.find((marker) => marker.speaker_status === 'ON');
  const path = window.location.pathname;

  const mainServiceName = path.split('/')[1] || 'default';

  useEffect(() => {
    const fetchInitialPosition = async () => {
      try {
        const res = await apiCallInitialMapPosition(mainServiceName);


        if (res?.result) {
          const lat = parseFloat(res?.result?.lat);
          const lng = parseFloat(res?.result?.lng);
          const zoom = parseInt(res?.result?.zoom_level ?? '12');

          if (!isNaN(lat) && !isNaN(lng)) {
            setMapCenter([lat, lng]);
            setZoomLevel(zoom);
          } else {
            console.log('DB 값 없음 - 서울 기본값 사용');
            setMapCenter([37.5665, 126.9780]);
            setZoomLevel(12);
          }
        } else {
          console.log('DB 응답 없음 - 서울 기본값 사용');
          setMapCenter([37.5665, 126.9780]);
          setZoomLevel(12);
        }
      } catch (err) {
        console.error(err);
        setMapCenter([37.5665, 126.9780]);
        setZoomLevel(12);
      } finally {
        setIsInitialPositionLoaded(true);
      }
    };

    fetchInitialPosition();
  }, []);

  const isMarkerDraggable = (marker: MarkerData) => {
    return isDraggingEnabled && marker.id === draggedMarkerId;
  };

  const handleMarkerClick = (marker: MarkerData, e: L.LeafletMouseEvent) => {
    const map = e.target._map;
    const center = marker.position;

    map.setView(center, map.getZoom(), { animate: true });

    const screenCenter = map.getSize();
    const dialogOffset = { x: 120, y: 80 };

    const popupPosition = {
      x: (screenCenter.x / 2) + dialogOffset.x,
      y: (screenCenter.y / 2) + dialogOffset.y
    };

    onMarkerClick(marker, popupPosition);
  };

  function MapEventHandler() {
    useMapEvents({
      click: (e) => {
        onMapClick?.({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
        onContextMenuClose?.();
      },
      contextmenu: (e) => {
        if (mapRef.current) {
          if (isAdmin) {

            const rect = mapRef.current.getBoundingClientRect();
            const menuData = {
              x: e.originalEvent.clientX - rect.left,
              y: e.originalEvent.clientY - rect.top,
              latlng: e.latlng,
            };
            onMapClick?.({
              lat: e.latlng.lat,
              lng: e.latlng.lng
            });
            setContextMenu(menuData);
            setMarkerMenu(null);
            onContextMenu(menuData);
          }

        }
      },
      movestart: clearAllStates,
      zoomstart: clearAllStates
    });
    return null;
  }

  const handleMarkerContextMenu = (e: L.LeafletMouseEvent, marker: MarkerData) => {
    e.originalEvent.preventDefault();
    e.originalEvent.stopPropagation();
    if (mapRef.current && onMarkerContextMenu && isAdmin) {
      const rect = mapRef.current.getBoundingClientRect();
      const menuData: MarkerMenuData = {
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        latlng: e.latlng,
        markerId: marker.id,
        camera_ip: marker.camera_ip
      };
      setMarkerMenu(menuData);
      setContextMenu(null);
      marker.type === "broadcast" ? onMarkerContextMenu(null) : onMarkerContextMenu(menuData);
    }
  };

  const shouldShowContextMenu = isContextMenuOpen && contextMenu && contextMenuContent && isAdmin;
  const shouldShowMarkerMenu = isContextMenuOpen && markerMenu && markerMenuContent && isAdmin;

  // ============================================================
  // 서버 호스트 자동 감지 → 백엔드 정적 타일 서버 URL(4200)
  //      - 외부 PC에서 접속해도 현재 호스트/IP를 따라가도록 구성
  // ============================================================
  const SERVER_PORT = 4200;
  const SERVER_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;

  // ============================================================
  // 일반 / 위성 타일 URL
  //      - 일반: 기존과 동일 구조
  //      - 위성: 동일 경로 규칙 + 캐시버스트(ver) 옵션 대응 가능
  // ============================================================
  const TILE_URL = `${SERVER_BASE_URL}/tiles/{z}/{x}/{y}.png`;           // 일반지도
  const [satVer] = useState<number>(Date.now());                         // (선택) 캐시버스트 seed
  const SATELLITE_TILE_URL = `${SERVER_BASE_URL}/satellite_tiles/{z}/{x}/{y}.png?v=${satVer}`; // 위성지도

  // [기존] 투명 1x1
  const TRANSPARENT_1x1 =
    'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  const KOREA_BOUNDS = L.latLngBounds(
    [33.8, 123.5],
    [39.6, 132.5]
  );

  // ============================================================
  // 지도 모드 전환 상태: 'normal' | 'satellite'
  //  - [PERSIST] 로컬스토리지에 선택 상태 저장/복원 (키: tile_state)
  //  - lazy initializer로 첫 렌더 전에 즉시 복원 → 깜빡임 방지
  // ============================================================
  const TILE_STATE_KEY = 'tile_state'; // [PERSIST] 저장 키
  const [mapMode, setMapMode] = useState<'normal' | 'satellite'>(() => {
    try {
      const saved = localStorage.getItem(TILE_STATE_KEY);
      // 저장값이 'satellite'면 위성, 그 외/없음이면 기본(normal)
      return saved === 'satellite' ? 'satellite' : 'normal';
    } catch {
      return 'normal';
    }
  });

  // [PERSIST] 상태가 바뀔 때마다 로컬스토리지에 즉시 반영
  useEffect(() => {
    try {
      localStorage.setItem(TILE_STATE_KEY, mapMode);
    } catch {
      // 저장 실패는 무시 (사파리 프라이빗 모드 등)
    }
  }, [mapMode]);

  if (!isInitialPositionLoaded || !mapCenter) {
    return (
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '99%',
          position: 'relative',
          marginTop: '2px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#d0e7f9',
          borderRadius: '8px',
        }}
      >
        <div style={{ fontSize: '18px', color: '#666' }}>
          지도를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '99%', position: 'relative', marginTop: '2px' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        maxZoom={18}
        minZoom={9}
        attributionControl={false}
        // 여기서 대한민국 바운드로 이동 제한
        maxBounds={KOREA_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#d0e7f9',
          zIndex: '1',
          borderRadius: '8px',
        }}
      >
        {onMapReady && <MapReadyNotifier onReady={onMapReady} />}
        <InitialPositionButton />

        {/* ----------------------------------------------------
           ❌ [OLD/WMS] 기존 GeoServer WMS 레이어 (보존을 위해 주석)
        ------------------------------------------------------ */}
        {/*
        <WMSTileLayer
          url={`http://${window.location.hostname}:8181/geoserver/gis/wms`}
          maxZoom={25}
          params={{
            service: 'WMS',
            version: '1.1.0',
            request: 'GetMap',
            layers: 'gis:basemap',
            styles: '',
            format: 'image/png8',
            transparent: true,
          }}
        />
        */}

        {/* ----------------------------------------------------
           ✅ 일반지도
        ------------------------------------------------------ */}
        {mapMode === 'normal' && (
          <>
            <TileLayer
              url={TILE_URL}
              tileSize={256}
              minZoom={9}
              maxZoom={18}
              maxNativeZoom={14}
              zIndex={0}
            />
            <TileLayer
              url={TILE_URL}
              tileSize={256}
              minZoom={9}
              maxZoom={18}
              maxNativeZoom={18}
              errorTileUrl={TRANSPARENT_1x1}
              zIndex={1}
            />
          </>
        )}

        {/* ----------------------------------------------------
           🛰️ 위성지도
        ------------------------------------------------------ */}
        {mapMode === 'satellite' && (
          <>
            <TileLayer
              key={`sat-low-${satVer}`}
              url={SATELLITE_TILE_URL}
              tileSize={256}
              minZoom={9}
              maxZoom={18}
              maxNativeZoom={14}
              zIndex={0}
            />
            <TileLayer
              key={`sat-high-${satVer}`}
              url={SATELLITE_TILE_URL}
              tileSize={256}
              minZoom={9}
              maxZoom={18}
              maxNativeZoom={18}
              errorTileUrl={TRANSPARENT_1x1}
              zIndex={1}
            />
          </>
        )}

        <MapEventHandler />

        {/* ✅ Tunnel 마커만 클러스터 그룹으로 렌더링 */}
        <MarkerClusterGroup
          spiderfyOnMaxZoom={false}
          showCoverageOnHover={false}
          disableClusteringAtZoom={17}
          chunkedLoading
          iconCreateFunction={(cluster: { getChildCount(): number }): L.DivIcon => {
            const count = (cluster as any).getChildCount();

            return L.divIcon({
              html: `
                    <div style="position: relative; width: 36px; height: 36px;">
                      <img src="${tunnel_cluster_icon}" style="width: 36px; height: 36px;" />
                      <div style="
                        position: absolute;
                        bottom: -5px;
                        right: -5px;
                        width: 22px;
                        height: 22px;
                        background-color: #4A00DF;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        line-height : 21px;
                        justify-content: center;
                        font-size: 12px;
                        border: 1px solid #7B7B7B;
                      ">${count}</div>
                    </div>
                    `,
              className: 'custom-cluster-icon',
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            });
          }}
        >
          {markers
            .filter((marker) => marker.type === 'tunnel')
            .map((marker) => (
              <Marker
                key={`tunnel-${marker.id}`}
                position={marker.position}
                draggable={isMarkerDraggable(marker)}
                icon={getMarkerIcon(
                  marker.type,
                  !!marker.gateStatus,
                  typeof marker.waterlevel === 'object' && marker.waterlevel !== null
                    ? {
                      curr_water_level: (marker.waterlevel as any).curr_water_level,
                      threshold: (marker.waterlevel as any).threshold,
                    }
                    : undefined,
                  marker.broadcast_device,
                  marker.speaker_status === 'ON',
                  marker.barrier_status,
                  marker.barrier_direction,
                  marker.id
                )}
                eventHandlers={{
                  click: (e) => handleMarkerClick(marker, e),
                  contextmenu: (e) => handleMarkerContextMenu(e, marker),
                  dragend: (e) => handleMarkerDragEnd(e, marker),
                }}
              >
                <Tooltip sticky>
                  <div className="p-2 text-gray-800">
                    <div className="font-bold text-lg text-blue-700 truncate">{marker.name}</div>
                    <div className="text-xs text-gray-600 mt-1">방향: {marker.barrier_direction}</div>
                    <div className="text-xs text-gray-600 mt-1">위치: {marker?.location}</div>
                  </div>
                </Tooltip>
              </Marker>
            ))}
        </MarkerClusterGroup>
        {/* ✅ Tunnel 외 마커는 일반 Marker로 렌더링 */}
        {markers
          .filter((marker) => marker.type !== 'tunnel')
          .map((marker) => (
            <Marker
              key={`${marker.type}-${marker.id}`}
              position={marker.position}
              draggable={isMarkerDraggable(marker)}
              icon={getMarkerIcon(
                marker.type,
                !!marker.gateStatus,
                marker.gateLinkedStatus,
                typeof marker.waterlevel === 'object' && marker.waterlevel !== null
                  ? {
                    curr_water_level: (marker.waterlevel as any).curr_water_level,
                    threshold: (marker.waterlevel as any).threshold,
                  }
                  : undefined,
                marker.broadcast_device,
                marker.speaker_status === 'ON',
                marker.barrier_status,
                marker.barrier_direction,
                marker.id
              )}
              eventHandlers={{
                click: (e) => handleMarkerClick(marker, e),
                contextmenu: (e) => handleMarkerContextMenu(e, marker),
                dragend: (e) => handleMarkerDragEnd(e, marker),
              }}
            >
              {marker.name &&
                marker.type !== 'broadcast' &&
                marker.type !== 'broadcast_devices' && (
                  <Tooltip sticky>
                    <div className={marker.gateStatus && marker.gateLinkedStatus ? 'bg-blue-200' : !marker.gateStatus && marker.gateLinkedStatus ? 'bg-red-200' : 'bg-gray-400'}>
                      <div className="text-xl">{marker.name}</div>
                      <div className="text-xl">
                        {marker.type === 'area'
                          ?
                          `차단기 상태: ${marker.gateStatus === true
                            ? '열림'
                            : marker.gateLinkedStatus && !marker.gateStatus
                              ? '닫힘'
                              : !marker.gateLinkedStatus
                                ? '연결끊김'
                                : '알수없음'
                          }`
                          : '수위계 현재 상태'}
                      </div>
                    </div>
                  </Tooltip>
                )}

              {marker.type === 'broadcast' && (
                <Tooltip sticky>
                  <div className="flex flex-col justify-center gap-2 p-2 bg-white rounded-md">
                    <div className="font-semibold text-lg">
                      {marker.name} <span className="text-sm">{marker.speaker_name}</span>
                    </div>
                    <div className="text-sm text-gray-600">{marker.address}</div>
                    <div
                      className={`text-sm ${marker.speaker_status === 'OFF' ? 'text-red-500' : 'text-green-500'
                        }`}
                    >
                      {marker.speaker_status === 'OFF' ? '연결 끊김' : '연결됨'}
                    </div>
                  </div>
                </Tooltip>
              )}
            </Marker>
          ))}
        {children}

        {/* ✅ 시군구 경계선 */}
        <BoundaryLayerSigungu
          url="/geojson/sigungu.json"
          initialSido="ALL"                 // 기본: 전체 시도 보이기 (원하면 "경기도" 등으로)
        // restrictSidoList={['서울특별시','경기도']} // 드롭다운 시도 목록을 제한하고 싶으면 사용
        />
      </MapContainer>

      {/* ======================================================
         지도 모드 전환 버튼(일반/위성)
      ======================================================= */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 60,
          zIndex: 1,
          display: 'flex',
          gap: '6px'
        }}
      >
        {/* 일반지도 버튼 */}
        <button
          className={`w-[104px] h-[34px] rounded-sm border border-[#A9A9A9] flex items-center justify-center gap-1 
    ${mapMode === 'normal'
              ? 'bg-[#647DB7] text-[#EBECEF] border-none'
              : 'bg-white text-black dark:bg-[#707885] dark:text-[#EBECEF]'
            }`}
          onClick={() => setMapMode('normal')}
        >
          <img
            className="w-[15px] h-[15px]"
            src={
              // ✅ 다크모드일 땐 무조건 white 아이콘
              document.documentElement.classList.contains('dark')
                ? basic_map_icon_white
                : (mapMode === 'normal' ? basic_map_icon_white : basic_map_icon_black)
            }
          />
          <span>일반지도</span>
        </button>

        {/* 위성지도 버튼 */}
        <button
          className={`w-[104px] h-[34px] rounded-sm border border-[#A9A9A9] flex items-center justify-center gap-1 
    ${mapMode === 'satellite'
              ? 'bg-[#647DB7] text-[#EBECEF] border-none'
              : 'bg-white text-black dark:bg-[#707885] dark:text-[#EBECEF]'
            }`}
          onClick={() => setMapMode('satellite')}
        >
          <img
            className="w-[22px] h-[22px]"
            src={
              document.documentElement.classList.contains('dark')
                ? satellite_map_icon_white
                : (mapMode === 'satellite' ? satellite_map_icon_white : satellite_map_icon_black)
            }
          />
          <span>위성지도</span>
        </button>
      </div>

      {contextMenu && shouldShowContextMenu && (
        <div
          style={{
            position: 'absolute',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            background: 'white',
            boxShadow: '0px 0px 5px rgba(0,0,0,0.5)',
            borderRadius: '5px',
            padding: '10px',
            zIndex: 15,
          }}
        >
          {contextMenuContent}
        </div>
      )}

      {markerMenu && shouldShowMarkerMenu && (
        <div
          style={{
            position: 'absolute',
            top: `${markerMenu.y}px`,
            left: `${markerMenu.x}px`,
            background: 'white',
            boxShadow: '0px 0px 5px rgba(0,0,0,0.5)',
            borderRadius: '5px',
            padding: '10px',
            zIndex: 1500,
          }}
        >
          {markerMenuContent}
        </div>
      )}
    </div>
  );
}

export default BaseMapLayer;

const InitialPositionButton = () => {
  const map = useMap();
  const [openDialog, setOpenDialog] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const controlId = 'leaflet-initial-position-button';
    if (document.querySelector(`.${controlId}`)) return;

    const CustomControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        const container = L.DomUtil.create('div', `leaflet-bar leaflet-control ${controlId}`);
        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = '초기 위치 설정';

        const iconMarkup = ReactDOMServer.renderToStaticMarkup(<FaBookmark />);
        button.innerHTML = iconMarkup;

        Object.assign(button.style, {
          width: '30px',
          height: '30px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        });

        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.width = '22px';
          svg.style.height = '22px';
          svg.style.fill = 'green';
        }

        L.DomEvent.on(button, 'click', L.DomEvent.stopPropagation)
          .on(button, 'click', L.DomEvent.preventDefault)
          .on(button, 'click', () => {
            setOpenDialog(true);
          });

        return container;
      }
    });

    const control = new CustomControl();
    map.addControl(control);
  }, [map]);

  useEffect(() => {
    if (!mapReady) return;

    const onClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const zoom = map.getZoom();
      const mainServiceName = window.location.pathname.split('/')[1] || 'default';

      try {
        await apiSetInitialMapPosition(mainServiceName, lat, lng, zoom);
        alert('초기 위치 저장 완료');
      } catch (err) {
        console.error(err);
        alert('초기 위치 저장 실패');
      }

      map.off('click', onClick);
      setMapReady(false);
    };

    map.once('click', onClick);
  }, [map, mapReady]);

  return (
    <ConfirmDialog
      isOpen={openDialog}
      type="info"
      title="초기 위치 설정"
      onCancel={() => setOpenDialog(false)}
      onConfirm={() => {
        setOpenDialog(false);
        setMapReady(true);
      }}
      confirmText="설정"
      cancelText="취소"
    >
      지도를 클릭해 초기 위치를 설정하세요.
    </ConfirmDialog>
  );
};
