import { useEffect, useState, useMemo, useCallback } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import calendar from '@/assets/styles/images/calendar.png'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import { apiModifyWorkLogDeatil, apiDeleteWorkLogDeatil, apiDownloadWorkLogDeatil } from '@/services/DeviceManagerService'
import { AlertDialog } from '@/components/shared/AlertDialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

type LogInfo = {
  idx?: number
  title?: string
  service_request_date?: string
  visit_date?: string
  worker_name?: string
  department?: string
  work_detail?: string
  notes?: string
}

type WorkLogDeatilProps = {
  logInfo: LogInfo
  onClose?: () => void
  onSaved?: () => void
}

type DialogState = {
  isOpen: boolean
  type: 'alert' | 'confirm'
  title?: string
  message?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export default function WorkLogDeatil({ logInfo, onClose, onSaved }: WorkLogDeatilProps) {
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

  const yyyymmdd = (d = new Date()) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

  const sanitizeFilename = (s: string) =>
    (s || '')
      .replace(/[\\/:*?"<>|]/g, '')   // 윈도우에서 불가한 문자 제거
      .trim();

  // NEW: 확장자별 파일명 생성
  const makeFileName = (ext: 'xlsx' | 'pdf') => {
    const t = sanitizeFilename(title || logInfo.title || '');
    return (t ? t : 'worklog') + `.${ext}`;
  };

  // ---------- local editable state ----------
  const [title, setTitle] = useState(logInfo.title ?? '')
  const [department, setDepartment] = useState(logInfo.department ?? '')
  const [workerName, setWorkerName] = useState(logInfo.worker_name ?? '')
  const [workDetail, setWorkDetail] = useState(logInfo.work_detail ?? '')
  const [notes, setNotes] = useState(logInfo.notes ?? '')

  const [serviceRequestDate, setServiceRequestDate] = useState<Date | null>(parseDate(logInfo.service_request_date))
  const [visitDate, setVisitDate] = useState<Date | null>(parseDate(logInfo.visit_date))

  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'blue' | 'red'>('blue')

  // 방문일/접수일 달력 열림 상태
  const [isReqOpen, setIsReqOpen] = useState(false)
  const [isVisitOpen, setIsVisitOpen] = useState(false)

  // ConfirmDialog 상태
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  })

  // ✅ 삭제 모달 중복 오픈 방지
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // ✅ 엑셀 / PDF 다운로드 중 상태 (UI는 그대로, 동작만 제어)
  const [isDownloadingXlsx, setIsDownloadingXlsx] = useState(false) // NEW
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)   // NEW

  const showDialog = useCallback((cfg: Partial<DialogState>) => {
    setDialogState(prev => ({ ...prev, isOpen: true, ...cfg }))
  }, [])
  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // ✅ 필수값: 제목 + 방문일 + 작업자 + 소속 + 작업내용
  const canSave = useMemo(() => {
    const requiredTextsFilled = [title, workerName, department, workDetail].every(v => v.trim().length > 0)
    return Boolean(visitDate && requiredTextsFilled)
  }, [title, workerName, department, workDetail, visitDate])

  // logInfo prop 바뀌면 동기화
  useEffect(() => {
    setTitle(logInfo.title ?? '')
    setDepartment(logInfo.department ?? '')
    setWorkerName(logInfo.worker_name ?? '')
    setWorkDetail(logInfo.work_detail ?? '')
    setNotes(logInfo.notes ?? '')
    setServiceRequestDate(parseDate(logInfo.service_request_date))
    setVisitDate(parseDate(logInfo.visit_date))
  }, [logInfo])

  // ---------- reset (초기화) ----------
  const handleReset = () => {
    setTitle('')
    setDepartment('')
    setWorkerName('')
    setWorkDetail('')
    setNotes('')
    setServiceRequestDate(null)
    setVisitDate(null)
  }

  // ---------- save ----------
  const handleSave = async () => {
    if (!canSave) return

    const payload = {
      idx: logInfo.idx,
      title: title.trim(),
      department: department.trim(),
      workerName: workerName.trim(),
      workDetail: workDetail.trim(),
      notes,
      serviceRequestDate: fmt(serviceRequestDate),
      visitDate: fmt(visitDate),
    }

    try {
      await apiModifyWorkLogDeatil(payload as any)
      onSaved?.()
      setStatus('blue')
      setMessage('내역 상세정보가 수정되었습니다.')
      setIsAlertOpen(true)
    } catch (e) {
      setStatus('red')
      setMessage('내역 상세정보 수정에 실패하였습니다.')
      setIsAlertOpen(true)
      console.error('apiModifyDeviceDetail error:', e)
    }
  }

  // ---------- delete ----------
  const handleDelete = async () => {
    if (!logInfo.idx) return
    if (isConfirmOpen) return

    setIsConfirmOpen(true)
    const confirmed = await new Promise<boolean>((resolve) => {
      showDialog({
        type: 'confirm',
        title: '내역 삭제',
        message: '정말 이 내역을 삭제하시겠습니까?',
        onConfirm: () => {
          closeDialog()
          setIsConfirmOpen(false)
          resolve(true)
        },
        onCancel: () => {
          closeDialog()
          setIsConfirmOpen(false)
          resolve(false)
        },
      })
    })

    if (!confirmed) return

    try {
      await apiDeleteWorkLogDeatil({ idx: logInfo.idx })
      onSaved?.()
      onClose?.()
    } catch (e) {
      setStatus('red')
      setMessage('내역 삭제에 실패하였습니다.')
      setIsAlertOpen(true)
      console.error('apiDeleteWorkLogDeatil error:', e)
    }
  }

  // ---------- 공통 다운로드 유틸 (엑셀/PDF) ----------
  // NEW: 중복 로직 정리
  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const extractBlob = (res: any, fallbackMime: string) => {
    if (res instanceof Blob) return res
    if (res?.data instanceof Blob) return res.data
    if (res?.result) return new Blob([res.result], { type: fallbackMime })
    return null
  }

  // ---------- Excel Download ----------
  const handleExcelDownload = async () => {
    if (!logInfo.idx || isDownloadingXlsx) return
    try {
      setIsDownloadingXlsx(true)

      const res: any = await apiDownloadWorkLogDeatil({ idx: logInfo.idx, form: 'xlsx' })
      const blob = extractBlob(res, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      if (!blob) throw new Error('다운로드 데이터가 비어있습니다.')

      const filename = makeFileName('xlsx')
      triggerBrowserDownload(blob, filename)
    } catch (e) {
      console.error('excel download error:', e)
      setStatus('red')
      setMessage('엑셀 다운로드에 실패했습니다.')
      setIsAlertOpen(true)
    } finally {
      setIsDownloadingXlsx(false)
    }
  }

  // ---------- PDF Download ----------
  // NEW: pdf 다운로드 추가 (UI는 기존 요소 그대로 사용)
  const handlePdfDownload = async () => {
    if (!logInfo.idx || isDownloadingPdf) return
    try {
      setIsDownloadingPdf(true)

      const res: any = await apiDownloadWorkLogDeatil({ idx: logInfo.idx, form: 'pdf' })
      console.log("Aaa")
      console.log(res)
      const blob = extractBlob(res, 'application/pdf')
      if (!blob) throw new Error('다운로드 데이터가 비어있습니다.')

      const filename = makeFileName('pdf')
      triggerBrowserDownload(blob, filename)
    } catch (e) {
      console.error('pdf download error:', e)
      setStatus('red')
      setMessage('PDF 다운로드에 실패했습니다.')
      setIsAlertOpen(true)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      {/* Alert */}
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        status={status}
        onClose={() => setIsAlertOpen(false)}
      />

      {/* Confirm */}
      {dialogState.type === 'confirm' && (
        <ConfirmDialog
          isOpen={dialogState.isOpen}
          onCancel={() => {
            dialogState.onCancel?.()
          }}
          onConfirm={() => {
            dialogState.onConfirm?.()
          }}
          type="danger"
          title={dialogState.title}
          cancelText="취소"
          confirmText="확인"
          confirmButtonProps={{ color: 'red-600' }}
        >
          {dialogState.message}
        </ConfirmDialog>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[550px] h-[634px] shadow-xl text-gray-8 00 relative z-[99999] ">
        <CloseButton absolute className="ltr:right-4 rtl:left-6 top-3" onClick={onClose} />
        <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:text-[#E0E0E0] dark:border-[#3F3F3F]">내역 상세 정보</h2>

        <div className="w-full h-[22px] mt-[11px] pr-[12px] select-none flex justify-end gap-2">
            {/* PDF 버튼: 클래스/텍스트 그대로, onClick만 연결 */}
            <div
              className="w-[100px] h-[22px] text-center leading-[22px] border border-[#D9DCE3] bg-[#F5F5F5] text-[#616A79] cursor-pointer
            dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none"
              onClick={isDownloadingPdf ? undefined : handlePdfDownload} // NEW
              title={isDownloadingPdf ? '다운로드 중…' : 'PDF로 다운로드'} // NEW (툴팁만)
              role="button" // NEW (접근성)
              aria-disabled={isDownloadingPdf} // NEW
            >
              pdf 다운로드
            </div>

            {/* Excel 버튼: 기존 동작 유지 */}
            <div
              className={
                'w-[110px] h-[22px] text-center leading-[22px] border border-[#D9DCE3] bg-[#F5F5F5] text-[#616A79] ' +
                (isDownloadingXlsx ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer') +
                ' dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none'
              }
              onClick={isDownloadingXlsx ? undefined : handleExcelDownload}
              role="button"
              aria-disabled={isDownloadingXlsx}
              title={isDownloadingXlsx ? '다운로드 중…' : '엑셀로 다운로드'}
            >
              {isDownloadingXlsx ? '다운로드 중…' : 'Excel 다운로드'}
            </div>

          <div
            className="w-[65px] h-[22px] text-center leading-[22px] border border-[#D9DCE3] bg-[#F5F5F5] text-[#616A79] cursor-pointer
            dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none"
            onClick={handleReset}
          >
            초기화
          </div>
        </div>

        <ul className="w-full h-auto">
          {/* 제목 (필수) */}
          <li className="w-full h-[34px] flex mt-[11px]">
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
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
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
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
            <div className="w-[15%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
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
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
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
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
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
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
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
                className="w-[400px] h-full resize-none outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 py-1 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
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
                className="w-[400px] h-full resize-none outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 py-1 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              />
            </div>
          </li>
        </ul>

        {/* 버튼 영역 */}
        <div className="w-full h-[60px] mt-[11px] border-t-2 flex gap-2 justify-end items-center dark:border-[#3F3F3F]">
          <div
            className={
              'bg-[#EDF0F6] border border-[#D9DCE3] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#D76767] select-none ' +
              (isConfirmOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')
            }
            onClick={isConfirmOpen ? undefined : handleDelete}
          >
            삭제
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
            수정
          </div>
        </div>
      </div>
    </div>
  )
}

