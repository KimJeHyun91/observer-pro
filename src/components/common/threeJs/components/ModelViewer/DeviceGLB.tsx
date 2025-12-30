import { useEffect, useState, useRef } from 'react'
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { ThreedDeviceMappingMixInfo } from '@/@types/threeD'

type DeviceGLBProps = {
    isSelected: boolean // 선택 된 객체 boolean 값
    glbPath?: string | null // GLB 파일 경로 (없으면 기본 구체 표시)
    position: [number, number, number] // 장치 위치 좌표
    rotation?: [number, number, number] // 객체 회전 값
    scale?: number // 객체 크기 배율 (현재 DB값 미사용)
    onClick: (event: ThreeEvent<MouseEvent>) => void // 클릭 이벤트 콜백
    onLoaded?: (scene: THREE.Object3D) => void // 로딩 완료 후 호출되는 콜백
    onContextMenu?: (event: ThreeEvent<MouseEvent>) => void // 우클릭 이벤트 콜백
    mixDeviceData: ThreedDeviceMappingMixInfo // 3D 객체 데이터
}

// GLB 로드 실패 - 빨간 박스
const DeviceGLBError = ({
    position,
    isSelected,
    onClick,
    onContextMenu,
}: {
    position: [number, number, number]
    rotation?: [number, number, number]
    isSelected: boolean
    onClick?: (event: ThreeEvent<MouseEvent>) => void
    onContextMenu?: (event: ThreeEvent<MouseEvent>) => void
}) => {
    return (
        <mesh
            position={position}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={isSelected ? 'yellow' : 'red'} />
        </mesh>
    )
}

// glbPath 없음 - 연결 장비 표시 (파란 구체)
// const DeviceGLBLink = ({
//     position,
//     isSelected,
//     mixDeviceData,
//     onClick,
//     onContextMenu,
// }: {
//     position: [number, number, number]
//     isSelected: boolean,
//     mixDeviceData : ThreedDeviceMappingMixInfo
//     onClick?: (event: ThreeEvent<MouseEvent>) => void
//     onContextMenu?: (event: ThreeEvent<MouseEvent>) => void
// }) => {
//     const { type } = mixDeviceData
//     const color = type === 'linked_model' ? 'royalblue' : '#ff7b00'

//     return (
//         <mesh
//             position={position}
//             scale={new THREE.Vector3(1, 1, 1)}
//             onClick={onClick}
//             onContextMenu={onContextMenu}
//         >
//             {type === 'linked_model' ? (
//                 // 3D 모델 동그란 구체 (파란색)
//                 <sphereGeometry args={[0.2, 16, 16]} />
//             ) : (
//                 // 그 외 타입은 네모 (주황색)
//                 <boxGeometry args={[0.35, 0.35, 0.35]} />
//             )}

//             <meshStandardMaterial color={isSelected ? 'yellow' : color} />
//         </mesh>
//     )
// }

// 로딩 중 표시 - 회색 구체
const DeviceGLBLoading = ({
    position,
    rotation,
}: {
    position: [number, number, number]
    rotation?: [number, number, number]
}) => {
    return (
        <mesh position={position} rotation={rotation}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="gray" />
        </mesh>
    )
}

/**
 * DeviceGLB
 * - GLB 모델 로딩 및 예외 처리 담당
 * - 상태에 따라 4가지 형태로 분기 렌더링
 *   1. glbPath 없음(Link) -> 파란/노란 구체
 *   2. 로드 실패 -> 빨간/노란 박스
 *   3. 로딩 중 -> 회색 구체
 *   4. 로드 성공 -> GLB 모델
 */
