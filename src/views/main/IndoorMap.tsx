import { Dispatch, SetStateAction, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import ModalSetting from './modals/ModalSetting';
import Loading from '@/components/shared/Loading';
import ContextMenu from './modals/ContextMenu';
import { ModalType } from '@/@types/modal';
import IndoorAside from './components/IndoorAside';
import { CanvasObject, ClickLocation, ClickObject, RemoveObjectResult } from '@/@types/canvas';
// eslint-disable-next-line import/named
import { Canvas, StaticCanvas, FabricObject, FabricImage } from 'fabric';
import CanvasImpl from '@/utils/CanvasFabric';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useFloors } from '@/utils/hooks/main/useFloors';
import ImageUploadModal from './modals/ImageUploadModal';
import { apiAddGuardianlite, apiAddMDET, apiDoorLockControl, apiGetAcus, apiModifyCamera, apiModifyDoor, apiModifyEbell, apiModifyGuardianlite, apiModifyGuardianliteLocation, apiRemoveGuardianlite, apiUploadFloorImage } from '@/services/ObserverService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useMinimapStore } from '@/store/minimapStore';
import { useServiceNavStore } from '@/store/serviceNavStore';
import UsePrevious from '@/utils/hooks/usePreviousVal';
import { ImageUploadModalType } from './BuildingDashboard';
import MiniMapCanvasImpl from '@/utils/MinimapCanvasFabric';
import Upload from '@/utils/upload/image';
import AddCamera from './components/AddCamera';
import { useCameras } from '@/utils/hooks/useCameras';
import { CameraType, CameraTypes } from '@/@types/camera';
import { ApiResultBoolean } from '@/@types/api';
import { CameraUpdateParams } from './types/camera';
import RemoveCamera from './components/RemoveCamera';
import { ClientSize, FindCanvasDeviceObjectResult, RenderedDeviceObject } from './OutdoorMap';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { DevicePopupType, ObDeviceType, obDeviceUpdateData, ObGuardianliteType } from '@/@types/device';
import AddDoor from './components/AddDoor';
import RemoveDoor from './components/RemoveDoor';
import DoorAccessPerson from './components/DoorAccessPerson';
import { AccessCtlLog } from './types/accessCtl';
import DevicePopup from '../../components/common/device/DevicePopup';
import AddEbell from './components/AddEbell';
import { useEbells } from '@/utils/hooks/main/useEbells';
import RemoveEbell from './components/RemoveEbell';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import RemoveGuardianlite from './components/RemoveGuardianlite';
import { MutateGuardianlitePopup, ObGuardianliteLocationData, ObGuardianlitePopup } from './types/guardianlite';
import AddModifyGuardianlite from './modals/AddModifyGuardianlite';
import GuardianlitePopup from './components/GuardianlitePopup';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { ServiceType } from '@/@types/common';
import { EventPopup } from '@/@types/event';
import AddModifyMDET from './components/AddModifyMDET';
// import { useMDETs } from '@/utils/hooks/main/useMDETs';
import ModifyCamera from './components/ModifyCamera';
import { useWindowSizeChange } from '@/utils/hooks/main/useWindowHeightChange';
import { DeviceList } from './components/DeviceList';

type UploadFloorImageResult = {
  file: File,
  message: 'ok' | 'fail';
}

type addCammeraResult = {
  success: boolean;
}

type UpdateLocationFunc<T> = (params: T) => Promise<ApiResultBoolean>;

type UpdateLocationResult =
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

type Props = {
  eventPopup: EventPopup | null;
  setEventPopup: Dispatch<SetStateAction<EventPopup | null>>
}

