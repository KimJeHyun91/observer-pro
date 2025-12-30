import { useState, useRef, useMemo } from 'react'
import { Upload, Button, Select } from '@/components/ui'
import { ThreedModel, ThreedDevice, CameraType, CAMERA_TYPES } from '@/@types/threeD'
import { FaRegFileLines, FaPlus } from 'react-icons/fa6'
import { IoCloseOutline, IoCloudUploadOutline } from 'react-icons/io5'
import { FaTrashAlt } from 'react-icons/fa'
import Modal from '../modal/Modal'
import { ModalType } from '@/@types/modal'
import Remove from '../modal/Remove'
import { ThreedDeviceList } from '@/utils/hooks/useThreedDevice'
import {
    apiGlbDevicesUpload,
    threedDeleteDevice,
} from '@/services/ThreedService'

type Props = {
    models: ThreedModel[] // 현재 등록된 3D 건물 리스트
    modelName: string // 새로 등록할 건물 이름 입력값
    uploading: boolean // 업로드 진행 여부 상태
    uploadGlbFile: (fileList: File[], clearFiles: () => void, modelType: string) => void // GLB 파일 업로드 함수
    setModelName: (value: string) => void // 건물 이름 상태 변경 함수
    setTargetModel: (model: ThreedModel | null) => void // 삭제/편집 대상 건물 설정 함수
    removeModel: (manageClose?: boolean) => void // 건물 삭제 함수 (모달 닫기 여부 옵션)
    onRefreshDevices: () => void // 장비 리스트 새로고침 콜백
}

type uploadResult = {
    file: File
    message: 'ok' | 'fail'
}

type SelectOption<T extends string> = {
  value: T | '';
  label: string;
};

