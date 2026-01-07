import { useState, useEffect, useRef, useMemo } from 'react'
import {
    ThreedModel,
    ThreedDevice,
    AddPayload,
    ThreedDeviceMappingMixInfo,
    CAMERA_TYPES, CameraType as CameraDeviceType
} from '@/@types/threeD'
import parkingIcon from '@/configs/parking-icon.config'
import { ThreedDeviceList } from '@/utils/hooks/useThreedDevice'
import { Select, Button, Radio } from '@/components/ui'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useCameras } from '@/utils/hooks/useCameras';
import { ServiceType } from '@/@types/common';
import { CameraType } from '@/@types/camera';
import TreeSelect from '@/components/common/camera/TreeSelect';
import type { SingleValue } from 'react-select';

type Props = {
    title: string
    add: (data: AddPayload) => void
    closeModal: () => void
    models: ThreedModel[]
    currentModelId: number | null
    isLinkedView: boolean
    deviceMappings: ThreedDeviceMappingMixInfo[]
    allDeviceMappings: ThreedDeviceMappingMixInfo[]
    serviceType: string
}

type CameraOption = {
    label: string;
    value: string;
};

type CameraServicePrefix = 'ob' | 'pm'
type CameraSocketEvent = `${CameraServicePrefix}_cameras-update`