export default function IndoorMap({ eventPopup, setEventPopup }: Props) {
  const { buildingIdx, floorIdx, buildingName, floorName, setCanvasMapState, mapImageURL, is3DView, threeDModelId } = useCanvasMapStore();
  const { isFullscreen } = useFullScreenStore();
  const { cameras, error: camerasError, mutate: mutateCamera } = useCameras('origin');
  const { doors, error: doorsError, mutate: mutateDoors } = useDoors(floorIdx, is3DView ? '3d' : '2d');
  const { ebells, error: ebellsError, mutate: mutateEbell } = useEbells({ inside_idx: floorIdx, dimension_type: is3DView ? '3d' : '2d' });
  const { guardianlites, error: guardianlitesError, mutate: mutateGuardianlites } = useGuardianlites({ inside_idx: floorIdx, dimension_type: is3DView ? '3d' : '2d' });
  // const { mdets, error: mdetsError, mutate: mutateMDETs } = useMDETs();
  const { socketService } = useSocketConnection();
  const { use: useMinimap } = useMinimapStore();
  const { use: useServiceNav } = useServiceNavStore();
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
  const deviceObjectRendered = useRef<RenderedDeviceObject>({
    camera: {
      rendered: false,
      when: null
    },
    ebell: {
      rendered: false,
      when: null
    },
    door: {
      rendered: false,
      when: null
    },
    guardianlite: {
      rendered: false,
      when: null
    },
  });
  const [clickObject, setClickObject] = useState<ClickObject>(null);
  const [fabricObject, setFabricObject] = useState<CanvasObject>(null);
  const [modal, setModal] = useState<ModalType>({
    show: false,
    type: '',
    title: ''
  });
  const modalChildRef = useRef<HTMLDivElement>(null);
  const isUpdatingObject = useRef<boolean>(false);
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const [ImageUpload, setImageUpload] = useState<ImageUploadModalType>({
    show: false,
    imageURL: '',
    title: ''
  });
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [cameraAngle, setCameraAngle] = useState(true);
  const [objectLabel, setObjectLabel] = useState(false);
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
    type: '',
    service_type: '',
    access_point: '',
    startDateTime: '',
    device_id: '',
    timeout: 0
  });
  const devicePopupRef = useRef<DevicePopupType | null>(null);
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
    type: '',
    service_type: '',
    access_point: '',
    device_name: '',
  });
  const [guardianlitePopup, setGuardianlitePopup] = useState<ObGuardianlitePopup>({
    show: false,
    status: false,
    name: '',
    ip: '',
    id: '',
    password: '',
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
    map_type: 'indoor'
  });
  const [accessCtlLog, setAccessCtlLog] = useState<AccessCtlLog[]>([]);
  const prevUseServiceNav = UsePrevious(useServiceNav);
  const clientSizeRef = useRef<ClientSize>({
    width: innerWidth,
    height: innerHeight
  });
  useWindowSizeChange((height, width) => {
    clientSizeRef.current = {
      height,
      width
    };
  });
  const prevClientSize = UsePrevious(clientSizeRef.current);

  if (camerasError) {
    console.error('get cameras error');
  };
  if (doorsError) {
    console.error('get doors error');
  };
  if (ebellsError) {
    console.error('get ebells error');
  };
  if (guardianlitesError) {
    console.error('get guardianlites error');
  };
  // if (mdetsError) {
  //   console.error('get mdets error');
  // };

  const handleChangeUploadImage = (image: string, file: File) => {
    // setUploadImageURL(image);
    setUploadImage(file);
    toggleImageUploadModal({
      show: true,
      title: '층 이미지 변경',
      imageURL: image,
    })
  }
  const resetUploadImage = () => {
    setUploadImage(null);
    toggleImageUploadModal({
      show: false,
      imageURL: '',
      title: ''
    })
  }
  const buildingId = is3DView ? threeDModelId : buildingIdx;
  const { mutate: mutateFloor } = useFloors(buildingIdx, threeDModelId);
  // const floors: Floor[] = data?.result || [];
  const toggleImageUploadModal = ({ show, imageURL, title }: ImageUploadModalType) => {
    setImageUpload({
      show,
      imageURL,
      title
    });
  };

  const handleConfirmUpdateImage = async () => {
    try {
      if (!uploadImage) {
        return;
      }
      const formData = new FormData();
      formData.append("idx", `${floorIdx}`);
      formData.append("map_image_url", uploadImage.name);
      formData.append("floorplan", uploadImage);
      const result = await apiUploadFloorImage<UploadFloorImageResult>(formData);
      if (!result || result.message !== 'ok') {
        return;
      }
      resetUploadImage();
      const current = useCanvasMapStore.getState();
      setCanvasMapState({
        ...current,
        floorIdx,
        mapImageURL: `http://${window.location.hostname}:4200/images/floorplan/${uploadImage.name}`
      });
    } catch (err) {
      console.error(err);
    };
  };


  const addCamera = async (vms_name: string, camera_id: string, camera_type: CameraTypes): Promise<addCammeraResult> => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      try {
        const res = await apiModifyCamera({
          camera_id,
          vms_name,
          top_location: `${(y / mainCanvasRef.current.height)}`,
          left_location: `${(x / mainCanvasRef.current.width)}`,
          mainServiceName: 'origin',
          outside_idx: buildingId,
          inside_idx: floorIdx,
          dimension_type: is3DView ? '3d' : '2d',
          use_status: true,
          camera_type,
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

  const modifyCamera = async ({ main_service_name, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, camera_angle, camera_type }: {
    main_service_name: string;
    vms_name: string;
    camera_id: string;
    outside_idx: number;
    inside_idx: number;
    top_location: string;
    left_location: string;
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
        camera_type,
        dimension_type: is3DView ? '3d' : '2d',
      })
      if (res.result.success) {
        toggleModal({ show: false, title: '', type: '' });
        return {
          message: 'ok',
          result: res.result
        }
      }
      return {
        message: 'fail',
        result: {
          success: false
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
    camera_type,
    dimension_type
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
      camera_type,
      dimension_type
    })
  }

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
      top_location: '',
      left_location: '',
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
      })
      handleCloseDevicePopup({ main_service_name, vms_name, camera_id });
      handleCloseDeviceEventPopup({ main_service_name, vms_name, camera_id });
    }
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
    camera_type,
    dimension_type
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
      camera_type,
      dimension_type
    })
  }

  const addDoor = async (idx: number): Promise<void> => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      try {
        const res = await apiModifyDoor({
          idx,
          top_location: `${(y / mainCanvasRef.current.height)}`,
          left_location: `${(x / mainCanvasRef.current.width)}`,
          inside_idx: floorIdx,
          outside_idx: buildingId,
          dimension_type: is3DView ? '3d' : '2d'
        })
        if (res) {
          toggleModal({ show: false, title: '', type: '' });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  const removeDoor = async () => {
    if (clickObject == null) {
      return;
    }
    const { idx } = clickObject as ObDeviceType;
    const result = await apiModifyDoor({
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
      });
      handleCloseDevicePopup({ idx });
      handleCloseDeviceEventPopup({ idx });
    }
  }

  const moveDoor = ({
    idx,
    outside_idx,
    inside_idx,
    left_location,
    top_location,
    dimension_type
  }: obDeviceUpdateData) => {
    return apiModifyDoor({
      idx,
      inside_idx,
      outside_idx,
      top_location,
      left_location,
      dimension_type
    })
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
    }
  }

  const doorSetCamera = async (main_service_name: string, vms_name: string, camera_id: string, service_type: string): Promise<boolean> => {
    try {
      let cameraId: string | null;
      if (main_service_name && vms_name != null && camera_id && service_type) {
        cameraId = `${main_service_name}:${vms_name}:${camera_id}:${service_type}`
      } else {
        cameraId = null;
      }

      const idx = (clickObject as ObDeviceType)?.idx as number

      const res = await apiModifyDoor({
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


  const handleLockDoor = async () => {

    const { device_id } = clickObject as ObDeviceType;
    try {
      if (device_id == null || doors == null) {
        return;
      }
      const acusRes = await apiGetAcus();
      if (!acusRes || !acusRes.result || acusRes.result.length === 0) {
        return;
      }
      const prefix = device_id.substring(0, device_id.length - 2);
      const controlId = prefix.padStart(3, '0');
      const acu = acusRes.result.find((acu: ObDeviceType) => acu.device_id === controlId);
      if (!acu) {
        return;
      }
      const result = await apiDoorLockControl({
        acuId: controlId,
        acuIpaddress: acu.device_ip,
        command: 0,
        doorId: device_id,
      })
      if (result.result) {
        closeContextMenu();
      }
    } catch (err) {
      console.log('출입문 잠금 오류: ', err);
    }
  }

  const handleUnlockDoor = async (cmdSec?: number) => {
    const { device_id } = clickObject as ObDeviceType;
    try {
      if (device_id == null || doors == null) {
        return;
      }
      const acusRes = await apiGetAcus();
      if (!acusRes || !acusRes.result || acusRes.result.length === 0) {
        return;
      }
      const prefix = device_id.substring(0, device_id.length - 2);
      const controlId = prefix.padStart(3, '0');
      const acu = acusRes.result.find((acu: ObDeviceType) => acu.device_id === controlId);
      if (!acu) {
        return;
      }
      const result = await apiDoorLockControl({
        acuId: controlId,
        acuIpaddress: acu.device_ip,
        command: 1,
        doorId: device_id,
        cmdSec
      })
      if (result.result) {
        closeContextMenu();
      }
    } catch (err) {
      console.log('출입문 잠금 해제(10초) 오류: ', err);
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
          inside_idx: floorIdx,
          outside_idx: buildingId,
          dimension_type: is3DView ? '3d' : '2d'
        })
        if (res) {
          toggleModal({ show: false, title: '', type: '' });
        }
      } catch (err) {
        console.error(err);
      };
    };
  };

  const ebellSetCamera = async (main_service_name: string, vms_name: string, camera_id: string, service_type: string): Promise<boolean> => {
    try {
      let cameraId: string | null;
      if (main_service_name && vms_name && camera_id && service_type) {
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

  const moveEbell = ({
    idx,
    outside_idx,
    inside_idx,
    left_location,
    top_location,
    dimension_type
  }: obDeviceUpdateData) => {
    return apiModifyEbell({
      idx,
      inside_idx,
      outside_idx,
      top_location,
      left_location,
      dimension_type
    })
  }

  const moveGuardianlite = ({
    guardianlite_ip,
    top_location,
    left_location,
    dimension_type
  }: ObGuardianliteLocationData) => {
    return apiModifyGuardianliteLocation({
      guardianlite_ip,
      top_location,
      left_location,
      dimension_type
    })
  }

  const addGuardianlite = async ({ name, ipaddress, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    { name: string, ipaddress: string, ch1_label?: string, ch2_label?: string, ch3_label?: string, ch4_label?: string, ch5_label?: string }
  ) => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      return await apiAddGuardianlite({
        outside_idx: buildingId,
        inside_idx: floorIdx,
        top_location: `${(y / mainCanvasRef.current.height)}`,
        left_location: `${(x / mainCanvasRef.current.width)}`,
        guardianlite_ip: ipaddress,
        guardianlite_name: name,
        ch1_label,
        ch2_label,
        ch3_label,
        ch4_label,
        ch5_label,
        dimension_type: is3DView ? '3d' : '2d'
      });
    };
  };

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
      closeContextMenu();
      handleCloseGuardianlitePopup({ guardianlite_ip })
      toggleModal({
        show: false,
        type: '',
        title: ''
      });
    };
  };

  const addMDET = async ({ name, ipaddress, location }:
    { name: string, ipaddress: string, location?: string }
  ) => {
    const { x, y } = clickLocationRef.current;
    if (mainCanvasRef.current) {
      return await apiAddMDET({
        device_name: name,
        device_ip: ipaddress,
        outside_idx: buildingId,
        inside_idx: floorIdx,
        top_location: `${(y / mainCanvasRef.current.height)}`,
        left_location: `${(x / mainCanvasRef.current.width)}`,
        device_location: location
      });
    };
  };

  const setModalChild = (type: string) => {
    switch (type) {
      case 'camera-add':
        return <AddCamera type='add' add={addCamera} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
      case 'camera-remove':
        return <RemoveCamera camera={clickObject as CameraType} toggleModal={toggleModal} onDelete={removeCamera} />
        break;
      case 'door-add':
        return <AddDoor add={addDoor} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'door-remove':
        return <RemoveDoor door={clickObject as ObDeviceType} toggleModal={toggleModal} onDelete={removeDoor} />
        break;
      case 'door-camera':
        return <AddCamera type='setCamera' setDeviceCamera={doorSetCamera} clickDevice={clickObject as ObDeviceType} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />;
        break;
      case 'ebell-add':
        return <AddEbell add={addEbell} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
        break;
      case 'ebell-remove':
        return <RemoveEbell ebell={clickObject as ObDeviceType} toggleModal={toggleModal} onDelete={removeEbell} />
        break;
      case 'ebell-camera':
        return <AddCamera type='setCamera' setDeviceCamera={ebellSetCamera} clickDevice={clickObject as ObDeviceType} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />;
        break;
      case 'guardianlite-add':
        return <AddModifyGuardianlite toggleModal={toggleModal} add={addGuardianlite} />
        break;
      case 'guardianlite-remove':
        return <RemoveGuardianlite guardianlite={clickObject as ObGuardianliteType} toggleModal={toggleModal} onDelete={removeGuardianlite} />
        break;
      case 'guardianlite-modify':
        return <AddModifyGuardianlite toggleModal={toggleModal} modify={modifyGuardianlite} guardianlite={clickObject as ObGuardianliteType} />
        break;
      case 'mdet-add':
        return <AddModifyMDET add={addMDET} toggleModal={toggleModal} />
        break;
      case 'camera-type':
        return <ModifyCamera cameraDetail={clickObject as CameraType} modify={modifyCamera} onCancel={() => toggleModal({ show: false, title: '', type: '' })} />
      default:
        return undefined;
        break;
    }
  }

  const handleIsUpdatingObject = (status: boolean) => {
    isUpdatingObject.current = status;
  }

  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')!;
    if (menu) {
      menu.style.display = 'none';
    }
  }


  const handleUpdateLocation = async () => {
    if (fabricObject == null) {
      return;
    }
    if (mainCanvasImpl.current == null) {
      return;
    }
    if (isUpdatingObject.current) {
      return;
    }
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    handleCloseGuardianlitePopup({});
    handleIsUpdatingObject(true);
    function updateObjectLocation(clickObject: ClickObject): UpdateLocationResult {
      switch (clickObject?.type) {
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
            } as CameraUpdateParams
          }
          break;
        case 'door':
          clickObject = clickObject as ObDeviceType;
          return {
            func: moveDoor,
            params: {
              idx: clickObject.idx,
              outside_idx: clickObject.outside_idx,
              inside_idx: clickObject.inside_idx,
              top_location: clickObject.top_location!,
              left_location: clickObject.left_location!,
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
              dimension_type: clickObject.dimension_type
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
      // 타입 가드로 타입을 구분
      if (isCameraUpdateParams(params)) {
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
        throw new Error('Unexpected params type');
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

  const toggleModal = ({ show, title, type }: ModalType) => {
    setModal({
      show,
      title,
      type
    })
  }

  const setCanvasSize = () => {
    const width = clientSizeRef.current.width - 262;
    let height = clientSizeRef.current.height - (isFullscreen ? -28 : 107); // 96px는 헤더 높이

    if (useServiceNav) {
      height -= 62.5; // 서비스 네비게이션 사용 시 높이 조정
    };

    // if (isFullscreen) {
    //   height += 135;
    // }

    return {
      width,
      height
    }
  }

  const setMiniCanvasSize = () => {
    let width = clientSizeRef.current.width - 262;
    width = (width / 4.7);
    let height = clientSizeRef.current.height - (isFullscreen ? -28 : 107);
    if (useServiceNav) {
      height -= 62.5; // 서비스 네비게이션 사용 시 높이 조정
    };

    // if (isFullscreen) {
    //   height += 135;
    // }
    height = (height / 4.67);

    return {
      width,
      height
    };
  };

  const showDoorPopup = (accessCtlLog: AccessCtlLog[]) => {
    if (mainCanvasImpl.current == null) {
      return;
    };

    accessCtlLog.forEach((accessCtlLog) => {
      const deviceIdx = mainCanvasImpl.current?.handleDoorPopup(accessCtlLog);
      setTimeout(() => {
        handleCloseDevicePopup({ idx: deviceIdx, timeout: 1000 * 1 * 20 });
      }, 1000 * 1 * 20);
    });

  };

  const createMiniCanvas = async () => {
    const miniCanvasEl = document.getElementById('miniMapCanvas') as HTMLCanvasElement;
    if (!miniCanvasEl || mapImageURL == null) {
      return;
    }
    cleanUpMiniMapCanvas();
    if (useMinimap && mainCanvasRef.current) {
      const miniMapCanvasImpl = await MiniMapCanvasImpl.createMiniCanvas(
        mainCanvasRef.current,
        mapImageURL,
        setMiniCanvasSize().width,
        setMiniCanvasSize().height
      );
      miniMapCanvasImpl.registerMainCanvasEvents();
      miniMapCanvasRef.current = miniMapCanvasImpl.getCanvas();
      setCanvasReady(true);
    }
  }

  const createCanvas = async () => {
    if (mapImageURL == null || createCanvasRef.current) {
      return;
    };
    if (isUpdatingObject.current) {
      handleIsUpdatingObject(false);
    };
    createCanvasRef.current = new Date();
    const canvasImpl = await CanvasImpl.createCanvas(
      mapImageURL,
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const { height } = setCanvasSize();
        resizeCanvasByBgHeight(height);
        mainCanvasRef.current?.calcOffset();
        mainCanvasRef.current?.requestRenderAll();
      });
    });
    createMiniCanvas();
    function resizeCanvasByBgHeight(targetHeight: number) {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;

      const bg = canvas.backgroundImage as FabricImage; // FabricImage
      if (!bg || !bg.width || !bg.height) return;

      const imgW = bg.width;
      const imgH = bg.height;

      // 1) height 기준 스케일
      const scale = targetHeight / imgH;

      // 2) 비율 유지 width 계산
      const width = Math.round(imgW * scale);
      const height = Math.round(imgH * scale);

      // 3) 캔버스 크기 변경 (css + backstore 같이)
      canvas.setDimensions({ width, height }, { cssOnly: true });
      canvas.setDimensions({ width, height }, { backstoreOnly: true });

      // 4) 배경이미지도 동일 스케일/좌표로 맞춰서 "캔버스=이미지"가 되게
      bg.set({
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        scaleX: scale,
        scaleY: scale,
      });

      canvas.calcOffset();
      canvas.requestRenderAll();
    }
  }

  const initializeCanvas = async () => {
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    handleCloseGuardianlitePopup({});
    await createCanvas();
  };

  const cleanUpMapCanvas = () => {
    if (mainCanvasRef.current) {
      closeContextMenu();
      mainCanvasRef.current.dispose();
      mainCanvasRef.current = null; // 참조 초기화
      setCanvasReady(false);
      createCanvasRef.current = null;
    }
  };

  const cleanUpMiniMapCanvas = () => {
    if (miniMapCanvasRef.current) {
      miniMapCanvasRef.current.dispose();
      miniMapCanvasRef.current = null; // 참조 초기화
    }
  };

  const settingObject = useCallback(async ({ cameras, cameraAngle, objectLabel, doors, ebells, guardianlites }: { cameras?: CameraType[], doors?: ObDeviceType[], cameraAngle?: boolean, objectLabel?: boolean, ebells?: ObDeviceType[], guardianlites?: ObGuardianliteType[] }) => {
    if (mainCanvasImpl.current == null) {
      return;
    }
    if (isUpdatingObject.current) {
      handleIsUpdatingObject(false);
    }

    if (cameras) {
      await mainCanvasImpl.current.addObject({
        items: cameras.map((camera) => ({ ...camera, type: 'camera' })),
        cameraAngle,
        objectLabel,
        type: 'camera'
      });
      deviceObjectRendered.current.camera = {
        rendered: true,
        when: new Date()
      };
    };
    if (doors) {
      await mainCanvasImpl.current.addObject({
        items: doors.map((door) => ({ ...door, type: 'door' })),
        objectLabel,
        type: 'door'
      });

      deviceObjectRendered.current.door = {
        rendered: true,
        when: new Date()
      };
    };
    if (ebells) {
      await mainCanvasImpl.current.addObject({
        items: ebells.map((ebell) => ({ ...ebell, type: 'ebell' })),
        type: 'ebell'
      });
      deviceObjectRendered.current.ebell = {
        rendered: true,
        when: new Date()
      };
    };
    if (guardianlites) {
      await mainCanvasImpl.current.addObject({
        items: guardianlites.map((guardianlite) => ({ ...guardianlite, type: 'guardianlite' })),
        type: 'guardianlite'
      })
      deviceObjectRendered.current.guardianlite = {
        rendered: true,
        when: new Date()
      };
    };
  }, [])

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
    handleIsUpdatingObject(true);
    handleCloseDevicePopup({});
    handleCloseDeviceEventPopup({});
    async function updateCameraAngleServer(object: FabricObject, camera_angle: number) {
      const result = {
        success: false
      }
      const updateCamera = object.data as CameraType;
      const { main_service_name: mainServiceName, vms_name, camera_id, outside_idx, inside_idx, top_location, left_location, camera_type, dimension_type } = updateCamera;
      const res = await updateCameraAngle({
        mainServiceName,
        vms_name,
        camera_id,
        outside_idx,
        inside_idx,
        top_location,
        left_location,
        camera_angle: `${camera_angle}`, camera_type,
        dimension_type: dimension_type
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

  const handleCloseDevicePopup = ({ main_service_name, vms_name, camera_id, idx, timeout }: { main_service_name?: ServiceType, vms_name?: string, camera_id?: string, idx?: number | null, timeout?: number }) => {
    if (devicePopupRef.current == null) {
      return;
    };

    if (idx != null && idx !== devicePopupRef.current.idx) {
      return;
    };

    if (main_service_name && vms_name && camera_id && !(
      main_service_name === devicePopupRef.current.main_service_name &&
      vms_name === devicePopupRef.current.vms_name &&
      camera_id === devicePopupRef.current.camera_id
    )) {
      return;
    }

    if (timeout && devicePopupRef.current.timeout == null) {
      return;
    }

    if (devicePopupRef.current.show) {
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
        map_type: 'indoor',
        type: '',
        service_type: '',
        access_point: '',
        startDateTime: '',
        device_id: '',
        timeout: undefined
      });
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
        map_type: 'indoor',
        type: '',
        service_type: '',
        access_point: '',
        device_name: ''
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
        map_type: 'indoor',
      })
    }
  };

  const toggleCameraAngle = () => {
    setCameraAngle(!cameraAngle)
    closeContextMenu();
  };

  const toggleObjectLabel = () => {
    setObjectLabel(!objectLabel)
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

  const handleShowDevicePopup = (value: DevicePopupType | ObGuardianlitePopup) => {
    if ((value as DevicePopupType).type) {
      setDevicePopup({
        ...value,
        canvas_width: mainCanvasRef.current!.width,
        canvas_height: mainCanvasRef.current!.height,
        icon_width: 31,
        icon_height: 31
      } as DevicePopupType);
    } else {
      setGuardianlitePopup({
        ...value,
        canvas_width: mainCanvasRef.current!.width,
        canvas_height: mainCanvasRef.current!.height,
        icon_width: 31,
        icon_height: 31
      } as ObGuardianlitePopup);
    }
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const floorSocket = socketService.subscribe('ob_floors-update', (received) => {
      if (received) {
        mutateFloor();
      }
    });
    const cameraSocket = socketService.subscribe('ob_cameras-update', (received) => {
      if (received) {
        mutateCamera();
      };
    });
    const doorSocket = socketService.subscribe('ob_doors-update', (received) => {
      if (received) {
        mutateDoors();
      }
    })
    const accessCtlLogSocket = socketService.subscribe('ob_accessCtlLog', (received) => {
      if (received?.accessControlLog) {
        setAccessCtlLog(received.accessControlLog);
        showDoorPopup(received.accessControlLog);
      }
    })
    const ebellSocket = socketService.subscribe('ob_ebells-update', (received) => {
      if (received) {
        mutateEbell();
      }
    });
    const guardianliteSocket = socketService.subscribe('ob_guardianlites-update', (received) => {
      if (received) {
        mutateGuardianlites();
      }
    });

    return () => {
      floorSocket();
      cameraSocket();
      doorSocket();
      accessCtlLogSocket();
      ebellSocket();
      guardianliteSocket();
    }
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
  }, [isFullscreen])

  useEffect(() => {
    createMiniCanvas();
    return () => {
      cleanUpMiniMapCanvas();
    }
  }, [useMinimap])

  useEffect(() => {
    if (mainCanvasRef.current == null && prevUseServiceNav !== undefined && prevUseServiceNav !== useServiceNav) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
    }
  }, [useServiceNav]);

  useEffect(() => {
    if (mainCanvasRef.current == null && mapImageURL != null) {
      initializeCanvas();
    }
    return () => {
      cleanUpMapCanvas();
      cleanUpMiniMapCanvas();
    }
  }, [mapImageURL])

  useEffect(() => {
    if (cameras == null || !canvasReady) {
      return;
    }
    settingObject({ cameras: cameras.filter((camera: CameraType) => camera.outside_idx === buildingId && camera.inside_idx === floorIdx), cameraAngle, objectLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, cameras, cameraAngle, objectLabel])

  useEffect(() => {
    if (doors == null || !canvasReady) {
      return;
    }
    settingObject({ doors: doors.filter((door: ObDeviceType) => door.outside_idx === buildingId && door.inside_idx === floorIdx), objectLabel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, doors, objectLabel])

  useEffect(() => {
    if (ebells == null || !canvasReady) {
      return;
    }
    settingObject({ ebells: ebells.filter((ebell: ObDeviceType) => ebell.outside_idx === buildingId && ebell.inside_idx === floorIdx) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, ebells]);

  useEffect(() => {
    if (guardianlites == null || !canvasReady) {
      return;
    }
    settingObject({ guardianlites: guardianlites.filter((guardianlite: ObGuardianliteType) => guardianlite.outside_idx === buildingId && guardianlite.inside_idx === floorIdx) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, guardianlites]);

  useEffect(() => {
    return () => {
      handleCloseDevicePopup({});
      handleCloseDeviceEventPopup({});
      handleCloseDeviceEventPopup({});
    }
  }, [floorIdx]);

  useEffect(() => {
    if (eventPopup == null || mainCanvasImpl.current == null) {
      return;
    }
    const {
      eventIdx,
      eventName,
      outsideIdx,
      insideIdx,
      deviceIdx,
      deviceType,
      ipaddress,
      cameraId,
      topLocation,
      leftLocation,
      mainServiceName,
      vmsName,
      service_type,
      deviceName
    } = eventPopup;
    if (outsideIdx !== buildingId || insideIdx !== floorIdx) {
      return;
    };
    if (deviceType === 'camera' && !deviceObjectRendered.current.camera.rendered) {
      return;
    };

    if (deviceType === 'ebell' && !deviceObjectRendered.current.ebell.rendered) {
      return;
    };

    if (deviceType === 'door' && !deviceObjectRendered.current.door?.rendered) {
      return;
    };

    const result: FindCanvasDeviceObjectResult = mainCanvasImpl.current.showEventPopup({
      deviceType,
      deviceIdx,
      eventCameraId: `${mainServiceName}:${vmsName}:${cameraId}`,
      eventName,
      leftLocation,
      topLocation,
      mainServiceName,
      vmsName,
      cameraId,
      ipaddress,
      mapType: 'indoor',
      service_type,
    });
    if (result.success === false) {
      return;
    };
    setDeviceEventPopup({
      show: true,
      on_event: true,
      idx: eventIdx,
      canvas_height: setCanvasSize().height,
      canvas_width: setCanvasSize().width,
      icon_height: result.data!.height,
      icon_width: result.data!.width,
      ip: ipaddress,
      left_location: leftLocation,
      top_location: topLocation,
      name: eventName,
      type: deviceType,
      camera_id: cameraId,
      main_service_name: mainServiceName,
      map_type: 'outdoor',
      vms_name: vmsName,
      service_type: service_type,
      device_name: deviceName
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventPopup, canvasReady, deviceObjectRendered.current.camera.rendered, deviceObjectRendered.current.ebell.rendered, deviceObjectRendered.current.door?.rendered]);

  useEffect(() => {
    devicePopupRef.current = devicePopup;
  }, [devicePopup]);

  useEffect(() => {
    if (mainCanvasRef.current == null && prevClientSize != null && (
      prevClientSize.width !== clientSizeRef.current.width ||
      prevClientSize.height !== clientSizeRef.current.height
    )) {
      initializeCanvas()
        .then(() => {

          if (!deviceObjectRendered.current.camera.rendered) {
            settingObject({
              cameras: cameras.filter((camera: CameraType) => camera.inside_idx === floorIdx), cameraAngle, objectLabel
            });
          };
          if (!deviceObjectRendered.current.door?.rendered) {
            settingObject({ doors: doors.filter((door: ObDeviceType) => door.inside_idx === floorIdx) });
          };
          if (!deviceObjectRendered.current.ebell.rendered) {
            settingObject({ ebells: ebells.filter((ebell: ObDeviceType) => ebell.inside_idx === floorIdx) });
          };
          if (!deviceObjectRendered.current.guardianlite.rendered) {
            settingObject({ guardianlites: guardianlites.filter((guardianlite: ObGuardianliteType) => guardianlite.outside_idx === null) });
          };

        })
    };
    return () => {
      cleanUpMapCanvas();
      cleanUpMiniMapCanvas();
    }
  }, [clientSizeRef.current]);

  return (
    <section className='relative flex justify-between h-full'>
      <Suspense fallback={
        <div className="flex flex-auto flex-col h-[100vh]">
          <Loading loading={true} />
        </div>
      }
      >
        <IndoorAside />
        <section className={`w-[calc(100%-262px)] h-full flex gap-4`}>
          <div className='relative h-full'>
            <section
              className='w-[100%] h-full bg-white dark:bg-[#1E1E20] rounded-md'
            >
              <canvas id='mainCanvas' className={mainCanvasRef.current ? 'h-full' : 'relative w-[1110px] h-full'} />
              <canvas key={`miniMapCanvas-${isFullscreen}`} id='miniMapCanvas' className={`absolute top-3 left-[77.5%] z-10 ${(useMinimap && miniMapCanvasRef.current) ? 'border-[#e5e7eb] border-solid border-[1px]' : ''} ${useMinimap === false ? 'hidden' : ''}`} />
            </section>
            <ul id="contextMenu" className='absolute hidden bg-white border-[1px] border-solid border-[#ccc], p-[10px] w-[12rem] rounded-md z-20' >
              <ContextMenu
                mapType='indoor'
                fabricObject={fabricObject}
                object={clickObject}
                updateLocation={handleUpdateLocation}
                cameraAngle={cameraAngle}
                updateCameraAngle={handleUpdateCameraAngle}
                handleLockDoor={handleLockDoor}
                handleUnlockDoor={handleUnlockDoor}
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
                map_type='indoor'
                type={devicePopup.type}
                close={handleCloseDevicePopup}
                service_type={devicePopup.service_type}
                access_point={devicePopup.access_point}
                startDateTime={devicePopup.startDateTime}
                device_id={devicePopup.device_id}
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
                map_type='indoor'
                type={deviceEventPopup.type}
                close={handleCloseDeviceEventPopup}
                service_type={deviceEventPopup.service_type}
                access_point={deviceEventPopup.access_point}
                device_name={deviceEventPopup.device_name}
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
                map_type='indoor'
                mutate={mutateGuardianlitePopup}
                close={handleCloseGuardianlitePopup}
              />
            ) :
              ''
            }
            <DoorAccessPerson
              accessCtlLog={accessCtlLog}
              doors={doors}
              currBuildingIdx={buildingId}
              currFloorIdx={floorIdx}
              canvasWidth={mainCanvasRef.current?.width}
              canvasHeight={mainCanvasRef.current?.height}
            />
          </div>
          <section className={`flex-1 min-w-[230px] ${mainCanvasRef.current ? 'relative' : ''}`}>
            <section className='bg-white dark:bg-[#262626] p-3 rounded-sm mb-2'>
              <h3>{buildingName} {floorName}</h3>
              <div className='flex gap-x-2'>
                <button
                  className='w-1/3 h-[26px] border-[#C5D0E8] border-[1px] border-solid bg-[#ADB2BD] rounded-md top-4 text-white text-[0.75rem] self-center'
                  onClick={toggleCameraAngle}
                >
                  카메라 화각
                </button>
                <button
                  className='w-1/3 h-[26px] border-[#C5D0E8] border-[1px] border-solid bg-[#ADB2BD] rounded-md top-4 text-white text-[0.75rem] self-center'
                  onClick={toggleObjectLabel}
                >
                  장비 라벨
                </button>
                <Upload handleChangeUploadImage={handleChangeUploadImage} title={'층'} />
              </div>
            </section>
            <DeviceList
              filter='location'
              mode='map'
              floorIdx={floorIdx}
              handleShowDevicePopup={handleShowDevicePopup}
            />
          </section>
        </section>
      </Suspense>
      {modal.show && (
        <ModalSetting modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
          <div ref={modalChildRef}>
            {setModalChild(modal.type)}
          </div>
        </ModalSetting>
      )}
      {ImageUpload.show ?
        <ImageUploadModal
          show={ImageUpload.show}
          imageURL={ImageUpload.imageURL}
          title={ImageUpload.title}
          toggle={toggleImageUploadModal}
          confirm={handleConfirmUpdateImage}
        />
        : ''}
    </section>
  );
}