import React, { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import CloseButton from '@/components/ui/CloseButton'
import { useMoveMapStore } from '@/store/tunnel/useMoveMapStore'

const MoveMap = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { setCenter } = useMoveMapStore()

  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      setLat('')
      setLng('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const isDisabled = !lat.trim() || !lng.trim()

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    if (isDisabled) return

    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('위도와 경도를 올바르게 입력하세요.')
      return
    }
    setCenter(latNum, lngNum) // zoom은 store 기본값 18 적용
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-[8px] w-[460px] h-[180px] shadow-xl text-gray-800 dark:text-white relative">
        <CloseButton absolute className="ltr:right-4 rtl:left-6 top-[7px]" onClick={onClose} />
        <h2 className="text-[17px] font-bold mb-2 border-b-2">지도 위치 검색</h2>

        {/* ⬇️ 폼으로 감싸서 Enter 제출 지원 */}
        <form onSubmit={handleSubmit}>
          <div className="w-full h-[32px] flex items-center justify-between">
            <span className="text-gray-500 font-bold text-[15px] h-full leading-[32px]">위도</span>
            <input
              className="w-[377px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]"
              placeholder="위도를 입력하세요"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>

          <div className="w-full h-[32px] flex items-center justify-between mt-2">
            <span className="text-gray-500 font-bold text-[15px] h-full leading-[32px]">경도</span>
            <input
              className="w-[377px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]"
              placeholder="경도를 입력하세요"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>

          <div className="w-full flex justify-end gap-2 mt-[9px] ">
            <Button
              className={`w-[100px] h-[34px] rounded-none text-white ${
                isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#17A36F]'
              }`}
              size="sm"
              type="submit"          
              disabled={isDisabled}
            >
              이동
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MoveMap
