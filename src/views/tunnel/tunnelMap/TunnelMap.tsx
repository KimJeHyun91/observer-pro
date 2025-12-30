import BaseMapLayer, {
  ContextMenuData,
  MarkerData,
  MarkerMenuData,
} from '@/components/map/BaseMapLayer'
import Loading from '@/components/shared/Loading'
import { useAreaStore } from '@/store/Inundation/useAreaStore'
import { customIcons } from '@/views/inundation/MapLayer/InundationMapLayer'
import { Map as LeafletMap } from 'leaflet';
import { HiOutlineSpeakerWave } from 'react-icons/hi2'
import ContextMenu from '@/views/main/modals/ContextMenu'
import React, { Suspense, useEffect, useRef, useState } from 'react'

import { Dialog, Select } from '@/components/ui'
import { apiDeleteArea, apiGetAreaInfo } from '@/services/BroadcastService'
import { useBroadcastArea, useBroadcastSpeakerList } from '@/utils/hooks/useBroadcast'
import ReactDOMServer from 'react-dom/server'
import L from 'leaflet'
import { IoLocation } from "react-icons/io5";
import { FaArrowDown, FaArrowUp, FaCarTunnel } from "react-icons/fa6";
import { useMinimapStore } from '@/store/minimapStore'
import NavigationMinimap from '@/components/map/MinimapBounds'
import _ from 'lodash'
import AddTunnel from '../modals/AddTunnel'
import { TunnelOutsideForm, TunnelOutsideResponse, SortedTunnel } from '@/@types/tunnel'
import { apiAddOutside, apiDeleteOutside, apiModifyOutside } from '@/services/TunnelService'
import { useTunnelOutside } from '@/utils/hooks/useTunnelArea'
import TunnelDetail from '../tunnelDetail/tunnelDetail'
import { SelectedObject } from '@/@types/tunnel'
import DeleteConfirm from '../modals/DeleteConfirm'
import ModifyTunnel from '../modals/ModifyTunnel'
import { HiMenu } from 'react-icons/hi'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { useMoveMapStore } from '@/store/tunnel/useMoveMapStore'
// 이미지
import point from '@/assets/styles/images/map/point.png'
import point_hover from '@/assets/styles/images/map/point_hover.png'
import tunnel_up_connect from '@/assets/styles/images/map/tunnel_up_connect.png'
import tunnel_down_connect from '@/assets/styles/images/map/tunnel_down_connect.png'
import tunnel_up_disconnect from '@/assets/styles/images/map/tunnel_up_disconnect.png'
import tunnel_down_disconnect from '@/assets/styles/images/map/tunnel_down_disconnect.png'
import up_arrow from '@/assets/styles/images/map/up_arrow.png'
import down_arrow from '@/assets/styles/images/map/down_arrow.png'

interface TunnelMapProps {
  // onMapClick: (coordinates: { lat: number; lng: number }) => void;
  onObjectSelect: (data: SelectedObject) => void;
}

/** 이름 말줄임 유틸 (이모지/한글 안전: 코드포인트 기준) */
function truncateWithEllipsis(input: string | undefined | null, max = 13) {
  const s = (input ?? '').toString();
  if (!s) return { display: '', full: '' };
  const chars = [...s];
  const display = chars.length > max ? chars.slice(0, max).join('') + '...' : s;
  return { display, full: s };
}

export const createTunnelIcon = (
  direction: string,
  isConnected: boolean,
  isSelected?: boolean
): L.DivIcon => {
  let imageSrc = tunnel_up_disconnect;

  if (direction === '상행' && isConnected) imageSrc = tunnel_up_connect;
  else if (direction === '상행' && !isConnected) imageSrc = tunnel_up_disconnect;
  else if (direction === '하행' && isConnected) imageSrc = tunnel_down_connect;
  else if (direction === '하행' && !isConnected) imageSrc = tunnel_down_disconnect;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: ${isSelected ? 'rgba(59,130,246,0.1)' : 'transparent'};
        box-shadow: ${isSelected ? '0 0 10px 3px rgba(59,130,246,0.8)' : 'none'};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${imageSrc}" style="width: 100%; height: 100%;" />
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [22, 25],
  });
};

