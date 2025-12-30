import React, { memo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, WMSTileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import { createTunnelIcon } from '@/views/tunnel/tunnelMap/TunnelMap';
import { SelectedObject } from '@/@types/tunnel';
import disconnectedIcon from '@/assets/styles/images/disconnect-gate.png';
import openGateIcon from '@/assets/styles/images/open-gate.png';
import closeGateIcon from '@/assets/styles/images/close-gate.png';

interface MiniMapProps {
    key?: number;
    position: [number, number];
    markerType?: string;
    gateStatus?: boolean;
    gateLinkedStatus?: boolean;
}

const MiniMap = memo(({ key, position, markerType, gateStatus, gateLinkedStatus = true }: MiniMapProps) => {
    const mapRef = React.useRef<any>(null);
    const defaultPosition: [number, number] = [37.6162074367235, 126.836542115685];

    const createGateIcon = (gateStatus, gateLinkedStatus) => {
        let iconUrl;

        if (!gateLinkedStatus) {
            iconUrl = disconnectedIcon;
        } else if (gateStatus) {
            iconUrl = openGateIcon;
        } else {
            iconUrl = closeGateIcon;
        }

        return L.icon({
            iconUrl: iconUrl,
            iconSize: [34, 45],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
        });
    };

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

    const getMarkerIcon = (
        type: string | undefined,
        gateStatus: boolean | undefined,
        gateLinkedStatus: boolean
    ) => {
        if (type === 'waterlevel') return waterlevelIcon;
        if (type === 'tunnel') return createTunnelIcon('gray');
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

    // ajy add 브이월드 타일 지도 불러오기에 필요한 변수 추가
    const SERVER_PORT = 4200;
    const SERVER_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
    const TILE_URL = `${SERVER_BASE_URL}/tiles/{z}/{x}/{y}.png`;     // 👉 로컬 타일 기본 경로
    const TRANSPARENT_1x1 = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    const KOREA_BOUNDS = L.latLngBounds(
        [33.8, 123.5], // 남서(SW) — 제주 남서쪽 바다까지 약간 여유
        [39.6, 132.5]  // 북동(NE) — 동해 북동쪽 바다까지 약간 여유
    );

    return (
        <MapContainer
            center={effectivePosition}
            zoom={14}
            ref={mapRef}
            className="w-full h-full rounded-lg"
            // ajy add 대한민국 바운드로 이동 제한
            maxBounds={KOREA_BOUNDS}
            maxBoundsViscosity={1.0}  // 0~1 (1이면 경계 밖으로 드래그가 거의 불가)
            worldCopyJump={false}     // 세계 반대편으로 “점프” 방지
            attributionControl={false}
            style={{ height: "100%", zIndex: 0 }}
        >
            <ForceMapResize />
            {/* ajy del 임시삭제 => 기존 지도 불러오기*/}
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

            {/* ajy add 타일 방식 지도 불러오기*/}
            <TileLayer
                // ⬇️ 전국 타일 (8~14가 실제, 15~18은 업샘플링)
                url={TILE_URL}
                tileSize={256}
                minZoom={9}
                maxZoom={18}
                maxNativeZoom={14}
                zIndex={0}
            />
            <TileLayer
                // ⬇️ 고해상도 타일 (예: 서울 14~18만 제공)
                url={TILE_URL}
                tileSize={256}
                minZoom={9}
                maxZoom={18}
                maxNativeZoom={18}
                // 상단 레이어에서 타일이 없을 때 투명 타일로 대체해
                // 하단 레이어가 비치도록 처리
                errorTileUrl={TRANSPARENT_1x1}
                zIndex={1}
            />

            <Marker
                position={effectivePosition}
                icon={getMarkerIcon(markerType, gateStatus, gateLinkedStatus)}
            />
        </MapContainer>
    );
});

export default MiniMap;

const ForceMapResize = () => {
    const map = useMap();

    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
            // map.setZoom(map.getZoom()); 
            map.setZoom(15)
        }, 100);
    }, [map]);

    return null;
};

