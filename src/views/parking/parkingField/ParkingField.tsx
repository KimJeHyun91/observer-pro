// eslint-disable-next-line import/named
import { Canvas, FabricObject } from 'fabric'
import parkingField from '../../../assets/styles/images/outdoor.png'
import { Suspense, useRef, useEffect, useState, useCallback } from 'react'
import Loading from '@/components/shared/Loading'
import { useParkingBuildingList } from '@/utils/hooks/useParkingArea'
import { Building } from '@/@types/building'
import CanvasImpl from '@/utils/CanvasFabric'
import { ClickLocation, ClickObject, CanvasObject } from '@/@types/canvas'
import { useCanvasMapStore } from '@/store/canvasMapStore'
import Modal from '../modals/Modal'
import { ModalType } from '@/@types/modal'
import ContextMenu from '../modals/ContextMenu'
import { useDataStatusStore } from '@/store/useDataStatusStore'
import {
    apiParkingFieldModify,
    apiAddParkingField,
    apiRemoveParkingField,
} from '@/services/ParkingService'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import RemoveParkingData from '../modals/RemoveParkingData'
import AddParkingField from '../modals/AddParkingField'
import ModifyParkingField from '../modals/ModifyParkingField'
import AddCamera from '../components/AddCamera';
import { useCameras } from '@/utils/hooks/useCameras';
import { CameraType, CameraTypes } from '@/@types/camera';
import { apiModifyCamera } from '@/services/ObserverService';
import DevicePopup from '@/components/common/device/DevicePopup';
import { DevicePopupType } from '@/@types/parking';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { EventPopup } from '@/@types/event';
import ModifyCamera from '../components/ModifyCamera';
import { ApiResultBoolean } from '@/@types/api';

type ParkingFieldProps = {
    eventPopup: EventPopup | null;
    clearEventPopup: () => void;
    onBuildingClick: (building: Building) => void;
}

export type FindCanvasDeviceObjectResult = {
    success: boolean;
    message?: string;
    data?: FabricObject;
};


