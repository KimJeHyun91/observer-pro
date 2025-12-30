import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-minimap';
import 'leaflet-minimap/dist/Control.MiniMap.min.css';

interface MinimapProps {
  position?: 'bottomleft' | 'bottomright' | 'topleft' | 'topright';
  width?: number;
  height?: number;
  zoomLevelOffset?: number;
}

// BaseMapLayer와 동일 키로 지도 모드 상태 공유
const TILE_STATE_KEY = 'tile_state'

// 정적 타일 서버 포트
const SERVER_PORT = 4200


const NavigationMinimap = ({
  position = 'topright',
  width = 250,
  height = 200,
  zoomLevelOffset = -3
}: MinimapProps) => {
  const map = useMap();


  // minimap 인스턴스/현재 모드/폴링 타이머를 ref로 유지
  const minimapRef = useRef<any>(null)
  const currentModeRef = useRef<'normal' | 'satellite'>('normal')
  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!map) return;

    // const tileLayer = L.tileLayer(`http://${window.location.hostname}:4200/tiles/{z}/{x}/{y}.png`, {
    //   minZoom: 10,  
    //   maxZoom: 14,  
    //   bounds: [ 
    //     [32.332395598002627, 118.54775640691085],
    //     [38.683825468829404, 138.09946041391888]
    //   ],
    //   errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    // });

    // const minimap = new L.Control.MiniMap(tileLayer, {
    //   position: position,
    //   width: width,
    //   height: height,
    //   zoomLevelOffset: zoomLevelOffset,
    //   toggleDisplay: false,
    //   minimized: false,
    //   centerFixed: false,
    //   zoomAnimation: true,
    //   autoToggleDisplay: false, 
    //   aimingRectOptions: {
    //     color: "#ff0000",
    //     weight: 1,
    //     fillOpacity: 0.1,
    //     smoothFactor: 1
    //   },
    //   shadowRectOptions: {
    //     color: "#000000",
    //     weight: 1,
    //     fillOpacity: 0,
    //     fillColor: "#000000",
    //     smoothFactor: 1
    //   }
    // });

    // geoserver


    /* ------------------------------------------------------------
    구 지도 

    const wmsTileLayer = L.tileLayer.wms(`http://${window.location.hostname}:8181/geoserver/gis/wms`, {
      layers: 'gis:basemap',
      format: 'image/png8',
      transparent: true,
      version: '1.1.0',
      minZoom: 10,
      maxZoom: 14
    });
    

    // // geoserver
    const minimap = new L.Control.MiniMap(wmsTileLayer, {
      position: position,
      width: width,
      height: height,
      zoomLevelOffset: zoomLevelOffset,
      toggleDisplay: false,
      minimized: false,
      centerFixed: false,
      zoomAnimation: false,
      autoToggleDisplay: false,
      aimingRectOptions: {
        color: "#ff0000",
        weight: 1,
        fillOpacity: 0.1,
        smoothFactor: 1
      },
      shadowRectOptions: {
        color: "#000000",
        weight: 1,
        fillOpacity: 0,
        fillColor: "#000000",
        smoothFactor: 1
      }
    });
  ------------------------------------------------------------- */

    // start
    const SERVER_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`
    const NORMAL_TILE_URL = `${SERVER_BASE_URL}/tiles/{z}/{x}/{y}.png`
    const satVer = Date.now()
    const SATELLITE_TILE_URL = `${SERVER_BASE_URL}/satellite_tiles/{z}/{x}/{y}.png?v=${satVer}`
    const TRANSPARENT_1x1 =
      'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

    // 일반 지도(저해상도 + 고해상도)
    const normalLow = L.tileLayer(NORMAL_TILE_URL, { minZoom: 9, maxZoom: 18, maxNativeZoom: 14 })
    const normalHi = L.tileLayer(NORMAL_TILE_URL, { minZoom: 9, maxZoom: 18, maxNativeZoom: 18, errorTileUrl: TRANSPARENT_1x1 })
    const normalGroup = L.layerGroup([normalLow, normalHi])

    // 위성 지도(저해상도 + 고해상도)
    const satLow = L.tileLayer(SATELLITE_TILE_URL, { minZoom: 9, maxZoom: 18, maxNativeZoom: 14 })
    const satHi = L.tileLayer(SATELLITE_TILE_URL, { minZoom: 9, maxZoom: 18, maxNativeZoom: 18, errorTileUrl: TRANSPARENT_1x1 })
    const satelliteGroup = L.layerGroup([satLow, satHi])


    const getSavedMode = (): 'normal' | 'satellite' => {
      try {
        const saved = localStorage.getItem(TILE_STATE_KEY)
        return saved === 'satellite' ? 'satellite' : 'normal'
      } catch {
        return 'normal'
      }
    }
    currentModeRef.current = getSavedMode()


    const initialLayer = currentModeRef.current === 'satellite' ? satelliteGroup : normalGroup
    const minimap = new (L as any).Control.MiniMap(initialLayer, {
      position,
      width,
      height,
      zoomLevelOffset,
      toggleDisplay: false,
      minimized: false,
      centerFixed: false,
      zoomAnimation: false, // 기존 유지 (버그 회피용)
      autoToggleDisplay: false,
      aimingRectOptions: { color: '#ff0000', weight: 1, fillOpacity: 0.1, smoothFactor: 1 },
      shadowRectOptions: { color: '#000000', weight: 1, fillOpacity: 0, fillColor: '#000000', smoothFactor: 1 },
    })
    minimap.addTo(map)
    minimapRef.current = minimap

    const applyModeToMiniMap = (mode: 'normal' | 'satellite') => {
      if (!minimapRef.current) return
      const target = mode === 'satellite' ? satelliteGroup : normalGroup
      minimapRef.current.changeLayer(target)
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== TILE_STATE_KEY) return
      const next = e.newValue === 'satellite' ? 'satellite' : 'normal'
      if (next !== currentModeRef.current) {
        currentModeRef.current = next
        applyModeToMiniMap(next)
      }
    }
    window.addEventListener('storage', onStorage)

    const startPolling = () => {
      stopPolling()
      pollTimerRef.current = window.setInterval(() => {
        const saved = getSavedMode()
        if (saved !== currentModeRef.current) {
          currentModeRef.current = saved
          applyModeToMiniMap(saved)
        }
      }, 300) as unknown as number
    }
    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
    startPolling()

    // end

    const handleZoomEnd = () => { // NEW
      const mainZoom = map.getZoom()
      const mmZoom = mainZoom + zoomLevelOffset
      if (minimap && (minimap as any)._miniMap) {
        const adjusted = Math.min(Math.max(mmZoom, 10), 14)
        if (mmZoom !== adjusted) {
          ; (minimap as any)._miniMap.setZoom(adjusted)
        }
      }
    }

    // 버그로 인해 임시 삭제
    // map.on('zoomend', handleZoomEnd);
    minimap.addTo(map);

    handleZoomEnd();

    return () => {
      window.removeEventListener('storage', onStorage)
      stopPolling()
      if (minimapRef.current) {
        map.removeControl(minimapRef.current)
        minimapRef.current = null
      }
      normalGroup.clearLayers()
      satelliteGroup.clearLayers()
    };
  }, [map, position, width, height, zoomLevelOffset]);

  return null;
};

export default NavigationMinimap;