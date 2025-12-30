// eslint-disable-next-line import/named
import { Canvas, FabricObject } from 'fabric';
import CanvasImpl from '@/utils/CanvasFabric';
import { ClickLocation, ClickObject, CanvasObject } from '@/@types/canvas';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { ModalType } from '@/@types/modal';
import ContextMenu from '../modals/ContextMenu';
import Modal from '../modals/Modal';
import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Loading from '@/components/shared/Loading';
import { ParkingArea, TreeNode, ParkingTypeCount, FloorInfo, unDeviceType, DevicePopupType } from '@/@types/parking';
import AddParkingArea from '../modals/AddParkingArea';
import ModifyParkingArea from '../modals/ModifyParkingArea';
import RemoveParkingData from '../modals/RemoveParkingData';
import { apiFloorInfo, apiAddParkingArea, apiRemoveParkingArea, apiParkingAreaModify, apiParkingTypeCountAreaInfo } from '@/services/ParkingService';
import { useParkingAreaList } from '@/utils/hooks/useParkingArea';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import ParkingIcon from '@/configs/parking-icon.config';
import ParkingAll from '../../../assets/styles/images/parking_All.png';
import ParkingAreaImg from '../../../assets/styles/images/parkingArea.png';
import AddCamera from '../components/AddCamera';
import { apiModifyCamera } from '@/services/ObserverService';
import { CameraType, CameraTypes } from '@/@types/camera';
import { useCameras } from '@/utils/hooks/useCameras';
import DevicePopup from '@/components/common/device/DevicePopup';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { EventPopup } from '@/@types/event';
import ModifyCamera from '../components/ModifyCamera';
import { ApiResultBoolean } from '@/@types/api';

type childicon = {
    icon: React.ReactNode;  // 아이콘
    max: number;           // 차량 맥스 개수
    status: number;        // 현재 차량 개수
};

type Props = {
    eventPopup: EventPopup | null;
    selectedNode: TreeNode | null;
    childImageChange: number;
    clearEventPopup: () => void;
};

export type FindCanvasDeviceObjectResult = {
    success: boolean;
    message?: string;
    data?: FabricObject;
};

