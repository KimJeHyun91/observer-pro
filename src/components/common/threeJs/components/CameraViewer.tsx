import { useEffect, useRef, useState } from 'react'
import { DevicePopupType } from '@/@types/device'
import LiveStream from '@/components/common/camera/LiveStream'
import { AiOutlineCloseSquare } from 'react-icons/ai'
import { ThreedDeviceMappingMixInfo } from '@/@types/threeD'

type CameraViewerProps = {
    cameraOverlay: {
        url: DevicePopupType
        device: ThreedDeviceMappingMixInfo
        pos: { x: number; y: number }
        isEventMode: boolean
    }
    onClose: () => void
}

const defaultPopup: DevicePopupType = {
    show: false,
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
}

const CameraViewer = ({ cameraOverlay, onClose }: CameraViewerProps) => {
    const { device , pos, isEventMode, url } = cameraOverlay
    const overlayRef = useRef<HTMLDivElement>(null)
    const [cameraPopup, setCameraPopup] = useState<DevicePopupType>(defaultPopup)
    const [showLabel, setShowLabel] = useState(false)
    const [hideTimeout, setHideTimeout] = useState<number | null>(null)

    useEffect(() => {
        const clickOutside = (e: MouseEvent) => {
            if (
                overlayRef.current &&
                !overlayRef.current.contains(e.target as Node)
            ) {
                onClose()
            }
        }
        document.addEventListener('mousedown', clickOutside)

        return () => {
            document.removeEventListener('mousedown', clickOutside)
        }
    }, [onClose])

    useEffect(() => {
        if (device?.id) {
            const dummyUrl: DevicePopupType = {
                show : true,
                main_service_name: 'origin',
                vms_name: 'GIT4',
                camera_id: '4.0',
                name: '123',
                ip: '192.168.0.214',
                top_location: '0.11511789181692095',
                left_location: '0.682',
                icon_width: 74.91,
                icon_height: 114.5115625,
                canvas_width: 1500,
                canvas_height: 725,
                type: 'camera',
                service_type: 'mgist',
            };

            setCameraPopup({
                ...defaultPopup,
                ...(url?.ip ? url : dummyUrl),
                show: true,
            })
        } else {
            setCameraPopup(defaultPopup)
        }
    }, [device?.id, url])

    useEffect(() => {
        const clickOutside = (e: MouseEvent) => {
            if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
                closeCameraPopup()
            }
        }
        document.addEventListener('mousedown', clickOutside)
        return () => document.removeEventListener('mousedown', clickOutside)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const closeCameraPopup = () => {
        if (cameraPopup.show) {
            setCameraPopup({
                show: false,
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
            })
        }
    }

    const mouseEnter = () => {
        setShowLabel(true)
    }

    const mouseMove = () => {
        setShowLabel(true)
        if (hideTimeout) clearTimeout(hideTimeout)
        // 3초간 움직임 없으면 라벨 숨김
        const timeout = setTimeout(() => {
            setShowLabel(false)
        }, 3000)

        setHideTimeout(timeout)
    }

    const mouseLeave = () => {
        setShowLabel(false)
        if (hideTimeout) clearTimeout(hideTimeout)
    }

    useEffect(() => {
        return () => {
            if (hideTimeout) clearTimeout(hideTimeout)
        }
    }, [hideTimeout])

    return (
        <div
            ref={overlayRef}
            className={`absolute w-[420px] bg-white z-50 shadow-xl rounded-md overflow-hidden border 
                ${isEventMode ? 'border-red-600' : 'border-[#9EA3B2]'}
            `}
            style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            {cameraPopup.show && (
                <>
                    {/* 상단 헤더 */}
                    <div 
                        className={`flex items-center justify-between px-2 py-1 
                            ${isEventMode ? 'bg-red-600' : 'bg-[#9EA3B2]'}
                        `}
                    >
                        <span className="text-xs text-white font-semibold truncate">
                            {cameraPopup.ip
                            ? `${cameraPopup.camera_id || '-'} ${cameraPopup.name || ''} (${cameraPopup.vms_name || '-'})`
                            : '연결된 카메라 없음'}
                        </span>

                        <button
                            className="flex items-center justify-center w-6 h-6 transition -mr-1"
                            title="닫기"
                            onClick={() => {
                                onClose()
                            }}
                        >
                            <AiOutlineCloseSquare size={26} className="text-white hover:text-gray-300 cursor-pointer transition"/>
                        </button>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="p-0.5">
                        <div
                            className="relative w-full h-[225px] overflow-hidden"
                            {...(!isEventMode && {
                                onMouseEnter: mouseEnter,
                                onMouseMove: mouseMove,
                                onMouseLeave: mouseLeave,
                            })}
                        >   
                            {cameraPopup.ip && cameraPopup.show ? (
                                <LiveStream
                                    main_service_name={cameraPopup.main_service_name || ''}
                                    vms_name={cameraPopup.vms_name || ''}
                                    camera_id={cameraPopup.camera_id || ''}
                                    service_type={cameraPopup.service_type}
                                    access_point={undefined}
                                    camera_ip={cameraPopup.ip}
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500 text-sm">
                                    연결된 카메라가 없습니다.
                                </div>
                            )}

                            {/* 하단 라벨 */}
                            {cameraPopup.ip && (
                                <div
                                    className={`absolute bottom-2 left-2 text-gray-300 text-xs px-2 py-0.5 rounded transition-opacity duration-300 
                                        ${isEventMode ? 'bg-red-700 opacity-100 text-gray-200' : 'bg-black/50'} 
                                        ${showLabel ? 'opacity-100' : 'opacity-0'}
                                    `}
                                >
                                    ip : {cameraPopup.ip}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default CameraViewer