const TunnelMap = ({ onObjectSelect }: TunnelMapProps) => {
  const [markers, setMarkers] = useState<MarkerData[]>([])
  const [outsideMarkers, setOutsideMarkers] = useState<MarkerData[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null)
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [sortedTunnels, setSortedTunnels] = useState<SortedTunnel[]>([]);

  const [tunnelDeviceMenuOpen, setTunnelDeviceMenuOpen] = useState<boolean>(false)
  const [areaInformation, setAreaInformation] = useState({
    areaName: '',
    areaLocation: '',
    areaSpeaker: '',
    leftLocation: '',
    topLocation: '',
    serviceType: 'tunnel',
  })

  const [deviceDeleteMenuOpen, setDeviceDeleteMenuOpen] = useState(false)
  const [modifyMenuOpen, setModifyMenuOpen] = useState(false)
  const [deviceId, setDeviceId] = useState<number | null>(null)

  const { outsideList, mutate } = useTunnelOutside()
  const minimapState = useMinimapStore((state) => state.use);

  const { socketService } = useSocketConnection();

  const { lat: moveLat, lng: moveLng, zoom: moveZoom, resetCenter } = useMoveMapStore()

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'blue' | 'red' | undefined>('red')

  useEffect(() => {
    // 값이 들어오면 flyTo
    if (mapRef.current && moveLat != null && moveLng != null) {
      // 줌 범위 안전하게 클램프 (리플릿 기본적으로 0~25 정도)
      const z = Math.max(1, Math.min(25, moveZoom ?? 18))

      mapRef.current.flyTo([moveLat, moveLng], z, { animate: true, duration: 0.8 })

      // 한 번 이동하고 값 초기화하고 싶으면 주석 해제
      resetCenter()
    }
  }, [moveLat, moveLng, moveZoom, resetCenter])


  /**
   * [마커 세팅] outsideList → MarkerData 배열로 변환
   * - 지도에 찍을 마커 속성(name, position 등) 구성
   * - 좌표가 있는 항목만 필터링
   */
  useEffect(() => {
    if (Array.isArray(outsideList?.result)) {
      const newMarkers: MarkerData[] = outsideList.result
        .filter(area => area.left_location && area.top_location)
        .map(item => ({
          ...item,
          id: item.idx.toString(),
          position: [
            parseFloat(item.top_location!),
            parseFloat(item.left_location!),
          ],
          name: item.outside_name,
          address: item.location ?? undefined,
          type: 'tunnel',
          gateStatus: false,
          barrier_status: item.barrier_status,
          barrier_direction: item.direction,
          speaker_name: '',
          broadcast_device: {},
          billboard_idx_list_lcs: item.billboard_idx_list_lcs,
          billboard_idx_list_vms: item.billboard_idx_list_vms,
          guardianLightIp: item.guardianlite_ip
        }));

      setMarkers(newMarkers);
    } else {
      setMarkers([]);
    }
  }, [outsideList]);


  /**
   * [정렬 패널] 수위 기준으로 터널 정렬 데이터 생성
   * - outside_name에서 (상행|하행) 제거한 공통명 도출
   * - waterLevel 내림차순 정렬
   */
  useEffect(() => {
    if (!outsideList?.result) return;

    const tunnels = (outsideList.result as TunnelOutsideResponse[])
      .map((item) => {
        const baseName = item.outside_name.replace(/(상행|하행)/g, '').trim();
        return {
          id: Number(item.idx),
          name: baseName,
          direction: item.direction,
          waterLevel: (item as any)?.waterlevel,
          barrierStatus: (item as any).barrier_status_text,
        };
      })
      .sort((a, b) => (b.waterLevel ?? 0) - (a.waterLevel ?? 0));

    setSortedTunnels(tunnels);
  }, [outsideList]);


  /**
 * [소켓 연동]
 * - 수위 업데이트: 리스트 리프레시(mutate)
 * - 이벤트 팝업: onObjectSelect로 상위에 선택정보 전달
 * - 언마운트 시 구독 해제
 */
  useEffect(() => {
    if (!socketService) {
      return;
    }
    const waterLevelSocket = socketService.subscribe('tm_waterLevel-update', (received) => {
      if (received) {
        mutate();
      }
    })
    const tunnelEventSocket = socketService.subscribe('tm_event-update', (received) => {
      if (received && received.use_popup) {
        const selected = {
          idx: received.outside_idx?.toString() ?? '',
          id: received.outside_idx?.toString() ?? '',
          name: received.outside_name ?? '',
          location: received.outside_location ?? '',
          type: 'tunnel',
          position: [parseFloat(received.lat), parseFloat(received.lng)] as [number, number],
          isSocket: true,
          event_device_type: received.device_type,
          barrier_ip: received.outside_ip
        }
        onObjectSelect?.(selected)
      }
    })
    return () => {
      waterLevelSocket();
      tunnelEventSocket();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])


  /**
 * 아이콘 선택 로직
 * - type이 'tunnel'인 경우 방향/연결상태/선택여부로 createTunnelIcon
 */
  const getMarkerIcon = (
    type: string,
    gateStatus: boolean,
    waterlevel?: { curr_water_level?: string; threshold?: string },
    broadcast_device?: { device_name?: string; device_status?: boolean },
    speaker_status?: boolean,
    barrier_status?: boolean,
    barrier_direction?: string,
    id?: string | number
  ): L.DivIcon => {
    const isSelected = deviceId === Number(id);

    if (type === 'tunnel') {
      return createTunnelIcon(barrier_direction ?? '상행', !!barrier_status, isSelected);
    }

    // fallback
    return createTunnelIcon('상행', false, isSelected);
  };


  /**
 * 마커 클릭 시 상위로 선택 객체 전달 (지도 좌표/정보 포함)
 */
  const handleMarkerClick = async (marker: MarkerData) => {
    onObjectSelect?.({
      ...marker,
      id: marker.id,
      name: marker.name,
      location: marker.address ?? '',
      position: marker.position as [number, number],
      type: 'tunnel',
    } as SelectedObject);
  }


  /**
 * 지도 클릭 시 컨텍스트 메뉴 닫고 현재 좌표를 areaInformation에 저장
 * - 향후 터널 개소 추가 시 기본 좌표로 활용
 */
  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    setContextMenuOpen(false)
    setAreaInformation(prev => ({
      ...prev,
      leftLocation: String(coordinates.lng),
      topLocation: String(coordinates.lat),
    }))
  }


  /**
 * 마커 컨텍스트 메뉴 오픈/선택 처리
 */
  const handleMarkerContextMenu = (data: MarkerMenuData) => {
    if (!data) {
      setContextMenuOpen(false)
      return
    }

    const mid = data.markerId
      ? Number(data.markerId)    // "123" -> 123
      : null;                    // null 유지
    setDeviceId(Number.isFinite(mid as number) ? (mid as number) : null)
    setContextMenuOpen(true)
  }

  // 현재 선택된 터널 (수정/삭제 모달에 기본값 제공)
  const selectedTunnel = markers?.find((marker) => marker.id === String(deviceId))

  // 지도 빈 공간 컨텍스트 메뉴 내용 (터널 개소 추가)
  const contextMenuContent = (
    <div
      onClick={() => {
        setTunnelDeviceMenuOpen(true)
        setContextMenuOpen(false)
      }}
      className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
    >
      터널 개소 추가
    </div>
  )

  // 마커 컨텍스트 메뉴 내용 (수정/삭제)
  const markerMenuContent = (
    <>
      <div
        className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold'
        onClick={async () => {
          setModifyMenuOpen(true)
          setContextMenuOpen(false)
        }}
      >
        터널 개소 수정
      </div>
      <div
        className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold'
        onClick={async () => {
          setDeviceDeleteMenuOpen(true)
          setContextMenuOpen(false)
        }}
      >
        터널 개소 삭제
      </div>
    </>
  )

  /**
 * [삭제] 선택된 deviceId의 터널 개소 삭제 후 목록 갱신
 */
  const handleDeleteDevice = async () => {
    if (!deviceId) return
    await apiDeleteOutside({ idx: Number(deviceId) })
    mutate()
    setDeviceDeleteMenuOpen(false)
  }


  /**
 * [추가 확인] AddTunnel 모달에서 전달된 값으로 터널 개소 추가
 * - 성공 시: 모달 닫고 전체 제어반 상태 요청, 목록 갱신
 * - 실패 시: message alert
 */
  const onConfirm = async (device: TunnelOutsideForm) => {
    try {
      const res = await apiAddOutside({
        outsideName: device.name,
        outsideLocation: device.location,
        barrierIp: device.barrierIp,
        leftLocation: areaInformation.leftLocation,
        topLocation: areaInformation.topLocation,
        direction: device.direction,
        billboardLCSIds: device.billboardLCSIds,
        billboardVMSIds: device.billboardVMSIds,
        guardianLightIp: device.guardianLightIp
      })

      if (res.message === "ok") {
        setTunnelDeviceMenuOpen(false)
        socketService.onRequest('requestAllBarrierStatuses', undefined);
      } else {
        alert(res.message)
      }
      mutate()
    } catch { }
  }

  /**
 * [수정 확인] ModifyTunnel 모달에서 전달된 값으로 개소 정보 수정
 * - IP 중복 시 경고 다이얼로그 표시
 * - 성공/실패와 무관하게 목록 갱신 시도
 */
  const onConfirmModify = async (device: { idx: number; name: string; location: string; barrierIp: string; direction: string; billboardLCSIds: string[]; billboardVMSIds: string[]; guardianLightIp: string }) => {
    try {
      const res = await apiModifyOutside({
        idx: device.idx,
        outsideName: device.name,
        location: device.location,
        barrierIp: device.barrierIp,
        direction: device.direction,
        billboardLCSIds: device.billboardLCSIds,
        billboardVMSIds: device.billboardVMSIds,
        guardianLightIp: device.guardianLightIp
      })

      if (res.message === "ok") {
        setModifyMenuOpen(false)
      } else {
        setMessage(`제어반 IP가 중복됐습니다.\nIP를 확인해주세요`);
        setStatus('red');
        setIsAlertOpen(true);
      }
      mutate()
    } catch { }
  }

  const toStringArray = (v: unknown): string[] | undefined => {
    if (Array.isArray(v)) return v.map(x => String(x));
    if (typeof v === 'string' && v.trim() !== '') {
      return v.split(',').map(s => s.trim());
    }
    return undefined;
  };

  // 상태 요약 패널 표시 여부
  const [showStatusPanel, setShowStatusPanel] = useState(true);

  // 리플릿 맵 인스턴스 ref (센터 이동 등 제어용)
  const mapRef = useRef<L.Map | null>(null);

  return (
    <>
      {/* 경고 다이얼로그 */}
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
        status={status}
      />
      <div className="relative w-full h-full">
        {/* 베이스 지도 레이어. 각종 콜백/아이콘/컨텍스트 메뉴 전달 */}
        <BaseMapLayer
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          markers={[...markers]}
          customIcons={customIcons}
          getMarkerIcon={getMarkerIcon}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          onContextMenu={(data) => {
            setContextMenu(data)
            setContextMenuOpen(true)
            setAreaInformation(prev => ({
              ...prev,
              leftLocation: String(data.latlng.lng),
              topLocation: String(data.latlng.lat),
            }))
          }}
          onMarkerContextMenu={handleMarkerContextMenu}
          isContextMenuOpen={contextMenuOpen}
          contextMenuContent={contextMenuOpen ? contextMenuContent : null}
          markerMenuContent={contextMenuOpen ? markerMenuContent : null}
        >
          {minimapState && <NavigationMinimap
            position="topright"
            zoomLevelOffset={-3}
            width={250}
            height={200}
          />}

        </BaseMapLayer>

        {/* 우측 상태 요약 패널 */}
        {showStatusPanel && (
          <div className="absolute bottom-6 right-2 h-[65%] w-[363px] bg-white/80 dark:bg-[#1f2937]/80 border rounded shadow p-3 z-[10] backdrop-blur-xs">
            <div className="h-[30px] flex justify-between items-center mb-3 border-b-[3px] border-[#616A79]">
              <h4 className="font-bold text-base text-gray-900 dark:text-gray-100 ">상태 요약</h4>
              <button
                onClick={() => {
                  setShowStatusPanel(false);
                  setDeviceId(null);
                }}
                className="text-gray-500 text-[25px] hover:text-red-500 text-sm"
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-end mb-2">
              <div className="w-[165px] bg-[#EAEBED] border border-[#D2D7E0] rounded-md flex items-center gap-2 px-2 h-[28px] opacity-80">
                <span className="text-[12px] font-medium text-[#616A79]">등록된 제어반 수위계</span>
                <span className="text-[14px] font-bold text-[#647DB7]">
                  {Array.isArray(outsideList?.result)
                    ? outsideList.result.filter(item => item.water_gauge_use_status).length
                    : 0}개
                </span>
              </div>
            </div>

            <div className="scroll-container h-[380px] overflow-y-auto overflow-x-hidden">
              {Array.isArray(outsideList?.result) &&
                (outsideList.result as TunnelOutsideResponse[]).map((item) => {
                  // idx를 숫자로 안전 변환
                  const idxNum = Number(item.idx);
                  const safeIdx = Number.isNaN(idxNum) ? null : idxNum;

                  // 이름 13자 초과 시 말줄임 + 툴팁
                  const { display: nameDisplay, full: nameFull } = truncateWithEllipsis(item.outside_name, 11);

                  return (
                    <div
                      key={String(item.idx)}
                      className="mt-[12px] w-full h-[70px] rounded-sm opacity-80 cursor-pointer"
                      onMouseEnter={() => setDeviceId(safeIdx)}
                      onMouseLeave={() => setDeviceId(null)}
                      onClick={() => {
                        setDeviceId(safeIdx);
                        if (mapRef.current) {
                          const lat = parseFloat(item.top_location ?? '');
                          const lng = parseFloat(item.left_location ?? '');
                          if (!isNaN(lat) && !isNaN(lng)) {
                            mapRef.current.setView([lat, lng], 18, { animate: true });
                          }
                        }
                      }}
                    >
                      {/* 헤더 */}
                      <ul className="w-full h-[25px] rounded-t-sm bg-[#DADDE5] flex border border-[#D2D7E0]">
                        <li className="text-[12px] w-[48%] text-center leading-[25px]">이름</li>
                        <li className="text-[12px] w-[17%] text-center leading-[25px]">방향</li>
                        <li className="text-[12px] w-[20%] text-center leading-[25px]">현재 수위</li>
                        <li className="text-[12px] w-[15%] text-center leading-[25px]">이동</li>
                      </ul>

                      {/* 내용 */}
                      <ul className="w-full h-[45px] rounded-b-sm flex pt-1 items-center bg-white text-[#4E4A4A] font-bold border border-[#D2D7E0]">
                        <li className="text-[13px] w-[48%] text-center" title={nameFull}>
                          {nameDisplay}
                        </li>
                        <li className="text-[13px] w-[17%] text-center flex gap-1 justify-end ">
                          {item.direction}
                          <img
                            src={item.direction === '상행' ? up_arrow : down_arrow}
                            className="w-[12px] h-[14px] mt-[2px]"
                          />
                        </li>
                        <li className="text-[13px] w-[20%] text-center">
                          {item.waterlevel ? `${item.waterlevel}CM` : '-'}
                        </li>
                        <li className="text-[13px] w-[15%] text-center relative">
                          <img
                            src={deviceId !== null && safeIdx !== null && deviceId === safeIdx ? point_hover : point}
                            className="w-[22px] h-[22px] absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]"
                            alt="이동"
                          />
                        </li>
                      </ul>
                    </div>
                  );
                })}
            </div>


          </div>
        )}

        {/* 패널 토글 버튼 (닫힌 상태) */}
        {!showStatusPanel && (
          <button
            className="absolute bottom-6 right-2 z-[11] bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg"
            onClick={() => setShowStatusPanel(true)}
            title="상태 요약 열기"
          >
            <HiMenu size={20} />
          </button>
        )}

      </div>

      {/* 모달들: 추가/수정/삭제 확인 */}
      <AddTunnel
        show={tunnelDeviceMenuOpen}
        onModalClose={() => setTunnelDeviceMenuOpen(false)}
        onConfirm={onConfirm}
      />
      <ModifyTunnel
        show={modifyMenuOpen}
        onModalClose={() => setModifyMenuOpen(false)}
        onConfirm={(dev) => {
          onConfirmModify({
            idx: Number(dev.idx),
            name: dev.name,
            location: dev.location,
            barrierIp: dev.barrierIp,
            direction: dev.direction,
            billboardLCSIds: dev.billboardLCSIds ?? [],
            billboardVMSIds: dev.billboardVMSIds ?? [],
            guardianLightIp: dev.guardianLightIp ?? '',
          });
        }}
        defaultData={
          selectedTunnel
            ? ({
              idx: Number(selectedTunnel.id),
              outside_name: selectedTunnel.name ?? '',
              location: selectedTunnel.address ?? '',
              barrier_ip: String((selectedTunnel as any).barrier_ip ?? ''),
              direction: (selectedTunnel as any).barrier_direction ?? '상행',
              // ✅ (string | number)[] -> string[] 로 강제 변환
              billboard_idx_list_lcs: toStringArray(
                (selectedTunnel as any).billboard_idx_list_lcs
              ),
              billboard_idx_list_vms: toStringArray(
                (selectedTunnel as any).billboard_idx_list_vms
              ),
              // ✅ 타입 키에 맞춤 (guardianlite_ip)
              guardianlite_ip:
                (selectedTunnel as any).guardianlite_ip ??
                (selectedTunnel as any).guardianLightIp ??
                undefined,
            } as TunnelOutsideResponse)
            : null
        }
      />



      <DeleteConfirm
        show={deviceDeleteMenuOpen}
        title="터널 개소"
        contents='터널 개소를'
        onClose={() => setDeviceDeleteMenuOpen(false)}
        onConfirm={handleDeleteDevice}
      />
    </>
  )
}

export default TunnelMap
