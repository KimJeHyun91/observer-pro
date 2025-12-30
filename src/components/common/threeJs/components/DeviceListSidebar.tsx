import { motion } from 'framer-motion'
import { BiSolidCctv, BiMove } from 'react-icons/bi'
import { FaParking, FaTrashAlt } from 'react-icons/fa'
import { RiMapPinLine } from 'react-icons/ri'
import { HiVideoCamera } from 'react-icons/hi'
import { useEffect } from 'react'
import { ThreedDeviceMappingMixInfo, CAMERA_TYPES, CameraType } from '@/@types/threeD'
import { HiClipboardDocumentList } from "react-icons/hi2";
import { TbDeviceCctv } from "react-icons/tb";

type Props = {
    mixDeviceMappings?: ThreedDeviceMappingMixInfo[]
    selectedDevice?: ThreedDeviceMappingMixInfo | null
    onSelectDevice: (device: ThreedDeviceMappingMixInfo | null) => void
    onMoveDeviceFocus: (device: ThreedDeviceMappingMixInfo) => void
    onDeleteDevice: (device: ThreedDeviceMappingMixInfo) => void
    onOpenCamera: (device: ThreedDeviceMappingMixInfo) => void
}

const DeviceListSidebar = ({
    mixDeviceMappings,
    selectedDevice,
    onSelectDevice,
    onMoveDeviceFocus,
    onDeleteDevice,
    onOpenCamera,
}: Props) => {
    const generalDevices = mixDeviceMappings?.filter((d) => !d.linked_model_id)

    const CAMERA_TYPE_ICON_MAP: Record<CameraType, JSX.Element> = {
        dome: <TbDeviceCctv size={18} />,
        bullet: <BiSolidCctv size={18} />,
    };

    const isCameraType = (value: string): value is CameraType => {
        return CAMERA_TYPES.includes(value as CameraType);
    };
    const typeIcon = (type: string) => {
        const lowerType = type.toLowerCase();

        if (isCameraType(lowerType)) {
            return CAMERA_TYPE_ICON_MAP[lowerType];
        }

        switch (lowerType) {
            case 'parking':
            return <FaParking size={16} />;
            default:
            return <RiMapPinLine size={16} />;
        }
    };

    useEffect(() => {
        return () => {
            onSelectDevice(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <motion.aside
            initial={{ x: -50 }}
            animate={{ x: 0 }}
            exit={{ x: -50 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="
                absolute top-[44px] left-0 bottom-[3.1px] z-20 w-[320px]
                bg-gradient-to-b from-slate-900/95 to-slate-800/85
                border-r border-slate-700 shadow-2xl text-slate-100
                flex flex-col backdrop-blur-sm
            "
        >
            {/* 헤더 */}
            <div className="h-[52px] px-4 flex items-center border-b border-slate-700">
                <HiClipboardDocumentList className="text-indigo-400 mr-2" size={20} />
                <span className="text-sm font-semibold tracking-wide text-slate-200">
                    장비 목록
                </span>
                <span className="ml-auto text-xs text-slate-400">
                    총 {generalDevices?.length ?? 0}개
                </span>
            </div>

            {/* 리스트 */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scroll-container">
                {generalDevices && generalDevices.length > 0 ? (
                    [...generalDevices]
                    .sort((a, b) => a.mapping_name.localeCompare(b.mapping_name))
                    .map((device) => (
                        <motion.div
                            key={device.id}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            data-devicefocus-id={device.id}
                            className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-200
                                ${
                                    selectedDevice?.id === device.id
                                    ? 'bg-indigo-600/70 text-white shadow-inner'
                                    : 'hover:bg-indigo-600/80 text-slate-200'
                                }
                            `}
                            onClick={() => onSelectDevice(device)}
                        >
                            <div
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-all duration-200
                                    ${
                                        selectedDevice?.id === device.id
                                        ? 'bg-white/20'
                                        : 'bg-slate-700 text-slate-100'
                                    }
                                `}
                            >
                                {typeIcon(device.type)}
                            </div>

                            {/* 장치명 */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium truncate" title={device.mapping_name}>
                                    {device.mapping_name}
                                </div>
                                <div className="text-xs text-slate-400 truncate lowercase">
                                    {device.type}
                                </div>
                            </div>

                            {/* 우측 액션 아이콘들 */}
                            <div
                                className={`
                                    flex items-center gap-1
                                    ${selectedDevice?.id === device.id ? 'text-white' : 'text-slate-400'}
                                    group-hover:text-slate-200
                                    transition-colors
                                `}
                            >
                                {CAMERA_TYPES.includes(device.type?.toLowerCase() as CameraType) && (
                                    <motion.button
                                        whileHover={{ scale: 1.2 }}
                                        className="p-1 rounded hover:bg-white/20 transition"
                                        title="카메라 보기"
                                        onClick={(e) => {
                                        e.stopPropagation()
                                            onMoveDeviceFocus(device)
                                            onOpenCamera(device)
                                        }}
                                    >
                                        <HiVideoCamera size={14} />
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.2 }}
                                    className="p-1 rounded hover:bg-white/20 transition"
                                    title="위치 이동"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onMoveDeviceFocus(device)
                                    }}
                                >
                                    <BiMove size={14} />
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.2 }}
                                    className="p-1 rounded hover:bg-red-500/80 transition"
                                    title="삭제"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteDevice(device)
                                    }}
                                >
                                    <FaTrashAlt size={12} />
                                </motion.button>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center text-slate-500 text-sm mt-10">
                        등록된 장비가 없습니다
                    </div>
                )}
            </div>
        </motion.aside>
    )
}

export default DeviceListSidebar
