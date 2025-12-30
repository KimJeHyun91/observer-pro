import { useEffect, useRef } from 'react'
import { ThreeEvent, useLoader, 
    // useFrame, useThree 
} from '@react-three/fiber'
import { GLTFLoader } from 'three-stdlib'
import { useThreeDStore } from '@/store/threeJs/useThreeDStore'
import { Html } from '@react-three/drei'
import { IoWarningOutline } from 'react-icons/io5'
import { ErrorBoundary } from 'react-error-boundary'
import * as THREE from 'three'
import { ThreedDeviceMappingMixInfo } from '@/@types/threeD'

type ModelProps = {
    isAreaRegisterMode?: boolean // 모드 여부
    mixDeviceMappings?: ThreedDeviceMappingMixInfo[] // 모델과 연결된 장치 매핑 정보
    modelPath: string // 로드할 GLB 파일 경로
    rightClickedGroupName?: string | null // 우클릭된 그룹 이름
    selectedDevice?: ThreedDeviceMappingMixInfo | null // 현재 선택된 장치 정보
    setSelectedDevice: (device: ThreedDeviceMappingMixInfo | null) => void // 선택 된 장비
    setRightClickedGroupName: React.Dispatch<React.SetStateAction<string | null>> // 우클릭 그룹명 상태 갱신 함수
    onContextMenu: (event: ThreeEvent<MouseEvent>, groupName?: string) => void // 우클릭 시 실행할 콜백
    onNavigateModel: (device: ThreedDeviceMappingMixInfo) => void // 장치 클릭 시 해당 모델로 이동하는 콜백
    setFloorList: React.Dispatch<React.SetStateAction<string[]>>
    setIsFloorListOpen : (open : boolean) => void;
    setIsAreaRegisterMode : (open : boolean) => void;
}

