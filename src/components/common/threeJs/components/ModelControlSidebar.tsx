import { motion } from 'framer-motion'
import { Select } from '@/components/ui'
import { ThreedModel, ModalTypeKey } from '@/@types/threeD'
import { FaStar, FaTrashAlt } from "react-icons/fa";
import { HiLocationMarker } from "react-icons/hi";
import { PiBuildingApartmentFill } from "react-icons/pi";

type Props = {
  models: ThreedModel[]
  currentModelId: number | null
  onModelSelect: (id: number) => void
  onOpenModal: (type: ModalTypeKey, id?: number) => void
  onSaveModel: (id: number) => void
  onSavePosition: (id: number) => void
}

const ModelControlSidebar = ({
  models,
  currentModelId,
  onModelSelect,
  onOpenModal,
  onSaveModel,
  onSavePosition,
}: Props) => {
  const saveClick = () => {
    if (currentModelId) {
      onSaveModel(currentModelId)
    }
  }

  const savePositionClick = () => {
    if (currentModelId) {
      onSavePosition(currentModelId)
    }
  }

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
        <PiBuildingApartmentFill className="text-indigo-400 mr-2" size={20} />
        <span className="text-sm font-semibold tracking-wide text-slate-200">
            건물 관리
        </span>
    </div>

      {/* 본문 */}
      <div className="flex-1 p-4 space-y-6">
        {/* 모델 선택 */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            모델 선택
          </div>
          <div className="relative">
            <Select
                className="w-full mb-3 cursor-pointer rounded-lg bg-[#fff] dark:bg-[#fff] text-black dark:text-[#fff]"
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
                placeholder="건물을 선택해주세요"
                value={
                    currentModelId
                        ? {
                                value: currentModelId,
                                label:
                                    models.find(
                                        (m) => m.id === currentModelId,
                                    )?.name ?? `ID: ${currentModelId}`,
                            }
                        : null
                }
                options={models
                    .filter((m) => m.model_type?.toLowerCase() === 'main')
                    .map((model) => ({
                        value: model.id,
                        label: `${model.name}`,
                    }))
                }
                onChange={(option) => {
                    if (option) {
                        onModelSelect(option.value)
                    }
                }}
            />
          </div>
        </div>

        {/* 모델 설정 */}
        <div className="space-y-3">
            <div className="text-xs text-slate-400 uppercase tracking-wider">
                모델 설정
            </div>
          
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    bg-slate-800/60 hover:bg-indigo-600/80
                    hover:shadow-md transition duration-150
                    text-left group relative
                "
                onClick={saveClick}
            >
                <div className="-ml-2 flex items-center justify-center w-7 h-7 rounded-md bg-slate-700/70 group-hover:bg-white/20 transition">
                    <FaStar size={15} className="text-yellow-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">기본 모델로 설정</span>
                </div>

                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs text-white/70">✓  저장</span>
                </div>
            </motion.button>
            
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    bg-slate-800/60 hover:bg-blue-600/80
                    hover:shadow-md transition duration-150
                    text-left group relative
                "
                onClick={savePositionClick}
            >
                <div className="-ml-2 flex items-center justify-center w-7 h-7 rounded-md bg-slate-700/70 group-hover:bg-white/20 transition">
                    <HiLocationMarker size={18} className="text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">카메라 위치 저장</span>
                </div>

                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs text-white/70">✓  저장</span>
                </div>
            </motion.button>
        </div>

        {/* 주의 작업 */}
        <div className="pt-6 border-t border-slate-700 space-y-2">
            <div className="text-xs text-slate-400 mb-4">주의 작업</div>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    bg-slate-800/60 hover:bg-red-500/90
                    hover:shadow-md transition-all duration-200 ease-in-out
                    text-left group relative
                "
                onClick={() =>
                    currentModelId && onOpenModal('removeModel', currentModelId)
                }
            >
                <div className="-ml-2 flex items-center justify-center w-7 h-7 rounded-md bg-slate-700/70 group-hover:bg-white/20 transition-colors duration-200">
                    <FaTrashAlt size={14} className="text-red-500 group-hover:text-white transition-colors duration-200"/>
                </div>

                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-100 group-hover:text-white transition-colors duration-200">
                        모델 삭제
                    </span>
                </div>

                <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-white/80">⚠ 삭제</span>
                </div>
            </motion.button>
        </div>
      </div>
    </motion.aside>
  )
}

export default ModelControlSidebar