const ManageModelDevice = ({
    models,
    modelName,
    uploading,
    uploadGlbFile,
    setModelName,
    setTargetModel,
    removeModel,
    onRefreshDevices,
}: Props) => {
    const [activeMenu, setActiveMenu] = useState<'main' | 'floor' | 'device'>('main')
    const [fileList, setFileList] = useState<File[]>([])
    const modalChildRef = useRef<HTMLDivElement>(null)
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    })

    const [deleteTitle, setDeleteTitle] = useState<string>('')
    const [deviceUploading, setDeviceUploading] = useState(false)
    const [deviceName, setDeviceName] = useState<string>('')
    const [deviceFilename, setDeviceFilename] = useState<string>('')
    const [deviceFile, setDeviceFile] = useState<File[]>([])
    const [deviceDesc, setDeviceDesc] = useState<string>('')
    const [deviceType, setDeviceType] = useState<string>('')
    const [deleteDevice, setDeleteDevice] = useState<ThreedDevice | null>(null)

    const deviceTypeOptions: SelectOption<CameraType>[] = [
        { value: '', label: '선택 안함' },
        ...CAMERA_TYPES.map((type) => ({
            value: type,
            label: type,
        })),
    ];

    const { data, mutate } = ThreedDeviceList()
    const deviceList: ThreedDevice[] = useMemo(() => data || [], [data])

    const modalTitles: Record<'removeModel' | 'removeDevice', string> = {
        removeModel: '3D 건물 삭제',
        removeDevice: '일반 장비 삭제',
    }

    /**
     * 업로드할 GLB 파일의 유효성을 검사하는 함수
     * - 확장자가 .glb인지 확인
     * - 파일 크기가 200MB 이하인지 확인
     */
    const glbTypeCheck = (fileList: FileList | null): true | string => {
        if (fileList) {
            for (const file of Array.from(fileList)) {
                if (
                    file.type !== 'model/gltf-binary' &&
                    !file.name.endsWith('.glb')
                ) {
                    return 'GLB 파일만 업로드할 수 있습니다.'
                }
                if (file.size > 200 * 1024 * 1024) {
                    return '200MB 이하의 GLB 파일만 업로드할 수 있습니다.'
                }
            }
        }
        return true
    }

    const reset = () => {
        setModelName('')
        setFileList([])
        setTargetModel(null)
        setDeleteTitle('')
        setDeviceName('')
        setDeviceType('')
        setDeviceDesc('')
        setDeviceFile([])
        setDeviceFilename('')
    }

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type,
        })
    }

    const setModalChild = (type: string) => {
        switch (type) {
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

    const getRemoveConfig = () => {
        if (modal.title === modalTitles.removeModel) {
            return {
                remove: remove,
                type: 'threeJsModel',
                deleteTarget: { title: deleteTitle ?? '' },
            }
        } else if (modal.title === modalTitles.removeDevice) {
            return {
                remove: removeDevice,
                type: 'ManageDevice',
                deleteTarget: deleteDevice
                    ? { title: `${deleteDevice.name} (${deleteDevice.filename})`,}
                    : { title: '' },
            }
        }

        return {
            remove: () => {},
            type: '',
            deleteTarget: { title: '' },
        }
    }

    const remove = () => {
        removeModel(true)
        closeModal()
    }

    const removeDevice = async () => {
        if (!deleteDevice) return

        const payload = {
            id: deleteDevice.id,
        }

        try {
            const res = await threedDeleteDevice(payload)

            if (res.message === 'fail') {
                alert(res.result)
                return
            }

            if (!res || !res.result) {
                return
            }

            alert('장비 삭제 완료')

            mutate()
            onRefreshDevices()
            closeModal()
        } catch (error) {
            console.error('3D 장비 삭제 API 에러: ', error)
            return
        }
    }

    const closeModal = () => {
        reset()

        toggleModal({
            show: false,
            type: '',
            title: '',
        })
    }

    const uploadDeviceFile = async () => {
        if (!deviceFile[0]) return

        if (!deviceName) {
            alert('건물 이름을 입력해주세요.')
            return
        }

        const file = deviceFile[0]
        const formData = new FormData()

        formData.append('name', deviceName)
        formData.append('filename', file.name)
        formData.append('type', deviceType)
        formData.append('description', deviceDesc)
        formData.append('glb_devices', file)

        try {
            setDeviceUploading(true)
            const res = await apiGlbDevicesUpload<uploadResult>(formData)

            if (!res || res.message !== 'ok') {
                alert('업로드 실패')
                return
            }

            alert(`${modelName} 업로드 성공`)
            reset()
            mutate()
        } catch (error) {
            console.error('GLB 장비 업로드 에러:', error)
        } finally {
            setDeviceUploading(false)
        }
    }

    return (
        <div className="flex w-full h-[600px]">
            {/* 좌측 영역 - 탭 메뉴 */}
            <div className="w-[180px] border border-gray-300 bg-gray-50 rounded-md dark:bg-gray-700 dark:border-gray-800 ">
                <ul className="flex flex-col">
                    <li
                        className={`relative px-4 py-3 cursor-pointer transition-colors  ${
                            activeMenu === 'main'
                                ? 'bg-white font-semibold text-blue-700 shadow-md rounded-tr-md before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:bg-blue-600 rounded-t-md dark:bg-gray-600 dark:text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-300 text-gray-600 rounded-t-md dark:text-gray-400 dark:hover:text-black'
                        }`}
                        onClick={() => {
                            setActiveMenu('main')
                            reset()
                        }}
                    >
                        건물 관리
                    </li>
                    {/* <li
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                            activeMenu === 'floor'
                                ? 'bg-white font-semibold border-l-[5px] border-blue-600 text-blue-700 shadow-md'
                                : 'hover:bg-gray-100 text-gray-600'
                        }`}
                        onClick={() => {
                            setActiveMenu('floor')
                            reset()
                        }}
                    >
                        층 관리
                    </li> */}
                    <li
                        className={`px-4 py-3 cursor-pointer transition-colors  ${
                            activeMenu === 'device'
                                ? 'bg-white font-semibold border-l-[5px] border-blue-600 text-blue-700 shadow-md dark:bg-gray-600 dark:text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-300 text-gray-600 dark:text-gray-400 dark:hover:text-black'
                        }`}
                        onClick={() => {
                            setActiveMenu('device')
                            reset()
                        }}
                    >
                        일반 장비 관리
                    </li>
                </ul>
            </div>

            {/* 우측 영역 - 컨텐츠 */}
            <div className="flex-1 pl-3 overflow-y-auto pr-0.5">
                {/* 건물 관리 */}
                {activeMenu === 'main' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            건물 등록
                        </h3>
                        {/* 건물 등록 */}
                        <div className="mb-4">
                            {/* 건물 이름 + 업로드 버튼 */}
                            <div className="flex items-center mb-2">
                                <div className="w-[80px] text-sm font-medium text-gray-700 dark:text-white">
                                    <span className="text-red-500">*</span> 건물 이름
                                </div>

                                <input
                                    type="text"
                                    name="modelName"
                                    placeholder="건물 이름을 입력해주세요"
                                    className="dark:bg-gray-700 dark:border-gray-800 flex-1 border border-gray-300 rounded px-3 py-2 mr-2 focus:outline-none focus:ring-0 focus:ring-blue-600 focus:border-blue-600"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                />

                                <Button
                                    variant="solid"
                                    size="sm"
                                    disabled={
                                        !modelName.trim() ||
                                        uploading ||
                                        fileList.length === 0
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md h-[39px] font-medium 
                                        ${
                                            uploading || !modelName.trim() || fileList.length === 0
                                                ? 'bg-blue-400'
                                                : ''
                                        }`}
                                    onClick={() => {
                                        uploadGlbFile(fileList, () => setFileList([]), 'main')
                                    }}
                                >
                                    {!uploading && (
                                        <IoCloudUploadOutline className="w-5 h-5" />
                                    )}
                                    {uploading ? '업로드 중...' : '건물 업로드'}
                                </Button>
                            </div>

                            {/* 파일 업로드 선택 박스 */}
                            <Upload
                                draggable
                                className="items-center justify-center group"
                                accept=".glb"
                                uploadLimit={1}
                                fileList={fileList}
                                showList={false}
                                beforeUpload={(newFiles) => glbTypeCheck(newFiles)}
                                onChange={(files) => setFileList(files)}
                                onFileRemove={(files) => setFileList(files)}
                            >
                                <div className="flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                                    <FaRegFileLines className="w-7 h-7 mb-2 text-gray-400 group-hover:text-blue-600" />
                                    <p className="text-[12px] text-gray-400 group-hover:text-blue-600 dark:text-white">
                                        클릭하거나 드래그하여 파일 선택 <br />
                                        (GLB 파일 / 200MB 이하 파일만 가능합니다)
                                    </p>
                                </div>
                            </Upload>

                            {/* 선택된 파일 표시 */}
                            {fileList.length > 0 && (
                                <div className="mt-3 flex items-center justify-between bg-white border rounded-md px-3 py-2 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <FaRegFileLines className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p
                                                title={fileList[0].name}
                                                className="text-sm font-medium text-gray-800 truncate max-w-[500px]"
                                            >
                                                {fileList[0].name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {fileList[0].size >= 1024 * 1024
                                                    ? `${(fileList[0].size / (1024 * 1024)).toFixed(2)} MB`
                                                    : `${(fileList[0].size / 1024).toFixed(0)} KB`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        className="text-gray-400 hover:text-red-500"
                                        onClick={() => setFileList([])}
                                    >
                                        <IoCloseOutline className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 건물 목록 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">
                                건물 목록
                            </h3>
                            <div className="border border-gray-200 rounded">
                                <div
                                    className={`overflow-y-auto ${
                                        fileList.length > 0
                                            ? 'h-[285px]'
                                            : 'h-[351px]'
                                    }`}
                                >
                                    <table
                                        className={`w-full text-sm text-left border-collapse ${
                                            models.length === 0 ? 'h-full' : ''
                                        }`}
                                    >
                                        <thead className="bg-gray-100 sticky top-0 dark:text-black">
                                            <tr>
                                                <th className="px-3 py-2 border-b">
                                                    건물 이름
                                                </th>
                                                <th className="px-3 py-2 border-b">
                                                    파일명
                                                </th>
                                                <th className="px-3 py-2 border-b w-[90px]">
                                                    기본 건물
                                                </th>
                                                <th className="px-3 py-2 border-b text-center">
                                                    삭제
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const mainModels = models.filter((m) => m.model_type === 'main')

                                                if (mainModels.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={4}>
                                                                <div className="flex items-center justify-center text-gray-500">
                                                                    등록된 건물이 없습니다
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }

                                                return mainModels.map((model) => (
                                                    <tr
                                                        key={model.id}
                                                        className="hover:bg-gray-50 border-b last:border-b-0 dark:hover:bg-gray-600 dark:text-white"
                                                    >
                                                        <td
                                                            className="px-3 py-2 max-w-[150px] truncate"
                                                            title={model.name}
                                                        >
                                                            {model.name}
                                                        </td>
                                                        <td
                                                            className="px-3 py-2 max-w-[180px] truncate"
                                                            title={model.filename}
                                                        >
                                                            {model.filename}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {model.is_use ? (
                                                                <span className="text-green-500 font-bold ">
                                                                    ●
                                                                </span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                className="hover:text-red-600"
                                                                title="삭제"
                                                                onClick={() => {
                                                                    setTargetModel(model)
                                                                    setDeleteTitle(model.name)
                                                                    toggleModal(
                                                                        {
                                                                            show: true,
                                                                            type: 'remove',
                                                                            title: modalTitles[
                                                                                'removeModel'
                                                                            ],
                                                                        },
                                                                    )
                                                                }}
                                                            >
                                                                <FaTrashAlt />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 층 관리 */}
                {activeMenu === 'floor' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">
                            층 등록
                        </h3>

                        <div className="mb-4">
                            {/* 층 이름 + 업로드 버튼 */}
                            <div className="flex items-center mb-2">
                                <div className="w-[80px] text-sm font-medium text-gray-700">
                                    <span className="text-red-500">*</span> 층 이름
                                </div>

                                <input
                                    type="text"
                                    name="modelName"
                                    placeholder="층 이름을 입력해주세요"
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 mr-2 focus:outline-none focus:ring-0 focus:ring-blue-600 focus:border-blue-600"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                />

                                <Button
                                    variant="solid"
                                    size="sm"
                                    disabled={
                                        !modelName.trim() || 
                                        uploading || 
                                        fileList.length === 0
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md h-[39px] font-medium  
                                        ${
                                            uploading || !modelName.trim() || fileList.length === 0
                                                ? 'bg-blue-400'
                                                : ''
                                        }`}
                                    onClick={() => {
                                        uploadGlbFile(fileList, () => setFileList([]), 'floor')
                                    }}
                                >
                                    {!uploading && 
                                        <IoCloudUploadOutline className="w-5 h-5" />
                                    }
                                    {uploading ? '업로드 중...' : '층 업로드'}
                                </Button>
                            </div>

                            {/* 파일 업로드 선택 박스 */}
                            <Upload
                                draggable
                                className="items-center justify-center group"
                                accept=".glb"
                                uploadLimit={1}
                                fileList={fileList}
                                showList={false}
                                beforeUpload={(newFiles) => glbTypeCheck(newFiles)}
                                onChange={(files) => setFileList(files)}
                                onFileRemove={(files) => setFileList(files)}
                            >
                                <div className="flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                                    <FaRegFileLines className="w-7 h-7 mb-2 text-gray-400 group-hover:text-blue-600" />
                                    <p className="text-[12px] text-gray-400 group-hover:text-blue-600">
                                        클릭하거나 드래그하여 파일 선택 <br />
                                        (GLB 파일 / 200MB 이하 파일만 가능합니다)
                                    </p>
                                </div>
                            </Upload>

                            {/* 선택된 파일 표시 */}
                            {fileList.length > 0 && (
                                <div className="mt-3 flex items-center justify-between bg-white border rounded-md px-3 py-2 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <FaRegFileLines className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <p
                                                title={fileList[0].name}
                                                className="text-sm font-medium text-gray-800 truncate max-w-[500px]"
                                            >
                                                {fileList[0].name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {fileList[0].size >= 1024 * 1024
                                                    ? `${(fileList[0].size / (1024 * 1024)).toFixed(2)} MB`
                                                    : `${(fileList[0].size / 1024).toFixed(0)} KB`}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        className="text-gray-400 hover:text-red-500"
                                        onClick={() => setFileList([])}
                                    >
                                        <IoCloseOutline className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 층 목록 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">
                                층 목록
                            </h3>
                            <div className="border border-gray-200 rounded">
                                <div
                                    className={`overflow-y-auto ${
                                        fileList.length > 0
                                            ? 'h-[285px]'
                                            : 'h-[351px]'
                                    }`}
                                >
                                    <table
                                        className={`w-full text-sm text-left border-collapse ${
                                            models.length === 0 ? 'h-full' : ''
                                        }`}
                                    >
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 border-b">
                                                    층 이름
                                                </th>
                                                <th className="px-3 py-2 border-b">
                                                    파일명
                                                </th>
                                                <th className="px-3 py-2 border-b text-center">
                                                    삭제
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const floorModels = models.filter((m) => m.model_type === 'floor',)

                                                if (floorModels.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={3}>
                                                                <div className="flex items-center justify-center text-gray-500">
                                                                    등록된 층이 없습니다
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }

                                                return floorModels.map((model) => (
                                                    <tr
                                                        key={model.id}
                                                        className="hover:bg-gray-50 border-b last:border-b-0"
                                                    >
                                                        <td
                                                            className="px-3 py-2 max-w-[150px] truncate"
                                                            title={model.name}
                                                        >
                                                            {model.name}
                                                        </td>
                                                        <td
                                                            className="px-3 py-2 max-w-[180px] truncate"
                                                            title={model.filename}
                                                        >
                                                            {model.filename}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                className="hover:text-red-600"
                                                                title="삭제"
                                                                onClick={() => {
                                                                    setTargetModel(model)
                                                                    setDeleteTitle(model.name)
                                                                    toggleModal({
                                                                        show: true,
                                                                        type: 'remove',
                                                                        title: modalTitles[
                                                                            'removeModel'
                                                                        ],
                                                                    })
                                                                }}
                                                            >
                                                                <FaTrashAlt />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 장비 관리 */}
                {activeMenu === 'device' && (
                    <div>
                        <h3 className="text-lg font-semibold mb-3">
                            일반 장비 등록
                        </h3>

                        {/* 등록 폼 */}
                        <div className="space-y-3 mb-4">
                            {/* 이름 */}
                            <div className="flex items-center gap-3">
                                <div className="w-[90px] text-sm font-medium text-gray-700 dark:text-white">
                                    <span className="text-red-500">*</span> 장비 이름
                                </div>
                                <input
                                    type="text"
                                    name="deviceName"
                                    placeholder="이름을 입력하세요"
                                    className="dark:bg-gray-700 dark:border-gray-800 font-bold flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:ring-blue-600 focus:border-blue-600"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                />
                            </div>

                            {/* GLB 업로드 */}
                            <div className="flex items-center gap-3">
                                <div className="w-[90px] text-sm font-medium text-gray-700 dark:text-white">
                                    <span className="text-red-500">*</span> GLB 파일
                                </div>
                                <Upload
                                    accept=".glb"
                                    uploadLimit={1}
                                    fileList={deviceFile}
                                    showList={false}
                                    beforeUpload={(newFiles) => glbTypeCheck(newFiles)}
                                    onChange={(files) => {
                                        setDeviceFile(files)
                                        if (files.length > 0) {
                                            setDeviceFilename(files[0].name)
                                        } else {
                                            setDeviceFilename('')
                                        }
                                    }}
                                    onFileRemove={(files) => setDeviceFile(files)}
                                >
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        className="flex items-center gap-2 px-4 py-2 rounded-md h-[39px] font-medium"
                                    >
                                        <IoCloudUploadOutline className="w-5 h-5" />
                                        파일 선택
                                    </Button>
                                </Upload>

                                {/* 선택된 파일명 + X 버튼 */}
                                {deviceFilename ? (
                                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2 py-2 h-[39px]">
                                        <div
                                            title={deviceFilename}
                                            className="text-sm text-gray-700 truncate max-w-[332px]"
                                        >
                                            {deviceFilename}
                                        </div>
                                        <button
                                            className="text-gray-400 hover:text-red-500"
                                            onClick={() => {
                                                setDeviceFile([])
                                                setDeviceFilename('')
                                            }}
                                        >
                                            <IoCloseOutline className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400">
                                        선택된 파일 없음
                                    </span>
                                )}
                            </div>

                            {/* 설명 */}
                            <div className="flex items-center gap-3">
                                <div className="w-[90px] text-sm font-medium text-gray-700 dark:text-white">
                                    설명
                                </div>
                                <input
                                    type="text"
                                    name="deviceDesc"
                                    placeholder="설명을 입력하세요"
                                    className="dark:bg-gray-700 dark:border-gray-800 font-bold flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:ring-blue-600 focus:border-blue-600"
                                    value={deviceDesc}
                                    onChange={(e) => setDeviceDesc(e.target.value)}
                                />
                            </div>

                            {/* 타입 */}
                            <div className="flex items-center gap-3">
                                <div className="w-[90px] text-sm font-medium text-gray-700 dark:text-white">
                                    타입
                                </div>
                                <Select
                                    className="flex-1 cursor-pointer text-sm h-[38px]"
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
                                    placeholder="타입을 선택하세요"
                                    value={
                                        deviceType
                                            ? { value: deviceType, label: deviceType }
                                            : null
                                    }
                                    options={deviceTypeOptions}
                                    onChange={(option) => {
                                        if (option) {
                                            setDeviceType(option.value)
                                        } else {
                                            setDeviceType('')
                                        }
                                    }}
                                />
                            </div>

                            {/* 등록 버튼 */}
                            <div className="flex justify-end">
                                <Button
                                    className="flex items-center gap-2 px-4 py-2 rounded-md h-[39px] font-medium w-[120px]"
                                    size="sm"
                                    variant="solid"
                                    disabled={!deviceName.trim() || !deviceFilename}
                                    onClick={uploadDeviceFile}
                                >
                                    {!deviceUploading && (
                                        <FaPlus className="w-4 h-4" />
                                    )}
                                    {deviceUploading ? '장비 등록중...' : '장비 등록'}
                                </Button>
                            </div>
                        </div>

                        {/* 장비 리스트 */}
                        <h3 className="text-lg font-semibold mb-2">
                            일반 장비 목록
                        </h3>
                        <div className="border border-gray-200 rounded h-[268px]">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-100 dark:text-black">
                                    <tr>
                                        <th className="px-3 py-2 border-b ">
                                            장비 이름
                                        </th>
                                        <th className="px-3 py-2 border-b">
                                            파일명
                                        </th>
                                        <th className="px-3 py-2 border-b">
                                            타입
                                        </th>
                                        <th className="px-3 py-2 border-b">
                                            설명
                                        </th>
                                        <th className="px-3 py-2 border-b text-center w-[55px]">
                                            삭제
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deviceList.map((device) => (
                                        <tr
                                            key={device.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-600 border-b last:border-b-0 dark:text-white"
                                        >
                                            <td
                                                className="px-3 py-2 max-w-[80px] truncate"
                                                title={device.name}
                                            >
                                                {device.name}
                                            </td>
                                            <td
                                                className="px-3 py-2 max-w-[130px] truncate"
                                                title={device.filename}
                                            >
                                                {device.filename}
                                            </td>
                                            <td
                                                className="px-3 py-2 max-w-[40px] truncate"
                                                title={device.type || '-'}
                                            >
                                                {device.type || '-'}
                                            </td>
                                            <td
                                                className="px-3 py-2 max-w-[90px] truncate"
                                                title={device.description || '-'}
                                            >
                                                {device.description || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    className="hover:text-red-600"
                                                    onClick={() => {
                                                        setDeleteDevice(device)

                                                        toggleModal({
                                                            show: true,
                                                            type: 'remove',
                                                            title: modalTitles[
                                                                'removeDevice'
                                                            ],
                                                        })
                                                    }}
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                width={520}
                modal={modal}
                toggle={toggleModal}
                modalChildRef={modalChildRef}
                onClose={closeModal}
            >
                <div ref={modalChildRef}>{setModalChild(modal.type)}</div>
            </Modal>
        </div>
    )
}

export default ManageModelDevice