export default function ParkingField({ eventPopup, clearEventPopup , onBuildingClick }: ParkingFieldProps) {
    const refContainer = useRef<HTMLDivElement>(null);
    const { isFullscreen } = useFullScreenStore();
    const mainCanvasRef = useRef<Canvas | null>(null)
    const mainCanvasImpl = useRef<CanvasImpl | null>(null)
    const isDraggingRef = useRef(false)
    const lastPosXRef = useRef(0)
    const lastPosYRef = useRef(0)
    const [clickObject, setClickObject] = useState<ClickObject | null>(null)
    const [fabricObject, setFabricObject] = useState<CanvasObject>(null)
    const isUpdatingObject = useRef<boolean>(false)
    const { setCanvasMapState } = useCanvasMapStore()
    const [canvasReady, setCanvasReady] = useState(false);
    const {
        data: buildings,
        isLoading: isLoadingBuilding,
        error: buildingsError,
        mutate: mutateBuildings
    } = useParkingBuildingList()
    const {
        cameras,
        isLoading: isLoadingCameras,
        error: camerasError,
        mutate: mutateCamera
    } = useCameras('parking');

    const modalChildRef = useRef<HTMLDivElement>(null)
    const clickLocationRef = useRef<ClickLocation>({
        x: 0,
        y: 0,
    })
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    })

    const {
        service,
        data
    } = useDataStatusStore((state) => state.tabs.parking);

    const useService = useRef(service);
    const useData = useRef(data);
    const { socketService } = useSocketConnection()
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

    if (isLoadingBuilding) {
        console.log('get pm_buildings loading...')
    }
    if (buildingsError) {
        console.error('get pm_buildings error')
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
            service_type
        } = eventPopup;
    
        if (outsideIdx !== 0) {
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
            service_type
        });

        if (result.success === false) {
            console.log(result.message);
            return;
        };        

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventPopup]);

    useEffect(() => {
        if (prevFullscreen.current !== isFullscreen) {
            mounted.current = false;
            prevFullscreen.current = isFullscreen;
        }
    }, [isFullscreen]);

    useEffect(() => {
        const current = refContainer.current;
        let observer: ResizeObserver | null = null;
        let initialized = false;
        
        if (!mounted.current && current) {
            mounted.current = true;
            handleCloseCameraPopup();
            cleanUpCanvas();
    
            observer = new ResizeObserver((entries) => {
                const entry = entries[0];
                const height = entry.contentRect.height;
    
                const minHeight = isFullscreen ? 800 : 400;
    
                if (!initialized && height >= minHeight) {
                    initialized = true;
                    initializeCanvas();
                }
            });
    
            observer.observe(current);
    
            setTimeout(() => {
                const height = current.clientHeight;
                const minHeight = isFullscreen ? 800 : 400;
    
                if (!initialized && height >= minHeight) {
                    initialized = true;
                    initializeCanvas();
                }
            }, 0);
        }
    
        return () => {
            cleanUpCanvas();
            if (observer && current) {
                observer.unobserve(current);
                observer.disconnect();
            }
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFullscreen]);

    // useEffect(() => {
    //     const current = refContainer.current;
    //     if (!current) return;
    
    //     handleCloseCameraPopup();
    //     cleanUpCanvas();
    
    //     const observer = new ResizeObserver(() => {
    //         cleanUpCanvas();
    //         initializeCanvas();
    //     });
    
    //     observer.observe(current);
    
    //     return () => {
    //         cleanUpCanvas();
    //         observer.disconnect();
    //     };
    
    //   // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [isFullscreen]);
    
    useEffect(() => {
        useService.current = service;
        useData.current = data;
    }, [service, data]);

    useEffect(() => {
        if (buildings?.result == null || !canvasReady) {
            return;
        }

        settingObject({ buildings: buildings.result })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady, buildings?.result])

    useEffect(() => {
        if (cameras == null || !canvasReady) {
            return;
        }

        settingObject({ cameras: cameras.filter((camera: CameraType) => camera.outside_idx === 0), cameraAngle });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady, cameras, cameraAngle])

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const buildingSocket = socketService.subscribe('pm_buildings-update', (received) => {
            if (received) {
                mutateBuildings();
            }
        })

        const cameraSocket = socketService.subscribe('pm_cameras-update', (received) => {
            if (received) {
                mutateCamera();
            }
        })
        return () => {
            buildingSocket();
            cameraSocket();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    const initializeCanvas = async () => {
        await createCanvas()
    }

    const settingObject = useCallback(({ buildings, cameras, cameraAngle }: { buildings?: Building[], cameras?: CameraType[], cameraAngle?: boolean }) => {
        if (mainCanvasImpl.current == null) {
            return;
        }
        if (isUpdatingObject.current) {
            handleIsUpdatingObject(false);
        }

        if (buildings) {
            mainCanvasImpl.current.addObject({
                items: buildings.map((building) => ({ ...building, type: 'building' })),
                type: 'building'
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

    const handleIsUpdatingObject = (status: boolean) => {
        isUpdatingObject.current = status
    }

    // const urlToFile = async (url: string): Promise<{ width: number; height: number }> => {
    //     const response = await fetch(url);
    //     const blob = await response.blob();

    //     const imageSize = await getImageSize(URL.createObjectURL(blob));
    //     return { ...imageSize };
    // };

    // const getImageSize = async (dataURL: string): Promise<{ width: number; height: number }> => {
    //     return new Promise((resolve, reject) => {
    //         const img = new Image();
    //         img.onload = () => {
    //             resolve({ width: img.width, height: img.height });
    //         };
    //         img.onerror = reject;
    //         img.src = dataURL;
    //     });
    // };

    // const setCanvasSize = (width: number, height: number) => {
    //     let maxWidth = 1500;
    //     let maxHeight = 722;

    //     if (isFullscreen) {
    //         maxWidth = 1870;
    //         maxHeight = 887;
    //     }

    //     const aspectRatio = width / height;

    //     let canvasWidth = width;
    //     let canvasHeight = height;

    //     if (canvasWidth > maxWidth) {
    //         canvasWidth = maxWidth;
    //         canvasHeight = maxWidth / aspectRatio;
    //     }

    //     if (canvasHeight > maxHeight) {
    //         canvasHeight = maxHeight;
    //         canvasWidth = maxHeight * aspectRatio;
    //     }

    //     return {
    //         canvasWidth,
    //         canvasHeight,
    //     };
    // };

    const createCanvas = async () => {
        const divElement = refContainer.current;

        if (!divElement) return;

        const divWidth = divElement.clientWidth - 8;
        const divHeight = divElement.clientHeight - 18;
        // const { width: imgWidth, height: imgHeight } = await urlToFile(parkingField);
        // const aspectRatio = imgWidth / imgHeight;
        // const { canvasWidth, canvasHeight } = setCanvasSize(width, height);

        // let canvasWidth = divWidth;
        // let canvasHeight = divWidth / aspectRatio;
    
        // if (canvasHeight > divHeight) {
        //     canvasHeight = divHeight;
        //     canvasWidth = divHeight * aspectRatio;
        // }

        const canvasImpl = await CanvasImpl.createCanvas(
            parkingField,
            divWidth,
            divHeight,
            isDraggingRef,
            lastPosXRef,
            lastPosYRef,
            clickLocationRef,
            setClickObject,
            setFabricObject,
            setCanvasMapState,
            onBuildingClick,
            setCameraPopup,
            undefined,
            setCameraEventPopup
        )

        if (!canvasImpl) {
            return;
        }
        
        mainCanvasRef.current = canvasImpl.getCanvas()
        mainCanvasImpl.current = canvasImpl;
        setCanvasReady(true);
    }

    const cleanUpCanvas = () => {
        if (mainCanvasRef.current) {
            closeContextMenu()
            mainCanvasRef.current.dispose()
            mainCanvasRef.current = null
            setCanvasReady(false)
        }
    }

    const closeContextMenu = () => {
        const menu = document.getElementById('contextMenu')!
        if (menu) {
            menu.style.display = 'none'
        }
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'parkingField-add':
                return (
                    <AddParkingField add={addField} closeModal={closeModal} />
                )
            case 'parkingField-fieldModify':
                return (
                    <ModifyParkingField
                        modify={modifyParkingField}
                        closeModal={closeModal}
                        originData={clickObject as Building}
                    />
                )
            case 'parkingField-remove':
                return (
                    <RemoveParkingData
                        remove={removeParkingField}
                        closeModal={closeModal}
                        originData={clickObject as Building}
                    ></RemoveParkingData>
                )

            case 'parkingCamera-add':
                return (
                    <AddCamera type='add' add={addCamera} onCancel={closeModal} />
                )
            case 'camera-remove':
                return (
                    <RemoveParkingData
                        remove={removeCameraField}
                        closeModal={closeModal}
                        originData={clickObject as CameraType}
                    ></RemoveParkingData>
                )
            case 'camera-type':
                return (
                    <ModifyCamera cameraDetail={clickObject as CameraType} modify={modifyCamera} onCancel={closeModal} />
                )
            default:
                break
        }
    }

    const removeCameraField = async () => {
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
                outside_idx: 0,
                inside_idx: 0,
                use_status: true,
                camera_type
            })

            if (!res || !res.result) {
                return
            }

            closeModal()
        } catch (error) {
            console.error('주차관리 필드 카메라 추가 API 에러: ', error)
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
    
    const handleUpdateLocation = async () => {
        if (
            !fabricObject ||
            !mainCanvasImpl.current ||
            !mainCanvasRef.current ||
            isUpdatingObject.current
        ) {
            return
        }

        handleCloseCameraPopup();
        handleIsUpdatingObject(true)

        async function setUpdateLocation(
            leftLocation: number,
            topLocation: number,
        ): Promise<{ success: boolean }> {
            const result = {
                success: false,
            }

            if (!clickObject || mainCanvasRef.current == null) {
                return result
            }

            if (clickObject?.type === 'building') {
                const orgData = clickObject as Building

                const data = {
                    idx: orgData.idx,
                    outsideName: orgData.outside_name,
                    leftLocation: `${leftLocation / mainCanvasRef.current.width}`,
                    topLocation: `${topLocation / mainCanvasRef.current.height}`,
                    mapImageUrl: orgData.map_image_url,
                    serviceType: orgData.service_type,
                }

                try {
                    const res = await apiParkingFieldModify(data)

                    if (typeof res.result === 'number' && res.result === 1) {
                        result.success = true
                        handleIsUpdatingObject(false)
                    }

                    return result
                } catch (error) {
                    console.error('주차관리 주차 면 이동 API 에러: ', error)
                    return result
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
        })

        closeContextMenu();
    }

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type,
        })
    }

    const removeParkingField = async () => {
        if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
            return
        }

        if (clickObject == null || clickObject.type !== 'building') {
            return
        }

        const idx = clickObject.idx ?? -1

        if (idx !== -1) {
            try {
                const res = await apiRemoveParkingField(idx)

                if (!res || !res.result) {
                    return
                }

                closeModal()
            } catch (error) {
                console.error('주차관리 건물 삭제 API 에러: ', error)
                return
            }
        }
    }

    const addField = async ({ fieldName }: { fieldName: string }) => {
        if (mainCanvasRef.current == null || mainCanvasImpl.current == null) {
            return
        }

        const { x, y } = clickLocationRef.current

        const data = {
            outsideName: fieldName,
            leftLocation: `${x / mainCanvasRef.current.width}`,
            topLocation: `${y / mainCanvasRef.current.height}`,
            mapImageUrl: '',
            serviceType: '',
        }

        try {
            const res = await apiAddParkingField(data)

            if (!res || !res.result) {
                return
            }

            closeModal()
        } catch (error) {
            console.error('주차관리 건물추가 API 에러: ', error)
            return
        }
    }

    const modifyParkingField = async (newName: string) => {
        if (
            !clickObject ||
            clickObject.type !== 'building' ||
            mainCanvasImpl.current == null
        ) {
            return
        }

        const orgData = clickObject as Building
        const data = {
            idx: orgData.idx,
            outsideName: newName,
            leftLocation: orgData.left_location,
            topLocation: orgData.top_location,
            mapImageUrl: orgData.map_image_url,
            serviceType: orgData.service_type,
        }

        try {
            const res = await apiParkingFieldModify(data)

            if (!res || !res.result) {
                return
            }

            closeModal()
        } catch (error) {
            console.error('주차관리 이름변경 API 에러: ', error)
            return
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
            title: '',
        })
    }

    const toggleCameraAngle = () => {
        setCameraAngle(!cameraAngle)
        closeContextMenu();
    }

    const handleCloseCameraPopup = () => {
        if (cameraPopup.show) {
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
                type: '',
                service_type : ''
            })
        }
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
        <div ref={refContainer} className="ml-2 flex-shrink-0 bg-gray-100 dark:bg-gray-900 flex flex-col h-full">
            <div className="flex flex-col gap-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow mb-2 w-full h-full">
                <Suspense
                    fallback={
                        <div className="flex flex-auto flex-col h-[100vh]">
                            <Loading loading={true} />
                        </div>
                    }
                >
                    <div className="flex">
                        <section className="relative">
                            <canvas id="mainCanvas" className='object-contain' />
                            <button
                                className='w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] rounded-md absolute top-4 left-4 text-white text-[0.75rem] self-center'
                                onClick={toggleCameraAngle}
                            >
                                카메라 화각
                            </button>
                            <ul
                                id="contextMenu"
                                className="absolute hidden bg-white border-[1px] border-solid border-[#ccc], p-[10px] w-[10rem] rounded-md"
                            >
                                <ContextMenu
                                    mapType="outdoor"
                                    fabricObject={fabricObject}
                                    object={clickObject}
                                    updateLocation={handleUpdateLocation}
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
                                    map_type={"outdoor"}
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
                                    map_type={"outdoor"}
                                    type={"camera"}
                                    close={handleCloseDeviceEventPopup}
                                    service_type={cameraEventPopup.service_type}
                                />
                                :
                                ''}
                                
                            <Modal
                                modal={modal}
                                toggle={toggleModal}
                                modalChildRef={modalChildRef}
                            >
                                <div ref={modalChildRef}>
                                    {setModalChild(modal.type)}
                                </div>
                            </Modal>
                        </section>
                    </div>
                </Suspense>
            </div>
        </div>
    )
}