import { useEffect, useState } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import calendar from '@/assets/styles/images/calendar.png'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import { apiModifyDeviceDetail } from '@/services/DeviceManagerService'
import { AlertDialog } from '@/components/shared/AlertDialog';

type NoteDTO = { time: string; content: string };

type Device = {
  idx?: number
  device_name?: string
  device_ip?: string
  service_type?: string
  device_type?: string
  vendor?: string
  firmware_version?: string
  location?: string
  installation_date?: string // "YYYY-MM-DD" | "YYYYMMDD" | ISO
  maintenance_end_date?: string
  model_name?: string
  model_number?: string
  // 서버가 문자열(JSON) 또는 배열로 내려올 수 있음 (null 가능성 대비)
  notes?: string | NoteDTO[] | null | undefined
}

type DeviceDetailProps = {
  device: Device
  onClose?: () => void;
  onSaved?: () => void
}

// 저장 전 새로 추가한 특이사항 구분
type NoteItem = { createdAt: Date; timeStr: string; text: string; isNew?: boolean };

export default function DeviceDetail({ device, onClose, onSaved }: DeviceDetailProps) {

  // ---------- helpers ----------
  const parseDate = (s?: string | null): Date | null => {
    if (!s) return null
    const t = s.trim()
    if (!t) return null

    // YYYYMMDD
    if (/^\d{8}$/.test(t)) {
      const y = Number(t.slice(0, 4))
      const m = Number(t.slice(4, 6))
      const d = Number(t.slice(6, 8))
      const dt = new Date(y, m - 1, d)
      return isNaN(dt.getTime()) ? null : dt
    }

    // ISO 또는 YYYY-MM-DD
    const d = new Date(t)
    return isNaN(d.getTime()) ? null : d
  }

  const fmtDateTime = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${dd} ${hh}:${mm}`
  }

  // 서버 전송용 "YYYYMMDD"
  const toYYYYMMDD = (d: Date | null) =>
    d ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` : ''

  // "YYYY-MM-DD HH:mm" -> Date (정렬용)
  const parseNoteTime = (s?: string): Date => {
    if (!s) return new Date(NaN)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
    if (m) {
      const [, yy, mm, dd, hh, min] = m
      return new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min))
    }
    const d = new Date(s)
    return isNaN(d.getTime()) ? new Date(NaN) : d
  }

