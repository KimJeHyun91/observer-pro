import { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { apiGetDeviceListSearch, apiGetSelectBox, apiModifyDeviceListSearch } from '@/services/DeviceManagerService'
import DeviceDetail from './DeviceDetail'

import device_manager_update from '@/assets/styles/images/device_manager_update.png'
import device_manager_check from '@/assets/styles/images/device_manager_check.png'

import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import calendar from '@/assets/styles/images/calendar.png'

import { AlertDialog } from '@/components/shared/AlertDialog';

type SearchPayload = {
  deviceName: string
  location: string
  serviceType: string
  deviceType: string
}

export default function DeviceSearch() {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [serviceOptions, setserviceOptions] = useState<string[]>([])
  const [deviceTypeOptions, setDeviceTypeOptions] = useState<string[]>([])

  const [showDeviceDeatail, setShowDeviceDeatail] = useState(false)
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  // 유지보수 만료일 팝업
  const [maintFilterOpen, setMaintFilterOpen] = useState(false)
  const [maintDate, setMaintDate] = useState<Date | null>(null)
  const [isMaintCalendarOpen, setIsMaintCalendarOpen] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const maintPanelRef = useRef<HTMLDivElement | null>(null)
  const maintAnchorRef = useRef<HTMLDivElement | null>(null)

  // 제조사 팝업
  const [vendorFilterOpen, setVendorFilterOpen] = useState(false)
  const [vendorText, setVendorText] = useState('')
  const [vendorUpdating, setVendorUpdating] = useState(false)
  const vendorPanelRef = useRef<HTMLDivElement | null>(null)
  const vendorAnchorRef = useRef<HTMLDivElement | null>(null)

  // 펌웨어 버전 팝업
  const [fwFilterOpen, setFwFilterOpen] = useState(false)
  const [fwText, setFwText] = useState('')
  const [fwUpdating, setFwUpdating] = useState(false)
  const fwPanelRef = useRef<HTMLDivElement | null>(null)
  const fwAnchorRef = useRef<HTMLDivElement | null>(null)

  // AlertDialog
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertStatus, setAlertStatus] = useState<'blue' | 'red'>('blue')
  const showAlert = (message: string, status: 'blue' | 'red' = 'blue') => {
    setAlertMessage(message)
    setAlertStatus(status)
    setIsAlertOpen(true)
  }

  // 상단 검색
  const [filters, setFilters] = useState<SearchPayload>({
    deviceName: '',
    location: '',
    serviceType: '',
    deviceType: '',
  })

  useEffect(() => {
    fetchDevices({ deviceName: '', location: '', serviceType: '', deviceType: '' })
    getSelectBoxContents()
  }, [])

  const fetchDevices = async (payload: SearchPayload) => {
    try {
      setLoading(true)
      const res = await apiGetDeviceListSearch(payload)
      setDevices(res.result || [])
    } catch (err) {
      setDevices([])
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getSelectBoxContents = async () => {
    try {
      const serviceOptionsRes = await apiGetSelectBox({ requestType: 'service' })
      setserviceOptions(serviceOptionsRes.result || [])
      const deviceTypeOptionsRes = await apiGetSelectBox({ requestType: 'device' })
      setDeviceTypeOptions(deviceTypeOptionsRes.result || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 8
  const total = devices.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return devices.slice(start, start + pageSize)
  }, [devices, page, pageSize])

  const visiblePages = useMemo(() => {
    const maxButtons = 5
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1)
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))

  const handleSearch = async () => {
    setPage(1)
    await fetchDevices(filters)
  }

  const onSubmitSearch: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!loading) await handleSearch()
  }

  // 날짜 포맷 (API payload용)
  const fmt = (d: Date | null) => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  const waitForPaint = async () => { await nextFrame(); await nextFrame() }

  // 유지보수 만료일 일괄 적용
  const onApplyBulkMaintenanceDate = async () => {
    const maintenanceEndDate = fmt(maintDate)
    if (!maintenanceEndDate) {
      showAlert('유지보수 만료일을 먼저 선택하세요.', 'red')
      return
    }
    const idxList = devices.map((d) => d?.idx).filter((v: any) => typeof v === 'number') as number[]
    if (idxList.length === 0) {
      showAlert('변경할 대상이 없습니다. (검색 결과 없음)', 'red')
      return
    }

    try {
      setBulkUpdating(true)
      setMaintFilterOpen(false)
      setIsMaintCalendarOpen(false)
      await nextFrame()
      await apiModifyDeviceListSearch({ idxList, maintenanceEndDate })
      await fetchDevices(filters)
      await waitForPaint()
      showAlert(`유지보수 만료일이 ${idxList.length}건에 적용되었습니다.`, 'blue')
    } catch (e) {
      console.error(e)
      showAlert('변경에 실패했습니다.', 'red')
    } finally {
      setBulkUpdating(false)
    }
  }

  // 제조사 일괄 적용
  const onApplyBulkVendor = async () => {
    const vendor = vendorText.trim()
    if (!vendor) {
      showAlert('제조사 값을 입력하세요.', 'red')
      return
    }
    const idxList = devices.map((d) => d?.idx).filter((v: any) => typeof v === 'number') as number[]
    if (idxList.length === 0) {
      showAlert('변경할 대상이 없습니다. (검색 결과 없음)', 'red')
      return
    }

    try {
      setVendorUpdating(true)
      setVendorFilterOpen(false)
      await nextFrame()
      await apiModifyDeviceListSearch({ idxList, vendor })
      await fetchDevices(filters)
      await waitForPaint()
      showAlert(`제조사가 ${idxList.length}건에 적용되었습니다.`, 'blue')
    } catch (e) {
      console.error(e)
      showAlert('변경에 실패했습니다.', 'red')
    } finally {
      setVendorUpdating(false)
    }
  }

  // 펌웨어 버전 일괄 적용
  const onApplyBulkFirmwareVersion = async () => {
    const firmwareVersion = fwText.trim()
    if (!firmwareVersion) {
      showAlert('펌웨어 버전을 입력하세요.', 'red')
      return
    }
    const idxList = devices.map((d) => d?.idx).filter((v: any) => typeof v === 'number') as number[]
    if (idxList.length === 0) {
      showAlert('변경할 대상이 없습니다. (검색 결과 없음)', 'red')
      return
    }

    try {
      setFwUpdating(true)
      setFwFilterOpen(false)
      await nextFrame()
      await apiModifyDeviceListSearch({ idxList, firmwareVersion })
      await fetchDevices(filters)
      await waitForPaint()
      showAlert(`펌웨어 버전이 ${idxList.length}건에 적용되었습니다.`, 'blue')
    } catch (e) {
      console.error(e)
      showAlert('변경에 실패했습니다.', 'red')
    } finally {
      setFwUpdating(false)
    }
  }

  // --------------------- 포지셔닝(포털용) ---------------------
  const useAnchorCoords = (anchorRef: React.RefObject<HTMLElement>, open: boolean, offsetY = 8) => {
    const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    useLayoutEffect(() => {
      const update = () => {
        if (!anchorRef.current) return
        const r = anchorRef.current.getBoundingClientRect()
        setCoords({
          top: r.bottom + window.scrollY + offsetY,
          left: r.left + window.scrollX + r.width / 2,
        })
      }
      if (open) {
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
      }
      return () => {
        window.removeEventListener('scroll', update, true)
        window.removeEventListener('resize', update)
      }
    }, [anchorRef, open, offsetY])
    return coords
  }

  const maintCoords = useAnchorCoords(maintAnchorRef, maintFilterOpen)
  const vendorCoords = useAnchorCoords(vendorAnchorRef, vendorFilterOpen)
  const fwCoords = useAnchorCoords(fwAnchorRef, fwFilterOpen)

  // --------------------- 바깥 클릭(포털용) ---------------------
  useEffect(() => {
    if (!maintFilterOpen) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.maint-datepicker-popper')) return
      if (maintPanelRef.current?.contains(target)) return
      if (maintAnchorRef.current?.contains(target)) return
      setMaintFilterOpen(false)
      setIsMaintCalendarOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [maintFilterOpen])

  useEffect(() => {
    if (!vendorFilterOpen) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (vendorPanelRef.current?.contains(t)) return
      if (vendorAnchorRef.current?.contains(t)) return
      setVendorFilterOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [vendorFilterOpen])

  useEffect(() => {
    if (!fwFilterOpen) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (fwPanelRef.current?.contains(t)) return
      if (fwAnchorRef.current?.contains(t)) return
      setFwFilterOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [fwFilterOpen])

  // --------------------- UI ---------------------
  return (
    <div className="w-full h-[580px] relative">
      {/* 공용 알림 다이얼로그 */}
      <AlertDialog
        isOpen={isAlertOpen}
        message={alertMessage}
        status={alertStatus}
        onClose={() => setIsAlertOpen(false)}
      />

      {/* 검색 영역 */}
      <form onSubmit={onSubmitSearch} className="w-full h-[54px] bg-[#EBECEF] my-[11px] flex items-center px-4 dark:bg-[#3F3F3F]">
        <div className="flex items-center gap-3 w-full">
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">제품 명</span>
            <input
              value={filters.deviceName}
              onChange={(e) => setFilters((s) => ({ ...s, deviceName: e.target.value }))}
              type="text"
              placeholder="제품 명을 입력하세요."
              className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
            />
          </label>

          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">서비스 종류</span>
            <div className="relative">
              <select
                value={filters.serviceType}
                onChange={(e) => setFilters((s) => ({ ...s, serviceType: e.target.value }))}
                className="h-8 w-56 appearance-none rounded border border-gray-300 bg-white pr-8 pl-3 text-sm dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
              >
                <option value="">서비스를 선택하세요.</option>
                {serviceOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">제품 종류</span>
            <div className="relative">
              <select
                value={filters.deviceType}
                onChange={(e) => setFilters((s) => ({ ...s, deviceType: e.target.value }))}
                className="h-8 w-56 appearance-none rounded border border-gray-300 bg-white pr-8 pl-3 text-sm dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
              >
                <option value="">제품 종류를 선택하세요.</option>
                {deviceTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 10l5 5 5-5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </label>

          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">위치</span>
            <input
              value={filters.location}
              onChange={(e) => setFilters((s) => ({ ...s, location: e.target.value }))}
              type="text"
              placeholder="설치 위치를 입력하세요."
              className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 dark:bg-[#0D0D0D] dark:border-none dark:text-[#E0E0E0]"
            />
          </label>

          <div className="mx-2 h-8 w-px bg-gray-300 dark:bg-[#141414]" />

          <button
            type="submit"
            disabled={loading}
            className="h-8 rounded bg-[#4F73C8] ml-[40px]  px-4 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60 select-none dark:bg-[#647DB7] dark:text-[#EBECEF]"
          >
            {loading ? '검색 중…' : '검색'}
          </button>
        </div>
      </form>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white dark:bg-[#141414] dark:border-none">
        <table className="w-full text-sm text-center text-gray-700 ">
          <thead className="bg-[#EBECEF] text-xs font-medium text-gray-600 uppercase dark:bg-[#3F3F3F] dark:text-[#E0E0E0]">
            <tr>
              <th className="px-4 py-3">제품명</th>
              <th className="px-4 py-3">IP</th>
              <th className="px-4 py-3">서비스 종류</th>
              <th className="px-4 py-3">제품 종류</th>

              {/* 제조사 */}
              <th
                className="px-4 py-3 cursor-pointer relative select-none"
                onClick={(e) => {
                  e.stopPropagation()
                  setMaintFilterOpen(false)
                  setIsMaintCalendarOpen(false)
                  setFwFilterOpen(false)
                  if (!vendorFilterOpen) setVendorText('')
                  setVendorFilterOpen(o => !o)
                }}
                title="제조사 일괄 변경"
              >
                <div ref={vendorAnchorRef} className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                  제조사
                  <img
                    src={vendorFilterOpen ? device_manager_check : device_manager_update}
                    className="w-[16px] h-[16px]"
                    alt="제조사 상태 아이콘"
                  />
                </div>
              </th>

              {/* 펌웨어 버전 */}
              <th
                className="px-4 py-3 cursor-pointer relative select-none"
                onClick={(e) => {
                  e.stopPropagation()
                  setMaintFilterOpen(false)
                  setIsMaintCalendarOpen(false)
                  setVendorFilterOpen(false)
                  if (!fwFilterOpen) setFwText('')
                  setFwFilterOpen(o => !o)
                }}
                title="펌웨어 버전 일괄 변경"
              >
                <div ref={fwAnchorRef} className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                  펌웨어 버전
                  <img
                    src={fwFilterOpen ? device_manager_check : device_manager_update}
                    className="w-[16px] h-[16px]"
                    alt="펌웨어 상태 아이콘"
                  />
                </div>
              </th>

              <th className="px-4 py-3">위치</th>
              <th className="px-4 py-3">설치일</th>

              {/* 유지보수 만료일 */}
              <th
                className="px-4 py-3 cursor-pointer relative select-none"
                onClick={(e) => {
                  e.stopPropagation()
                  setVendorFilterOpen(false)
                  setFwFilterOpen(false)
                  if (!maintFilterOpen) {
                    setMaintDate(null)
                    setIsMaintCalendarOpen(false)
                  }
                  setMaintFilterOpen(o => !o)
                }}
                title="유지보수 만료일 선택 및 일괄 변경"
              >
                <div ref={maintAnchorRef} className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                  유지보수 만료일
                  <img
                    src={maintFilterOpen ? device_manager_check : device_manager_update}
                    className="w-[16px] h-[16px]"
                    alt="유지보수 상태 아이콘"
                  />
                </div>
              </th>

              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-gray-500">로딩 중…</td>
              </tr>
            ) : pageItems.length > 0 ? (
              pageItems.map((d, i) => (
                <tr key={i} className="border-b transition-colors text-[#716E6E] even:bg-[#F5F5F5] dark:even:bg-[#303030] dark:text-[#E0E0E0] dark:border-[#2C2C2C]">
                  <td className="px-4 py-3" title={d.device_name ?? '-'}>
                    {d.device_name && d.device_name.length > 25
                      ? d.device_name.slice(0, 25) + '…'
                      : d.device_name ?? '-'}
                  </td>
                  <td className="px-4 py-3">{d.device_ip ?? '-'}</td>
                  <td className="px-4 py-3">{d.service_type ?? '-'}</td>
                  <td className="px-4 py-3">{d.device_type ?? '-'}</td>

                  <td className="px-4 py-3">{d.vendor ?? '-'}</td>
                  <td className="px-4 py-3">{d.firmware_version ?? '-'}</td>

                  <td className="px-4 py-3" title={d.location ?? '-'}>
                    {d.location && d.location.length > 25
                      ? d.location.slice(0, 25) + '…'
                      : d.location ?? '-'}
                  </td>
                  <td className="px-4 py-3">{d.installation_date ?? '-'}</td>
                  <td className="px-4 py-3">{d.maintenance_end_date ?? '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-md border border-gray-300 h-[24px] leading-[18px] bg-white px-3 py-1 text-xs font-medium text-gray-600 ml-2 hover:bg-gray-100 
                                 dark:bg-[#696C72] dark:border-none dark:text-[#E0E0E0]"
                      onClick={() => {
                        setSelectedRow(d)
                        setShowDeviceDeatail(true)
                      }}>
                      상세 정보
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-gray-500">데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이징 */}
      <div className="w-full h-[56px] bg-[#EBECEF] absolute bottom-0 left-0 flex items-center justify-center px-4 select-none dark:bg-[#3F3F3F]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 text-sm rounded border border-gray-300 bg-white disabled:opacity-50 hover:bg-gray-100"
          >
            이전
          </button>

          {visiblePages[0] > 1 && (
            <>
              <button onClick={() => goToPage(1)} className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100">1</button>
              <span className="px-2 text-gray-500">…</span>
            </>
          )}

          {visiblePages.map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              disabled={loading}
              className={
                'px-3 py-1 text-sm rounded border ' +
                (p === page
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-[#647DB7] dark:text-[#EBECEF]'
                  : 'border-gray-300 bg-white hover:bg-gray-100 ')
              }
            >
              {p}
            </button>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              <span className="px-2 text-gray-500">…</span>
              <button onClick={() => goToPage(totalPages)} className="px-3 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-100">
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 text-sm rounded border border-gray-300 bg-white disabled:opacity-50 hover:bg-gray-100"
          >
            다음
          </button>
        </div>
      </div>

      {showDeviceDeatail && (
        <DeviceDetail
          device={selectedRow}
          onClose={() => { setShowDeviceDeatail(false); setSelectedRow(null) }}
          onSaved={async () => {
            setPage(1)
            await fetchDevices({ deviceName: '', location: '', serviceType: '', deviceType: '' })
          }}
        />
      )}

      {/* ================== 포털 팝업들 (UI 동일, 테이블 밖에 렌더) ================== */}
      {vendorFilterOpen && createPortal(
        <div
          ref={vendorPanelRef}
          style={{ position: 'absolute', top: vendorCoords.top, left: vendorCoords.left, transform: 'translateX(-50%)', zIndex: 99999 }}
          className="mt-2 w-[260px] rounded-md border border-gray-200 bg-white p-3 shadow-lg cursor-auto dark:bg-[#1f1f1f] dark:border-[#2C2C2C]"
        >
          <div className="text-[11px] text-gray-600 mb-2 dark:text-[#E0E0E0]">
            제조사 (현재 목록 {devices.length}건에 적용)
          </div>
          <div className="w-full h-[27px] relative flex items-center">
            <input
              value={vendorText}
              onChange={(e) => setVendorText(e.target.value)}
              className="w-[234px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              placeholder="값을 입력하세요"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && vendorText.trim() && !vendorUpdating) onApplyBulkVendor()
              }}
            />
          </div>
          <div className="flex justify-center gap-2 mt-3">
            <button
              className="px-3 py-1 text-xs rounded bg-[#4F73C8] text-white hover:brightness-95 disabled:opacity-60 dark:bg-[#647DB7]"
              onClick={onApplyBulkVendor}
              disabled={vendorUpdating || !vendorText.trim()}
            >
              {vendorUpdating ? '적용 중…' : '적용'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {fwFilterOpen && createPortal(
        <div
          ref={fwPanelRef}
          style={{ position: 'absolute', top: fwCoords.top, left: fwCoords.left, transform: 'translateX(-50%)', zIndex: 99999 }}
          className="mt-2 w-[260px] rounded-md border border-gray-200 bg-white p-3 shadow-lg cursor-auto dark:bg-[#1f1f1f] dark:border-[#2C2C2C]"
        >
          <div className="text-[11px] text-gray-600 mb-2 dark:text-[#E0E0E0]">
            펌웨어 버전 (현재 목록 {devices.length}건에 적용)
          </div>
          <div className="w-full h-[27px] relative flex items-center">
            <input
              value={fwText}
              onChange={(e) => setFwText(e.target.value)}
              className="w-[234px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              placeholder="값을 입력하세요"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && fwText.trim() && !fwUpdating) onApplyBulkFirmwareVersion()
              }}
            />
          </div>
          <div className="flex justify-center gap-2 mt-3">
            <button
              className="px-3 py-1 text-xs rounded bg-[#4F73C8] text-white hover:brightness-95 disabled:opacity-60 dark:bg-[#647DB7]"
              onClick={onApplyBulkFirmwareVersion}
              disabled={fwUpdating || !fwText.trim()}
            >
              {fwUpdating ? '적용 중…' : '적용'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {maintFilterOpen && createPortal(
        <div
          ref={maintPanelRef}
          style={{ position: 'absolute', top: maintCoords.top, left: maintCoords.left, transform: 'translateX(-50%)', zIndex: 99999 }}
          className="mt-2 w-[260px] rounded-md border border-gray-200 bg-white p-3 shadow-lg cursor-auto dark:bg-[#1f1f1f] dark:border-[#2C2C2C]"
        >
          <div className="text-[11px] text-gray-600 mb-2 dark:text-[#E0E0E0]">
            유지보수 만료일 (현재 목록 {devices.length}건에 적용)
          </div>

          <div className="w-full h-[27px] relative flex items-center">
            <DatePicker
              selected={maintDate}
              onChange={(date) => {
                setMaintDate(date as Date | null)
                setIsMaintCalendarOpen(false)
              }}
              locale={ko}
              dateFormat="yyyy-MM-dd"
              className="w-[234px] h-[27px] outline-none border border-[#E3E6EB] bg-[#F2F5F9] pl-2 dark:bg-[#565962] dark:border-[#7B7B7B] dark:text-[#EBECEF]"
              placeholderText="날짜를 선택하세요"
              open={isMaintCalendarOpen}
              popperClassName="maint-datepicker-popper"
              calendarClassName="maint-datepicker"
              onCalendarClose={() => setIsMaintCalendarOpen(false)}
              onClickOutside={() => setIsMaintCalendarOpen(false)}
              onInputClick={() => setIsMaintCalendarOpen(true)}
              onFocus={() => setIsMaintCalendarOpen(true)}
              onKeyDown={(e) => e.preventDefault()}
            />
            <img
              src={calendar}
              className="w-[21px] absolute right-[10px] cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsMaintCalendarOpen(true)
              }}
              alt="달력 열기"
            />
          </div>

          <div className="flex justify-center gap-2 mt-3">
            <button
              className="px-3 py-1 text-xs rounded bg-[#4F73C8] text-white hover:brightness-95 disabled:opacity-60 dark:bg-[#647DB7]"
              onClick={onApplyBulkMaintenanceDate}
              disabled={bulkUpdating || !maintDate}
            >
              {bulkUpdating ? '적용 중…' : '적용'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
