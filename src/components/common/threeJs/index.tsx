import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react'
import {
    apiGlbFileUpload,
    getModelsList,
    saveDefaultModel,
    savePositionModel,
    deleteModel,
    addDeviceMapping,
    getDeviceMappings,
    deleteDeviceMapping,
    getAllDeviceMappings,
    addModelFloors
} from '@/services/ThreedService'
import {
    ThreedModel,
    ThreedDeviceMapping,
    ThreedDeviceMappingMixInfo,
    AddPayload,
    ActivePanel,
    ModalTypeKey,
    CAMERA_TYPES,
    CameraType
} from '@/@types/threeD'
import { ThreeEvent, Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { 
    ModelViewer, 
    ContextMenu, 
    FloorListSidebar,
    DeviceListSidebar, 
    TopHeader, 
    ModelControlSidebar,
    CameraViewer
} from './components/exports'
import Modal from './modal/Modal'
import { ModalType } from '@/@types/modal'
import Remove from './modal/Remove'
import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import { IoWarningOutline } from 'react-icons/io5'
import { FcOpenedFolder } from 'react-icons/fc'
import { ErrorBoundary } from 'react-error-boundary'
import { Html } from '@react-three/drei'
import Add from './modal/Add'
import ManageModelDevice from './modal/ManageModelDevice'
import { useThreeDStore } from '@/store/threeJs/useThreeDStore'
import { useCanvasMapStore } from '@/store/canvasMapStore'
import { DevicePopupType } from '@/@types/device'

type Props = {
    serviceType: string // 필수 값
}

type uploadResult = {
    file: File
    message: 'ok' | 'fail'
}

// 3D 모델/장치 상태 관리용 타입
type ModelState = {
    models: ThreedModel[] // 모델 목록
    currentModel: ThreedModel | null // 현재 선택된 모델
    mixDeviceMappings: ThreedDeviceMappingMixInfo[] // 현재 모델에 연결된 장치 매핑
    isInitialLoading: boolean // 초기 로딩 여부
}

/**
 * serviceType
 * TODO : ob_camera 테이블의 main_service_name 과 매핑되는 값 예정
 * 동일한 값 입력 시 해당 설정에 연결된 카메라 정보를 가져옴
 * 현재는 카메라(CAMERA, CCTV) 타입에 한해 동작하며
 * 다른 디바이스는 추후 별도 분기 처리 필요
 */
const ThreeJSCanvas = ({ serviceType }: Props) => {
    // Zustand 전역 상태 - 모델 로딩 여부
    const isModelLoaded = useThreeDStore((s) => s.isModelLoaded) // 전역 모델 로딩 상태
    const setIsModelLoaded = useThreeDStore((s) => s.setIsModelLoaded) // 전역 모델 로딩 상태 갱신 함수
    const setIsModelError = useThreeDStore((s) => s.setIsModelError) // 전역 모델 로딩 상태 갱신 함수

    // 2D & 3D 뷰 전환 상태
    const { threeDModelId: modelId, buildingIdx, mainServiceName, setCanvasMapState } = useCanvasMapStore();
    // 3D 컨트롤 & 상태 관리
    const currentModelRef = useRef<ThreedModel | null>(null) // 현재 선택된 모델 참조 (상태 아닌 Ref로 관리)
    const controlsRef = useRef<CameraControlsImpl>(null) // orbitControls 제어 참조
    const [isRoation, setIsRoation] = useState(false) // 자동 회전 여부
    const [isTransitioning, setIsTransitioning] = useState(false) // 모델 전환 중 애니메이션 상태
    const [selectedDevice, setSelectedDevice] = useState<ThreedDeviceMappingMixInfo | null>(null) // 선택된 객체 저장

    // 연결된 모델 뷰 상태 관리
    const [linkedView, setLinkedView] = useState<{
        active: boolean, // 연결 모델 보기 모드 여부
        prevModel: ThreedModel | null // 연결된 모델로 이동하기 전 원래 모델 정보 저장
    }>({ active: false, prevModel: null })

    // 모델 & 장치 데이터
    const [allDeviceMappings, setAllDeviceMappings] = useState<ThreedDeviceMappingMixInfo[]>([]) // 모든 모델에 매핑된 장치 데이터 (중복 체크나 전체 현황 조회용)

    // 업로드 관련 상태
    const [uploading, setUploading] = useState(false) // GLB 업로드 진행 여부
    const [modelName, setModelName] = useState('') // 업로드 시 입력한 모델 이름

    // UI 제어 상태
    // const [showBox, setShowBox] = useState(false) // 우측 메뉴 박스 표시 여부
    const [activePanel, setActivePanel] = useState<ActivePanel>('none')

    // 층 목록 전용 상태
    const [isFloorListOpen, setIsFloorListOpen] = useState(false)
    const [floorTargetGroup, setFloorTargetGroup] = useState<string | null>(null)
    const [floorList, setFloorList] = useState<string[]>([])

    const [contextMenuVisible, setContextMenuVisible] = useState(false) // 우클릭 ContextMenu 표시 여부

    // 우클릭 메뉴 위치와 클릭된 장치 정보 저장
    const contextMenuRef = useRef<{
        x: number
        y: number
        clickedDevice: ThreedDeviceMappingMixInfo | null
        groupName: string | null
    }>({
        x: 0,
        y: 0,
        clickedDevice: null,
        groupName: null,
    })

    // 새 장치 생성 시 좌표와 회전 임시 저장
    const deviceCreationRef = useRef({
        point3d: null as THREE.Vector3 | null,
        rotation: null as THREE.Euler | null,
    })

    // 모달 상태
    const modalChildRef = useRef<HTMLDivElement>(null)
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    })
    // 모달별 고정 타이틀 매핑
    const modalTitles: Record<
        'removeModel' | 'removeDevice' | 'manage',
        string
    > = {
        removeModel: '3D 모델 삭제',
        removeDevice: '장비 삭제',
        manage: '3D 모델 / 장비 설정',
    }
    const [targetModel, setTargetModel] = useState<ThreedModel | null>(null) // 삭제/수정 대상이 되는 모델
    const [targetDevice, setTargetDevice] = useState<ThreedDeviceMappingMixInfo | null>(null) // 삭제/수정 대상이 되는 장치

    // 에러 상태
    const [modelError, setModelError] = useState<Error | null>(null) // 모델 로딩 실패 시 저장되는 에러

    // 드래그 여부 (우클릭 드래그 감지용)
    const isDragging = useRef(false) // 우클릭 후 드래그했는지 여부를 기록 -> ContextMenu 열지 않게 하기 위함

    // 카메라 상태
    const [openCameraDevice, setOpenCameraDevice] = useState<ThreedDeviceMappingMixInfo | null>(null)
    const [cameraOverlay, setCameraOverlay] = useState<{
        url: DevicePopupType
        device: ThreedDeviceMappingMixInfo
        pos: { x: number; y: number }
        isEventMode: boolean
    } | null>(null)

    // 3D 모델 및 장치 매핑 상태
    const [modelState, setModelState] = useState<ModelState>({
        models: [], // 전체 모델 목록
        currentModel: null, // 현재 선택된 모델
        mixDeviceMappings: [], // 현재 모델에 매핑된 장치 목록
        isInitialLoading: true, // 최초 로딩 여부 (첫 렌더링 시 로딩 화면 표시용)
    })

    const [isAreaRegisterMode, setIsAreaRegisterMode] = useState(false)
    const [rightClickedGroupName, setRightClickedGroupName] = useState<string | null>(null)

    const { models, currentModel, mixDeviceMappings, isInitialLoading } = modelState

    const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
    /**
     * GLB 파일을 서버에 업로드하는 함수
     * - 모델 이름이 입력되지 않았으면 업로드 불가
     * - FormData를 구성하여 API 호출
     * - 업로드 성공 시 모델 목록 갱신
     */
    const uploadGlbFile = async (fileList: File[], clearFiles: () => void, modelType: string) => {
        if (!fileList[0]) return

        if (!modelName) {
            alert('모델 이름을 입력해주세요.')
            return
        }

        const file = fileList[0]
        const formData = new FormData()

        formData.append('modelName', modelName)
        formData.append('mapImageUrl', file.name)
        formData.append('serviceType', serviceType)
        formData.append('modelType', modelType)
        formData.append('glb_models', file)

        try {
            setUploading(true)
            const res = await apiGlbFileUpload<uploadResult>(formData)

            if (!res || res.message !== 'ok') {
                alert('업로드 실패')
                return
            }

            alert(`${modelName} 업로드 성공`)
            setModelName('')
            clearFiles()
            await refreshData(false)
        } catch (error) {
            console.error('GLB 업로드 에러:', error)
        } finally {
            setUploading(false)
        }
    }

    // 저장되어 있는 디바이스 장비 리스트 불러오는 함수 (선택 된 모델 기준)
    const loadDeviceMappings = useCallback(
        async (model: ThreedModel) => {
            const payload = { modelId: model.id, serviceType }
    
            try {
                const res = await getDeviceMappings(payload)
                
                setModelState((prev) => ({
                    ...prev,
                    mixDeviceMappings: res.message === 'ok'
                        ? (res.result as unknown as ThreedDeviceMappingMixInfo[])
                        : [],
                }))
            } catch (error) {
                console.error('3D 장비 매핑 불러오기 실패:', error)
                setModelState((prev) => ({ ...prev, mixDeviceMappings: [] }))
            }
        },
        [serviceType],
    )
      
    /**
     * 저장되어 있는 디바이스 장비 리스트 불러오는 함수 (전체 매핑 로드)
     * - 현재 선택된 모델 외 동일 serviceType 내 모든 모델에 매핑된 장비들을 조회
     * - 신규 장비 추가(Add) 시 중복 매핑 여부 확인 또는 전체 매핑 현황을 표시할 때 활용
     */
    const loadAllDeviceMappings = useCallback(async () => {
        const payload = {
            serviceType,
        }

        try {
            const res = await getAllDeviceMappings(payload)
            
            if (res.message === 'ok') {
                setAllDeviceMappings(
                    res.result as unknown as ThreedDeviceMappingMixInfo[],
                )
            } else {
                setAllDeviceMappings([])
            }
        } catch (error) {
            console.error('3D 장비 전체 매핑 불러오기 실패:', error)
            setAllDeviceMappings([])
        }
    }, [serviceType])

    /**
     * 서버에서 3D 모델 목록을 불러와 상태를 갱신하는 함수
     * true  - 모델 목록을 불러온 후, 기본 사용 모델(is_use=true)을 현재 모델로 세팅
     * false - 모델 목록만 갱신함, 현재 선택된 모델(currentModelRef)을 새 리스트에서 찾아 최신화
     */
    const refreshData = useCallback(
        async (setDefault: boolean = true) => {
            const payload = { serviceType }
        
            try {
                const res = await getModelsList(payload)
        
                if (res.message === 'fail') {
                    alert(res.result)
                    return
                }
        
                const list = res.result as unknown as ThreedModel[]
                await loadAllDeviceMappings()
                
                if (setDefault) {
                    // 기본 모델(is_use=true) 찾고 장치 매핑 불러오기
                    const defaultModel = list.find((item) => item?.is_use) ?? null
                    
                    if (defaultModel) {
                        await loadDeviceMappings(defaultModel)
                    } else {
                        setIsModelLoaded(true)
                    }
            
                    // 모델 목록과 기본 모델로 상태 갱신
                    setModelState((prev) => ({
                        ...prev,
                        models: list,
                        currentModel: defaultModel,
                        isInitialLoading: false,
                    }))
                } else {
                    // 현재 선택된 모델 유지하면서 최신 데이터로 갱신
                    const prevModel = currentModelRef.current
                    let newCurrentModel: ThreedModel | null = null
            
                    if (prevModel) {
                        const found = list.find((item) => item.id === prevModel.id) ?? null
                        newCurrentModel = found
            
                        if (found) {
                            await loadDeviceMappings(found)
                            currentModelRef.current = found
                        }
                    }
            
                    // 모델 목록과 현재 모델로 상태 갱신
                    setModelState((prev) => ({
                        ...prev,
                        models: list,
                        currentModel: newCurrentModel,
                        isInitialLoading: false,
                    }))
                }
            } catch (error) {
                console.error('3D 모델 데이터를 불러오는데 실패했습니다.', error)
        
                setModelState((prev) => ({
                    ...prev,
                    isInitialLoading: false,
                }))
            }
        },
        [serviceType, setIsModelLoaded, loadDeviceMappings, loadAllDeviceMappings],
    )

    useEffect(() => {
        currentModelRef.current = currentModel // currentModel 상태가 바뀔 때마다 ref도 동기화
    }, [currentModel])

    /**
     * 3D 공간에서 모델 객체를 우클릭했을 때 실행되는 함수
     * - 회전 중이거나 드래그 중이면 동작하지 않음
     * - 클릭한 위치를 기준으로 ContextMenu를 열고,
     *   해당 위치 좌표(point3d)를 저장하여 새로운 장비 등록 준비
     */
    const modelContextMenu = useCallback((event: ThreeEvent<MouseEvent>, groupName?: string) => {
        if (isRoation || isDragging.current) return
        event.stopPropagation()
        event.nativeEvent.preventDefault()

        const canvas = document.getElementById('threejs-canvas')
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()

        const point = event.point.clone() // 클릭 위치
        let rotation: THREE.Euler | null = null

        // 카메라에서 클릭한 점으로 향하는 방향
        const cameraDir = new THREE.Vector3()
            .subVectors(point, event.camera.position) // 카메라 -> 클릭지점 벡터
            .normalize()

        const obj = new THREE.Object3D()
        obj.position.copy(point)
        obj.lookAt(point.clone().add(cameraDir))

        /**
         * TODO : GLB 모델 요청 시 조건
         * - 피벗(Origin)은 설치 기준점(벽/바닥 닿는 지점)을 (0,0,0) 으로
         * - 모델의 앞(front)은 +Z 축을 바라보도록
         * - 단위는 1 = 1m 로 통일
         *    -> 이렇게 해야 lookAt/offset 로직이 모든 모델에 동일하게 적용 가능
         *
         * 현재는 인터넷에서 다운로드한 테스트용 GLB라서
         * 피벗 위치를 정확히 알 수 없어 임시 offset을 적용 중임
         * - GLB의 local Z축을 기준으로 -0.15m 이동
         * - 모델이 벽에 파묻히는 걸 방지하기 위한 임시 처리
         *
         * 실제 디자이너가 제공하는 GLB 파일을 받으면
         * 밑에 테스트 offset 로직은 반드시 제거해야 함
         */
        const offset = new THREE.Vector3(0, 0, -0.15)
        offset.applyEuler(obj.rotation) // 회전값 반영해서 월드 좌표계로 변환
        obj.position.add(offset) // 최종 위치에 offset 적용

        obj.rotateY(-Math.PI / 2)
        rotation = obj.rotation.clone()

        deviceCreationRef.current = {
            point3d: obj.position.clone(),
            rotation,
        }
        
        contextMenuRef.current = {
            x: event.nativeEvent.clientX - rect.left,
            y: event.nativeEvent.clientY - rect.top,
            clickedDevice: null,
            groupName: groupName ?? null
        }

        setContextMenuVisible(true)
    }, [isRoation]) 

    /**
     * 3D 공간에서 특정 디바이스(마커)를 우 클릭했을 때 실행되는 함수
     * - 회전 모드일 경우 무시
     * - 클릭된 마커 정보를 ContextMenu에 전달하여,
     *   해당 마커에 대해 삭제/좌표 확인/모델 이동 같은 작업 가능
     * - 객체위 디바이스클 우클릭하면 객체 이벤트는 무시
     */
    const deviceContextMenu = useCallback((
        event: ThreeEvent<MouseEvent>,
        device: ThreedDeviceMappingMixInfo,
    ) => {
        if (isRoation) return
        event.stopPropagation()
        event.nativeEvent.preventDefault()
    
        const canvas = document.getElementById('threejs-canvas')
        if (!canvas) return
    
        const rect = canvas.getBoundingClientRect()
        setSelectedDevice(device)
    
        contextMenuRef.current = {
            x: event.nativeEvent.clientX - rect.left,
            y: event.nativeEvent.clientY - rect.top,
            clickedDevice: device,
            groupName: null
        }
    
        setContextMenuVisible(true)
    }, [isRoation, setSelectedDevice]) 

    /**
     * 선택된 3D 모델을 서버에서 삭제하는 함수 (기본값: false)
     * true - 상위 관리 모달 유지
     * false - 삭제 확인 모달 닫기
     */
    const removeModel = async (manageClose: boolean = false) => {
        if (!targetModel) {
            alert('삭제할 모델를 찾을 수 없습니다.')
            return
        }

        const payload = {
            modelId: targetModel.id,
            serviceType: serviceType,
        }

        try {
            const res = await deleteModel(payload)

            if (res.message === 'fail') {
                alert(res.result)
                return
            }

            if (!res || !res.result) {
                return
            }
            
            if (!manageClose) {
                closeModal()
            }

            if (linkedView.active && linkedView.prevModel) {
                resetFloorState()

                // 선택 된 모델이 기본 모델이 아닐경우 선택 된 모델로 이동
                setLinkedView({ active: false, prevModel: null })
                setSelectedDevice(null)
                await switchModelWithDevices(linkedView.prevModel.id)
                await refreshData(false)
              } else {
                resetFloorState()

                // 기본 동작 - 기본 모델로
                setModelState((prev) => ({
                    ...prev,
                    mixDeviceMappings: [],
                    currentModel: null,
                }))
                setSelectedDevice(null)
                setLinkedView({ active: false, prevModel: null })
                await refreshData(true)
              }
        } catch (error) {
            console.error('3D 모델 삭제 API 에러: ', error)
            return
        }
    }

    const resetFloorState = () => {
        setIsFloorListOpen(false)
        setFloorTargetGroup(null)
        setFloorList([])
        setIsAreaRegisterMode(false)
    }

    useEffect(() => {
        if (!currentModel) {
            resetFloorState();
        }
    }, [currentModel])

    // 현재 선택된 장비를 삭제하는 함수
    const removeDevice = async () => {
        if (!targetDevice || !currentModel) return

        try {
            const payload = {
                id: targetDevice.id,
            }

            const res = await deleteDeviceMapping(payload)

            if (res.message === 'fail') {
                alert(res.result)
                return
            }

            // 현재 모델 기준 매핑 다시 불러오기
            await loadDeviceMappings(currentModel)

            // 전체 매핑도 다시 불러오기
            await loadAllDeviceMappings()

            setTargetDevice(null)
            closeModal()
        } catch (error) {
            console.error('3D 장비 삭제 API 에러:', error)
        }
    }

    // Remove 모달에 전달할 props를 결정하는 함수
    const getRemoveConfig = () => {
        if (modal.title === modalTitles.removeModel) {
            return {
                remove: removeModel,
                type: 'threeJsModel',
                deleteTarget: { title: targetModel?.name ?? '' },
            }
        } else if (modal.title === modalTitles.removeDevice) {
            const title = `${targetDevice?.name ?? ''} (${targetDevice?.mapping_name ?? ''})`

            return {
                remove: removeDevice,
                type: 'threeJsDevice',
                deleteTarget: { title },
            }
        }
        return {
            remove: () => {},
            type: '',
            deleteTarget: { title: '' },
        }
    }

    // 현재 카메라 시점을 서버에 저장하여 선택 된 모델을 기본 모델로 등록하는 함수
    const onSaveModel = async (modelId: number) => {
        if (!modelId) return alert('저장할 모델을 찾을 수 없습니다.');
        const controls = controlsRef.current;
        if (!controls) return alert('카메라 정보를 가져올 수 없습니다.');

        const camera = controls.camera; // 내부 camera 참조
        const target = new THREE.Vector3();
        controls.getTarget(target);

        const payload = {
            modelId,
            serviceType,
            camera_pos_x: camera.position.x,
            camera_pos_y: camera.position.y,
            camera_pos_z: camera.position.z,
            camera_target_x: target.x,
            camera_target_y: target.y,
            camera_target_z: target.z,
            camera_zoom: 1,
        };

        try {
            const res = await saveDefaultModel(payload);
            if (res.message === 'fail') return alert(res.result);
            if (!res || !res.result) return;

            alert('현재 모델이 기본 모델로 등록되었습니다.');
            await refreshData(false);
        } catch (error) {
            console.error('3D 모델 저장 API 에러:', error);
        }
    };

    // 컴포넌트 마운트 시 또는 refreshData가 변경될 때 모델 목록 초기화/갱신
    useEffect(() => {
        if (!modelState.models.length) refreshData(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 모델 전환 함수 (장치 매핑 초기화 + 전환 애니메이션 처리)
    const switchModelWithDevices = useCallback(
        async (id: number) => {
            // 이미 같은 모델이면 그냥 무시
            if (currentModelRef.current?.id === id) return

            setIsTransitioning(true)
            setIsModelLoaded(false);
            setIsModelError(false);

            // 층 관련 초기화 상태
            setIsFloorListOpen(false)
            setFloorTargetGroup(null)
            setFloorList([])
            setIsAreaRegisterMode(false)

            setActivePanel('none')
            setContextMenuVisible(false)

            setModelState((prev) => ({
                ...prev,
                mixDeviceMappings: [],
            }))
        
            if (linkedView.active) {
                setLinkedView({ active: false, prevModel: null })
                setSelectedDevice(null)
            }
        
            await new Promise((resolve) => setTimeout(resolve, 100))
        
            const selectedModel = models.find((m) => m.id === id) || null
            setModelState((prev) => ({
                ...prev,
                currentModel: selectedModel,
            }))
        
            if (selectedModel) {
                await loadDeviceMappings(selectedModel)
            }
        
            await new Promise((resolve) => setTimeout(resolve, 500))
            setIsTransitioning(false)
        },
        [models, loadDeviceMappings, linkedView.active, setIsModelLoaded, setIsModelError],
    )
    
    const setModalChild = (type: string) => {
        switch (type) {
            case 'manage':
                return (
                    <ManageModelDevice
                        models={models}
                        modelName={modelName}
                        setModelName={setModelName}
                        uploadGlbFile={uploadGlbFile}
                        uploading={uploading}
                        setTargetModel={setTargetModel}
                        removeModel={removeModel}
                        onRefreshDevices={async () => {
                            if (currentModel) {
                                await loadDeviceMappings(currentModel)
                            }
                            await loadAllDeviceMappings()
                        }}
                    />
                )
            case 'add':
                return (
                    <Add
                        title={modal.title}
                        currentModelId={currentModel ? currentModel.id : null}
                        models={models}
                        isLinkedView={linkedView.active}
                        deviceMappings={mixDeviceMappings}
                        allDeviceMappings={allDeviceMappings}
                        serviceType={serviceType}
                        add={addNewDevice}
                        closeModal={closeModal}
                    />
                )
            case 'remove': {
                const {
                    remove,
                    type: removeType,
                    deleteTarget,
                } = getRemoveConfig()

                return (
                    <Remove
                        remove={remove}
                        closeModal={closeModal}
                        type={removeType}
                        deleteTarget={deleteTarget}
                    />
                )
            }
            default:
                return null
        }
    }

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type,
        })
    }

    const closeModal = () => {
        if (modal.type === 'add') {
            setIsAreaRegisterMode(false)
            deviceCreationRef.current = { point3d: null, rotation: null }
        } else if (modal.type === 'manage') {
            setModelName('')
        } else if (modal.type === 'remove') {
            setTargetModel(null)
        }

        toggleModal({
            show: false,
            type: '',
            title: '',
        })
    }

    // 현재 카메라 시점을 서버에 저장하여 선택 된 모델을 기본 카메라 위치로 등록하는 함수
    const onSavePosition = async (modelId: number, showAlert: boolean = true) => {
        if (!controlsRef.current) {
            alert('카메라 정보를 가져올 수 없습니다.')
            return
        }

        const controls = controlsRef.current
        const camera = controls.camera
        const target = new THREE.Vector3()
        controls.getTarget(target)

        const payload = {
            modelId,
            serviceType,
            camera_pos_x: camera.position.x,
            camera_pos_y: camera.position.y,
            camera_pos_z: camera.position.z,
            camera_target_x: target.x,
            camera_target_y: target.y,
            camera_target_z: target.z,
            camera_zoom: controls.distance,
        }

        try {
            const res = await savePositionModel(payload)

            if (res.message === 'fail') {
                alert(res.result)
                return
            }

            if (!res || !res.result) {
                return
            }

            if (showAlert) alert('현재 모델이 기본 위치로 등록되었습니다.')
            await refreshData(false)
        } catch (error) {
            console.error('3D 모델 기본 위치 저장 API 에러: ', error)
        }
    }

    /**
     * 현재 선택된 모델(currentModel)에 저장된 카메라 값으로
     * three.js 카메라 설정을 구성하는 useMemo
     * - config: position, fov, near, far
     * - target: 카메라가 바라보는 좌표
     * - hasSaveView: 저장된 위치/타겟이 있는지 여부
     */
    const cameraState = useMemo(() => {
        const hasPosition =
            currentModel?.camera_pos_x != null &&
            currentModel?.camera_pos_y != null &&
            currentModel?.camera_pos_z != null

        const hasTarget =
            currentModel?.camera_target_x != null &&
            currentModel?.camera_target_y != null &&
            currentModel?.camera_target_z != null

        return {
            config: {
                ...(hasPosition && {
                    position: [
                        currentModel!.camera_pos_x,
                        currentModel!.camera_pos_y,
                        currentModel!.camera_pos_z,
                    ] as [number, number, number],
                }),
                fov: 50,
                near: 0.1,
                far: 1000,
            },
            target: hasTarget
                ? ([
                      currentModel!.camera_target_x,
                      currentModel!.camera_target_y,
                      currentModel!.camera_target_z,
                  ] as [number, number, number])
                : ([0, 0, 0] as [number, number, number]),
            hasSaveView: hasPosition && hasTarget,
        }
    }, [currentModel])

    /**
     * 컨텍스트 메뉴 닫기 처리
     * - 메뉴 외부 클릭 또는 마우스 휠 동작 시 닫음
     * - 메뉴 내부 클릭 시에는 무시
     */
    useEffect(() => {
        const contextMenuClose = (e: MouseEvent) => {
            const menuEl = document.getElementById('3d-context-menu')
            if (menuEl && menuEl.contains(e.target as Node)) return
    
            setContextMenuVisible(false)
            contextMenuRef.current = { x: 0, y: 0, clickedDevice: null, groupName: null }
        }
    
        if (contextMenuVisible) {
            window.addEventListener('mousedown', contextMenuClose)
            window.addEventListener('wheel', contextMenuClose)
        }
    
        return () => {
            window.removeEventListener('mousedown', contextMenuClose)
            window.removeEventListener('wheel', contextMenuClose)
        }
    }, [contextMenuVisible])
    
    /**
     * 우클릭 드래그 감지 로직
     * - 마우스 우클릭 누를 때 - 드래그 상태 초기화
     * - 마우스 이동 시 (우클릭 상태) - 드래그 중으로 인식
     * - 마우스 우클릭 뗄 때 - 드래그 상태 초기화 (setTimeout 사용으로 contextMenu와 충돌 방지)
     */
    useEffect(() => {
        const onRightMouseDown = (e: MouseEvent) => {
            if (e.button === 2) {
                // 우클릭
                isDragging.current = false
            }
        }

        const onRightMouseMove = (e: MouseEvent) => {
            if (e.buttons === 2) {
                // 우클릭 누른 상태에서 움직임 감지
                isDragging.current = true
            }
        }

        const onRightMouseUp = (e: MouseEvent) => {
            if (e.button === 2) {
                // 드래그 한 경우라면 contextMenu 열지 않음
                setTimeout(() => {
                    isDragging.current = false
                }, 0)
            }
        }

        window.addEventListener('mousedown', onRightMouseDown)
        window.addEventListener('mousemove', onRightMouseMove)
        window.addEventListener('mouseup', onRightMouseUp)

        return () => {
            window.removeEventListener('mousedown', onRightMouseDown)
            window.removeEventListener('mousemove', onRightMouseMove)
            window.removeEventListener('mouseup', onRightMouseUp)
        }
    }, [])

    // 연결된 모델로 전환하는 함수
    const navigateToLinkedModel = async (device: ThreedDeviceMappingMixInfo) => {
        if (!device.linked_model_id) return

        setLinkedView({ active: true, prevModel: currentModel })

        setContextMenuVisible(false)
        contextMenuRef.current = { x: 0, y: 0, clickedDevice: null, groupName: null }

        if (device.type === 'linked_model') {
            setViewMode('3D');
            await switchModelWithDevices(device.linked_model_id)
        } else {
            // TODO : 여기다 주스탠드
            const { model_id, id, mapping_name, map_image_url } = device;
            setCanvasMapState({
                threeDModelId: model_id,
                buildingIdx,
                floorIdx: id,
                mapImageURL: map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${map_image_url}` : null,
                floorName: mapping_name,
                mainServiceName: 'origin',
                is3DView: true
            });
            setViewMode('2D');
        }
    }

    // 장비 삭제 모달을 여는 함수
    const deleteDeviceModalOpen = (device: ThreedDeviceMappingMixInfo) => {
        setIsRoation(false)
        setTargetDevice(device)
    
        toggleModal({
            show: true,
            type: 'remove',
            title: modalTitles['removeDevice'],
        })
    
        setContextMenuVisible(false)
        contextMenuRef.current = { x: 0, y: 0, clickedDevice: null, groupName: null }
    }

    // 선택된 장비 좌표/회전 값으로 카메라 이동
    const moveToDeviceFocus = useCallback((device: ThreedDeviceMappingMixInfo) => {
        if (!controlsRef.current) return
        setIsRoation(false)

        const controls = controlsRef.current

        // 장비 위치
        const pos = new THREE.Vector3(
            device.position_x,
            device.position_y,
            device.position_z,
        )

        // 장비의 회전값
        const rotation = new THREE.Euler(
            device.rotation_x ?? 0,
            device.rotation_y ?? 0,
            device.rotation_z ?? 0,
            'XYZ'
        )

        // 장비의 앞 방향 (local +Z 기준)
        const forward = new THREE.Vector3(13, 0, -3.5)
            .applyEuler(rotation)
            .normalize()

        // 장비의 위 방향 (눈높이 보정)
        const up = new THREE.Vector3(0, 15, 0)

        // 카메라 위치 오프셋
        const distance = 70     // 장비로부터 거리 (m)
        const height = 1.6      // 눈높이 (m)

        // 카메라 위치 = 장비 위치 - 앞방향 * 거리 + 위로 height
        const cameraPos = pos
            .clone()
            .sub(forward.multiplyScalar(distance))
            .add(up.multiplyScalar(height))

        // 카메라가 장비 정면을 바라보게
        controls.setLookAt(
            cameraPos.x, cameraPos.y, cameraPos.z, // 카메라 위치
            pos.x, pos.y + height, pos.z     // 타겟 (장비 약간 위)
        )

        setSelectedDevice(device)
    }, [setSelectedDevice])

    const toggleDeviceList = () => {
        setActivePanel((prev) =>
            prev === 'deviceList' ? 'none' : 'deviceList'
        )
    }

    const toggleModelControl = () => {
        setActivePanel((prev) =>
            prev === 'modelControl' ? 'none' : 'modelControl'
        )
    }

    // 모델 로드 실패 시 표시되는 Fallback 컴포넌트
    const ModelErrorFallback = ({ error }: { error: Error }) => {
        return (
            <Html center zIndexRange={[0, 0]}>
                <div className="bg-white border border-red-300 rounded-md shadow-md p-6 max-w-lg w-[500px] text-center">
                    <p className="flex items-center justify-center font-semibold text-red-600 mb-3 text-lg">
                        <IoWarningOutline className="mr-2 text-2xl" />
                        모델 로드 실패
                    </p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {error.message}
                    </p>
                </div>
            </Html>
        )
    }

    // 새로운 장비(Device)를 3D 모델에 매핑하여 추가하는 함수
    const addNewDevice = async ({ selectedTypeId, targetData }: AddPayload) => {
        if (!currentModel || !deviceCreationRef.current.point3d) return

        const { point3d, rotation } = deviceCreationRef.current

        const newDeviceMapping = {
            model_id: currentModel.id,
            mapping_name: targetData.mapping_name,
            device_id:
            selectedTypeId === 0
                ? targetData?.id
                : selectedTypeId === 2
                ? -1
                : 0,
            linked_model_id:
                selectedTypeId === 1 || selectedTypeId === 2
                ? targetData?.id
                : null,
            position_x: point3d.x,
            position_y: point3d.y,
            position_z: point3d.z,
            rotation_x: rotation?.x,
            rotation_y: rotation?.y,
            rotation_z: rotation?.z,
            scale: null,
            group_name: null,
        }

        try {
            const res = await addDeviceMapping(newDeviceMapping)

            if (!res || !res.result) return

            const mapping = res.result as unknown as ThreedDeviceMapping

            const data = {
                ...(selectedTypeId === 0 && { type: targetData.type }),
                // ...(selectedTypeId === 1 && { type: 'model_link' }),
                ...(selectedTypeId === 2 && { type: 'image_link' }),
            };

            const mix = {
                ...mapping,
                name: selectedTypeId === 0
                    ? targetData.name
                    : selectedTypeId === 1
                    ? targetData.name
                    : 'image',
                filename: selectedTypeId === 0 ? targetData.filename : '',
                type: data.type ?? '',
                description: selectedTypeId === 0 ? targetData.description : '', // 일반 장비만 값 유지
            }

            setModelState((prev) => ({
                ...prev,
                mixDeviceMappings: [...prev.mixDeviceMappings, mix],
            }))

            await loadAllDeviceMappings()
            closeModal()
        } catch (error) {
            console.error('3D 장비 등록 API 에러:', error)
        } finally {
            deviceCreationRef.current = { point3d: null, rotation: null }
        }
    }

    // 연결된 모델 뷰에서 메인 모델 뷰로 되돌아가는 함수
    // const backToMain = async () => {
    //     if (linkedView.prevModel) {
    //         setSelectedDevice(null)
    //         await switchModelWithDevices(linkedView.prevModel.id)
    //     }
    //     setLinkedView({ active: false, prevModel: null })

    //     if (viewMode === '2D') {
    //         setViewMode('3D')
    //     }
    // }

    // 현재 모델에 저장된 기본 카메라 위치/타겟으로 카메라를 리셋하는 함수
    const resetCameraToDefault = () => {
        if (!controlsRef.current || !currentModel) return

        const controls = controlsRef.current

        const hasPosition =
            currentModel.camera_pos_x != null &&
            currentModel.camera_pos_y != null &&
            currentModel.camera_pos_z != null

        const hasTarget =
            currentModel.camera_target_x != null &&
            currentModel.camera_target_y != null &&
            currentModel.camera_target_z != null

        if (!hasPosition || !hasTarget) {
            alert('저장된 기본 위치가 없습니다. 먼저 [위치 저장]을 해주세요.')
            return
        }

        controls.setLookAt(
            currentModel.camera_pos_x!,
            currentModel.camera_pos_y!,
            currentModel.camera_pos_z!,
            currentModel.camera_target_x!,
            currentModel.camera_target_y!,
            currentModel.camera_target_z!,
        )
    }

    const onOpenCamera = useCallback((device: ThreedDeviceMappingMixInfo) => {
        if (CAMERA_TYPES.includes(device.type?.toLowerCase() as CameraType)) {
            setOpenCameraDevice(device)
        }
    }, [setOpenCameraDevice])

    useEffect(() => {
        const controls = controlsRef.current
        if (!controls) return

        if (cameraOverlay) {
            // overlay가 켜져있을 땐 컨트롤 완전 비활성화
            controls.enabled = false
        } else {
            // overlay가 없을 땐 다시 활성화
            controls.enabled = true
        }
    }, [cameraOverlay])

    useEffect(() => {
        if (viewMode === '2D') {
            // createCanvas();
        }
    }, [viewMode]);

    useEffect(() => {
        if (modelId == null || mainServiceName !== serviceType || models.length === 0) return
        setViewMode('3D');
        switchModelWithDevices(modelId);

    }, [modelId, switchModelWithDevices, mainServiceName, serviceType, models]);
    
    const isUIReady = useMemo(
        () =>
            isModelLoaded &&
            !isInitialLoading &&
            !isTransitioning,
        [isModelLoaded, isInitialLoading, isTransitioning]
    )
    
    const openModal = (type: ModalTypeKey, id?: number) => {
        const mappedType = type === 'removeModel' ? 'remove' : type

        toggleModal({
            show: true,
            type: mappedType,
            title: modalTitles[type],
        })

        if (type === 'removeModel' && id) {
            const found = models.find((m) => m.id === id) || null
            setTargetModel(found)
        }
    }

    const canRotate = useMemo(
        () => !!currentModel && !modelError,
        [currentModel, modelError]
    )

    const syncFloorsToServer = useCallback(async () => {
        if (!currentModel || !floorTargetGroup || floorList.length === 0) return
        
        const payload = floorList.map((floorName) => ({
            model_id: currentModel.id,
            building_group: floorTargetGroup,
            floor_name: floorName,
            serviceType,
        }))

        try {
            await addModelFloors(payload)
            // DB 반영 후 최신 매핑 리스트 다시 불러오기
            await loadDeviceMappings(currentModel)
        } catch (error) {
            console.error('층 데이터 동기화 에러:', error)
        }
    }, [currentModel, floorTargetGroup, floorList, serviceType, loadDeviceMappings])

    useEffect(() => {
        if (isFloorListOpen && floorList.length > 0) {
            syncFloorsToServer()
        }
    }, [isFloorListOpen, floorList, syncFloorsToServer])
        
    // serviceType없을 경우 띄워줄 화면
    if (!serviceType || serviceType.trim() === '') {
        return (
            <div className="flex items-center justify-center w-full h-full text-gray-500">
                <div className="text-center">
                    <p className="flex items-center justify-center text-lg font-semibold text-red-600 mb-2">
                        <IoWarningOutline className="mr-2 text-2xl" />
                        서비스 타입 오류
                    </p>
                    <p className="text-sm">
                        서비스 타입이{' '}
                        <span className="font-bold">비어있거나</span> 지정되지
                        않았습니다.
                    </p>
                    <p className="text-sm">
                        <span className="font-medium text-gray-700">
                            컴포넌트 전달값을 확인해주세요.
                        </span>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="relative w-full h-full">
                {/* 3D, 2D 화면 */}
                {viewMode === '3D' ? (
                    <>
                        {/* 3D 공간 */}
                        {/* 로딩 상태 UI */}
                        {(!isModelLoaded || isInitialLoading || isTransitioning) && (
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20 transition-opacity duration-500">
                                <div className="text-center">
                                    <div className="text-lg font-semibold mb-2">
                                        로딩 중...
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        모델 데이터를 불러오고 있습니다.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 표시 모델 없을 시 화면 */}
                        {!currentModel && !isInitialLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="text-center text-gray-600">
                                    <p className="flex items-center justify-center text-xl font-semibold mb-2">
                                        <FcOpenedFolder className="mr-2 text-2xl" />
                                        표시할 모델이 없습니다
                                    </p>
                                    <p className="text-sm">새 모델을 업로드해주세요.</p>
                                </div>
                            </div>
                        )}

                        <TopHeader
                            isRotation={isRoation}
                            activePanel={activePanel}
                            canRotate={canRotate}
                            onToggleDeviceList={toggleDeviceList}
                            onToggleModelControl={toggleModelControl}
                            onToggleRotation={() => setIsRoation((p) => !p)}
                            onToggleView={() => {
                                const current = useCanvasMapStore.getState()
                                    setCanvasMapState({
                                    ...current,
                                    is3DView: !current.is3DView,
                                })
                            }}
                            onOpenModal={(type, id) => {
                                openModal(type, id);
                            }}
                            onResetCamera={resetCameraToDefault}
                        />
                        
                        {isUIReady && activePanel === 'deviceList' && (
                            <DeviceListSidebar
                                mixDeviceMappings={mixDeviceMappings}
                                selectedDevice={selectedDevice}
                                onSelectDevice={(device) => setSelectedDevice(device)}
                                onMoveDeviceFocus={moveToDeviceFocus}
                                onDeleteDevice={deleteDeviceModalOpen}
                                onOpenCamera={onOpenCamera}
                            />
                        )}

                        {isUIReady && activePanel === 'modelControl' && (
                            <ModelControlSidebar
                                models={models}
                                currentModelId={currentModel ? currentModel.id : null}
                                onModelSelect={switchModelWithDevices}
                                onOpenModal={(type, id) => {
                                    openModal(type, id);
                                }}
                                onSaveModel={onSaveModel}
                                onSavePosition={onSavePosition}
                            />
                        )}
                        
                        {isFloorListOpen && floorTargetGroup && (
                            <FloorListSidebar
                                floors={floorList}
                                onClose={() => {
                                    setIsAreaRegisterMode(false);
                                    setIsFloorListOpen(false)
                                    setFloorTargetGroup(null)
                                    setFloorList([])
                                }}
                                onSelectFloor={(floorName) => {
                                    const floorDevice = mixDeviceMappings.find(
                                        (d) =>
                                            d.mapping_name === floorName &&
                                            d.group_name === floorTargetGroup &&
                                            d.device_id === -1 &&
                                            d.linked_model_id === -1
                                    )

                                    if (!floorDevice) {
                                        console.warn('층 매핑을 찾을 수 없음:', floorName)
                                        return
                                    }

                                    navigateToLinkedModel(floorDevice)
                                    setIsFloorListOpen(false)
                                }}
                            />
                        )}

                        <div id="threejs-canvas" className="absolute inset-0">
                            {!isInitialLoading && (
                                <Canvas
                                    key={currentModel ? currentModel.id : null}
                                    style={{
                                        background: '#f0f0f0',
                                        opacity: !isModelLoaded || isTransitioning ? 0 : 1,
                                        transition: 'opacity 0.3s ease-in-out',
                                    }}
                                    camera={cameraState.config}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onPointerDown={(e) => {
                                        if (e.button === 0) {
                                            setSelectedDevice(null)
                                        }
                                    }}
                                    onCreated={({ gl }) => {
                                        gl.getContext().canvas.addEventListener('webglcontextlost', (e) => {
                                            e.preventDefault()
                                        })
                                    }}
                                >
                                    <Suspense fallback={null}>
                                        {currentModel && (
                                            <ErrorBoundary
                                                FallbackComponent={ModelErrorFallback}
                                                onError={(error) => setModelError(error)}
                                            >
                                                <ModelViewer
                                                    modelPath={`http://${window.location.hostname}:4200/images/glb_models/${currentModel.filename}`}
                                                    currentModelId={currentModel ? currentModel.id : null}
                                                    mixDeviceMappings={mixDeviceMappings}
                                                    isRoation={isRoation}
                                                    controlsRef={controlsRef}
                                                    controlsTarget={cameraState.target}
                                                    hasSaveView={cameraState.hasSaveView}
                                                    selectedDevice={selectedDevice}
                                                    openCameraDevice={openCameraDevice}
                                                    isAreaRegisterMode={isAreaRegisterMode}
                                                    rightClickedGroupName={rightClickedGroupName}
                                                    setIsAreaRegisterMode={setIsAreaRegisterMode}
                                                    setIsFloorListOpen={setIsFloorListOpen}
                                                    setFloorList={setFloorList}
                                                    setRightClickedGroupName={setRightClickedGroupName}
                                                    setSelectedDevice={setSelectedDevice}
                                                    setCameraOverlay={setCameraOverlay}
                                                    setOpenCameraDevice={() => setOpenCameraDevice(null)}
                                                    onModelContextMenu={modelContextMenu}
                                                    onDeviceContextMenu={deviceContextMenu}
                                                    onNavigateModel={navigateToLinkedModel}
                                                    onSavePosition={onSavePosition}
                                                />
                                            </ErrorBoundary>
                                        )}
                                    </Suspense>
                                </Canvas>
                            )}
                        </div>

                        {/* 모달 */}
                        <Modal
                            width={modal.type === 'manage' ? 850 : 520}
                            modal={modal}
                            toggle={toggleModal}
                            modalChildRef={modalChildRef}
                            onClose={closeModal}
                        >
                            <div ref={modalChildRef}>{setModalChild(modal.type)}</div>
                        </Modal>

                        {/* 컨텍스 메뉴(우클릭) */}
                        <ContextMenu
                            data={{
                                visible: contextMenuVisible,
                                ...contextMenuRef.current,
                            }}
                            rightClickedGroupName={rightClickedGroupName}
                            onDeleteDevice={() => {
                                if (contextMenuRef.current.clickedDevice) {
                                    deleteDeviceModalOpen(contextMenuRef.current.clickedDevice)
                                }
                            }}
                            onNavigateModel={async () => {
                                if (contextMenuRef.current.clickedDevice) {
                                    navigateToLinkedModel(contextMenuRef.current.clickedDevice)
                                }
                            }}
                            onAdd={(type) => {
                                if (deviceCreationRef.current.point3d) {
                                    toggleModal({
                                        show: true,
                                        type: 'add',
                                        title: type,
                                    })
                                }

                                setContextMenuVisible(false)
                            }}
                            onOpenFloorList={(groupName) => {
                                setFloorTargetGroup(groupName)
                                setIsAreaRegisterMode(true);
                                setIsFloorListOpen(true)
                                setContextMenuVisible(false)
                            }}
                        />

                        {/* Camera 오버레이 (HTML 고정 UI) */}
                        {cameraOverlay && (
                            <CameraViewer
                                cameraOverlay={cameraOverlay}
                                onClose={() => {
                                    setCameraOverlay(null)
                                }}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* 2D 패브릭 넣을 공간 */}
                        <>
                        </>
                    </>
                )}
            </div>
        </>
    )
}

export default ThreeJSCanvas