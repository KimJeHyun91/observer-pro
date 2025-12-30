import { useEffect, useState } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import DeviceSearch from './DeviceSearch'
import InstallHistory from './installHistory'
import WorkLogSearch from './WorkLogSearch'

type MaintenancePopUpProps = {
  onClose?: () => void
}

export default function MaintenancePopUp({ onClose }: MaintenancePopUpProps) {
  // ✅ 탭 상태
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search')
  // ✅ 설치 내역 모달 표시 여부
  const [showInstallHistory, setShowInstallHistory] = useState(false)
  // ✅ 유지보수 내역 추가 모달 표시 여부
  const [showWorkLogInstall, setShowWorkLogInstall] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99998] cursor-default">
        <div className="bg-white dark:bg-[#141414] rounded-xl px-6 pt-6 pb-3 w-[1406px] h-[738px] shadow-xl text-gray-800 relative z-[99999] ">
          <CloseButton
            absolute
            className="ltr:right-4 rtl:left-6 top-3"
            onClick={onClose}
          />
          <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:border-[#3F3F3F] dark:text-[#E0E0E0]">장치관리</h2>

          {/* 메뉴 */}
          <div className="w-full h-[70px] border-b-2 flex items-center gap-2 relative dark:border-[#3F3F3F]">
            {/* 제품 검색 버튼 */}
            <div
              className={`w-[102px] h-[36px] text-center leading-[37px] rounded-[25px] text-[14px] cursor-pointer font-bold 
                ${activeTab === 'search' ? 'bg-[#6F93D3] text-white' : 'bg-[#EBECEF] text-[#716E6E]  dark:bg-[#707885] dark:text-[#101E3D]'}`}
              onClick={() => setActiveTab('search')}
            >
              제품 검색
            </div>

            {/* 유지보수 내역 버튼 */}
            <div
              className={`w-[120px] h-[36px] text-center leading-[37px] rounded-[25px] text-[14px] cursor-pointer font-bold 
                ${activeTab === 'history' ? 'bg-[#6F93D3] text-white' : 'bg-[#EBECEF] text-[#716E6E] dark:bg-[#707885] dark:text-[#101E3D]'}`}
              onClick={() => setActiveTab('history')}
            >
              유지보수 내역
            </div>

            {/* 우측 액션 */}
            {activeTab === 'search' && (
              <div
                className="w-[78px] h-[26px] bg-[#DCE0EA] text-[#716E6E] text-center leading-[25px] text-[13px] border border-[#BEC4D2] cursor-pointer absolute right-0 select-none
                 dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none dark:leading-[26px]"
                onClick={() => setShowInstallHistory(true)}
              >
                현장 정보
              </div>
            )}
            {activeTab === 'history' && (
              <div
                className="w-[135px] h-[26px] bg-[#DCE0EA] text-[#716E6E] text-center leading-[25px] text-[13px] border border-[#BEC4D2] cursor-pointer absolute right-0 select-none
                 dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none dark:leading-[26px]"
                onClick={() => { setShowWorkLogInstall(true) }}
              >
                유지보수 내역 추가
              </div>
            )}
          </div>

          {/* contents */}
          {activeTab === 'search' && <DeviceSearch />}
          {activeTab === 'history' && (
            <WorkLogSearch
              showWorkLogInstall={showWorkLogInstall}
              setShowWorkLogInstall={setShowWorkLogInstall}
            />
          )}
        </div>
      </div>

      {/* ✅ 설치 내역 모달 */}
      {showInstallHistory && (
        <InstallHistory onClose={() => setShowInstallHistory(false)} />
      )}
    </>
  )
}
