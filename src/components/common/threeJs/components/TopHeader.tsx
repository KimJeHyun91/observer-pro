import { HiOutlineArrowPath, HiOutlineMap } from 'react-icons/hi2'
import { RiBox2Line, RiBox3Line } from "react-icons/ri";
import { HiPlus } from 'react-icons/hi'
import { FaRegListAlt, FaUndoAlt } from "react-icons/fa";
import { ActivePanel, ModalTypeKey } from '@/@types/threeD'

type Props = {
  isRotation: boolean // 3D 모델 자동 회전 활성 여부
  activePanel: ActivePanel // 현재 열려 있는 상단 패널 상태 (장비 목록 / 모델 관리 등)
  canRotate: boolean // 회전 버튼 활성 가능 여부 (모델 존재 + 에러 없음)
  onToggleRotation: () => void // 자동 회전 시작/중지 토글
  onToggleView: () => void // 2D <-> 3D 뷰 전환
  onOpenModal: (type: ModalTypeKey, id?: number) => void // 지정된 타입의 모달 열기
  onToggleDeviceList: () => void // 장비 목록 패널 열기/닫기
  onToggleModelControl: () => void // 모델 관리 패널 열기/닫기
  onResetCamera: () => void // 카메라를 저장된 기본 위치로 리셋
}

const TopHeader = ({
  isRotation,
  activePanel,
  canRotate,
  onToggleRotation,
  onToggleView,
  onOpenModal,
  onToggleDeviceList,
  onToggleModelControl,
  onResetCamera
}: Props) => {
  return (
    <div
      className="
        absolute top-0 left-0 right-0 h-[44px] z-30
        flex items-center gap-2 px-3
        bg-gradient-to-b from-slate-900 to-slate-800
        text-slate-200
      "
    >
      {/* 메뉴 */}
      <div
        className="
          flex items-center gap-1 px-2 py-1
          rounded-md bg-slate-700/60
          text-indigo-300
        "
      >
        <RiBox2Line size={18} />
        <span className="text-xs font-medium">3D Menu</span>
      </div>

        <button
            className={`p-2 rounded flex items-center gap-1 hover:bg-slate-700`}
            onClick={onToggleView}
        >
            <HiOutlineMap size={16} />
            <span className="text-xs">2D 전환</span>
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
            className={`p-2 rounded flex items-center gap-1 hover:bg-slate-700`}
            onClick={onResetCamera}
        >
          <FaUndoAlt size={12} />
          <span className="text-xs">새로고침</span>
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
          disabled={!canRotate}
          className={`
            p-2 rounded flex items-center gap-1 text-xs
            transition
            ${
              !canRotate
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : isRotation
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-slate-700 text-slate-200'
            }
          `}
          onClick={onToggleRotation}
        >
          <HiOutlineArrowPath size={16} />
          <span>{isRotation ? '회전 중지' : '회전 시작'}</span>
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
              className={`
                  p-2 rounded flex items-center gap-1
                  ${
                  activePanel === 'modelControl'
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-700'
                  }
              `}
              onClick={onToggleModelControl}
          >
              <RiBox3Line  size={16} />
              <span className="ml-1 text-xs font-medium">건물 관리</span>
        </button>
        
        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
            className={`
                p-2 rounded flex items-center gap-1
                ${
                activePanel === 'deviceList'
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-700'
                }
            `}
            onClick={onToggleDeviceList}
        >
            <FaRegListAlt size={16} />
            <span className="ml-1 text-xs font-medium">장비 목록</span>
        </button>

        <div className="w-px h-5 bg-slate-600 mx-1" />

        <button
            className={`p-2 rounded flex items-center gap-1 hover:bg-slate-700`}
            onClick={() => onOpenModal('manage')}
        >
            <HiPlus size={14} />
            <span className="text-xs font-medium">GLB 관리</span>
        </button>
    </div>
  )
}


export default TopHeader