const DeviceGLB = (props: DeviceGLBProps) => {
    const {
        glbPath,
        position,
        rotation,
        isSelected,
        mixDeviceData,
        onClick,
        onLoaded,
        onContextMenu,
    } = props
    const [scene, setScene] = useState<THREE.Object3D | null>(null)
    const [error, setError] = useState(false)
    const scaleValue = mixDeviceData.scale ?? 1.5
    const billboardRef = useRef<THREE.Group>(null) // 카메라를 바라보게 할 billboard 그룹 참조
    const { camera } = useThree() // 현재 씬의 카메라 참조
    const targetRef = useRef(new THREE.Vector3()) // 매 프레임 재사용할 Vector3 (GC 방지용)

    useFrame(() => {
        if (!billboardRef.current) return // billboard 그룹이 아직 생성되지 않았으면 처리하지 않음

        const target = targetRef.current

        // billboard의 현재 월드 좌표를 가져옴
        // (부모 group의 position / rotation이 적용된 실제 위치)
        const worldPos = billboardRef.current.getWorldPosition(target)

         // 카메라 위치를 기준으로
        // - X, Z 는 카메라 방향을 따르고
        // - Y 는 billboard 자신의 높이를 유지
        // -> 위아래로 꺾이지 않게 하기 위함
        target.set(
            camera.position.x,
            worldPos.y + 10,
            camera.position.z
        )

        // billboard가 항상 카메라를 바라보도록 회전
        billboardRef.current.lookAt(target)
    })

    /**
     * GLB 로더 실행
     * - glbPath가 없으면 error 상태로 전환 (바로 대체 구체 표시)
     * - GLB 파일 로딩 성공 시 Scene 저장
     * - 실패 시 error=true 설정 -> 빨간 박스로 대체
     */
    useEffect(() => {
        if (!glbPath) {
            setScene(null)
            setError(false)
            return
        }

        const loader = new GLTFLoader()

        loader.load(
            glbPath,
            (gltf) => {
                const cloned = gltf.scene.clone(true)

                setScene(cloned)
                onLoaded?.(cloned)
            },
            undefined,
            () => {
                setError(true)
            },
        )
    }, [glbPath, onLoaded])

    // 원래 색상 저장용 Map
    const originalColors = useRef<Map<THREE.Mesh, THREE.Color>>(new Map())

    /**
     * 선택 상태(isSelected)에 따라 색상 업데이트
     * - 선택됨 : 노란색
     * - 기본 : 흰색
     */
    useEffect(() => {
        if (!scene) return

        scene.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh

                if (mesh.material) {
                    const material = mesh.material as THREE.MeshStandardMaterial

                    // 원래 색상 저장 (처음만 저장)
                    if (!originalColors.current.has(mesh)) {
                        originalColors.current.set(mesh, material.color.clone())
                    }
                    
                    // 선택 여부에 따라 색상 변경
                    if (isSelected) {
                        material.color.set('yellow')
                        material.emissive.set('yellow') // 발광 효과 추가
                        material.emissiveIntensity = 1
                    } else {
                        const orig = originalColors.current.get(mesh)
                        if (orig) {
                            material.color.copy(orig) // 원래 색상 복원
                            material.emissiveIntensity = 0
                        }
                    }
                }
            }
        })
    }, [scene, isSelected])

    // glbPath 없음 - 연결 장비 표시
    if (!glbPath) return null
    // if (!glbPath) return <DeviceGLBLink {...props} />

    // 로드 실패
    if (error) return <DeviceGLBError {...props} />

    // 로딩 중
    if (!scene)
        return <DeviceGLBLoading position={position} rotation={rotation} />

    // GLB 로드 완료 시 실제 모델 렌더링
    return (
        <group
            name={`device-${mixDeviceData.id}`}
            position={position}
            rotation={rotation}
        >
            <group ref={billboardRef}>
                <primitive
                    name={`device-${mixDeviceData.id}`}
                    object={scene}
                    scale={Array(3).fill(scaleValue)}
                    onClick={(event: ThreeEvent<MouseEvent>) => {
                        event.stopPropagation()
                        if (event.intersections[0]?.object === event.object) {
                            onClick(event)
                        }
                    }}
                    onContextMenu={(event: ThreeEvent<MouseEvent>) => {
                        event.stopPropagation()
                        if (event.intersections[0]?.object === event.object) {
                            onContextMenu?.(event)
                        }
                    }}
                />
            </group>
        </group>
    )
}

export default DeviceGLB