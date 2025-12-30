import { motion } from 'framer-motion'
import { HiXMark, HiOutlineBuildingOffice2 } from 'react-icons/hi2'
import { FaLayerGroup } from 'react-icons/fa6'
import { TbStairsDown, TbStairsUp } from "react-icons/tb";

type Props = {
  floors: string[]
  onSelectFloor?: (floorName: string) => void
  onClose: () => void
}

const FloorListSidebar = ({
  floors = [],
  onSelectFloor,
  onClose,
}: Props) => {
  const getFloorIcon = (name: string) => {
    if (/^B\d+/i.test(name)) return <TbStairsDown className="text-red-400" size={20} /> // 지하
    if (/^1F$/i.test(name)) return <HiOutlineBuildingOffice2 className="text-green-400" size={20} /> // 1층
    return <TbStairsUp className="text-blue-400" size={20} /> // 일반층
  }

  return (
    <motion.aside
      initial={{ x: 50 }}
      animate={{ x: 0 }}
      exit={{ x: 50 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="absolute top-[44px] right-0 bottom-[3.1px] z-20 w-[320px] 
                 bg-gradient-to-b from-slate-900/95 to-slate-800/85 
                 border-l border-slate-700 text-slate-100 shadow-2xl 
                 flex flex-col backdrop-blur-sm"
    >
      <div className="h-[52px] px-4 flex items-center border-b border-slate-700">
        <FaLayerGroup className="text-indigo-400 mr-2" size={18} />
        <span className="text-sm font-semibold tracking-wide text-slate-200">
          층 목록
        </span>

        <button
          className="ml-auto text-slate-400 hover:text-white transition"
          title="닫기"
          onClick={onClose}
        >
          <HiXMark size={18} />
        </button>
      </div>

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {floors.length > 0 ? (
          floors.map((floorName) => (
            <motion.button
              key={floorName}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                bg-slate-800/60 hover:bg-indigo-600/80
                hover:shadow-md transition duration-150
                text-left group relative
              "
              onClick={() => onSelectFloor?.(floorName)}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-slate-700/70 group-hover:bg-white/20 transition">
                {getFloorIcon(floorName)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{floorName}</div>
              </div>

              <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition">
                <span className="text-xs text-white/70">보기 →</span>
              </div>
            </motion.button>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            등록된 층이 없습니다
          </div>
        )}
      </div>
    </motion.aside>
  )
}

export default FloorListSidebar
