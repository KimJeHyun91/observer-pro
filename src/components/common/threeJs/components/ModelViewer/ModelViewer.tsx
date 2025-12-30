import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { ThreeEvent, useThree, useFrame } from '@react-three/fiber'
import { CameraControls, Environment, Bounds, Center } from '@react-three/drei'
import * as THREE from 'three'
import { ThreedDeviceMappingMixInfo, CAMERA_TYPES, CameraType } from '@/@types/threeD'
import type { CameraControls as CameraControlsImpl } from '@react-three/drei'
import Model from './Model'
import Device from './Device'
import { useThreeDStore } from '@/store/threeJs/useThreeDStore'
import { DevicePopupType } from '@/@types/device'

type ModelViewerProps = {
    currentModelId: number | null
    modelPath: string // 표시할 GLB 모델 경로
    mixDeviceMappings?: ThreedDeviceMappingMixInfo[] // 모델에 표시할 장치 데이터
    onModelContextMenu: (event: ThreeEvent<MouseEvent>, groupName?: string) => void // 모델 우클릭 메뉴 콜백
    onDeviceContextMenu: (
        event: ThreeEvent<MouseEvent>,
        device: ThreedDeviceMappingMixInfo,
    ) => void // 객체 우클릭 메뉴 콜백
    isRoation?: boolean // 자동 회전 여부
    controlsRef?: React.RefObject<CameraControlsImpl> // 카메라 컨트롤 참조
    controlsTarget?: [number, number, number] // 카메라가 바라볼 타겟 좌표
    isModelLoaded?: boolean // 모델 로딩 상태 플래그
    hasSaveView?: boolean // 저장된 카메라 뷰 여부
    selectedDevice?: ThreedDeviceMappingMixInfo | null // 선택 된 객체
    openCameraDevice?: ThreedDeviceMappingMixInfo | null // 부모에서 카메라 열기 요청으로 내려온 장치 정보
    setCameraOverlay: React.Dispatch<
        React.SetStateAction<{
            // 선택된 장치 기반으로 CCTV 오버레이 상태 갱신
            url: DevicePopupType
            device: ThreedDeviceMappingMixInfo
            pos: { x: number; y: number }
            isEventMode: boolean
        } | null>
    >
    setOpenCameraDevice: () => void // 카메라 열기 요청 처리 후 부모에 알리기 위한 콜백(초기화용)
    setSelectedDevice: (device: ThreedDeviceMappingMixInfo | null) => void // 선택 된 장비
    isAreaRegisterMode?: boolean // 모드 여부
    rightClickedGroupName?: string | null // 우클릭된 그룹 이름
    setRightClickedGroupName: React.Dispatch<React.SetStateAction<string | null>> // 우클릭 그룹명 상태 갱신 함수
    onNavigateModel: (device: ThreedDeviceMappingMixInfo) => void // 모델 내 장치 클릭 시 네비게이션 콜백
    setFloorList: React.Dispatch<React.SetStateAction<string[]>>
    setIsFloorListOpen : (open : boolean) => void;
    setIsAreaRegisterMode : (open : boolean) => void;
    onSavePosition: (id: number, alertShow : boolean) => void // 카메라 위치 저장
}