const normalizeNotes = (raw: Device['notes']): NoteItem[] => {
  const makeBlank = () => {
    const now = new Date()
    return [{ createdAt: now, timeStr: fmtDateTime(now), text: '', isNew: true }]
  }

  if (raw == null) return makeBlank()

  if (Array.isArray(raw)) {
    const arr = raw
      .map(n => {
        const createdAt = parseNoteTime(n?.time)
        // time이 이상하면 지금 시간으로 보정해 표시만이라도 되게.
        const safeDate = isNaN(createdAt.getTime()) ? new Date() : createdAt
        const timeStr = n?.time && !isNaN(createdAt.getTime())
          ? String(n.time)
          : fmtDateTime(safeDate)

        return {
          createdAt: safeDate,
          timeStr,
          text: n?.content ?? '',
          isNew: false,
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return arr.length ? arr : makeBlank()
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const arr = parsed
          .map((n: any) => ({
            createdAt: parseNoteTime(n?.time),
            timeStr: String(n?.time ?? ''),
            text: String(n?.content ?? ''),
            isNew: false,
          }))
          .filter(n => n.timeStr && !isNaN(n.createdAt.getTime()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        return arr.length ? arr : makeBlank()
      }
    } catch {
      const now = new Date()
      return [{ createdAt: now, timeStr: fmtDateTime(now), text: raw, isNew: false }]
    }
    return makeBlank()
  }

  return makeBlank()
}


  // ---------- state ----------
  const initialNotesList = normalizeNotes(device.notes)
  const [vendor, setVendor] = useState(device.vendor ?? '')
  const [modelName, setModelName] = useState(device.model_name ?? '')
  const [modelNumber, setModelNumber] = useState(device.model_number ?? '')
  const [firmwareVersion, setFirmwareVersion] = useState(device.firmware_version ?? '')
  const [notesList, setNotesList] = useState<NoteItem[]>(initialNotesList)
  const [notes, setNotes] = useState(initialNotesList[0]?.text ?? '')
  const [installationDate, setInstallationDate] = useState<Date | null>(parseDate(device.installation_date))
  const [maintenanceEndDate, setMaintenanceEndDate] = useState<Date | null>(parseDate(device.maintenance_end_date))

  // 달력 열림 상태
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isMaintOpen, setIsMaintOpen] = useState(false);

  // 알럿
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<"blue" | "red">('blue');

  // props 변경 시 동기화
  useEffect(() => {
    setVendor(device.vendor ?? '')
    setModelName(device.model_name ?? '')
    setModelNumber(device.model_number ?? '')
    setFirmwareVersion(device.firmware_version ?? '')
    setInstallationDate(parseDate(device.installation_date))
    setMaintenanceEndDate(parseDate(device.maintenance_end_date))

    const list = normalizeNotes(device.notes)
    setNotesList(list)
    setNotes(list[0]?.text ?? '')
  }, [device])

// ---------- reset ----------
const handleReset = () => {
  setVendor('')
  setModelName('')
  setModelNumber('')
  setFirmwareVersion('')
  setInstallationDate(null)
  setMaintenanceEndDate(null)

  // 서버 메모 없음(null 또는 빈 배열) => 빈 항목 1개 유지
  if (device.notes == null || (Array.isArray(device.notes) && device.notes.length === 0)) {
    const now = new Date()
    setNotesList([{ createdAt: now, timeStr: fmtDateTime(now), text: '', isNew: true }])
    setNotes('')
    return
  }

  // 서버 메모만 남기기
  const savedOnly = normalizeNotes(device.notes).map(n => ({ ...n, isNew: false }))
  setNotesList(savedOnly)
  setNotes(savedOnly[0]?.text ?? '')
}



  // ---------- save ----------
  const handleSave = async () => {
    if (!installationDate || !maintenanceEndDate) {
      console.error('설치일/유지보수 만료일은 필수입니다.')
      return
    }

    // 서버 포맷: [{ time: "YYYY-MM-DD HH:mm", content: string }]
    const notesPayload = notesList
      .map((n, i) => ({
        time: n.timeStr,
        content: (i === 0 ? notes : n.text).trim(),
      }))
      .filter(n => n.content.length > 0)

    const payload = {
      idx: device.idx as number,
      vendor,
      modelName,
      modelNumber,
      firmwareVersion,
      installationDate: toYYYYMMDD(installationDate),
      maintenanceEndDate: toYYYYMMDD(maintenanceEndDate),
      notes: notesPayload,
    }

    try {
      await apiModifyDeviceDetail(payload)
      onSaved?.()
      setStatus('blue')
      setMessage('제품 상세정보가 저장되었습니다.')
      setIsAlertOpen(true)
      // 저장 후 새로 추가 가능하도록 isNew 초기화
      setNotesList(prev => prev.map(n => ({ ...n, isNew: false })))
    } catch (e) {
      setStatus('red')
      setMessage('제품 상세정보 저장에 실패하였습니다.')
      setIsAlertOpen(true)
      console.error('apiModifyDeviceDetail error:', e)
    }
  }

  const canSave = Boolean(installationDate && maintenanceEndDate)

  // ---------- add note (위로 쌓기) ----------
  const handleAddNote = () => {
    // 1) 저장 전엔 새로 추가한(isNew) 특이사항을 1개만 허용
    if (notesList.some(n => n.isNew)) {
      setStatus('red')
      setMessage('저장 전에는 특이사항을 1개만 추가할 수 있습니다.')
      setIsAlertOpen(true)
      return
    }

    // 2) 현재(맨 위) 텍스트에어리어가 비어있으면 추가 금지
    if (!notes || notes.trim().length === 0) {
      setStatus('red')
      setMessage('내용을 입력한 뒤 추가해 주세요.')
      setIsAlertOpen(true)
      return
    }

    // 3) 추가
    const now = new Date()
    const item: NoteItem = { createdAt: now, timeStr: fmtDateTime(now), text: '', isNew: true }
    setNotesList(prev => [item, ...prev])
    setNotes('')
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        status={status}
        onClose={() => setIsAlertOpen(false)}
      />
              {/* className={`w-[410px] ${notesList.length <= 1 ? 'h-[90px]' : 'h-[120px]'} scroll-container overflow-y-auto`} */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[580px]  ${notesList.length <= 1 ? 'h-[690px]' : 'h-[722px]'} shadow-xl text-gray-800 relative z-[99999]`}>
        <CloseButton absolute className="ltr:right-4 rtl:left-6 top-3" onClick={onClose} />
        <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:text-[#E0E0E0] dark:border-[#3F3F3F]">제품 상세 정보</h2>

        <div className='w-full h-[22px] mt-[11px] pr-[15px] select-none'>
          <div
            className='w-[65px] h-[22px] text-center leading-[22px] border border-[#D9DCE3] bg-[#F5F5F5] text-[#616A79] float-end cursor-pointer
            dark:bg-[#707885] dark:text-[#EBECEF] dark:border-none'
            onClick={handleReset}
          >
            초기화
          </div>
        </div>

        <ul className="w-full h-auto">
          {/* 제품명 */}
          <li className="w-full h-[27px] flex mt-[11px]">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0] ">제품명</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={device.device_name} readOnly className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-white pl-2 
              dark:bg-[#3F3F3F] dark:text-[#BEBEBE] dark:border-none" />
            </div>
          </li>

          {/* IP */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">IP</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={device.device_ip} readOnly className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-white pl-2
              dark:bg-[#3F3F3F] dark:text-[#BEBEBE] dark:border-none" />
            </div>
          </li>

          {/* 서비스 종류 */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">서비스 종류</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={device.service_type} readOnly className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-white pl-2
              dark:bg-[#3F3F3F] dark:text-[#BEBEBE] dark:border-none" />
            </div>
          </li>

          {/* 제품 종류 */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">제품 종류</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={device.device_type} readOnly className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-white pl-2
              dark:bg-[#3F3F3F] dark:text-[#BEBEBE] dark:border-none" />
            </div>
          </li>

          {/* 위치 */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">위치</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={device.location} readOnly className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-white pl-2
              dark:bg-[#3F3F3F] dark:text-[#BEBEBE] dark:border-none" />
            </div>
          </li>

          {/* 제조사 (편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">제조사</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]" />
            </div>
          </li>

          {/* 모델명 (편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">모델명</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]" />
            </div>
          </li>

          {/* 모델 번호 (편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">모델 번호</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]" />
            </div>
          </li>

          {/* 펌웨어 버전 (편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">펌웨어 버전</div>
            <div className="w-[81%] h-full pl-4">
              <input type="text" value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2
                dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]" />
            </div>
          </li>

          {/* 설치일 (필수, 편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">
              <a className='text-red-500'>* </a>설치일
            </div>
            <div className="w-[81%] h-full pl-4 flex gap-[21px] items-center relative">
              <DatePicker
                selected={installationDate}
                onChange={(date) => {
                  setInstallationDate(date);
                  setIsInstallOpen(false);
                }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2   dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
                placeholderText="날짜를 선택하세요"
                open={isInstallOpen}
                onCalendarClose={() => setIsInstallOpen(false)}
                onClickOutside={() => setIsInstallOpen(false)}
                onInputClick={() => setIsInstallOpen(true)}
              />
              <img
                src={calendar}
                className="w-[21px] absolute right-[22px] cursor-pointer"
                onClick={() => setIsInstallOpen(true)}
                alt="달력 열기"
              />
            </div>
          </li>

          {/* 유지보수 만료일 (필수, 편집 가능) */}
          <li className="w-full h-[27px] flex mt-2">
            <div className="w-[19%] h-full leading-[27px] text-[#716E6E] text-[12px] text-right font-semibold dark:text-[#E0E0E0]">
              <a className='text-red-500 text-[17px]'>* </a>유지보수 만료일
            </div>
            <div className="w-[81%] h-full pl-4 flex gap-[21px] items-center relative">
              <DatePicker
                selected={maintenanceEndDate}
                onChange={(date) => {
                  setMaintenanceEndDate(date);
                  setIsMaintOpen(false);
                }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                className="w-[400px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2   dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
                placeholderText="날짜를 선택하세요"
                open={isMaintOpen}
                onCalendarClose={() => setIsMaintOpen(false)}
                onClickOutside={() => setIsMaintOpen(false)}
                onInputClick={() => setIsMaintOpen(true)}
              />
              <img
                src={calendar}
                className="w-[21px] absolute right-[22px] cursor-pointer"
                onClick={() => setIsMaintOpen(true)}
                alt="달력 열기"
              />
            </div>
          </li>

          {/* 특이사항 (편집 가능) */}
          <li className="w-full h-auto flex mt-1">
            <div className="w-[19%] h-full leading-[34px] text-[#716E6E] text-[14px] text-right font-semibold dark:text-[#E0E0E0]">특이사항</div>
            <div className="w-[81%] h-full pl-4">
              <div
                className={`w-[410px] ${notesList.length <= 1 ? 'h-[90px]' : 'h-[120px]'} scroll-container overflow-y-auto`}
              >
                {notesList.map((note, index) => (
                  <span key={index} className="block mt-1">
                    <div className='w-[210px] h-[27px] pl-2 leading-[26px] bg-[#F2F5F9] border border-[#E3E6EB] rounded-lg
                     dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF] ' >
                      <a className='text-[#868686] mr-3 border-r border-[#BEC4D2] pr-2'>작성일</a>
                      {note.timeStr}
                    </div>
                    <textarea
                      value={index === 0 ? notes : note.text}
                      onChange={(e) => {
                        const value = e.target.value;
                        const next = [...notesList]
                        next[index] = { ...next[index], text: value }
                        setNotesList(next)
                        if (index === 0) setNotes(value)
                      }}
                      className="block w-[400px] h-[52px] resize-none outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 py-1 scroll-container mt-[2px]
                  dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF] "
                    />
                  </span>
                ))}
              </div>

              {/* 특이사항 추가 버튼 (UI 동일) */}
              <div
                className='w-[400px] h-[24px] bg-[#F7F7F7] border border-[#D9DCE3] text-center text-[13px] text-[#647DB7] cursor-pointer leading-[23px] mt-4'
                onClick={handleAddNote}
              >
                특이사항 추가
              </div>
            </div>
          </li>
        </ul>

        {/* 버튼 영역 */}
        <div className="w-full h-[60px] mt-[11px] border-t-2 flex gap-2 justify-end items-center dark:border-[#3F3F3F]">
          <div className="bg-[#EDF0F6] border border-[#D9DCE3] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#696C72] cursor-pointer select-none
          dark:border-none dark:bg-[#696C72] dark:text-[#EBECEF]" onClick={onClose}>
            닫기
          </div>
          <div
            role="button"
            aria-disabled={!canSave}
            className={
              "bg-[#17A36F] border border-[#BEC8BA] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#ECECEC] select-none dark:border-none " +
              (canSave ? "cursor-pointer" : "opacity-50 cursor-not-allowed pointer-events-none")
            }
            onClick={canSave ? handleSave : undefined}
          >
            저장
          </div>
        </div>
      </div>
    </div>
  )
}