export default function ParkingDetailChild({ eventPopup, selectedNode, childImageChange, clearEventPopup }: Props) {
    const { isFullscreen } = useFullScreenStore();
    const mainCanvasRef = useRef<Canvas | null>(null);
    const mainCanvasImpl = useRef<CanvasImpl | null>(null);
    const isDraggingRef = useRef(false);
    const lastPosXRef = useRef(0);
    const lastPosYRef = useRef(0);
    const clickLocationRef = useRef<ClickLocation>({
        x: 0,
        y: 0
    });
    const isUpdatingObjectLocation = useRef<boolean>(false);
    const [clickObject, setClickObject] = useState<ClickObject | null>(null);
    const [fabricObject, setFabricObject] = useState<CanvasObject>(null);
    const { setCanvasMapState } = useCanvasMapStore();
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: ''
    });
    const modalChildRef = useRef<HTMLDivElement>(null);
    const { data: parkingAreaList, isLoading: isLoadingParkingAreaList, error: parkingAreaListError, mutate: mutateParkingAreas } =
        useParkingAreaList(
            selectedNode?.outside_idx ?? null,
            selectedNode?.inside_idx ?? null
        );

    const {
        cameras,
        isLoading: isLoadingCameras,
        error: camerasError,
        mutate: mutateCamera
    } = useCameras('parking');
    const [childStatus, setChildStatus] = useState<childicon[]>([]);
    const { socketService } = useSocketConnection();
    const isUpdatingObject = useRef<boolean>(false)
    const [canvasReady, setCanvasReady] = useState(false);
    const [cameraAngle, setCameraAngle] = useState(true);

    const [cameraPopup, setCameraPopup] = useState<DevicePopupType>({
        show: false,
        main_service_name: 'parking',
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
        service_type : ''
    });
    const [cameraEventPopup, setCameraEventPopup] = useState<DevicePopupType>({
        show: false,
        main_service_name: 'parking',
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
        service_type : ''
    });

    const mapStatus = (data: ParkingTypeCount) => [
        {
            icon: <img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-3" />,
            max: data.all,
            status: data.use_all,
        },
        {
            icon: <ParkingIcon.generalCar className='w-[20px] h-[20px] mr-3 text-[#1F40D6]' />,
            max: data.general,
            status: data.use_general,
        },
        {
            icon: <ParkingIcon.compactCar className='w-[25px] h-[25px] mr-3 text-[#0DC5E0]' />,
            max: data.compact,
            status: data.use_compact,
        },
        {
            icon: <ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-3 text-[#E9B707]' />,
            max: data.disabled,
            status: data.use_disabled,
        },
        {
            icon: <ParkingIcon.electricCar className='w-[23px] h-[22px] mr-3 text-[#099B3F]' />,
            max: data.electric,
            status: data.use_electric,
        },
    ];

    if (isLoadingParkingAreaList) {
        console.log('get parkingAreaList loading...');
    };

    if (parkingAreaListError) {
        console.error('get parkingAreaList error');
    }

    if (isLoadingCameras) {
        console.log('get cameras loading...');
    };
    if (camerasError) {
        console.error('get cameras error');
    }

    const mounted = useRef(false);
    const prevFullscreen = useRef(isFullscreen);

    useEffect(() => {
    if (!canvasReady || !eventPopup || mainCanvasImpl.current === null) return;
    
    const delay = setTimeout(() => {  
        if(mainCanvasImpl.current === null) return;

        const {
            eventName,
            deviceIdx,
            deviceType,
            ipaddress,
            cameraId,
            topLocation,
            leftLocation,
            mainServiceName,
            vmsName,
            service_type
        } = eventPopup;
    
        const result = mainCanvasImpl.current.showEventPopup({
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
            service_type
        });
    
        if (!result.success) {
            console.warn(result.message);
        }
    }, 100); 
    
    return () => clearTimeout(delay);
    }, [eventPopup, canvasReady]);
    
    useEffect(() => {
        if (!socketService) {
            return;
        }

        const parkingSocket = socketService.subscribe('pm_area-update', (received) => {
            if (received) {
                mutateParkingAreas();
            }
        })

        const cameraSocket = socketService.subscribe('pm_cameras-update', (received) => {
            if (received) {
                mutateCamera();
            }
        })

        return () => {
            parkingSocket();
            cameraSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(() => {
        if (prevFullscreen.current !== isFullscreen) {
            mounted.current = false;
            prevFullscreen.current = isFullscreen;
        }
    }, [isFullscreen]);

    useEffect(() => {
        if (mainCanvasRef.current == null && !mounted.current) {
            mounted.current = true;
            handleCloseCameraPopup();
            cleanUpCanvas();
            initializeCanvas();
        }

        return () => {
            cleanUpCanvas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullscreen]);

    useEffect(() => {
        if (cameras == null || !canvasReady) {
            return;
        }

        settingObject({ cameras: cameras.filter((camera: CameraType) => camera.outside_idx === selectedNode?.outside_idx && camera.inside_idx === selectedNode?.inside_idx), cameraAngle });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady, cameras, cameraAngle]);

    const getParkingTypeCountAreaInfo = async () => {
        const data = {
            outsideIdx: selectedNode?.outside_idx,
            insideIdx: selectedNode?.inside_idx,
        } as unknown as ParkingTypeCount;

        try {
            const res = await apiParkingTypeCountAreaInfo<ParkingTypeCount>(data);

            if (!res || !res.result) {
                return;
            }

            if (res.result.length > 0) {
                const filterData = mapStatus(res.result[0]);
                return setChildStatus(filterData);
            }

            return setChildStatus([]);
        } catch (error) {
            console.error('주차관리 설정타입 API 에러: ', error);
        }
    };

    useEffect(() => {
        if (parkingAreaList?.result == null || !canvasReady) {
            return;
        }
        getParkingTypeCountAreaInfo();
        settingObject({ parkingAreas: parkingAreaList.result })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady, parkingAreaList?.result])

    useEffect(() => {
        if (childImageChange) {
            cleanUpCanvas();
            initializeCanvas();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childImageChange]);

    const cleanUpCanvas = () => {
        if (mainCanvasRef.current) {
            mainCanvasRef.current.dispose();
            mainCanvasRef.current = null;
            closeContextMenu();
            setCanvasReady(false)
        }
    };

    const initializeCanvas = async () => {
        const imageUrl = await getInsideData();

        if (imageUrl) {
            await createCanvas(imageUrl);
        }
    };

    const settingObject = useCallback(({ parkingAreas, cameras, cameraAngle }: { parkingAreas?: ParkingArea[], cameras?: CameraType[], cameraAngle?: boolean }) => {
        if (mainCanvasImpl.current == null) {
            return;
        }
        if (isUpdatingObject.current) {
            handleIsUpdatingObject(false);
        }

        if (parkingAreas) {
            mainCanvasImpl.current.addObject({
                items: parkingAreas.map((parkingArea) => ({ ...parkingArea, type: 'parkingArea' })),
                type: 'parkingArea'
            })
        }

        if (cameras) {
            mainCanvasImpl.current.addObject({
                items: cameras.map((camera) => ({ ...camera, type: 'camera' })),
                cameraAngle,
                type: 'camera'
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const getInsideData = async (): Promise<string> => {
        const data = {
            idx: selectedNode?.inside_idx,
        } as unknown as FloorInfo;

        try {
            const res = await apiFloorInfo<FloorInfo>(data);

            if (!res || !res.result) {
                return ParkingAreaImg;
            }

            const imageUrl = res.result[0].inside_map_image_url
                ? `http://${window.location.hostname}:4200/images/pm_floorplan/${res.result[0].inside_map_image_url}`
                : ParkingAreaImg;

            return imageUrl;
        } catch {
            return ParkingAreaImg;
        }
    };

    const createCanvas = async (image: string) => {
        const scale = Math.min(1, 1);

        const canvasWidth = (isFullscreen ? 1300 : 1000) * scale;
        const canvasHeight = (isFullscreen ? 685 : 530) * scale;

        const canvasImpl = await CanvasImpl.createCanvas(
            image,
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
        );

        mainCanvasRef.current = canvasImpl.getCanvas();
        mainCanvasImpl.current = canvasImpl;
        setCanvasReady(true);
    };

    const handleUpdateLocation = async () => {
        if (!fabricObject || !mainCanvasImpl.current || !mainCanvasRef.current || isUpdatingObjectLocation.current) {
            return;
        }

        handleCloseCameraPopup();
        handleIsUpdatingObject(true);

        async function setUpdateLocation(leftLocation: number, topLocation: number): Promise<{ success: boolean }> {
            const result = {
                success: false
            }

            if (!clickObject || mainCanvasRef.current == null) {
                return result;
            }

            if (clickObject?.type === 'parkingArea') {
                const orgData = clickObject as ParkingArea;

                const data = {
                    idx: clickObject.idx,
                    areaName: orgData.area_name,
                    parkingTypeId: orgData.parking_type_id,
                    leftLocation: `${leftLocation / mainCanvasRef.current.width}`,
                    topLocation: `${topLocation / mainCanvasRef.current.height}`,
                    iconWidth: orgData.icon_width,
                    iconHeight: orgData.icon_height,
                    deviceIdx: orgData.device_idx
                }

                try {
                    const res = await apiParkingAreaModify(data);

                    if (typeof res.result === "number" && res.result === 1) {
                        result.success = true
                        handleIsUpdatingObject(false);
                    }

                    return result
                } catch (error) {
                    console.error('주차관리 주차 면 이동 API 에러: ', error);
                    return result;
                }
            } else if (clickObject?.type === 'camera') {
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
                    use_status: orgData.use_status,
                    camera_type : orgData.camera_type
                }

                const res = await apiModifyCamera(data)

                if (res?.result?.success) {
                    result.success = true
                    handleIsUpdatingObject(false);
                }

                return result
            }

            return result;
        }

        mainCanvasImpl.current.updateObjectLocation({
            canvas: mainCanvasRef.current,
            object: fabricObject,
            callback: setUpdateLocation,
        });

        closeContextMenu();
    };

    const handleIsUpdatingObject = (status: boolean) => {
        isUpdatingObjectLocation.current = status;
    }

    const closeContextMenu = () => {
        const menu = document.getElementById('contextMenu')!;
        if (menu) {
            menu.style.display = 'none';
        }
    }

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'parkingArea-add':
                return (
                    <AddParkingArea add={addArea} closeModal={closeModal} />
                )
            case 'parkingArea-areaModify':
                return (
                    <ModifyParkingArea modify={modifyParkingArea} closeModal={closeModal} originData={clickObject as ParkingArea} />
                )
            case 'parkingArea-remove':
                return (
                    <RemoveParkingData remove={removeParkingArea} closeModal={closeModal} originData={clickObject as ParkingArea} ></RemoveParkingData>
                )
            case 'parkingCamera-add':
                return (
                    <AddCamera type='add' add={addCamera} onCancel={closeModal} />
                )
            case 'camera-remove':
                return (
                    <RemoveParkingData
                        remove={removeCameraArea}
                        closeModal={closeModal}
                        originData={clickObject as CameraType}
                    ></RemoveParkingData>
                )
            case 'camera-type':
                return (
                    <ModifyCamera cameraDetail={clickObject as CameraType} modify={modifyCamera} onCancel={closeModal} />
                )
            default:
                break;
        }
    }

    const addCamera = async (vms_name: string, camera_id: string, camera_type: CameraTypes) => {
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
                mainServiceName: 'parking',
                outside_idx: selectedNode?.outside_idx || 0,
                inside_idx: selectedNode?.inside_idx || 0,
                use_status: true,
                camera_type
            })

            if (!res || !res.result) {
                return
            }

            closeModal()
        } catch (error) {
            console.error('주차관리 면 카메라 추가 API 에러: ', error)
            return
        }
    }

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
                closeModal();
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
            use_status: false,
            camera_type : null
        });

        if (result.result) {
            closeContextMenu();
            closeModal();
            handleCloseCameraPopup();
        }
    }

    const addArea = async ({ selectedTypeId, targetDevice }: { selectedTypeId: number; targetDevice: unDeviceType }) => {
        if (mainCanvasRef.current == null || mainCanvasImpl.current == null || selectedNode == null) {
            return;
        }

        const { x, y } = clickLocationRef.current;

        const newParkingArea = {
            areaName: targetDevice.device_no16,
            deviceIdx: targetDevice.device_idx,
            outsideIdx: selectedNode.outside_idx,
            insideIdx: selectedNode.inside_idx,
            parkingTypeId: selectedTypeId,
            leftLocation: `${x / mainCanvasRef.current.width}`,
            topLocation: `${y / mainCanvasRef.current.height}`,
            iconWidth: '35',
            iconHeight: '60',
        }

        try {
            const res = await apiAddParkingArea(newParkingArea);

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차관리 설정타입 API 에러: ', error);
            return;
        }
    };

    const removeParkingArea = async () => {
        if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
            return;
        }

        if (clickObject == null || clickObject.type !== "parkingArea") {
            return;
        }

        const idx = clickObject.idx ?? -1;

        if (idx !== -1) {
            try {
                const res = await apiRemoveParkingArea(clickObject);

                if (!res || !res.result) {
                    return;
                }

                closeModal();
            } catch (error) {
                console.error('주차관리 면 삭제 API 에러: ', error);
                return;
            }
        }
    };

    const modifyParkingArea = async (newName: string, typeId: number) => {
        if (!clickObject || clickObject.type !== "parkingArea" || mainCanvasImpl.current == null) {
            return;
        }

        const orgData = clickObject as ParkingArea;

        const data = {
            idx: orgData.idx,
            areaName: newName,
            parkingTypeId: typeId,
            leftLocation: orgData.left_location,
            topLocation: orgData.top_location,
            iconWidth: orgData.icon_width,
            iconHeight: orgData.icon_height,
            deviceIdx: orgData.device_idx
        }

        try {
            const res = await apiParkingAreaModify(data);

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차관리 이름변경 API 에러: ', error);
            return;
        }
    };

    const handleUpdateSize = async () => {
        if (!fabricObject || !mainCanvasImpl.current || !mainCanvasRef.current || isUpdatingObjectLocation.current) {
            return;
        }

        handleIsUpdatingObject(true);

        mainCanvasImpl.current.updateObjectSize({
            canvas: mainCanvasRef.current,
            object: fabricObject,
            callback: setUpdateSize,
        });

        closeContextMenu();
    };

    const setUpdateSize = async (
        width: number,
        height: number,
        leftLocation: number,
        topLocation: number
    ): Promise<{ success: boolean }> => {
        const result = {
            success: false
        }

        if (!clickObject || mainCanvasImpl.current == null || mainCanvasRef.current == null || !("idx" in clickObject)) {
            return result;
        }

        const orgData = clickObject as ParkingArea;

        const data = {
            idx: clickObject.idx,
            areaName: orgData.area_name,
            parkingTypeId: orgData.parking_type_id,
            leftLocation: `${leftLocation / mainCanvasRef.current!.width}`,
            topLocation: `${topLocation / mainCanvasRef.current!.height}`,
            iconWidth: `${width}`,
            iconHeight: `${height}`,
            deviceIdx: orgData.device_idx,
        };

        try {
            const res = await apiParkingAreaModify(data);

            if (typeof res.result === "number" && res.result === 1) {
                result.success = true
                handleIsUpdatingObject(false);
            }

            return result
        } catch (error) {
            console.error('주차관리 주차 면 사이즈 조정 API 에러: ', error);
            handleIsUpdatingObject(false);
            return result;
        }
    }

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
            const { 
                main_service_name: mainServiceName, 
                vms_name, 
                camera_id, 
                outside_idx, 
                inside_idx, 
                top_location, 
                left_location, 
                use_status,
                camera_type
            } = updateCamera;

            const res = await apiModifyCamera({
                mainServiceName,
                vms_name,
                camera_id,
                outside_idx,
                inside_idx,
                top_location,
                left_location,
                camera_angle: `${camera_angle}`,
                use_status,
                camera_type
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

    const closeModal = () => {
        toggleModal({
            show: false,
            type: '',
            title: ''
        })
    }

    const toggleCameraAngle = () => {
        setCameraAngle(!cameraAngle)
        closeContextMenu();
    }

    const handleCloseCameraPopup = () => {
        setCameraPopup({
            show: false,
            main_service_name: 'parking',
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
            service_type : ''
        })
    }

    const handleCloseDeviceEventPopup = () => {
        if (cameraEventPopup.show) {
            setCameraEventPopup({
                show: false,
                main_service_name: 'parking',
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
                service_type : ''
            });

            clearEventPopup();

            if (mainCanvasImpl.current) {
                mainCanvasImpl.current.handleCloseShowDeviceEventPopup();
            }
        };
    };

    return (
        <>
            <div className="flex items-center bg-gray-100 p-3 rounded-lg shadow-md mb-2 dark:bg-[#A9A9A9]">
                <div className="flex items-center gap-1">
                    {(childStatus.length > 0 ? childStatus : [
                        { icon: <img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-3" />, max: 0, status: 0 },
                        { icon: <ParkingIcon.generalCar className='w-[20px] h-[20px] mr-3 text-[#1F40D6]' />, max: 0, status: 0 },
                        { icon: <ParkingIcon.compactCar className='w-[25px] h-[25px] mr-3 text-[#0DC5E0]' />, max: 0, status: 0 },
                        { icon: <ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-3 text-[#E9B707]' />, max: 0, status: 0 },
                        { icon: <ParkingIcon.electricCar className='w-[23px] h-[22px] mr-3 text-[#099B3F]' />, max: 0, status: 0 },
                    ]).map((item, index) => (
                        <div key={index} className="flex items-center gap-1 ml-7 mr-7">
                            {item.icon}
                            <span className="text-sm text-black bg-white rounded-md pr-3 pl-3 w-[110px] text-center dark:bg-[#696969] dark:text-[#FFFFFF]">
                                {item.status} / {item.max}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Suspense fallback={
                <div className="flex flex-auto flex-col h-[100vh]">
                    <Loading loading={true} />
                </div>
            }
            >
                <div className="mt-3 flex justify-center items-center">
                    <section className='relative'>
                        <canvas id='mainCanvas' />
                        <button
                            className='w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] rounded-md absolute top-4 left-4 text-white text-[0.75rem] self-center'
                            onClick={toggleCameraAngle}
                        >
                            카메라 화각
                        </button>
                        <ul id="contextMenu" className='absolute hidden bg-white border-[1px] border-solid border-[#ccc], p-[10px] w-[10rem] rounded-md z-10' >
                            <ContextMenu
                                mapType='indoor'
                                fabricObject={fabricObject}
                                object={clickObject}
                                updateLocation={handleUpdateLocation}
                                updateSize={handleUpdateSize}
                                updateCameraAngle={handleUpdateCameraAngle}
                                cameraAngle={cameraAngle}
                                onClick={toggleModal}
                            />
                        </ul>
                        {cameraPopup.show ?
                            <DevicePopup
                                on_event={false}
                                main_service_name={cameraPopup.main_service_name}
                                vms_name={cameraPopup.vms_name}
                                camera_id={cameraPopup.camera_id}
                                ip={cameraPopup.ip}
                                name={cameraPopup.name}
                                top_location={cameraPopup.top_location}
                                left_location={cameraPopup.left_location}
                                canvas_width={cameraPopup.canvas_width}
                                canvas_height={cameraPopup.canvas_height}
                                icon_width={cameraPopup.icon_width}
                                icon_height={cameraPopup.icon_height}
                                map_type={"indoor"}
                                type={"camera"}
                                close={handleCloseCameraPopup}
                                service_type={cameraPopup.service_type}
                            />
                            :
                            ''}
                        {cameraEventPopup.show ?
                            <DevicePopup
                                on_event={cameraEventPopup.on_event}
                                main_service_name={cameraEventPopup.main_service_name}
                                vms_name={cameraEventPopup.vms_name}
                                camera_id={cameraEventPopup.camera_id}
                                ip={cameraEventPopup.ip}
                                name={cameraEventPopup.name}
                                top_location={cameraEventPopup.top_location}
                                left_location={cameraEventPopup.left_location}
                                canvas_width={cameraEventPopup.canvas_width}
                                canvas_height={cameraEventPopup.canvas_height}
                                icon_width={cameraEventPopup.icon_width}
                                icon_height={cameraEventPopup.icon_height}
                                map_type={"indoor"}
                                type={"camera"}
                                close={handleCloseDeviceEventPopup}
                                service_type={cameraEventPopup.service_type}
                            />
                            :
                            ''}
                        <Modal modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
                            <div ref={modalChildRef}>
                                {setModalChild(modal.type)}
                            </div>
                        </Modal>
                    </section>
                </div>
            </Suspense>

        </>
    );
}