import { useEffect, useState, useMemo, useCallback } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import calendar from '@/assets/styles/images/calendar.png'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import { apiInstallWorkLog } from '@/services/DeviceManagerService'
import { AlertDialog } from '@/components/shared/AlertDialog'

type WorkLogInstallProps = {
  onClose?: () => void
  onSaved?: () => void
}

export default function WorkLogInstall({ onClose, onSaved }: WorkLogInstallProps) {
  // ---------- helpers ----------
  const parseDate = (s?: string | null): Date | null => {
    if (!s) return null
    const t = s.trim()
    if (!t) return null
    if (t.includes('T')) {
      const d = new Date(t)
      return isNaN(d.getTime()) ? null : d
    }
    const [y, m, d] = t.split('-').map(Number)
    if (!y || !m || !d) return null
    const dt = new Date(y, m - 1, d)
    return isNaN(dt.getTime()) ? null : dt
  }

  const fmt = (d: Date | null) => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  // ---------- local editable state ----------
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [workDetail, setWorkDetail] = useState('')
  const [notes, setNotes] = useState('')

  const [serviceRequestDate, setServiceRequestDate] = useState<Date | null>(null)
  const [visitDate, setVisitDate] = useState<Date | null>(null)

  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'blue' | 'red'>('blue')

  // 방문일/접수일 달력 열림 상태
  const [isReqOpen, setIsReqOpen] = useState(false)
  const [isVisitOpen, setIsVisitOpen] = useState(false)


  // ✅ 필수값: 제목 + 방문일 + 작업자 + 소속 + 작업내용
  const canSave = useMemo(() => {
    const requiredTextsFilled =
      [title, workerName, department, workDetail].every(v => v.trim().length > 0)
    return Boolean(visitDate && requiredTextsFilled)
  }, [title, workerName, department, workDetail, visitDate])



  // ---------- save ----------
  const handleSave = async () => {
    if (!canSave) return

    const payload = {
      title: title.trim(),
      department: department.trim(),
      workerName: workerName.trim(),
      workDetail: workDetail.trim(),
      notes,
      serviceRequestDate: fmt(serviceRequestDate),
      visitDate: fmt(visitDate),
    }

    try {
      await apiInstallWorkLog(payload as any)
      onSaved?.()
      setStatus('blue')
      setMessage('내역 상세정보가 등록되었습니다.')
      setIsAlertOpen(true)
    } catch (e) {
      setStatus('red')
      setMessage('내역 상세정보 등록에 실패하였습니다.')
      setIsAlertOpen(true)
      console.error('apiModifyDeviceDetail error:', e)
    }
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      {/* Alert */}
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        status={status}
        onClose={() => {
          setIsAlertOpen(false);
          onClose?.();
        }}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[550px] h-[594px] shadow-xl text-gray-800 relative z-[99999] ">
        <CloseButton absolute className="ltr:right-4 rtl:left-6 top-3" onClick={onClose} />
        <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:text-[#E0E0E0] dark:border-[#3F3F3F]">유지보수 내역 추가</h2>

        <ul className="w-full h-auto">
          {/* 제목 (필수) */}
          <li className="w-full h-[34px] flex mt-[11px]">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0] ">
              <a className="text-red-500">* </a>제목
            </div>
            <div className="w-[81%] h-full pl-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              />
            </div>
          </li>

          {/* 접수일 (선택) */}
          <li className="w-full h-[34px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
              접수일
            </div>
            <div className="w-[81%] h-full pl-4 flex gap-[21px] items-center relative">
              <DatePicker
                selected={serviceRequestDate}
                onChange={(date) => {
                  setServiceRequestDate(date)
                  setIsReqOpen(false)
                }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2  dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
                placeholderText="날짜를 선택하세요"
                open={isReqOpen}
                onCalendarClose={() => setIsReqOpen(false)}
                onClickOutside={() => setIsReqOpen(false)}
                onInputClick={() => setIsReqOpen(true)}
              />
              <img
                src={calendar}
                className="w-[28px] absolute right-[4px] cursor-pointer"
                onClick={() => setIsReqOpen(true)}
                alt="달력 열기"
              />
            </div>
          </li>

          {/* 방문일 (필수) */}
          <li className="w-full h-[34px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0] ">
              <a className="text-red-500">* </a>방문일
            </div>
            <div className="w-[81%] h-full pl-4 flex gap-[21px] items-center relative">
              <DatePicker
                selected={visitDate}
                onChange={(date) => {
                  setVisitDate(date)
                  setIsVisitOpen(false)
                }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2  dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
                placeholderText="날짜를 선택하세요"
                open={isVisitOpen}
                onCalendarClose={() => setIsVisitOpen(false)}
                onClickOutside={() => setIsVisitOpen(false)}
                onInputClick={() => setIsVisitOpen(true)}
              />
              <img
                src={calendar}
                className="w-[28px] absolute right-[4px] cursor-pointer"
                onClick={() => setIsVisitOpen(true)}
                alt="달력 열기"
              />
            </div>
          </li>

          {/* 소속 (필수) */}
          <li className="w-full h-[34px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
              <a className="text-red-500">* </a>소속
            </div>
            <div className="w-[81%] h-full pl-4">
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              />
            </div>
          </li>

          {/* 작업자 (필수) */}
          <li className="w-full h-[34px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
              <a className="text-red-500">* </a>작업자
            </div>
            <div className="w-[81%] h-full pl-4">
              <input
                type="text"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              />
            </div>
          </li>

          {/* 작업내용 (필수) */}
          <li className="w-full h-[114px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
              <a className="text-red-500">* </a>작업내용
            </div>
            <div className="w-[81%] h-full pl-4">
              <textarea
                value={workDetail}
                onChange={(e) => setWorkDetail(e.target.value)}
                className="w-[400px] h-full resize-none outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 py-1
                 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF] "
              />
            </div>
          </li>

          {/* 특이사항 (선택) */}
          <li className="w-full h-[114px] flex mt-2">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">특이사항</div>
            <div className="w-[81%] h-full pl-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-[400px] h-full resize-none outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 py-1
                 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF] "
              />
            </div>
          </li>
        </ul>

        {/* 버튼 영역 */}
        <div className="w-full h-[60px] mt-[11px] border-t-2 flex gap-2 justify-end items-center dark:border-[#3F3F3F] ">
          <div
            className="bg-[#EDF0F6] border border-[#D9DCE3] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#696C72] cursor-pointer select-none
            dark:border-none dark:bg-[#696C72] dark:text-[#EBECEF]"
            onClick={onClose}
          >
            취소
          </div>
          <div
            role="button"
            aria-disabled={!canSave}
            className={
              'bg-[#17A36F] border border-[#BEC8BA] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#ECECEC] select-none dark:border-none ' +
              (canSave ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none')
            }
            onClick={canSave ? handleSave : undefined}
          >
            등록
          </div>
        </div>
      </div>
    </div>
  )
}