const ModelViewer = ({
    currentModelId,
    modelPath,
    mixDeviceMappings,
    onModelContextMenu,
    onDeviceContextMenu,
    isRoation = false,
    controlsRef,
    controlsTarget = [0, 0, 0],
    hasSaveView,
    selectedDevice,
    openCameraDevice,
    setCameraOverlay,
    setOpenCameraDevice,
    setSelectedDevice,
    isAreaRegisterMode,
    rightClickedGroupName,
    setRightClickedGroupName,
    onNavigateModel,
    setFloorList,
    setIsFloorListOpen,
    setIsAreaRegisterMode,
    onSavePosition
}: ModelViewerProps) => {
    const { scene, camera, size } = useThree() // three.js 씬, 카메라, 화면 크기 가져오기
    const isInitializedRef = useRef(false) // 카메라 초기화 여부 플래그
    const [renderDevices, setRenderDevices] = React.useState(false) // 장치 렌더링 여부 상태
    const isModelLoaded = useThreeDStore((s) => s.isModelLoaded) // 전역 모델 로딩 상태
    const isModelError = useThreeDStore((s) => s.isModelError) // 전역 에러 로딩 상태
    const { invalidate } = useThree()

    // 카메라 초기화 - 처음 로드될 때 controlsTarget 기준으로 카메라 세팅
    useEffect(() => {
        if (!controlsRef?.current || isInitializedRef.current) return

        // camera와 renderer가 완전히 준비된 이후에만 실행
        if (!camera || !camera.position) return

        const controls = controlsRef.current
        const [tx, ty, tz] = controlsTarget

        // 다음 프레임으로 넘겨서 초기화 타이밍 맞추기
        setTimeout(() => {
            if (!controlsRef.current || !camera?.position) return
 
            if (hasSaveView) {
                // 저장된 뷰가 있을 때는 그대로 유지
                controls.setLookAt(
                    camera.position.x,
                    camera.position.y,
                    camera.position.z,
                    tx, ty, tz
                )
            } else {
                if (!controlsRef.current) {
                    alert('카메라 정보를 가져올 수 없습니다.')
                    return
                }

                controls.setLookAt(
                    camera.position.x,
                    camera.position.y,
                    camera.position.z,
                    tx, ty, tz
                )
                
                // 초기 위치 저장 될 데이터
                if (currentModelId) {
                    onSavePosition(currentModelId, false)
                }
            }

            isInitializedRef.current = true
        }, 600)
    }, [controlsRef, controlsTarget, camera, hasSaveView, currentModelId, onSavePosition])

    // 모델이 바뀔 때마다 초기화 플래그 리셋
    useEffect(() => {
        isInitializedRef.current = false
    }, [modelPath])

    // 모델 로드 컴포넌트 (ContextMenu 지원)
    const modelComponent = (
        <Center>
            <Model
                modelPath={modelPath}
                isAreaRegisterMode={isAreaRegisterMode}
                mixDeviceMappings={mixDeviceMappings}
                rightClickedGroupName={rightClickedGroupName}
                selectedDevice={selectedDevice}
                setIsFloorListOpen={setIsFloorListOpen}
                setIsAreaRegisterMode={setIsAreaRegisterMode}
                setFloorList={setFloorList}
                setSelectedDevice={setSelectedDevice}
                setRightClickedGroupName={setRightClickedGroupName}
                onContextMenu={onModelContextMenu}
                onNavigateModel={onNavigateModel}
            />
        </Center>
    )

    // 선택된 장치의 3D 위치를 2D 화면 좌표로 변환해 카메라 오버레이 위치를 계산하는 함수
    const cameraPosition = useCallback(
        (device: ThreedDeviceMappingMixInfo) => {
            // 기본 오버레이 위치: 화면 중앙
            let screenX = size.width / 2
            let screenY = size.height / 2
    
            // 3D 장치 객체 가져오기
            const object3d = scene.getObjectByName(`device-${device.id}`)
        
            if (object3d) {
                // 장치의 3D bounding box 계산 (min/max 좌표)
                const box = new THREE.Box3().setFromObject(object3d)
    
                // bounding box의 대표적인 꼭짓점 몇 개를 선택
                // (실제로는 8개 전체를 써도 됨, 여기서는 4개만 사용)
                const points = [
                    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
                    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
                    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
                    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
                ]
    
                // 각 꼭짓점을 카메라 기준으로 project -> 2D 화면 좌표로 변환
                const screenPoints = points.map((p) => {
                    const projected = p.clone().project(camera)
                    return {
                        x: (projected.x * 0.5 + 0.5) * size.width,   // -1~1 -> 0~width
                        y: (-projected.y * 0.5 + 0.5) * size.height, // -1~1 -> 0~height (y축 반전)
                    }
                })

                // 화면상 bounding box의 위/아래 좌표
                const minY = Math.min(...screenPoints.map((p) => p.y))
                const maxY = Math.max(...screenPoints.map((p) => p.y))
    
                // 화면상 bounding box의 중앙 X 좌표
                const centerX =
                    (Math.min(...screenPoints.map((p) => p.x)) +
                     Math.max(...screenPoints.map((p) => p.x))) / 2
    
                // 객체가 화면에서 차지하는 높이(px)
                const objectHeight = maxY - minY
    
                if (objectHeight > size.height * 0.5) {
                    // 화면 높이의 절반 이상 차지하는 큰 객체라면
                    // CCTV 오버레이를 화면 중앙 쯤에 표시
                    screenX = size.width / 2
                    screenY = size.height / 2
                } else {
                    // 작은 객체라면
                    // bounding box 위쪽(minY) 기준으로 약간 위에 배치
                    screenX = centerX
                    screenY = minY - 10
                }
            }

            const overlayWidth = 320
            const overlayHeight = 180
            const padding = 10
            const headerHeight = 150

            const minY = headerHeight + padding
            const maxY = size.height - overlayHeight - padding
            const maxX = size.width - overlayWidth - padding

            // 위로 튀는 상황인지 판단
            const overflowTop = screenY < minY

            if (overflowTop) {
                // 위쪽 불가 -> 오른쪽으로 배치
                screenY = minY

                // 객체 오른쪽으로 밀기
                screenX = screenX + overlayWidth / 2 + 100
            } 

            // 최종 안전 clamp (공통)
            screenX = Math.max(padding, Math.min(maxX, screenX))
            screenY = Math.max(minY, Math.min(maxY, screenY))
        
            // Camera 오버레이 상태 업데이트
            setCameraOverlay({
                url: {
                    show: false,
                     main_service_name: '',
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
                },
                device,
                pos: { x: screenX, y: screenY },
                isEventMode: false
            })
        },
        [camera, size, scene, setCameraOverlay],
    )
    
    // 카메라 열기 요청이 들어오면 해당 장치 기준으로 오버레이 위치 계산 후 초기화
    useEffect(() => {
        if (openCameraDevice) {
            cameraPosition(openCameraDevice)
            setOpenCameraDevice()
        }
    }, [openCameraDevice, cameraPosition, setOpenCameraDevice])

    // 모델 로딩이 완료되면 장치 렌더링 활성화
    useEffect(() => {
        if (isModelLoaded) {
            setRenderDevices(true)
        }
    }, [isModelLoaded])

    // 장치 클릭 시 선택 상태 갱신 + CCTV/카메라면 포커싱 및 오버레이 위치 계산
    const deviceClick = useCallback((device: ThreedDeviceMappingMixInfo) => {
        setSelectedDevice(device);
        if (CAMERA_TYPES.includes(device.type?.toLowerCase() as CameraType)) {
            requestAnimationFrame(() => cameraPosition(device));
        }
    }, [setSelectedDevice, cameraPosition]);
    
    // 장치 우클릭 시 컨텍스트 메뉴 호출
    const rightClickContextMenu = useCallback((e: ThreeEvent<MouseEvent>, device: ThreedDeviceMappingMixInfo) => {
        onDeviceContextMenu?.(e, device);
    }, [onDeviceContextMenu]);

    // 렌더링할 장치 리스트를 메모이제이션하여 반환 - 불필요한 리렌더 방지
    const devices = useMemo(() => {
        if (!renderDevices || !mixDeviceMappings) return null;
        
        return mixDeviceMappings.map(item => {    
            return (
                <Device
                    key={item.id}
                    mixDeviceData={item}
                    isSelected={selectedDevice?.id === item.id}
                    onContextMenu={rightClickContextMenu}
                    onClick={deviceClick}
                />
            );
        });
    }, [renderDevices, mixDeviceMappings, selectedDevice, deviceClick, rightClickContextMenu]);

    useEffect(() => {
        // cleanup 시점에 사용할 snapshot
        const controls = controlsRef?.current;

        return () => {
            controls?.dispose?.();
        };
    }, [controlsRef]);

    useFrame((_, delta) => {
        if (isRoation && controlsRef?.current) {
            controlsRef.current.azimuthAngle -= delta * 0.2 // 회전 속도 조절
            controlsRef.current.update(delta) // 변경사항 적용
        }
    })

    useEffect(() => {
        const controls = controlsRef?.current
        if (!controls) return

        const onUpdate = () => invalidate()

        controls.addEventListener('update', onUpdate)
        return () => controls.removeEventListener('update', onUpdate)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invalidate])

    return (
        <>
            {/* 기본 조명 */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 0.1, 0.1]} intensity={1.7} />

            {/* 환경 맵 */}
            <Environment preset="night" />

            {/* 카메라 저장 뷰가 있으면 그대로, 없으면 Bounds로 화면 맞춤 */}
            {hasSaveView ? (
                modelComponent
            ) : (
                <Bounds fit clip margin={1.2}>
                    {modelComponent}
                </Bounds>
            )}

            {/* 카메라 컨트롤 */}
            {isModelError ? (
                null
            ) : (
                <CameraControls
                    ref={controlsRef} // 카메라 컨트롤 객체 참조 (setLookAt 등 제어용)
                    smoothTime={0} // 카메라 이동 시 감속 시간 (값이 높을수록 부드럽게 감속)
                    dollySpeed={0.5} // 줌(거리 이동) 속도
                    azimuthRotateSpeed={0.3} // 수평(좌우) 회전 속도
                    polarRotateSpeed={0.2} // 수직(상하) 회전 속도
                    truckSpeed={0.6} // 패닝(시점 이동) 속도
                    enabled={!isRoation}
                />
            )}

            {/* 장치 마커 렌더링 */}
            {devices}
        </>
    )
}

export default React.memo(ModelViewer)