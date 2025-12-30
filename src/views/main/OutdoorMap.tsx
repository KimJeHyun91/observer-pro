
// eslint-disable-next-line import/named
import { Canvas, FabricObject, StaticCanvas } from 'fabric';
import { useEffect, useState, useRef, useCallback, Suspense, SetStateAction, Dispatch } from 'react';
import MiniMapCanvasImpl from '@/utils/MinimapCanvasFabric';
import UsePrevious from '@/utils/hooks/usePreviousVal';
import { useDataStatusStore } from '@/store/useDataStatusStore';
import ContextMenu from './modals/ContextMenu';
import { ModalType } from '@/@types/modal';
import Modal from './modals/ModalSetting';
import AddBuilding from './modals/AddBuilding';
import { ClickObject, ClickLocation, CanvasObject, UpdateObjectLocationResult, RemoveObjectResult } from '@/@types/canvas';
import CanvasImpl from '@/utils/CanvasFabric';
import { apiAddBuilding, apiAddGuardianlite, apiModifyBuilding, apiModifyCamera, apiModifyEbell, apiModifyGuardianlite, apiModifyGuardianliteLocation, apiModifyPIDS, apiRemoveBuilding, apiRemoveGuardianlite, apiUploadOutdoorImage } from '@/services/ObserverService';
import { useBuildings } from '@/utils/hooks/main/useBuildings';
import { Building } from '@/@types/building';
import ModifyBuilding from './modals/ModifyBuilding';
// import { useSessionUser } from '@/store/authStore';
import RemoveBuilding from './components/RemoveBuilding';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import Loading from '@/components/shared/Loading';
import AddCamera from './components/AddCamera';
import { useCameras } from '@/utils/hooks/useCameras';
import { CameraType, CameraTypes } from '@/@types/camera';
import { ApiResultBoolean } from '@/@types/api';
import { CameraUpdateParams } from './types/camera';
import RemoveCamera from './components/RemoveCamera';
import { ServiceType } from '@/@types/common';
import DevicePopup from '../../components/common/device/DevicePopup';
import AddEbell from './components/AddEbell';
import { useEbells } from '@/utils/hooks/main/useEbells';
import { DevicePopupType, ObDeviceType, obDeviceUpdateData, ObGuardianliteType } from '@/@types/device';
import RemoveEbell from './components/RemoveEbell';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import RemoveGuardianlite from './components/RemoveGuardianlite';
import { MutateGuardianlitePopup, ObGuardianliteLocationData, ObGuardianlitePopup } from './types/guardianlite';
import AddModifyGuardianlite from './modals/AddModifyGuardianlite';
import GuardianlitePopup from './components/GuardianlitePopup';
import { usePIDS } from '@/utils/hooks/main/usePIDS';
import AddPIDS from './components/AddPIDS';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { PIDS } from '@/@types/pids';
import RemovePIDS from './components/RemovePIDS';
import { EventPopup } from '@/@types/event';
// import ThreeJsContainer from '@/components/common/threeJs';
import image from '@/assets/styles/images/outdoor.png'
import Upload from '@/utils/upload/image';
import { ImageUploadModalType } from './BuildingDashboard';
import ImageUploadModal from './modals/ImageUploadModal';
import { useWindowSizeChange } from '@/utils/hooks/main/useWindowHeightChange';
import ModifyCamera from './components/ModifyCamera';

type Props = {
  canvasKey: number;
  eventPopup: EventPopup | null;
  setEventPopup: Dispatch<SetStateAction<EventPopup | null>>
};

type apiResultBoolean = {
  success: boolean;
};

type BuildingFuncParams = {
  idx: number;
  outside_name: string;
  left_location: string;
  top_location: string;
  service_type: string;
};

type BuildingParams = {
  idx: number;
  outside_name: string;
  service_type: string;
};

type UpdateLocationFunc<T> = (params: T) => Promise<ApiResultBoolean>;

type UpdateLocationResult =
  | {
    func: (params: BuildingFuncParams) => Promise<UpdateObjectLocationResult>;
    params: BuildingParams;
  }
  | {
    func: UpdateLocationFunc<CameraUpdateParams>;
    params: CameraUpdateParams;
  }
  | {
    func: UpdateLocationFunc<obDeviceUpdateData>;
    params: obDeviceUpdateData;
  }
  | {
    func: UpdateLocationFunc<ObGuardianliteLocationData>;
    params: ObGuardianliteLocationData;
  };

type UploadOutdoorImageResult = {
  file: File,
  message: 'ok' | 'fail';
}

type AddPIDSAPIData = ({ idx: number, line_x1: number, line_x2: number, line_y1: number, line_y2: number });

export type FindCanvasDeviceObjectResult = {
  success: boolean;
  message?: string;
  data?: FabricObject;
};

export type RenderedDeviceObject = {
  building?: {
    rendered: boolean;
    when: Date | null;
  };
  camera: {
    rendered: boolean;
    when: Date | null;
  };
  door?: {
    rendered: boolean;
    when: Date | null;
  };
  ebell: {
    rendered: boolean;
    when: Date | null;
  };
  guardianlite: {
    rendered: boolean;
    when: Date | null;
  };
  PIDS?: {
    rendered: boolean;
    when: Date | null;
  };
};

export type ClientSize = {
  width: number;
  height: number;
};

