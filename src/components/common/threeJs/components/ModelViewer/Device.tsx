import React, { useMemo, Suspense } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { ThreedDeviceMappingMixInfo } from '@/@types/threeD'
import DeviceGLB from './DeviceGLB'

type DeviceProps = {
    mixDeviceData: ThreedDeviceMappingMixInfo // 장치 데이터 (좌표, GLB 파일명 등)
    onContextMenu?: (
        event: ThreeEvent<MouseEvent>,
        device: ThreedDeviceMappingMixInfo,
    ) => void // 우클릭 이벤트 콜백
    isSelected: boolean // 선택 된 객체 boolean 값
    onClick?: (device: ThreedDeviceMappingMixInfo) => void // 클릭 이벤트 콜백
}

const Device = ({ mixDeviceData, onContextMenu, isSelected, onClick }: DeviceProps) => {
    // 장치 좌표 추출
    const {
        position_x,
        position_y,
        position_z,
        rotation_x,
        rotation_y,
        rotation_z,
        filename,
    } = mixDeviceData

    const position: [number, number, number] = [
        position_x,
        position_y,
        position_z,
    ]
    const rotation: [number, number, number] = [
        rotation_x ?? 0,
        rotation_y ?? 0,
        rotation_z ?? 0,
    ]

    // 클릭 이벤트 핸들러 (버블링 방지 + 상위 콜백 호출)
    const deviceClick = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onClick?.(mixDeviceData);
    }

    // 우클릭 이벤트 핸들러
    const rightClickContextMenu = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        onContextMenu?.(event, mixDeviceData)
    }

    // GLB 경로 생성 (파일명이 있는 경우만)
    const glbPath = useMemo(() => {
        return filename && filename.trim() !== ''
            ? `http://${window.location.hostname}:4200/images/glb_devices/${filename}`
            : null
    }, [filename])

    // GLB 로딩 중에는 회색 구체를 fallback 으로 표시
    return (
        <Suspense
            fallback={
                <mesh
                    position={position}
                    rotation={rotation}
                    onClick={deviceClick}
                    onContextMenu={rightClickContextMenu}
                >
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshStandardMaterial color="gray" />
                </mesh>
            }
        >
            <DeviceGLB
                mixDeviceData={mixDeviceData}
                glbPath={glbPath}
                position={position}
                rotation={rotation}
                isSelected={isSelected}
                onClick={deviceClick}
                onContextMenu={rightClickContextMenu}
            />
        </Suspense>
    )
}

export default React.memo(Device, (prev, next) => {
    // 같은 디바이스인지 확인
    const sameId = prev.mixDeviceData.id === next.mixDeviceData.id;

    // 선택 여부가 바뀌었는지 확인
    const sameSelected = prev.isSelected === next.isSelected;

    // onClick, onContextMenu 함수 reference는 같다고 가정
    return sameId && sameSelected;
});