// 모델 로드 및 렌더링 컴포넌트
const ModelGLB = ({ 
    rightClickedGroupName, 
    mixDeviceMappings, 
    isAreaRegisterMode, 
    selectedDevice, 
    modelPath, 
    onContextMenu, 
    setSelectedDevice,
    setRightClickedGroupName, 
    // onNavigateModel,
    setFloorList,
    setIsFloorListOpen,
    setIsAreaRegisterMode
}: ModelProps) => {
    // Zustand 전역 상태 관리 (로딩/에러)
    const setIsModelLoaded = useThreeDStore((s) => s.setIsModelLoaded) // 전역 모델 로딩 상태 갱신 함수
    const setIsModelError = useThreeDStore((s) => s.setIsModelError) // 전역 모델 로딩 상태 갱신 함수
    THREE.Cache.clear() // GLTF 전 THREE 캐시 삭제
    const gltf = useLoader(GLTFLoader, modelPath) // GLTF 모델 로더 (react-three-fiber hook)

    // hover 상태 관리
    const hoveredRef = useRef<THREE.Object3D | null>(null) // 현재 마우스가 hover 중인 그룹 참조
    const originalColors = useRef<Map<THREE.Mesh, THREE.Color>>(new Map()) // 각 Mesh의 원래 emissive 색상 저장용
    // const raycaster = useRef(new THREE.Raycaster()) // 마우스 위치 기반으로 객체 충돌 감지용 Raycaster
    // const { camera, pointer } = useThree() // 카메라와 마우스 포인터 좌표 참조
    const topGroups = useRef<THREE.Object3D[]>([]) // hover 감지 대상이 되는 상위 그룹 리스트
    
    // 드래그 감지를 위한 상태
    const clickInfoRef = useRef<{ x: number; y: number; time: number } | null>(null);

    // 마우스 누름 시작
    const pointerDown = (e: ThreeEvent<PointerEvent>) => {
        clickInfoRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    // 마우스 클릭 여부 판단
    const mouseClick = (e: ThreeEvent<MouseEvent>) => {
        const info = clickInfoRef.current;
        if (!info) return;

        const dx = Math.abs(e.clientX - info.x);
        const dy = Math.abs(e.clientY - info.y);
        const dt = Date.now() - info.time;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 움직임이 거의 없고(예: 3픽셀 이하 & 300ms) 시간도 짧으면 클릭으로 간주
        if (distance < 3 && dt < 300) {
            clickGroup(e);
        } 

        clickInfoRef.current = null;
    };

    // 로드 성공 시 전역 상태 업데이트
    useEffect(() => {
        if (gltf) {
            setIsModelError(false)  // 전역 에러 완료
            setIsModelLoaded(true)  // 전역 로딩 완료
        }
    }, [gltf, setIsModelError, setIsModelLoaded])

    // 로드 후 각 Mesh에 이름, 이벤트 속성 설정
    useEffect(() => {
        if (!gltf?.scene) return
        
        const foundTopGroups: THREE.Object3D[] = [] // hover 대상이 될 상위 그룹들을 임시 저장

        // GLTF 전체 트리 순회
        gltf.scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh

            // Mesh 객체 설정
            if (mesh.isMesh) {
                mesh.castShadow = true // 그림자 투사 활성화
                mesh.receiveShadow = true // 그림자 수신 활성화
                mesh.material = (mesh.material as THREE.Material).clone() // 공유 방지를 위해 재질 복제
            }

            // 상위 노드 이름이 Assembly, Group, ModelRoot 중 하나면 hover 대상 그룹으로 등록
            if (
                obj.parent &&
                obj.parent.name &&
                /(assembly|group|modelroot)/i.test(obj.parent.name)
            ) {
                foundTopGroups.push(obj)
            }
        })
        
        topGroups.current = foundTopGroups // hover 감지용 참조 리스트에 저장
    }, [gltf])

    // 모델 우클릭 핸들러 (ContextMenu 호출용)
    const rightClickContextMenu = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        const mesh = event.object as THREE.Mesh
        let parent: THREE.Object3D | null = mesh.parent
        let topGroup: THREE.Object3D = mesh

        while (parent) {
            // parent 이름이 Assembly로 시작하면, 그 바로 전 부모(topParent)를 유지하고 중단
            // GLB 모델 내보낼때 상위 name이 틀림
            // Revit - Assembly
            // Blender - Group
            // SketchUp - ModelRoot
            if (parent.name && /(assembly|group|modelroot)/i.test(parent.name)) {
                break
            }

            topGroup = parent
            parent = parent.parent as THREE.Object3D | null
        }
        
        const isBuildingGroup = /^Building/i.test(topGroup.name)
        
        if(isBuildingGroup){
            setIsAreaRegisterMode(false);
            setIsFloorListOpen(false);
            const floors = topGroup.children
                .filter((child) => child.type === 'Object3D')
                .map((child) => child.name.split('_')[0])
                .sort((a, b) => {
                    const parse = (name: string) => {
                        if (/^B\d+F$/i.test(name)) {
                            return -parseInt(name.replace(/[^\d]/g, ''), 10)
                        }

                        if (/^\d+F$/i.test(name)) {
                            return parseInt(name.replace(/[^\d]/g, ''), 10)
                        }

                        return 0
                    }

                    return parse(a) - parse(b)
            })

            setFloorList(floors)
            setRightClickedGroupName(topGroup.name)
        }else{
            setRightClickedGroupName('')
        }
        onContextMenu(event, topGroup.name)
    }

    // useEffect(() => {
    //     if (!gltf?.scene) return;

    //     // 새로운 매핑이 들어오면 전체 색상 초기화
    //     gltf.scene.traverse((obj) => {
    //         if ((obj as THREE.Mesh).isMesh) {
    //             const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
    //             mat.emissive.set(0x000000);
    //         }
    //     });
    // }, [gltf, mixDeviceMappings]);

    useEffect(() => {
        if (!gltf?.scene) return
        if (rightClickedGroupName) setSelectedDevice(null)

        // 모드 해제 시 hover 초기화
        if (!isAreaRegisterMode) {
            // 현재 hover 중이던 그룹 해제
            if (hoveredRef.current) {
                hoveredRef.current.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
                        const orig = originalColors.current.get(child as THREE.Mesh)
                        if (orig) mat.emissive.copy(orig)
                    }
                })
                hoveredRef.current = null
            }

            // 전체 emissive 색상 초기화
            gltf.scene.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial
                    if (mat.emissive) {
                        mat.emissive.set(0x000000)
                    }
                }
            })
        }else{
            // 등록 모드일 때

            // 우클릭한 그룹이 없으면 아무 것도 하지 않음 (색 유지)
            if (!rightClickedGroupName) return

            // 우클릭한 그룹만 찾기
            const targetGroup = gltf.scene.getObjectByName(rightClickedGroupName)
            if (!targetGroup) return

            // 전체 색을 기본색(검정)으로 초기화
            gltf.scene.traverse((obj) => {
                if ((obj as THREE.Mesh).isMesh) {
                    const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial
                    mat.emissive.set(0x000000)
                }
            })

            // 클릭된 그룹만 파란색으로 강조
            targetGroup.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
                    mat.emissive.set(0x0077ff)
                }
            })
        }
    }, [gltf, isAreaRegisterMode, rightClickedGroupName, setRightClickedGroupName, setSelectedDevice])
    
    useEffect(() => {
        if (!gltf?.scene) return;

        const hoveredGroup = hoveredRef.current; // 현재 hover 중인 그룹 참조

        // 전체 Mesh 순회하며 emissive 초기화
        gltf.scene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
                const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;

                // 현재 hover 중인 그룹은 초기화에서 제외 (hover 유지)
                if (hoveredGroup && hoveredGroup.getObjectById(obj.id)) return;

                // hover 중이 아니면 emissive 색상 초기화
                mat.emissive.set(0x000000);
            }
        });

        // 선택된 장비가 없으면 종료
        if (!selectedDevice?.group_name) return;

        // 선택된 장비의 그룹을 찾아서 강조 처리
        const targetGroup = gltf.scene.getObjectByName(selectedDevice.group_name);
        if (!targetGroup) return;

        // 선택된 그룹 내 모든 Mesh에 파란색 emissive 적용
        targetGroup.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                mat.emissive.set(0x0077ff);
            }
        });
    }, [gltf, selectedDevice]); // 장비 선택 또는 GLTF 로드 완료 시 실행

    // 클릭 시 어떤 층인지 콘솔 출력
    const clickGroup = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();

        const mesh = event.object as THREE.Mesh
        if (!mesh.isMesh) return

        let parent: THREE.Object3D | null = mesh.parent
        let topParent: THREE.Object3D = mesh

        while (parent) {
            if (parent.name && /(assembly|group|modelroot)/i.test(parent.name)) {
                break
            }
            topParent = parent
            parent = parent.parent as THREE.Object3D | null
        }

        // 클릭된 그룹명
        const groupName = topParent.name

        // 연결된 장비 찾기
        const linkedDevice = mixDeviceMappings?.find(
            (d) => d.group_name === groupName && d.linked_model_id
        )

        // 연결된 모델이 있으면 이동 콜백 실행
        if (linkedDevice) {
            // onNavigateModel(linkedDevice)
            return
        }
    }

    // primitive - GLTF 모델(scene)을 직접 렌더링
    // dispose={null} -> 메모리 자동 해제 방지 (필요 시 직접 관리)
    return (
        <primitive
            object={gltf.scene}
            dispose={null}
            onContextMenu={rightClickContextMenu}
            onPointerDown={pointerDown}
            onClick={mouseClick}
        />
    )
}

// 에러 발생 시 표시할 컴포넌트
const error = () => {
    return (
        <Html center zIndexRange={[0, 0]}>
            <div className="bg-white border border-red-300 rounded-md shadow-md p-6 max-w-lg w-[500px] text-center">
                <p className="flex items-center justify-center font-semibold text-red-600 mb-3 text-lg">
                    <IoWarningOutline className="mr-2 text-2xl" />
                    모델 로드 실패
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    모델을 불러올 수 없습니다. 경로를 확인하세요.
                </p>
            </div>
        </Html>
    )
}

const Model = (props: ModelProps) => {
    const setIsModelLoaded = useThreeDStore((s) => s.setIsModelLoaded) // 전역 모델 로딩 상태 갱신 함수
    const setIsModelError = useThreeDStore((s) => s.setIsModelError) // 전역 모델 로딩 상태 갱신 함수
        
    return (
        <ErrorBoundary 
            FallbackComponent={error}
            onError={() => {
                setIsModelError(true)   // 전역 에러 발생
                setIsModelLoaded(true)  // 전역 로딩 실패 (화면은 나오게 처리)
            }}
        >
            <ModelGLB {...props} />
        </ErrorBoundary>
    )
}

export default Model