export default function OutdoorMap({ canvasKey, eventPopup, setEventPopup }: Props) {
  // const { user: { userId } } = useSessionUser();
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const { data: buildings, error: buildingsError, mutate: mutateBuildings } = useBuildings('getBuilding');
  const { cameras, error: camerasError, mutate: mutateCamera } = useCameras('origin');
  const { ebells, error: ebellsError, mutate: mutateEbell } = useEbells({ outside_idx: 0 });
  const { guardianlites, error: guardianlitesError, mutate: mutateGuardianlites } = useGuardianlites({ outside_idx: null, dimension_type: '2d' });
  const { pidsList, error: pidsError, mutate: mutatePIDS } = usePIDS();
  const mainCanvasRef = useRef<Canvas | null>(null);
  const mainCanvasImpl = useRef<CanvasImpl | null>(null);
  const miniMapCanvasRef = useRef<StaticCanvas | null>(null);
  const createCanvasRef = useRef<Date | null>(null);
  const isDraggingRef = useRef(false);
  const clickLocationRef = useRef<ClickLocation>({
    x: 0,
    y: 0
  });
  const lastPosXRef = useRef(0);
  const lastPosYRef = useRef(0);
  const modalChildRef = useRef<HTMLDivElement>(null);
  const isUpdatingObject = useRef<boolean>(false);
  const {
    minimap: useMinimap,
    service: useServiceNav,
    data: useDataStatus
  } = useDataStatusStore((state) => state.tabs.origin);
  const deviceObjectRendered = useRef<RenderedDeviceObject>({
    building: {
      rendered: false,
      when: null
    },
    camera: {
      rendered: false,
      when: null
    },
    ebell: {
      rendered: false,
      when: null
    },
    guardianlite: {
      rendered: false,
      when: null
    },
    PIDS: {
      rendered: false,
      when: null
    }
  });
  const {
    mapImageURL,
    setCanvasMapState,
    is3DView
  } = useCanvasMapStore();
  const [modal, setModal] = useState<ModalType>({
    show: false,
    type: '',
    title: ''
  });
  const [clickObject, setClickObject] = useState<ClickObject>(null);
  const [fabricObject, setFabricObject] = useState<CanvasObject>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [cameraAngle, setCameraAngle] = useState(true);
  const [devicePopup, setDevicePopup] = useState<DevicePopupType>({
    show: false,
    idx: null,
    main_service_name: 'origin',
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
    map_type: 'outdoor',
    type: '',
    service_type: '',
    access_point: ''
  });
  const [deviceEventPopup, setDeviceEventPopup] = useState<DevicePopupType>({
    show: false,
    idx: null,
    main_service_name: 'origin',
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
    map_type: 'outdoor',
    type: '',
    service_type: '',
    access_point: ''
  });
  const [guardianlitePopup, setGuardianlitePopup] = useState<ObGuardianlitePopup>({
    show: false,
    name: '',
    ip: '',
    id: '',
    password: '',
    status: false,
    ch1: '',
    ch2: '',
    ch3: '',
    ch4: '',
    ch5: '',
    ch1_label: '',
    ch2_label: '',
    ch3_label: '',
    ch4_label: '',
    ch5_label: '',
    temper: '',
    top_location: '',
    left_location: '',
    icon_width: 0,
    icon_height: 0,
    canvas_width: 0,
    canvas_height: 0,
    map_type: 'outdoor'
  });
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [ImageUpload, setImageUpload] = useState<ImageUploadModalType>({
    show: false,
    imageURL: '',
    title: ''
  });
  const [isRoation, setIsRoation] = useState(true);
  const clientSizeRef = useRef<ClientSize>({
    width: innerWidth,
    height: innerHeight
  });
  useWindowSizeChange((height: number, width: number) => {
    clientSizeRef.current = {
      height,
      width
    };
  });
  const prevUseServiceNav = UsePrevious(useServiceNav);
  const prevUseDataStatus = UsePrevious(useDataStatus);
  const prevClientSize = UsePrevious(clientSizeRef.current);

  // if (outDoorError) {
  //   console.error('get outdoor image error');
  // }
  if (buildingsError) {
    console.error('get buildings error');
  }
  if (camerasError) {
    console.error('get cameras error');
  }
  if (ebellsError) {
    console.error('get ebells error');
  }
  if (guardianlitesError) {
    console.error('get cameras error');
  }
  if (pidsError) {
    console.error('get pids error');
  }
  const settingObject = useCallback(
    async ({
      buildings,
      cameras,
      cameraAngle,
      ebells,
      guardianlites,
      pidsList
    }: {
      buildings?: Building[],
      cameras?: CameraType[],
      cameraAngle?: boolean,
      ebells?: ObDeviceType[],
      guardianlites?: ObGuardianliteType[],
      pidsList?: PIDS[]
    }) => {
      if (mainCanvasImpl.current == null) {
        return;
      }
      if (isUpdatingObject.current) {
        handleIsUpdatingObject(false);
      }
      if (buildings) {
        await mainCanvasImpl.current.addObject({
          items: buildings.map((building) => ({ ...building, type: 'building' })),
          type: 'building'
        });
        deviceObjectRendered.current.building = {
          rendered: true,
          when: new Date()
        };
      };
      if (pidsList) {
        await mainCanvasImpl.current.addObject({
          items: pidsList.map((pids) => ({ ...pids, type: 'pids' })),
          type: 'pids',
        });
        deviceObjectRendered.current.PIDS = {
          rendered: true,
          when: new Date()
        };
      };
      if (cameras) {
        await mainCanvasImpl.current.addObject({
          items: cameras.map((camera) => ({ ...camera, type: 'camera' })),
          cameraAngle,
          type: 'camera',
        });
        deviceObjectRendered.current.camera = {
          rendered: true,
          when: new Date()
        };
      };
      if (ebells) {
        await mainCanvasImpl.current.addObject({
          items: ebells.map((ebell) => ({ ...ebell, type: 'ebell' })),
          type: 'ebell',
        });
        deviceObjectRendered.current.ebell = {
          rendered: true,
          when: new Date()
        };
      };
      if (guardianlites) {
        await mainCanvasImpl.current.addObject({
          items: guardianlites.map((guardianlite) => ({ ...guardianlite, type: 'guardianlite' })),
          type: 'guardianlite',
        });
        deviceObjectRendered.current.guardianlite = {
          rendered: true,
          when: new Date()
        };
      };
    }, [])

  const setCanvasSize = () => {
    let width = clientSizeRef.current.width - 20;
    let height = clientSizeRef.current.height - 106; // 96px는 헤더 높이

    if (useDataStatus) {
      width -= 342;
    };

    if (isFullscreen) {
      height += 127;
    };
    if (useServiceNav) {
      height -= 62.5;
    };

    return {
      width,
      height
    }
  }

  const setMiniCanvasSize = () => {
    let width = clientSizeRef.current.width - 20;
    let height = clientSizeRef.current.height - 106; // 96px는 헤더 높이
    width = (width / 6);
    if (useDataStatus) {
      width -= (342 / 6);
    }

    if (isFullscreen) {
      height += 127;
    };
    if (useServiceNav) {
      height -= 62.5;
    };

    height = (height / 6);

    return {
      width,
      height
    };
  };

  const createCanvas = async () => {
    const imageSource = mapImageURL || image;
    if (imageSource == null || createCanvasRef.current) {
      return;
    };
    createCanvasRef.current = new Date();
    if (isUpdatingObject.current) {
      handleIsUpdatingObject(false);
    };
    const canvasImpl = await CanvasImpl.createCanvas(
      imageSource,
      setCanvasSize().width,
      setCanvasSize().height,
      isDraggingRef,
      lastPosXRef,
      lastPosYRef,
      clickLocationRef,
      setClickObject,
      setFabricObject,
      setCanvasMapState,
      undefined,
      setDevicePopup,
      setGuardianlitePopup,
      setDeviceEventPopup,
      handleIsUpdatingObject
    );
    if (canvasImpl == null) {
      createCanvasRef.current = null;
      return;
    }
    mainCanvasRef.current = canvasImpl.getCanvas();
    mainCanvasImpl.current = canvasImpl;
    setCanvasReady(true);
    createMiniCanvas();
  }

  const createMiniCanvas = async () => {
    const imageSource = mapImageURL || image;
    const miniCanvasEl = document.getElementById('miniMapCanvas') as HTMLCanvasElement;
    if (!miniCanvasEl || imageSource == null) {
      return;
    };
    cleanUpMiniMapCanvas();
    if (useMinimap && mainCanvasRef.current) {
      const miniMapCanvasImpl = await MiniMapCanvasImpl.createMiniCanvas(
        mainCanvasRef.current,
        imageSource,
        setMiniCanvasSize().width,
        setMiniCanvasSize().height,
      );
      miniMapCanvasImpl.registerMainCanvasEvents();
      miniMapCanvasRef.current = miniMapCanvasImpl.getCanvas();
    }
  }

  const initializeCanvas = async () => {
    await createCanvas();
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    handleCloseGuardianlitePopup({});
  };

  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')!;
    if (menu) {
      menu.style.display = 'none';
    }
  }

  const cleanUpMapCanvas = () => {
    if (mainCanvasRef.current) {
      createCanvasRef.current = null;
      closeContextMenu();
      mainCanvasRef.current.dispose();
      mainCanvasRef.current = null; // 참조 초기화
      setCanvasReady(false);
    }
  };

  const cleanUpMiniMapCanvas = () => {
    if (miniMapCanvasRef.current) {
      miniMapCanvasRef.current.dispose();
      miniMapCanvasRef.current = null; // 참조 초기화
    }
  };

  const toggleModal = ({ show, title, type }: ModalType) => {
    setModal({
      show,
      title,
      type
    })
  };

  const addBuilding = async (outside_name: string) => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current == null) {
      return;
    };
    return await apiAddBuilding({
      outside_name,
      top_location: `${(y / mainCanvasRef.current.height)}`,
      left_location: `${(x / mainCanvasRef.current.width)}`,
      service_type: 'observer',
      alarm_status: false
    })
  }

  const modifyBuilding = ({
    idx,
    outside_name,
    left_location,
    top_location,
    service_type
  }: BuildingFuncParams) => {
    return apiModifyBuilding<UpdateObjectLocationResult>({
      idx,
      outside_name,
      left_location,
      top_location,
      service_type,
      main_service_id: 1
    });
  };

  const moveCamera = ({
    mainServiceName,
    vms_name,
    camera_id,
    outside_idx,
    inside_idx,
    left_location,
    top_location,
    camera_angle,
    camera_type
  }: CameraUpdateParams) => {
    return apiModifyCamera({
      mainServiceName,
      vms_name,
      outside_idx,
      inside_idx,
      camera_id,
      left_location,
      top_location,
      camera_angle,
      camera_type
    })
  }

  const updateCameraAngle = ({
    mainServiceName,
    vms_name,
    camera_id,
    camera_angle,
    outside_idx,
    inside_idx,
    top_location,
    left_location,
    camera_type
  }: CameraUpdateParams) => {
    return apiModifyCamera({
      mainServiceName,
      vms_name,
      camera_id,
      outside_idx,
      inside_idx,
      top_location,
      left_location,
      camera_angle,
      camera_type
    })
  }

  const removeBuilding = async () => {
    if (clickObject == null) {
      return;
    }
    const result = await apiRemoveBuilding<RemoveObjectResult>((clickObject as Building).idx!, 1);
    if (result.result === 1) {
      closeContextMenu();
      toggleModal({
        show: false,
        type: '',
        title: ''
      })
    }
  }

  const addCamera = async (vms_name: string, camera_id: string, camera_type: CameraTypes): Promise<apiResultBoolean> => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      try {
        const res = await apiModifyCamera({
          camera_id,
          vms_name,
          top_location: `${(y / mainCanvasRef.current.height)}`,
          left_location: `${(x / mainCanvasRef.current.width)}`,
          mainServiceName: 'origin',
          outside_idx: 0,
          inside_idx: 0,
          use_status: true,
          camera_type,
          dimension_type: '2d'
        })
        if (res.result) {
          toggleModal({ show: false, title: '', type: '' });
          return {
            success: true
          }
        }
      } catch (err) {
        console.error(err);
        return {
          success: false
        }
      }
    }
    return {
      success: false
    }
  };

  const modifyCamera = async ({ main_service_name, vms_name, camera_id, top_location, left_location, outside_idx, inside_idx, camera_angle, camera_type }: {
    main_service_name: string;
    vms_name: string;
    camera_id: string;
    top_location: string;
    left_location: string;
    outside_idx: number | null;
    inside_idx: number | null;
    camera_angle?: string | null;
    camera_type: '' | 'dome' | 'dome_elevator' | 'speed_dome' | 'bullet' | 'bullet_flame' | null;
  }): Promise<ApiResultBoolean> => {
    try {
      const res = await apiModifyCamera({
        camera_id,
        vms_name,
        top_location,
        left_location,
        mainServiceName: main_service_name,
        outside_idx,
        inside_idx,
        use_status: true,
        camera_angle,
        camera_type
      })
      if (res.result) {
        toggleModal({ show: false, title: '', type: '' });
        return {
          message: 'ok',
          result: res.result
        }
      }
    } catch (err) {
      console.error(err);
      return {
        message: 'fail',
        result: {
          success: false
        }
      }
    }
    return {
      message: 'fail',
      result: {
        success: false
      }
    }
  };

  const removeCamera = async () => {
    if (clickObject == null) {
      return;
    }
    const { main_service_name, vms_name, camera_id } = clickObject as CameraType;
    const result = await apiModifyCamera({
      mainServiceName: main_service_name,
      vms_name,
      camera_id,
      outside_idx: null,
      inside_idx: null,
      top_location: null,
      left_location: null,
      camera_angle: null,
      use_status: false,
      camera_type: null,
      dimension_type: null
    });
    if (result.result) {
      closeContextMenu();
      toggleModal({
        show: false,
        type: '',
        title: ''
      });
      handleCloseDevicePopup({ main_service_name, vms_name, camera_id });
      handleCloseDeviceEventPopup({ main_service_name, vms_name, camera_id });
    }
  }

  const addEbell = async (idx: number): Promise<void> => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      try {
        const res = await apiModifyEbell({
          idx,
          top_location: `${(y / mainCanvasRef.current.height)}`,
          left_location: `${(x / mainCanvasRef.current.width)}`,
          inside_idx: 0,
          outside_idx: 0,
          dimension_type: '2d'
        })
        if (res) {
          toggleModal({ show: false, title: '', type: '' });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  const removeEbell = async () => {
    if (clickObject == null) {
      return;
    }
    const { idx } = clickObject as ObDeviceType;
    const result = await apiModifyEbell({
      idx,
      outside_idx: null,
      inside_idx: null,
      top_location: null,
      left_location: null,
      dimension_type: null
    });
    if (result) {
      closeContextMenu();
      toggleModal({
        show: false,
        type: '',
        title: ''
      })
      handleCloseDevicePopup({ idx });
      handleCloseDeviceEventPopup({ idx });

    }
  }

  const ebellSetCamera = async (main_service_name: string, vms_name: string, camera_id: string, service_type: string): Promise<boolean> => {
    try {
      let cameraId: string | null;
      if (main_service_name && vms_name != null && camera_id && service_type) {
        cameraId = `${main_service_name}:${vms_name}:${camera_id}:${service_type}`
      } else {
        cameraId = null;
      }
      const idx = (clickObject as ObDeviceType)?.idx as number;
      const res = await apiModifyEbell({
        idx,
        camera_id: cameraId
      })
      if (res) {
        toggleModal({ show: false, title: '', type: '' });
        handleCloseDevicePopup({ idx });
        handleCloseDeviceEventPopup({ idx });
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  const addGuardianlite = async ({ name, ipaddress, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    { name: string, ipaddress: string, ch1_label?: string, ch2_label?: string, ch3_label?: string, ch4_label?: string, ch5_label?: string }
  ) => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      return await apiAddGuardianlite({
        outside_idx: null,
        inside_idx: null,
        top_location: `${(y / mainCanvasRef.current.height)}`,
        left_location: `${(x / mainCanvasRef.current.width)}`,
        guardianlite_ip: ipaddress,
        guardianlite_name: name,
        ch1_label,
        ch2_label,
        ch3_label,
        ch4_label,
        ch5_label,
        dimension_type: '2d'
      })
    }
  }

  const modifyGuardianlite = async ({ guardianlite_ip, name, ipaddress, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    { guardianlite_ip: string, name: string, ipaddress: string, ch1_label?: string, ch2_label?: string, ch3_label?: string, ch4_label?: string, ch5_label?: string }
  ) => {
    if (mainCanvasRef.current) {
      return await apiModifyGuardianlite({
        guardianlite_ip,
        new_guardianlite_ip: ipaddress,
        guardianlite_name: name,
        ch1_label,
        ch2_label,
        ch3_label,
        ch4_label,
        ch5_label
      })
    }
  }

  const removeGuardianlite = async () => {
    if (clickObject == null) {
      return;
    }
    const guardianlite_ip = (clickObject as ObGuardianliteType).guardianlite_ip!
    const result = await apiRemoveGuardianlite<RemoveObjectResult>(guardianlite_ip);
    if (result.result === 1) {
      handleCloseGuardianlitePopup({ guardianlite_ip })
      closeContextMenu();
      toggleModal({
        show: false,
        type: '',
        title: ''
      })
    }
  };

  const addPIDSCallback = async ({ idx, line_x1, line_x2, line_y1, line_y2 }: AddPIDSAPIData): Promise<ApiResultBoolean | void> => {
    if (mainCanvasRef.current == null || line_x1 == null || line_x2 == null || line_y1 == null || line_y2 == null) {
      return;
    }
    return await apiModifyPIDS({
      idx,
      line_x1: `${(line_x1 / mainCanvasRef.current.width)}`,
      line_x2: `${(line_x2 / mainCanvasRef.current.width)}`,
      line_y1: `${(line_y1 / mainCanvasRef.current.height)}`,
      line_y2: `${(line_y2 / mainCanvasRef.current.height)}`
    });
  }

  const addPIDS = async (idx: number, label: string) => {
    if (mainCanvasImpl.current) {
      return mainCanvasImpl.current.startPIDSCreation(idx, label, addPIDSCallback);
    }
  }

  const removePIDS = async () => {
    if (clickObject == null) {
      return;
    }
    const { idx } = clickObject as PIDS;
    const result = await apiModifyPIDS({
      idx,
      line_x1: null,
      line_x2: null,
      line_y1: null,
      line_y2: null
    });
    if (result) {
      closeContextMenu();
      handleCloseDevicePopup({ idx });
      handleCloseDeviceEventPopup({ idx });
      toggleModal({
        show: false,
        type: '',
        title: ''
      })
    }
  };

  const pidsSetCamera = async (main_service_name: string, vms_name: string, camera_id: string, service_type: string): Promise<boolean> => {
    try {
      let cameraId: string | null;
      if (main_service_name && vms_name != null && camera_id && service_type) {
        cameraId = `${main_service_name}:${vms_name}:${camera_id}:${service_type}`
      } else {
        cameraId = null;
      }
      const idx = (clickObject as ObDeviceType)?.idx as number;
      const res = await apiModifyPIDS({
        idx,
        camera_id: cameraId
      })
      if (res) {
        toggleModal({ show: false, title: '', type: '' });
        handleCloseDevicePopup({ idx });
        handleCloseDeviceEventPopup({ idx });
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }


  const setModalChild = (type: string) => {
    switch (type) {
      case 'building-add':
        return <AddBuilding toggleModal={toggleModal} add={addBuilding} />
        break;
      case 'building-modify':
        return <ModifyBuilding building={clickObject as Building} toggleModal={toggleModal} modify={modifyBuilding} />
        break;
      case 'building-remove':
        return <RemoveBuilding building={clickObject as Building} toggleModal={toggleModal} onDelete={removeBuilding} />
        break;
      case 'camera-add':
        return <AddCamera type='add' add={addCamera} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'camera-remove':
        return <RemoveCamera camera={clickObject as CameraType} toggleModal={toggleModal} onDelete={removeCamera} />
        break;
      case 'ebell-add':
        return <AddEbell add={addEbell} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'ebell-remove':
        return <RemoveEbell ebell={clickObject as ObDeviceType} toggleModal={toggleModal} onDelete={removeEbell} />
        break;
      case 'ebell-camera':
        return <AddCamera type='setCamera' setDeviceCamera={ebellSetCamera} clickDevice={clickObject as ObDeviceType} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'guardianlite-add':
        return <AddModifyGuardianlite toggleModal={toggleModal} add={addGuardianlite} />
        break;
      case 'guardianlite-modify':
        return <AddModifyGuardianlite toggleModal={toggleModal} modify={modifyGuardianlite} guardianlite={clickObject as ObGuardianliteType} />
        break;
      case 'guardianlite-remove':
        return <RemoveGuardianlite guardianlite={clickObject as ObGuardianliteType} toggleModal={toggleModal} onDelete={removeGuardianlite} />
        break;
      case 'pids-add':
        return <AddPIDS add={addPIDS} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'pids-remove':
        return <RemovePIDS pids={clickObject as PIDS} toggleModal={toggleModal} onDelete={removePIDS} />
        break;
      case 'pids-camera':
        return <AddCamera type='setCamera' setDeviceCamera={pidsSetCamera} clickDevice={clickObject as PIDS} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
      case 'camera-type':
        return <ModifyCamera cameraDetail={clickObject as CameraType} modify={modifyCamera} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
      default:
        break;
    };
  };

  const moveEbell = ({
    idx,
    outside_idx,
    inside_idx,
    left_location,
    top_location,
  }: obDeviceUpdateData) => {
    return apiModifyEbell({
      idx,
      inside_idx,
      outside_idx,
      top_location,
      left_location
    });
  };

  const moveGuardianlite = ({
    guardianlite_ip,
    top_location,
    left_location
  }: ObGuardianliteLocationData) => {
    return apiModifyGuardianliteLocation({
      guardianlite_ip,
      top_location,
      left_location
    })
  }

  const handleIsUpdatingObject = (status: boolean) => {
    isUpdatingObject.current = status;
  }
  const handleUpdateLocation = async () => {
    if (fabricObject == null) {
      return;
    };
    if (mainCanvasImpl.current == null) {
      return;
    };
    if (isUpdatingObject.current) {
      return;
    };
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    handleCloseGuardianlitePopup({});
    handleIsUpdatingObject(true);
    function updateObjectLocation(clickObject: ClickObject): UpdateLocationResult {
      switch (clickObject?.type) {
        case 'building':
          clickObject = clickObject as Building;
          return {
            func: modifyBuilding,
            params: {
              idx: clickObject.idx,
              outside_name: clickObject.outside_name,
              service_type: clickObject.service_type,
            }
          }
          break;
        case 'camera':
          clickObject = clickObject as CameraType;
          return {
            func: moveCamera,
            params: {
              mainServiceName: clickObject.main_service_name,
              vms_name: clickObject.vms_name,
              camera_id: clickObject.camera_id,
              outside_idx: clickObject.outside_idx,
              inside_idx: clickObject.inside_idx,
              top_location: clickObject.top_location,
              left_location: clickObject.left_location,
              camera_angle: clickObject.camera_angle,
              camera_type: clickObject.camera_type || null,
              dimension_type: clickObject.dimension_type
            }
          }
          break;
        case 'ebell':
          clickObject = clickObject as ObDeviceType;
          return {
            func: moveEbell,
            params: {
              idx: clickObject.idx,
              outside_idx: clickObject.outside_idx,
              inside_idx: clickObject.inside_idx,
              top_location: clickObject.top_location!,
              left_location: clickObject.left_location!,
            }
          }
          break;
        case 'guardianlite':
          clickObject = clickObject as ObGuardianliteType;
          return {
            func: moveGuardianlite,
            params: {
              guardianlite_ip: clickObject.guardianlite_ip,
              top_location: clickObject.top_location!,
              left_location: clickObject.left_location!,
            }
          }
          break;
        default:
          throw new Error('update canvas object type error')
          break;
      }
    }
    async function setUpdateLocation(leftLocation: number, topLocation: number) {
      const result = {
        success: false
      }
      if (mainCanvasRef.current == null) {
        return result
      }
      const { func, params } = updateObjectLocation(clickObject);
      let resFunc;
      // Building 타입 처리
      if ('idx' in params && 'outside_name' in params) {
        // BuildingFuncParams의 경우
        resFunc = await (func as (params: BuildingFuncParams) => Promise<UpdateObjectLocationResult>)({
          ...params,
          top_location: `${(topLocation / mainCanvasRef.current.height)}`,
          left_location: `${(leftLocation / mainCanvasRef.current.width)}`,
        });
      } else if (isCameraUpdateParams(params)) {
        // CameraUpdateParams 처리
        resFunc = await (func as (params: CameraUpdateParams) => Promise<ApiResultBoolean>)({
          ...params,
          top_location: `${(topLocation / mainCanvasRef.current.height)}`,
          left_location: `${(leftLocation / mainCanvasRef.current.width)}`,
        });
      } else if (isObDeviceUpdateData(params)) {
        // obDeviceUpdateData 처리
        resFunc = await (func as (params: obDeviceUpdateData) => Promise<ApiResultBoolean>)({
          ...params,
          top_location: `${(topLocation / mainCanvasRef.current.height)}`,
          left_location: `${(leftLocation / mainCanvasRef.current.width)}`,
        });
      } else if (isObGuardianliteLocationData(params)) {
        // obGuardianliteUpdateData 처리
        resFunc = await (func as (params: ObGuardianliteLocationData) => Promise<ApiResultBoolean>)({
          ...params,
          top_location: `${(topLocation / mainCanvasRef.current.height)}`,
          left_location: `${(leftLocation / mainCanvasRef.current.width)}`,
        });
      } else {
        throw new Error('Invalid params type');
      }
      if (resFunc.result || resFunc) {
        result.success = true;
        handleIsUpdatingObject(false);
      }
      return result;
    }
    mainCanvasImpl.current.updateObjectLocation({
      canvas: mainCanvasRef.current,
      object: fabricObject,
      callback: setUpdateLocation
    })
    closeContextMenu();
    function isCameraUpdateParams(params: CameraUpdateParams | obDeviceUpdateData | ObGuardianliteLocationData): params is CameraUpdateParams {
      return (
        'mainServiceName' in params &&
        'vms_name' in params &&
        'camera_id' in params
      );
    }
    function isObDeviceUpdateData(params: obDeviceUpdateData | CameraUpdateParams | ObGuardianliteLocationData): params is obDeviceUpdateData {
      return 'idx' in params;
    }
    function isObGuardianliteLocationData(params: obDeviceUpdateData | CameraUpdateParams | ObGuardianliteLocationData): params is ObGuardianliteLocationData {
      return 'guardianlite_ip' in params;
    }
  }

  const handleUpdateCameraAngle = async () => {
    if (fabricObject == null) {
      return;
    }
    if (mainCanvasImpl.current == null || mainCanvasRef.current == null) {
      return;
    }
    if (isUpdatingObject.current) {
      return;
    }
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    handleIsUpdatingObject(true);

    async function updateCameraAngleServer(object: FabricObject, camera_angle: number) {
      const result = {
        success: false
      }
      const updateCamera = object.data as CameraType;
      const { main_service_name: mainServiceName, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, camera_type } = updateCamera;
      const res = await updateCameraAngle({ mainServiceName, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, camera_angle: `${camera_angle}`, camera_type });
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

  const handleCloseDevicePopup = ({ main_service_name, vms_name, camera_id, idx }: { main_service_name?: ServiceType, vms_name?: string, camera_id?: string, idx?: number | null }) => {
    if (idx && (idx !== devicePopup.idx)) {
      return;
    }

    if (main_service_name && vms_name && camera_id && !(
      main_service_name === devicePopup.main_service_name &&
      vms_name === devicePopup.vms_name &&
      camera_id === devicePopup.camera_id
    )) {
      return;
    }

    if (devicePopup.show) {
      setDevicePopup({
        show: false,
        idx: null,
        main_service_name: 'origin',
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
        map_type: 'outdoor',
        type: '',
        service_type: '',
        access_point: ''
      })
    };
  };

  const handleCloseDeviceEventPopup = ({ main_service_name, vms_name, camera_id, idx }: { main_service_name?: ServiceType, vms_name?: string, camera_id?: string, idx?: number | null }) => {
    if (idx && (idx !== deviceEventPopup.idx)) {
      return;
    };
    if (main_service_name && vms_name && camera_id && !(
      main_service_name === deviceEventPopup.main_service_name &&
      vms_name === deviceEventPopup.vms_name &&
      camera_id === deviceEventPopup.camera_id
    )) {
      return;
    };

    if (deviceEventPopup.show) {
      setDeviceEventPopup({
        show: false,
        idx: null,
        main_service_name: 'origin',
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
        map_type: 'outdoor',
        type: '',
        service_type: '',
        access_point: ''
      });
      setEventPopup(null);
    };

    if (mainCanvasImpl.current != null) {
      mainCanvasImpl.current.handleCloseShowDeviceEventPopup();
    };
  };

  const handleCloseGuardianlitePopup = ({ guardianlite_ip }: { guardianlite_ip?: string }) => {
    if (guardianlite_ip && (guardianlite_ip !== guardianlitePopup.ip)) {
      return;
    }
    if (guardianlitePopup.show) {
      setGuardianlitePopup({
        show: false,
        name: '',
        ip: '',
        id: '',
        password: '',
        status: false,
        ch1: '',
        ch2: '',
        ch3: '',
        ch4: '',
        ch5: '',
        ch1_label: '',
        ch2_label: '',
        ch3_label: '',
        ch4_label: '',
        ch5_label: '',
        temper: '',
        top_location: '',
        left_location: '',
        icon_width: 0,
        icon_height: 0,
        canvas_width: 0,
        canvas_height: 0,
        map_type: 'outdoor',
      });
    };
  };

  const toggleCameraAngle = () => {
    setCameraAngle(!cameraAngle)
    closeContextMenu();
  };

  const mutateGuardianlitePopup = ({
    ip,
    name,
    ch1,
    ch2,
    ch3,
    ch4,
    ch5,
    ch1_label,
    ch2_label,
    ch3_label,
    ch4_label,
    ch5_label,
    temper,
    status
  }: MutateGuardianlitePopup) => {
    setGuardianlitePopup((prev) => ({
      ...prev,
      ip,
      name,
      ch1,
      ch2,
      ch3,
      ch4,
      ch5,
      ch1_label,
      ch2_label,
      ch3_label,
      ch4_label,
      ch5_label,
      temper,
      status
    })
    );
  };

  const toggleImageUploadModal = ({ show, imageURL, title }: ImageUploadModalType) => {
    setImageUpload({
      show,
      imageURL,
      title
    });
  };

  const handleChangeUploadImage = (image: string, file: File) => {
    // setUploadImageURL(image);
    setUploadImage(file);
    toggleImageUploadModal({
      show: true,
      title: '실외 이미지 변경',
      imageURL: image,
    })
  }
  const resetUploadImage = () => {
    // setUploadImageURL('');
    setUploadImage(null);
    toggleImageUploadModal({
      show: false,
      imageURL: '',
      title: ''
    })
  }

  const handleConfirmUpdateImage = async () => {
    try {
      if (!uploadImage) {
        return;
      }
      const formData = new FormData();
      formData.append("outdoorplan", uploadImage);
      const result = await apiUploadOutdoorImage<UploadOutdoorImageResult>(formData);
      if (!result || result.message !== 'ok') {
        return;
      }
      const current = useCanvasMapStore.getState();
      setCanvasMapState({
        ...current,
        mapImageURL: `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`
      })
      resetUploadImage();
      window.location.reload();
    } catch (err) {
      console.error(err);
    };
  };

  useEffect(() => {
    const imageSource = mapImageURL || image;
    if (mainCanvasRef.current == null || imageSource) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
      cleanUpMiniMapCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapImageURL, image]);

  useEffect(() => {
    if (buildings?.result == null || !canvasReady) {
      return;
    }
    settingObject({ buildings: buildings.result as Building[] });
  }, [canvasReady, buildings?.result, settingObject])

  useEffect(() => {
    if (cameras == null || !canvasReady) {
      return;
    }
    settingObject({ cameras: cameras.filter((camera: CameraType) => camera.outside_idx === 0), cameraAngle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, cameras, cameraAngle])

  useEffect(() => {
    if (ebells == null || !canvasReady) {
      return;
    }
    settingObject({ ebells: ebells.filter((ebell: ObDeviceType) => ebell.outside_idx === 0) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, ebells])

  useEffect(() => {
    if (guardianlites == null || !canvasReady) {
      return;
    }
    settingObject({ guardianlites: guardianlites.filter((guardianlite: ObGuardianliteType) => guardianlite.outside_idx === null) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, guardianlites]);

  useEffect(() => {
    if (pidsList == null || !canvasReady) {
      return;
    }
    settingObject({ pidsList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, pidsList]);

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const buildingSocket = socketService.subscribe('ob_buildings-update', (received) => {
      if (received) {
        mutateBuildings();
      };
    });
    const cameraSocket = socketService.subscribe('ob_cameras-update', (received) => {
      if (received) {
        mutateCamera();
      };
    });
    const ebellSocket = socketService.subscribe('ob_ebells-update', (received) => {
      if (received) {
        mutateEbell();
      };
    });
    const guardianliteSocket = socketService.subscribe('ob_guardianlites-update', (received) => {
      if (received) {
        mutateGuardianlites();
      };
    });
    const pidsSocket = socketService.subscribe('ob_pids-update', (received) => {
      if (received) {
        mutatePIDS();
      };
    });

    return () => {
      buildingSocket();
      cameraSocket();
      ebellSocket();
      guardianliteSocket();
      pidsSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  useEffect(() => {
    if (mainCanvasRef.current == null) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
      cleanUpMiniMapCanvas();
    }
  }, [isFullscreen]);

  useEffect(() => {
    createMiniCanvas();
    return () => {
      cleanUpMiniMapCanvas();
    }
  }, [useMinimap]);

  useEffect(() => {
    if (mainCanvasRef.current == null && prevUseServiceNav !== undefined && prevUseServiceNav !== useServiceNav) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
    }
  }, [useServiceNav]);

  useEffect(() => {
    if (mainCanvasRef.current == null && prevUseDataStatus !== undefined && prevUseDataStatus !== useDataStatus) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
    }
  }, [useDataStatus]);

  useEffect(() => {
    if (mainCanvasRef.current == null && prevClientSize != null && (
      prevClientSize.width !== clientSizeRef.current.width ||
      prevClientSize.height !== clientSizeRef.current.height
    )) {
      initializeCanvas()
        .then(() => {
          if (!deviceObjectRendered.current.building?.rendered) {
            settingObject({
              buildings: buildings?.result as Building[]
            });
          };
          if (!deviceObjectRendered.current.camera.rendered) {
            settingObject({
              cameras: cameras.filter((camera: CameraType) => camera.outside_idx === 0), cameraAngle
            });
          };
          if (!deviceObjectRendered.current.ebell.rendered) {
            settingObject({ ebells: ebells.filter((ebell: ObDeviceType) => ebell.outside_idx === 0) });
          };
          if (!deviceObjectRendered.current.guardianlite.rendered) {
            settingObject({ guardianlites: guardianlites.filter((guardianlite: ObGuardianliteType) => guardianlite.outside_idx === null) });
          };
          if (!deviceObjectRendered.current.PIDS) {
            settingObject({ pidsList });
          };
        })
    };
    return () => {
      cleanUpMapCanvas();
      cleanUpMiniMapCanvas();
    }
  }, [clientSizeRef.current.height, clientSizeRef.current.width]);

  useEffect(() => {
    if (eventPopup == null || mainCanvasImpl.current == null) {
      return;
    };
    const {
      outsideIdx,
      deviceIdx,
      deviceType,
      cameraId,
      ipaddress,
      leftLocation,
      topLocation,
      eventName,
      mainServiceName,
      vmsName,
      deviceName
    } = eventPopup;

    if (outsideIdx !== 0) {
      return;
    };

    if (deviceType === 'camera' && !deviceObjectRendered.current.camera.rendered) {
      return;
    };

    if (deviceType === 'ebell' && !deviceObjectRendered.current.ebell.rendered) {
      return;
    };

    const result: FindCanvasDeviceObjectResult = mainCanvasImpl.current.showEventPopup({
      deviceType,
      eventCameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
      deviceIdx,
      eventName,
      ipaddress,
      mainServiceName,
      vmsName,
      cameraId,
      mapType: 'outdoor',
      leftLocation,
      topLocation,
      pidsId: deviceName ? deviceName : undefined
    });
    if (result.success === false) {
      return;
    };
    closeDevicePopup();
    // 중복된 클릭 장비 팝업 닫기
    function closeDevicePopup() {
      if (devicePopup.show === false || devicePopup.left_location == null || devicePopup.top_location == null) {
        return;
      };
      if (devicePopup.top_location === topLocation && devicePopup.left_location === leftLocation) {
        handleCloseDevicePopup({});
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventPopup, canvasReady, deviceObjectRendered.current.camera.rendered, deviceObjectRendered.current.ebell.rendered]);

  return (
    <div className="flex relative w-full h-full">
      {!is3DView ? (
        <button
          className='absolute top-4 left-4 z-10 w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] rounded-md text-white text-[0.75rem] self-center'
          onClick={toggleCameraAngle}
        >
          카메라 화각
        </button>
      ) : (
        <button
          className='absolute top-4 left-4 z-10 w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] rounded-md text-white text-[0.75rem] self-center'
          onClick={() => setIsRoation((prev) => !prev)}
        >
          {isRoation ? '회전 중지' : '회전 시작'}
        </button>
      )}
      <button
        className={`absolute top-4 left-24 z-10 w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] rounded-md text-white text-[0.75rem] self-center`}
        onClick={() => {
          const current = useCanvasMapStore.getState();
          setCanvasMapState({
            ...current,
            buildingIdx: current.buildingIdx,
            floorIdx: 0,
            is3DView: !current.is3DView
          })
        }}
      >
        {"3D 전환"}
      </button>

      {!is3DView && (
        <section
          className='relative w-full'
        >
          <Suspense
            fallback={
              <div className="flex flex-auto flex-col h-[100vh]">
                <Loading loading={true} />
              </div>
            }
          >
            <>
              <canvas key={canvasKey} id='mainCanvas' />
              <canvas key={`miniMapCanvas-${isFullscreen}`} id='miniMapCanvas' className={`absolute top-8 left-[83%] z-10 border-[#e5e7eb] border-solid border-[1px] ${canvasReady ? '' : 'hidden'}`} />
            </>
            <Upload
              handleChangeUploadImage={handleChangeUploadImage}
              title={'실외'}
              className='absolute top-[0.25rem] right-[0.5rem]'
            />
          </Suspense>
          <ul id="contextMenu" className='absolute hidden bg-white border-[1px] border-solid border-[#ccc], p-[10px] w-[12rem] rounded-md z-20' >
            <ContextMenu
              mapType='outdoor'
              fabricObject={fabricObject}
              object={clickObject}
              updateLocation={handleUpdateLocation}
              cameraAngle={cameraAngle}
              updateCameraAngle={handleUpdateCameraAngle}
              onClick={toggleModal}
            />
          </ul>
          {devicePopup.show ?
            <DevicePopup
              on_event={false}
              idx={devicePopup.idx}
              main_service_name={devicePopup.main_service_name}
              vms_name={devicePopup.vms_name}
              camera_id={devicePopup.camera_id}
              ip={devicePopup.ip}
              name={devicePopup.name}
              top_location={devicePopup.top_location}
              left_location={devicePopup.left_location}
              canvas_width={devicePopup.canvas_width}
              canvas_height={devicePopup.canvas_height}
              icon_width={devicePopup.icon_width}
              icon_height={devicePopup.icon_height}
              map_type={"outdoor"}
              type={devicePopup.type}
              close={handleCloseDevicePopup}
              service_type={devicePopup.service_type}
              access_point={devicePopup.access_point}
            />
            :
            ''}
          {deviceEventPopup.show ?
            <DevicePopup
              on_event={deviceEventPopup.on_event}
              idx={deviceEventPopup.idx}
              main_service_name={deviceEventPopup.main_service_name}
              vms_name={deviceEventPopup.vms_name}
              camera_id={deviceEventPopup.camera_id}
              ip={deviceEventPopup.ip}
              name={deviceEventPopup.name}
              top_location={deviceEventPopup.top_location}
              left_location={deviceEventPopup.left_location}
              canvas_width={deviceEventPopup.canvas_width}
              canvas_height={deviceEventPopup.canvas_height}
              icon_width={deviceEventPopup.icon_width}
              icon_height={deviceEventPopup.icon_height}
              map_type={"outdoor"}
              type={deviceEventPopup.type}
              close={handleCloseDeviceEventPopup}
              service_type={deviceEventPopup.service_type}
              access_point={deviceEventPopup.access_point}
            />
            :
            ''}
          {guardianlitePopup.show ? (
            <GuardianlitePopup
              show={guardianlitePopup.show}
              ip={guardianlitePopup.ip}
              id={guardianlitePopup.id}
              password={guardianlitePopup.password}
              name={guardianlitePopup.name}
              status={guardianlitePopup.status}
              ch1={guardianlitePopup.ch1}
              ch2={guardianlitePopup.ch2}
              ch3={guardianlitePopup.ch3}
              ch4={guardianlitePopup.ch4}
              ch5={guardianlitePopup.ch5}
              ch1_label={guardianlitePopup.ch1_label}
              ch2_label={guardianlitePopup.ch2_label}
              ch3_label={guardianlitePopup.ch3_label}
              ch4_label={guardianlitePopup.ch4_label}
              ch5_label={guardianlitePopup.ch5_label}
              temper={guardianlitePopup.temper}
              top_location={guardianlitePopup.top_location}
              left_location={guardianlitePopup.left_location}
              canvas_width={guardianlitePopup.canvas_width}
              canvas_height={guardianlitePopup.canvas_height}
              icon_width={guardianlitePopup.icon_width}
              icon_height={guardianlitePopup.icon_height}
              map_type='outdoor'
              mutate={mutateGuardianlitePopup}
              close={handleCloseGuardianlitePopup}
            />
          ) :
            ''
          }
          {modal.show && (
            <Modal modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
              <div ref={modalChildRef}>
                {setModalChild(modal.type)}
              </div>
            </Modal>
          )
          }
        </section>
      )}
      {/* <ThreeJsContainer viewMode={viewMode} isRoation={isRoation} /> */}
      {ImageUpload.show ?
        <ImageUploadModal
          show={ImageUpload.show}
          imageURL={ImageUpload.imageURL}
          title={ImageUpload.title}
          toggle={toggleImageUploadModal}
          confirm={handleConfirmUpdateImage}
        />
        : ''}
    </div>
  );
}