const AddModel = ({
    title,
    add,
    closeModal,
    models,
    currentModelId,
    // isLinkedView,
    deviceMappings = [],
    allDeviceMappings = [],
    serviceType
}: Props) => {
    const { socketService } = useSocketConnection();
    const { cameras, mutate: mutateCamera } = useCameras(serviceType as ServiceType);

    const isParkingType = useRef(false)
    const [selectedTypeId, setSelectedTypeId] = useState(() => {
        if (title === '장비 등록') return 0
        // if (title === '구역 등록') return 1
        return 0
    })
    const [searchName, setSearchName] = useState<string>('')
    const [addName, setAddName] = useState<string>('')
    const [error, setError] = useState<boolean>(false)
    const [selectedDevice, setSelectedDevice] = useState<number | null>(null)
    const { data, mutate } = ThreedDeviceList()
    const deviceList: ThreedDevice[] = useMemo(() => data || [], [data])
    const [filteredDevices, setFilteredDevices] = useState<ThreedDevice[]>(deviceList)
    const [isSaving, setIsSaving] = useState(false)
    const types = useMemo(() => {
        if (title === '장비 등록') {
            return [{ id: 0, type_name: '3D 장비 연결', disabled: false }]
        }
        // if (title === '구역 등록') {
        //     return [
        //         { id: 1, type_name: '3D 층 연결', disabled: isLinkedView },
        //         { id: 2, type_name: '2D 층 연결', disabled: false },
        //     ]
        // }
        return []
    }, [title])
    const [camera, setCamera] = useState('');

    const getMainServicePrefix = (serviceType: string): CameraServicePrefix | null => {
        switch (serviceType.toLowerCase()) {
            case 'origin': return 'ob'
            case 'parking': return 'pm'
            default: return null
        }
    }

    const cameraSocketEvent = useMemo<CameraSocketEvent | null>(() => {
        const prefix = getMainServicePrefix(serviceType)
        if (!prefix) return null
        return `${prefix}_cameras-update`
    }, [serviceType])

    useEffect(() => {
        if (!socketService || !cameraSocketEvent) return

        const cameraSocket = socketService.subscribe(cameraSocketEvent, (received) => {
            if (received) mutateCamera()
        }
        )

        return () => {
            cameraSocket();
        }
    }, [socketService, cameraSocketEvent, mutateCamera])

    useEffect(() => {
        if (title === '장비 등록') {
            setSelectedTypeId(0)
        } else {
            setSelectedTypeId(0)
        }

        // else if (title === '구역 등록') {
        //     setSelectedTypeId(2)
        // }
    }, [title])

    const selectedDeviceInfo = useMemo(() => {
        return deviceList.find((d) => d.id === selectedDevice) ?? null
    }, [deviceList, selectedDevice])

    const isCameraBindableDevice = useMemo(() => {
        if (!selectedDeviceInfo?.type) return false;

        return CAMERA_TYPES.includes(
            selectedDeviceInfo.type.toLowerCase() as CameraDeviceType
        );
    }, [selectedDeviceInfo]);

    const selectArea = (item: ThreedDevice) => {
        if (selectedDevice === item.id) {
            setSelectedDevice(null)
            resetForm();
        } else {
            setSelectedDevice(item.id)
            resetForm();
        }
    }

    const save = async () => {
        if (selectedTypeId !== 2 && selectedDevice === null) return
        let targetData: ThreedDevice | ThreedModel | { id: number; mapping_name: string } | null = null

        if (selectedTypeId === 0) {
            if (!addName.trim()) {
                setError(true)
                return
            }
            const targetDevice = deviceList.find((d) => d.id === selectedDevice)
            if (!targetDevice) return
            if (camera) {
                targetData = { ...targetDevice, mapping_name: addName, cameraId: camera.split(':')[2] }
            } else {
                targetData = { ...targetDevice, mapping_name: addName }
            }
        } else if (selectedTypeId === 1) {
            const targetModel = models.find((m) => m.id === selectedDevice)
            if (!targetModel) return
            targetData = { ...targetModel, mapping_name: targetModel.name }
        } else if (selectedTypeId === 2) {
            if (!addName.trim()) {
                setError(true)
                return
            }

            targetData = { id: -1, mapping_name: addName }
        }

        try {
            await add({ selectedTypeId, targetData } as AddPayload)

            if (selectedTypeId === 0) {
                mutate()
            }
        } finally {
            setIsSaving(false)
        }

        console.log(targetData);
    }

    const cameraList = useMemo(() => {
        const sorted = (list: CameraType[]) => [...list].sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id)));
        return sorted(cameras?.filter((camera: CameraType) => !camera.left_location && !camera.top_location).sort((a: CameraType, b: CameraType) => (parseFloat(a.camera_id) - parseFloat(b.camera_id))));
    }, [cameras]);

    useEffect(() => {
        if (deviceList.length > 0) {
            setFilteredDevices(deviceList)
        }
    }, [deviceList])

    useEffect(() => {
        if (isParkingType.current) return
        isParkingType.current = true

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const radioChage = (newValue: number) => {
        setSelectedDevice(null)
        setSearchName('')
        setAddName('')
        setError(false)
        setSelectedTypeId(newValue)
    }

    const inputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchName(query)
        setSelectedDevice(null)

        const filtered = deviceList.filter((device) =>
            device.name.toLowerCase().includes(query.toLowerCase()),
        )

        setFilteredDevices(filtered)

        if (error && e.target.value.trim()) {
            setError(false)
        }
    }

    const handleChangeCurrentCamera = (option: SingleValue<CameraOption>) => {
        if (!option) {
            setCamera('');
            setAddName('');
            return;
        }

        setCamera(option.value);
        setAddName(option.label);
        setError(false);
    };

    const resetForm = () => {
        setSearchName('');
        setAddName('');
        setCamera('');
        setError(false);
    };

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="grid grid-cols-5 items-center gap-4 mb-4 mt-7">
                <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">
                    설정 타입
                </span>
                <div className="col-span-4 flex space-x-12">
                    <Radio.Group
                        value={selectedTypeId}
                        className="flex items-center space-x-9"
                        onChange={radioChage}
                    >
                        {types.map((type) => (
                            <Radio
                                key={type.id}
                                value={type.id}
                                radioClass="w-4 h-4"
                                className="flex items-center gap-2 text-xs dark:text-[#FFFFFF]"
                                disabled={type.disabled}
                            >
                                {type.type_name}
                            </Radio>
                        ))}
                    </Radio.Group>
                </div>
            </div>

            {selectedTypeId === 0 ? (
                <>
                    {/* 장비 이름 */}
                    {!isCameraBindableDevice && (
                        <div className="grid grid-cols-5 items-start gap-4 mb-2">
                            <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] mt-2">
                                장비 이름
                            </span>
                            <div className="col-span-4">
                                <input
                                    type="text"
                                    placeholder="장비명을 입력해주세요."
                                    value={addName}
                                    className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]
                                        focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500
                                        ${error ? 'border-red-500' : 'border-gray-300'}`}
                                    onChange={(e) => {
                                        setAddName(e.target.value)
                                        if (error && e.target.value.trim())
                                            setError(false)
                                    }}
                                />
                                {error && (
                                    <span className="text-red-500 text-sm mt-1 block">
                                        장비명을 입력해주세요.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 장비 검색 */}
                    <div className="grid grid-cols-5 items-start gap-4">
                        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] mt-2">
                            장비 검색
                        </span>
                        <div className="col-span-4 relative">
                            <input
                                type="text"
                                placeholder="장비 검색"
                                value={searchName}
                                className="border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]
                                    focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500"
                                onChange={inputChange}
                            />
                            <parkingIcon.searchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-[20px] h-[20px]" />
                        </div>
                    </div>

                    {/* 검색 결과 */}
                    <div
                        className={`grid grid-cols-5 items-start gap-4 ${isCameraBindableDevice ? '' : 'mb-8'
                            }`}
                    >
                        <span className="col-span-1"></span>
                        <div className="col-span-4">
                            <div
                                className="bg-white border rounded w-full mt-2 max-h-30 overflow-y-auto min-h-[200px]
                                dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]"
                            >
                                {filteredDevices.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer flex items-center ${selectedDevice === item.id
                                            ? 'bg-green-100 border-l-4 border-green-500 dark:bg-green-600 dark:border-green-800'
                                            : ''
                                            }`}
                                        onClick={() => selectArea(item)}
                                    >
                                        <input
                                            readOnly
                                            type="checkbox"
                                            checked={selectedDevice === item.id}
                                            className="mr-2"
                                        />
                                        {item.name}
                                        {item.type && (
                                            <span className="ml-1 text-xs text-gray-400">
                                                - {item.type}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {isCameraBindableDevice && (
                        <div className="grid grid-cols-5 items-start gap-4 mt-4 mb-8">
                            <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] mt-2">
                                카메라 선택
                            </span>

                            <div className="col-span-4">
                                <TreeSelect
                                    cameraList={cameraList}
                                    handleChangeCurrentCamera={handleChangeCurrentCamera}
                                    camera={camera}
                                />
                            </div>
                        </div>
                    )}
                </>
            ) : selectedTypeId === 1 ? (
                <>
                    <div className="grid grid-cols-5 items-start gap-4 mb-8">
                        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] mt-2">
                            층 선택
                        </span>

                        <div className="col-span-4 relative">
                            <Select
                                className="w-full cursor-pointer"
                                size="xs"
                                isSearchable={true}
                                styles={{
                                    control: () => ({
                                        backgroundColor: '#fff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '5px',
                                        height: '40px',
                                    }),
                                }}
                                placeholder="층을 선택해주세요"
                                value={
                                    selectedDevice
                                        ? {
                                            value: selectedDevice,
                                            label:
                                                models.find(
                                                    (m) =>
                                                        m.id ===
                                                        selectedDevice,
                                                )?.name ??
                                                `ID: ${selectedDevice}`,
                                        }
                                        : null
                                }
                                options={models
                                    .filter((model) => model.model_type === 'floor')
                                    .filter(
                                        (model) =>
                                            currentModelId == null ||
                                            model.id !== currentModelId,
                                    ) // 자기 자신 제외
                                    .filter(
                                        (model) =>
                                            // 현재 모델에 이미 링크된 경우 제외
                                            !(deviceMappings ?? []).some(
                                                (dm) =>
                                                    dm.linked_model_id ===
                                                    model.id,
                                            ) &&
                                            // 역방향 링크 방지 (allDeviceMappings 참조)
                                            !(allDeviceMappings ?? []).some(
                                                (dm) =>
                                                    dm.model_id === model.id &&
                                                    dm.linked_model_id ===
                                                    currentModelId,
                                            ),
                                    )
                                    .map((model) => ({
                                        value: model.id,
                                        label: model.name,
                                    }))}
                                onChange={(option) => {
                                    if (option) {
                                        setSelectedDevice(option.value)
                                    } else {
                                        setSelectedDevice(null)
                                    }
                                }}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-5 items-start gap-4 mb-8">
                        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF] mt-2">
                            층 입력
                        </span>

                        <div className="col-span-4">
                            <input
                                type="text"
                                placeholder="층 이름을 입력해주세요."
                                value={addName}
                                className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]
                                    focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500
                                    ${error ? 'border-red-500' : 'border-gray-300'}`}
                                onChange={(e) => {
                                    setAddName(e.target.value)
                                    if (error && e.target.value.trim()) setError(false)
                                }}
                            />
                            {error && (
                                <span className="text-red-500 text-sm mt-1 block">
                                    층 이름을 입력해주세요.
                                </span>
                            )}
                        </div>
                    </div>
                </>
            )}

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="flex justify-end space-x-2 -mb-[5px]">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    disabled={isSaving}
                    onClick={closeModal}
                >
                    취소
                </Button>

                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                    size="sm"
                    variant="solid"
                    disabled={
                        isSaving ||
                        (selectedTypeId === 0 && (selectedDevice === null || !addName.trim())) ||
                        (selectedTypeId === 1 && selectedDevice === null) ||
                        (selectedTypeId === 2 && !addName.trim()) ||
                        !camera
                    }
                    onClick={save}
                >
                    저장
                </Button>
            </div>
        </div>
    )
}

export default AddModel