import { SelectedObject, TunnelOutsideResponse, WaterGaugeType, WaterLevelType } from '@/@types/tunnel'
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback, useMemo } from 'react'
import CanvasImpl from '@/utils/CanvasFabric'
import tunnelBg from '@/assets/styles/images/tunnelBgSmall.png'
import { useFullScreenStore } from '@/store/common/useFullScreenStore'
import { Canvas, FabricObject, TPointerEventInfo, TPointerEvent } from 'fabric';
import ContextMenu from '../modals/ContextMenu'
import { CanvasObject, ClickLocation, ClickObject } from '@/@types/canvas'
import { ModalType } from '@/@types/modal'
import { useCanvasMapStore } from '@/store/canvasMapStore'
import Modal from '../modals/Modal'
import AddCamera from '../modals/AddCamera'
import { apiModifyCamera } from '@/services/ObserverService'
import { CameraType } from '@/@types/camera'
import { useCameras } from '@/utils/hooks/useCameras'
import RemoveTunnelData from '../modals/RemoveTunnelData'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import LiveStream from '@/components/common/camera/LiveStream'
import MiniMap from '@/views/tunnel/tunnelMap/MiniMap'
import { useTunnelOutside, useWaterLevelMappingList } from '@/utils/hooks/useTunnelArea'
import AddWaterGauge from '../modals/AddWaterGauge'
import { isArray } from 'lodash'
import { ScrollBar } from '@/components/ui'
import { apiAddWaterGauge, apiDeleteWaterGauge, apiModifyWaterGauge, apiModifyWaterLevelPosition } from '@/services/TunnelService'
import RemoveWaterGauge from '../modals/RemoveWaterGauge'
import RemoveWaterLevel from '../modals/RemoveWaterLevel'
import TunnelList from './TunnelList'
import TunnelCanvasSection from './TunnelCanvas'
import WaterGaugeChart from './WaterGaugeChart'
import { HiMiniVideoCamera } from 'react-icons/hi2'
import BarrierControlModal from '../modals/BarrierControlModal'
import TunnelBarrierControl from './TunnelBarrierControl'
import TunnelBillboard from './TunnelBillboard';
import AddWaterLevel from '../modals/AddWaterLevel'
import AddWaterLevelControlIn from '../modals/AddWaterLevelControlIn'
import CameraControl from '../modals/CameraControl'

type TunnelItem = {
  id: string;
  name: string;
  children: {
    idx: number;
    name: string;
    location: string;
    position: [number, number];
    top_location: number;
    left_location: number;
  }[];
};

type TunnelDetailProps = {
  data: SelectedObject
  onObjectSelect: (data: SelectedObject) => void;
}

