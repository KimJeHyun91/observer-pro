import React, { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import { createTunnelIcon } from '@/views/tunnel/tunnelMap/TunnelMap';

interface MiniMapProps {
  position: [number, number];
  markerType?: string;
  gateStatus?: boolean;
  gateLinkedStatus?: boolean;
  direction?: string;        // 상행/하행
  barrierStatus?: boolean;   // 차단막 상태
}

const MiniMap = ({
  position,
  markerType,
  gateStatus,
  gateLinkedStatus = true,
  direction = '상행',
  barrierStatus = false,
}: MiniMapProps) => {
  const mapRef = useRef<any>(null);
  const defaultPosition: [number, number] = [37.6162074367235, 126.836542115685];

  // ✅ 서버 자동 감지 (4200포트 기준)
  const SERVER_PORT = 4200;
  const SERVER_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  const TILE_URL = `${SERVER_BASE_URL}/tiles/{z}/{x}/{y}.png`;

  // 차단기 / 수위계 아이콘 설정
  const createGateIcon = (status: boolean | undefined, linkedStatus: boolean) =>
    L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          position: relative;
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 45px solid ${
            linkedStatus
              ? status === true
                ? '#2563eb'
                : status === false
                ? '#dc2626'
                : '#0e1163'
              : '#6b7280'
          };
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        ">
          <div style="
            position: absolute;
            top: -40px;
            left: -7px;
            width: 14px;
            text-align: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          ">${linkedStatus ? (status === true ? 'O' : status === false ? 'C' : '?') : 'D'}</div>
        </div>
      `,
      iconSize: [30, 45],
      iconAnchor: [15, 45],
      popupAnchor: [0, -45],
    });

  const waterlevelIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: #3B82F6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [6, 6],
  });

  // 아이콘 선택 로직
  const getMarkerIcon = () => {
    if (markerType === 'waterlevel') return waterlevelIcon;
    if (markerType === 'tunnel') return createTunnelIcon(direction, !!barrierStatus);
    return createGateIcon(gateStatus, gateLinkedStatus);
  };

  // 좌표 유효성 검사
  const isValidPosition =
    position &&
    Array.isArray(position) &&
    position.length === 2 &&
    !isNaN(position[0]) &&
    !isNaN(position[1]) &&
    Math.abs(position[0]) <= 90 &&
    Math.abs(position[1]) <= 180;

  const effectivePosition = isValidPosition ? position : defaultPosition;

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView(effectivePosition, 15);
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      if (map.tap) map.tap.disable();
    }
  }, [effectivePosition]);

  return (
    <MapContainer
      center={effectivePosition}
      zoom={14}
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ height: '100%', zIndex: 0 }}
      attributionControl={false}
    >
      <ForceMapResize />

      {/* ✅ 일반지도 타일만 표시 */}
      <TileLayer
        url={TILE_URL}
        tileSize={256}
        minZoom={9}
        maxZoom={18}
        maxNativeZoom={18}
        zIndex={0}
      />

      <Marker position={effectivePosition} icon={getMarkerIcon()} />
    </MapContainer>
  );
};

export default MiniMap;

// ✅ 맵 사이즈 보정 (뷰 토글 시 재렌더링 대응)
const ForceMapResize = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
      map.setZoom(15);
    }, 100);
  }, [map]);
  return null;
};