const TunnelDetail = ({ data, onObjectSelect }: TunnelDetailProps) => {
  const { isFullscreen } = useFullScreenStore() // 전체화면 여부
  const { setCanvasMapState } = useCanvasMapStore(); // 전역 캔버스 상태 설정 함수
  const { mutate: mutateOutsideList } = useTunnelOutside() // 터널 외부 리스트 갱신 함수
  // 수위 매핑 목록과 제어 모드 여부 (ControlIn)
  const { data: waterLevelList, mutate: mutateWaterLevelList, isControlIn } = useWaterLevelMappingList(data.id as number)
  // 카메라 목록 훅 및 상태
  const {
    cameras,
    isLoading: isLoadingCameras,
    error: camerasError,
    mutate: mutateCamera
  } = useCameras('tunnel');
  const { socketService } = useSocketConnection();// 소켓 서비스 인스턴스

  // 카메라 컨트롤 버튼 제어
  const [showCameraControl, setShowCameraControl] = useState(false)

  // Fabric 캔버스 및 구현체 레퍼런스
  const mainCanvasRef = useRef<Canvas | null>(null)
  const mainCanvasImpl = useRef<CanvasImpl | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const createCanvasRef = useRef<Date | null>(null);

  // 드래그 핸들링 레퍼런스들
  const lastPosXRef = useRef(0)
  const lastPosYRef = useRef(0)
  const isDraggingRef = useRef(false);

  // 클릭 좌표 저장 (상대 좌표 계산용)
  const clickLocationRef = useRef<ClickLocation>({
    x: 0,
    y: 0
  });

  // 위치 업데이트 중 플래그
  const isUpdatingObjectLocation = useRef<boolean>(false);

  // 모달 내용/컨텍스트 메뉴 DOM 참조
  const modalChildRef = useRef<HTMLDivElement>(null);
  const isUpdatingObject = useRef<boolean>(false)

  // 로컬 UI 상태들
  const [contextMenuVisible, setContextMenuVisible] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [canvasClickPoint, setCanvasClickPoint] = useState<{ x: number; y: number } | null>(null)
  const [clickObject, setClickObject] = useState<ClickObject | null>(null)// 클릭된 캔버스 객체
  const [fabricObject, setFabricObject] = useState<CanvasObject | null>(null)// Fabric 오브젝트 참조
  const [selectedCameraData, setSelectedCameraData] = useState<any | null>(null);// 선택된 카메라(영상 표시용)
  const [viewMode, setViewMode] = useState<'canvas' | 'map'>('canvas');// 상단 영역 뷰 모드

  // 공통 모달 상태
  const [modalInfo, setModalInfo] = useState<ModalType>({ show: false, type: '', title: '' })
  const [modal, setModal] = useState<ModalType>({
    show: false,
    type: '',
    title: ''
  });
  const [canvasReady, setCanvasReady] = useState(false);// 캔버스 준비 여부
  const [cameraAngle, setCameraAngle] = useState(true);// 카메라 시야각 표시 여부

  // 카메라 편집 팝업 상태
  const [cameraPopup, setCameraPopup] = useState<any>({
    show: false,
    main_service_name: 'tunnel',
    vms_name: '',
    camera_id: '',
    name: '',
    ip: '',
    top_location: '',
    left_location: '',
    icon_width: 0,
    icon_height: 0,
    canvas_width: 0,
    canvas_height: 0,
    type: '',
    service_type: ''
  });

  // 카메라 이벤트 팝업 상태
  const [cameraEventPopup, setCameraEventPopup] = useState<any>({
    show: false,
    main_service_name: 'tunnel',
    vms_name: '',
    camera_id: '',
    name: '',
    ip: '',
    on_event: true,
    top_location: '',
    left_location: '',
    icon_width: 0,
    icon_height: 0,
    canvas_width: 0,
    canvas_height: 0,
    type: '',
    service_type: ''
  });

  // 차단막 여부 플래그
  const [crossinggateData, setCrossinggateData] = useState<any | null>(null);

  // 선택된 데이터의 장치 타입이 crossinggate면 true, 아니면 false 설정
  useEffect(() => {
    if ((data?.event_device_type ?? '').toLowerCase() === 'crossinggate') {
      setCrossinggateData(true);
    } else {
      setCrossinggateData(false);
    }
  }, [data?.event_device_type, data]);

  // 맵 키(뷰 모드 전환시 리렌더 트리거 용)
  const [mapKey, setMapKey] = useState(1);

  // 뷰 모드가 map으로 바뀔 때 키 증가 → 맵 리셋용
  useEffect(() => {
    if (viewMode === 'map') {
      setMapKey(prev => prev + 1);
    }
  }, [viewMode]);

  // 캔버스 초기화/정리: viewMode 또는 전체화면 변화에 따라
  useEffect(() => {
    if (viewMode === 'canvas') {
      cleanUpMapCanvas();
      initializeCanvas();
    }
  }, [viewMode, isFullscreen]);

  // 터널 외부/수위 데이터 최신화: 터널 id 변경 시
  useEffect(() => {
    mutateOutsideList()
    mutateWaterLevelList()
  }, [data.id])


  // 카메라/캔버스 준비되면 캔버스 객체 배치
  useEffect(() => {
    if (cameras == null || !canvasReady) {
      return;
    }
    // 현재 터널에 속한 카메라만 필터링하여 배치
    settingObject({ cameras: cameras.filter((camera: CameraType) => camera.outside_idx === Number(data.id) && camera.inside_idx === Number(data.id)), cameraAngle });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, cameras, cameraAngle, data]);


  // 수위계 목록이 준비되면 캔버스에 배치
  useEffect(() => {
    if (waterLevelList == null || !canvasReady) {
      return;
    }

    // 현재 터널(outside_idx)과 매칭되는 수위계만 배치
    settingObject({ waterLevelList: waterLevelList?.result.filter((waterLevel: any) => waterLevel.outside_idx === Number(data.id)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, waterLevelList, data.id])


  useEffect(() => {
    if (!selectedCameraData) setShowCameraControl(false)
  }, [selectedCameraData])


  // 소켓 모드일 때 초기 카메라 자동 선택 (지연 후 첫 번째)
  useEffect(() => {
    if (!canvasReady || !cameras || cameras.length === 0) return;
    if (!data.isSocket) return;

    const timer = setTimeout(() => {
      const filtered = cameras.filter(
        (camera: CameraType) =>
          camera.outside_idx === Number(data.id) &&
          camera.inside_idx === Number(data.id)
      );

      if (filtered.length > 0) {
        setSelectedCameraData(filtered[0]); // 첫 번째 카메라 자동 선택
      }
    }, 800); // ✅ 800ms 지연

    return () => clearTimeout(timer); // cleanup
  }, [canvasReady, cameras, data])

  // 캔버스 클릭 시 카메라 선택 상태 갱신
  useEffect(() => {
    if (!canvasReady || !mainCanvasRef.current) return;

    const canvas = mainCanvasRef.current;

    // Fabric v5 타입: TPointerEventInfo<TPointerEvent> 사용
    const handler = (opt: TPointerEventInfo<TPointerEvent>) => {
      const e = opt.e;

      // 마우스 우클릭만 무시 (터치/포인터는 button 속성 없음)
      if (e instanceof MouseEvent && e.button === 2) return;

      const target = opt.target as (FabricObject & { data?: any }) | undefined;

      if (target && target.data?.type === 'camera') {
        setSelectedCameraData(target.data);
      } else {
        setSelectedCameraData(null);
      }
    };

    canvas.on('mouse:down', handler);

    return () => {
      canvas.off('mouse:down', handler);
    };
  }, [canvasReady]);;



  // 캔버스에 각 오브젝트(수위계/카메라)를 배치하는 함수
  const settingObject = useCallback(
    ({
      waterLevelList,
      cameras,
      cameraAngle,
    }: {
      waterLevelList?: any;
      cameras?: CameraType[];
      cameraAngle?: boolean;
    }) => {

      if (mainCanvasImpl.current == null) return;
      if (isUpdatingObject.current) handleIsUpdatingObject(false);

      // 수위계 추가
      if (waterLevelList) {
        mainCanvasImpl.current.addObject({
          items: waterLevelList.map((waterLevel: any) => ({
            ...waterLevel,
            type: 'waterLevel',
          })),
          type: 'waterLevel',
        });
      }

      // 카메라 추가
      if (cameras) {
        mainCanvasImpl.current.addObject({
          items: cameras.map((camera) => ({
            ...camera,
            type: 'camera',
          })),
          cameraAngle,
          type: 'camera',
        });
      }
    },
    []
  );

  // 소켓 구독: 카메라/수위 업데이트 이벤트 수신 시 목록 갱신
  useEffect(() => {
    if (!socketService) {
      return;
    }

    const cameraSocket = socketService.subscribe('tm_cameras-update', (received) => {
      if (received) {
        mutateCamera();
      }
    })

    const waterLevelSocket = socketService.subscribe('tm_waterLevel-update', (received) => {
      if (received) {
        mutateWaterLevelList();
      }
    })

    return () => {
      cameraSocket();
      waterLevelSocket();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])


  // (컨텍스트 메뉴) 우클릭 좌표/포인터 계산 — 현재 핸들러 등록만, 사용부는 CanvasImpl 내부로 추정
  useEffect(() => {
    const canvas = mainCanvasRef.current
    if (!canvas) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()

      const rect = canvasContainerRef.current?.getBoundingClientRect()
      const offsetX = e.clientX - (rect?.left ?? 0)
      const offsetY = e.clientY - (rect?.top ?? 0)

      const pointer = canvas.getPointer(e)
      setCanvasClickPoint({ x: pointer.x, y: pointer.y })

      setContextMenuPosition({ x: offsetX, y: offsetY })
      setClickObject(null)
      setContextMenuVisible(true)
    }
  }, [])

  // 캔버스 생성 로직
  const createCanvas = async () => {
    const scale = 1
    const containerWidth = canvasContainerRef.current?.clientWidth ?? 1000  //컨테이너 폭
    const canvasWidth = containerWidth * scale // 캔버스 폭
    // ajy height 값 수정
    // const canvasHeight = (isFullscreen ? 685 : 250) * scale
    const canvasHeight = 250 //캔버스 높이(고정)

    // 이미 생성한 적 있으면 중복 생성 방지
    if (createCanvasRef.current) {
      return;
    };

    createCanvasRef.current = new Date();

    // CanvasImpl을 통해 배경/핸들러가 적용된 Fabric 캔버스 생성
    const canvasImpl = await CanvasImpl.createCanvas(
      tunnelBg,
      canvasWidth,
      canvasHeight,
      isDraggingRef,
      lastPosXRef,
      lastPosYRef,
      clickLocationRef,
      setClickObject,
      setFabricObject,
      setCanvasMapState,
      undefined,
      setCameraPopup,
      undefined,
      setCameraEventPopup
    )

    // ⬇️ 널 가드 추가
    if (!canvasImpl) {
      console.error('CanvasImpl.createCanvas() failed: canvasImpl is null/undefined');
      return; // or throw new Error('...');
    }

    const canvas = canvasImpl.getCanvas();
    mainCanvasRef.current = canvas; // Fabric Canvas 참조 저장
    mainCanvasImpl.current = canvasImpl; // 구현체 참조 저장
    setCanvasReady(true); // 준비 완료

    // 배경 이미지 스케일/위치 조정
    const bg = canvas.backgroundImage;
    if (bg) {
      const imgWidth = bg.width ?? 1;
      const imgHeight = bg.height ?? 1;

      const scaleRatioX = 1;
      const scaleX = (canvasWidth / imgWidth) * scaleRatioX;

      const scaleRatioY = 1;
      const scaleY = (canvasHeight / imgHeight) * scaleRatioY;

      const scaledWidth = imgWidth * scaleX;
      const scaledHeight = imgHeight * scaleY;

      const left = (canvasWidth - scaledWidth) / 1.5;
      const top = (canvasHeight - scaledHeight) / 2.8;

      bg.set({
        scaleX,
        scaleY,
        left,
        top,
        originX: 'left',
        originY: 'top',
      });

      canvas.renderAll();
    }


  }

  // 초기 캔버스 생성 entry
  const initializeCanvas = async () => {
    await createCanvas();
  };

  // 캔버스 정리(뷰 모드 전환 등): Fabric 리소스 해제 및 DOM 제거
  const cleanUpMapCanvas = () => {
    let disposed = false;

    if (mainCanvasRef.current) {
      try {
        mainCanvasRef.current.dispose();
        disposed = true;
      } catch (e) {
        console.warn('dispose 실패:', e);
      }

      const canvasEl = mainCanvasRef.current.lowerCanvasEl;
      if (canvasEl && canvasEl.parentNode) {
        canvasEl.parentNode.removeChild(canvasEl);
      }

      mainCanvasRef.current = null;
    }

    if (mainCanvasImpl.current) {
      mainCanvasImpl.current = null;
    }

    // ✅ dispose가 성공한 경우에만 createCanvasRef 초기화
    if (disposed) {
      createCanvasRef.current = null;
    }

    setCanvasReady(false);
    closeContextMenu();
  };

  // 컨텍스트 메뉴 닫기 (DOM 직접 접근)
  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')!;
    if (menu) {
      menu.style.display = 'none';
    }
  }

  // 공통 모달 닫기
  const closeModal = () => {
    toggleModal({
      show: false,
      type: '',
      title: ''
    })
  }

  // 카메라 팝업 닫기 (상태 초기화)
  const handleCloseCameraPopup = () => {
    setCameraPopup({
      show: false,
      main_service_name: 'tunnel',
      vms_name: '',
      camera_id: '',
      name: '',
      ip: '',
      top_location: '',
      left_location: '',
      icon_width: 0,
      icon_height: 0,
      canvas_width: 0,
      canvas_height: 0,
      map_type: 'indoor',
      type: '',
      service_type: ''
    })
  }


  // 카메라 추가 처리
  const addCamera = async (vms_name: string, camera_id: string) => {
    if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
      return
    }

    const { x, y } = clickLocationRef.current;

    try {
      const res = await apiModifyCamera({
        camera_id,
        vms_name,
        top_location: `${(y / mainCanvasRef.current.height)}`,
        left_location: `${(x / mainCanvasRef.current.width)}`,
        mainServiceName: 'tunnel',
        outside_idx: Number(data.id),
        inside_idx: Number(data.id),
        use_status: true
      })

      if (!res || !res.result) {
        return
      }

      closeModal()
    } catch (error) {
      console.error('카메라 추가 API 에러: ', error)
      return
    }
  }

  // 카메라 제거 처리 (영역에서 제거)
  const removeCameraArea = async () => {
    if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
      return
    }

    if (clickObject == null || clickObject.type !== 'camera') {
      return
    }

    const { main_service_name, vms_name, camera_id } = clickObject as CameraType;

    const result = await apiModifyCamera({
      mainServiceName: main_service_name,
      vms_name,
      camera_id,
      outside_idx: null,
      inside_idx: null,
      top_location: '',
      left_location: '',
      camera_angle: null,
      use_status: false
    });

    if (result.result) {
      closeContextMenu();
      closeModal();
      handleCloseCameraPopup();
    }
  }

  // 수위계 제거 처리
  const removeWaterGauge = async () => {
    if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
      return
    }

    if (clickObject == null || clickObject.type !== 'waterGauge') {
      return
    }

    const { idx } = clickObject as WaterGaugeType;

    const result = await apiDeleteWaterGauge({ idx });

    if (result.result) {
      closeContextMenu();
      closeModal();
      // handleCloseCameraPopup();
    }
  }

  // 공통 모달 열고/닫기
  const toggleModal = ({ show, type, title }: ModalType) => {
    setModal({
      show,
      title,
      type
    })
  }

  // 카메라 시야각 토글
  const toggleCameraAngle = () => {
    setCameraAngle(!cameraAngle)
    closeContextMenu();
  }

  // 수위계 추가 처리
  const addWaterGauge = async (gaugeData: {
    port: string;
    baudRate: string;
    slaveId: string;
    registerAddress: string;
    name: string;
  }) => {
    // console.log('수위계 등록 데이터:', gaugeData);
    if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
      return
    }

    const { x, y } = clickLocationRef.current;

    try {
      await apiAddWaterGauge({
        outsideIdx: Number(data.id),
        name: gaugeData.name,
        port: gaugeData.port,
        baudRate: gaugeData.baudRate,
        slaveId: gaugeData.slaveId,
        registerAddress: gaugeData.registerAddress,
        topLocation: `${(y / mainCanvasRef.current.height)}`,
        leftLocation: `${(x / mainCanvasRef.current.width)}`,
        use_status: true
      })

      closeModal();
    } catch (err) {
      console.log(err)
    }
  }

  // 상단 뷰 모드 전환 (캔버스/맵)
  const toggleViewMode = () => {
    setViewMode(prev => (prev === 'canvas' ? 'map' : 'canvas'));
  };


  // 모달 내부에 넣을 실제 컨텐츠 선택
  const setModalChild = (type: string) => {
    const { x, y } = clickLocationRef.current;
    switch (type) {
      case 'tunnelCamera-add':
        return (
          <AddCamera add={addCamera} onCancel={closeModal} />
        )
      case 'barrier-areaModify':
        return (
          <></>
          // <ModifyParkingArea modify={modifyParkingArea} closeModal={closeModal} originData={clickObject as ParkingArea} />
        )
      case 'waterGauge-add':
        return (
          <AddWaterGauge add={addWaterGauge} onCancel={closeModal} />
        )
      case 'waterLevelControlIn-add': {
        const { x, y } = clickLocationRef.current;

        // ✅ 타입 확정
        const outsideIdx = Number(data.id ?? data.idx);
        const ip = String(data.barrier_ip ?? '');
        const location = String(data.location ?? '');
        const topLocation = `${y / (mainCanvasRef.current?.height || 1)}`;
        const leftLocation = `${x / (mainCanvasRef.current?.width || 1)}`;

        // (선택) outsideIdx가 숫자로 변환되지 못한 경우 안전장치
        if (!Number.isFinite(outsideIdx)) {
          console.error('Invalid outsideIdx in AddWaterLevelControlIn', { id: data.id, idx: data.idx });
          return <></>;
        }

        return (
          <AddWaterLevelControlIn
            submitData={{ outsideIdx, ip, location, topLocation, leftLocation }}
            onCancel={closeModal}
          />
        );
      }
      case 'waterLevelControlOut-add':
        return (
          <AddWaterLevel
            onCancel={closeModal}
            outsideIdx={Number(data.id)}
            topLocation={`${y / (mainCanvasRef.current?.height || 1)}`}
            leftLocation={`${x / (mainCanvasRef.current?.width || 1)}`}
            mutate={mutateWaterLevelList}
          />
        )
      case 'waterGauge-remove':
        return (
          <RemoveWaterGauge remove={removeWaterGauge} closeModal={closeModal} originData={clickObject as WaterGaugeType} />
        )
      case 'waterLevel-remove':
        if (clickObject && clickObject.type === 'waterLevel') {
          const waterLevel = clickObject as WaterLevelType;
          const submitData = {
            outsideIdx: waterLevel.outside_idx,
            waterLevelIdx: waterLevel.idx,
            waterLevelName: waterLevel.water_level_name,
            communication: waterLevel.communication
          };
          return (
            <RemoveWaterLevel
              closeModal={closeModal}
              submitData={submitData}
            />
          );
        }
      case 'tunnelCamera-remove':
        return (
          <RemoveTunnelData
            remove={removeCameraArea}
            closeModal={closeModal}
            originData={clickObject as CameraType}
          ></RemoveTunnelData>
        )


      default:
        break;
    }
  }

  // 선택된 오브젝트 위치 업데이트 핸들러 (드래그 이동 후 서버 반영)
  const handleUpdateLocation = async () => {

    if (!fabricObject || !mainCanvasImpl.current || !mainCanvasRef.current || isUpdatingObjectLocation.current) {
      return;
    }

    // 위치 이동 중 상태 설정 
    handleIsUpdatingObject(true);

    async function setUpdateLocation(leftLocation: number, topLocation: number): Promise<{ success: boolean }> {
      const result = { success: false };

      if (!clickObject || mainCanvasRef.current == null) return result;

      if (clickObject.type === 'camera') {
        const orgData = clickObject as CameraType

        const data = {
          mainServiceName: orgData.main_service_name,
          vms_name: orgData.vms_name,
          camera_id: orgData.camera_id,
          outside_idx: orgData.outside_idx,
          inside_idx: orgData.inside_idx,
          left_location: `${leftLocation / mainCanvasRef.current.width}`,
          top_location: `${topLocation / mainCanvasRef.current.height}`,
          camera_angle: orgData.camera_angle,
          use_status: orgData.use_status
        }

        const res = await apiModifyCamera(data)

        if (res?.result?.success) {
          result.success = true
          handleIsUpdatingObject(false);
        }

        return result

      } else if (clickObject.type === 'waterGauge') {
        const orgData = clickObject as WaterGaugeType

        const data = {
          idx: orgData.idx,
          topLocation: `${topLocation / mainCanvasRef.current.height}`,
          leftLocation: `${leftLocation / mainCanvasRef.current.width}`,
        }

        const res = await apiModifyWaterGauge(data)

        if (res?.message === 'ok') {
          result.success = true
          handleIsUpdatingObject(false);
        }

        return result

      } else if (clickObject.type === 'waterLevel') {
        const orgData = clickObject as WaterLevelType;

        const data = {
          outsideIdx: orgData.outside_idx,
          waterLevelIdx: orgData.idx,
          topLocation: `${topLocation / mainCanvasRef.current.height}`,
          leftLocation: `${leftLocation / mainCanvasRef.current.width}`,
        };

        const res = await apiModifyWaterLevelPosition(data);
        if (res?.message === 'ok') {
          result.success = true;
          handleIsUpdatingObject(false);
        }

        return result;

      }
      return result;
    }

    // const currentObject = mainCanvasRef.current.getObjects().find(obj => obj === fabricObject);
    // if (!currentObject) return

    mainCanvasImpl.current.updateObjectLocation({
      canvas: mainCanvasRef.current,
      object: fabricObject,
      callback: setUpdateLocation,
    });

    closeContextMenu();
  };

  // 위치 업데이트 중 상태 토글 도우미
  const handleIsUpdatingObject = (status: boolean) => {
    isUpdatingObjectLocation.current = status;
  }

  // 카메라 각도(시야) 업데이트 시작: Fabric 상에서 편집 모드 진입 → 서버 반영 콜백 등록
  const handleUpdateCameraAngle = () => {
    if (fabricObject == null) {
      return;
    }
    if (mainCanvasImpl.current == null || mainCanvasRef.current == null) {
      return;
    }
    if (isUpdatingObject.current) {
      return;
    }

    handleCloseCameraPopup();
    handleIsUpdatingObject(true);

    async function updateCameraAngleServer(object: FabricObject, camera_angle: number) {
      const result = {
        success: false
      }

      const updateCamera = object.data as CameraType;
      const { main_service_name: mainServiceName, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, use_status } = updateCamera;

      const res = await apiModifyCamera({
        mainServiceName,
        vms_name,
        camera_id,
        outside_idx,
        inside_idx,
        top_location,
        left_location,
        camera_angle: `${camera_angle}`,
        use_status
      });

      if (res.result.success) {
        result.success = true
        handleIsUpdatingObject(false);
      }

      return result;
    }

    mainCanvasImpl.current.enableUpdateCameraAngle(
      mainCanvasRef.current,
      fabricObject,
      updateCameraAngleServer
    )

    closeContextMenu();
  }


  return (
    <div className="flex w-full h-full gap-2 p-[8px]">

      <TunnelList
        data={data}
        onObjectSelect={onObjectSelect}
        setSelectedCameraData={setSelectedCameraData}
      />

      <div className="flex-1 flex flex-col gap-2">
        <div className='w-full h-[322px] rounded shadow dark:bg-gray-800 flex gap-2'>
          {/* 전광판*/}
          <TunnelBillboard outsideIdx={Number(data.idx)} />
          <TunnelCanvasSection
            data={data}
            viewMode={viewMode}
            toggleViewMode={toggleViewMode}
            canvasContainerRef={canvasContainerRef}
            cameraAngle={cameraAngle}
            toggleCameraAngle={toggleCameraAngle}
            fabricObject={fabricObject}
            clickObject={clickObject}
            handleUpdateLocation={handleUpdateLocation}
            handleUpdateCameraAngle={handleUpdateCameraAngle}
            modal={modal}
            toggleModal={toggleModal}
            ContextMenu={ContextMenu}
            isControlIn={isControlIn}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-800 p-3 rounded shadow">
          <section className="h-full flex gap-2 overflow-hidden ">
            {/* 카메라 */}
            <div className="flex-1 bg-[#f5f5f5] dark:bg-gray-700 rounded border dark:border-gray-600 p-4 flex flex-col shadow relative">

              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">카메라</h3>
                <div className="text-right text-sm text-gray-600 dark:text-gray-300 leading-tight">
                  <div>{selectedCameraData?.camera_name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-400">{selectedCameraData?.camera_ip}</div>
                </div>
              </div>

              {/* 카메라 컨트롤 버튼 */}
              {showCameraControl && (
                <CameraControl
                  selectedCamera={selectedCameraData}
                  onClose={() => setShowCameraControl(false)}
                  className="right-3 bottom-3"
                />
              )}

              <div className={`flex-1 rounded ${selectedCameraData ? 'bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800'}`}>
                {!selectedCameraData ? (
                  <div className="h-full text-center text-gray-400 dark:text-gray-300 flex flex-col items-center justify-center gap-3 py-8">
                    <div className="text-[24px]"><HiMiniVideoCamera /></div>
                    <div className="text-sm font-medium">카메라 아이콘을 클릭하면</div>
                    <div className="text-sm font-medium">영상을 볼 수 있습니다.</div>
                  </div>
                ) : (
                  <>
                    {selectedCameraData && (
                      <div
                        className="absolute right-[24px] top-[70px] z-10 w-[90px] h-[24px] rounded-sm bg-[#0D0D0D99] cursor-pointer opacity-90 text-white text-center leading-[24px] select-none"
                        onClick={() => setShowCameraControl(v => !v)}
                        role="button"
                        aria-pressed={showCameraControl}
                        title="Open Camera Control"
                      >
                        PTZ 제어
                      </div>
                    )}
                    <LiveStream
                      main_service_name={'tunnel'}
                      vms_name={selectedCameraData?.vms_name}
                      camera_id={selectedCameraData?.camera_id}
                      service_type={selectedCameraData?.service_type}
                      camera_ip={selectedCameraData?.camera_ip}
                      access_point={selectedCameraData?.access_point}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="w-[54%] flex flex-col gap-2">
              {/* 차단막 */}
              <TunnelBarrierControl barrierIp={data?.barrier_ip ?? ''} location={data?.location} crossinggateData={crossinggateData} />

              <div className="flex flex-1 gap-2 min-h-0">
                {/* 수위계 */}
                <WaterGaugeChart outsideIdx={Number(data.idx)} />
              </div>
            </div>
          </section>
        </div>

        {/* 모달 */}
        <Modal modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
          <div ref={modalChildRef}>{setModalChild(modal.type)}</div>
        </Modal>
      </div>
    </div>

  )
}

export default TunnelDetail
