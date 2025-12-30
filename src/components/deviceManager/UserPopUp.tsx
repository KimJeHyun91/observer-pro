import { useEffect, useMemo, useState } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import DeviceSearch from './DeviceSearch'
import { apiGetDeviceListSearchUser, apiGetSelectBox } from '@/services/DeviceManagerService' // 🔧 apiGetSelectBoxPeriod 제거

type UserPopUpProps = {
  onClose?: () => void
  sortColum: string
}

type SearchPayload = {
  deviceName: string
  serviceType: string
  deviceType: string
  sortColum: string
  // 🔧 notificationLabel 제거
}

export default function UserPopUp({ onClose, sortColum }: UserPopUpProps) {
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [serviceOptions, setserviceOptions] = useState<string[]>([])
  const [deviceTypeOptions, setDeviceTypeOptions] = useState<string[]>([])
  // 🔧 상태 셀렉트 제거
  // const [periodOptions, setPeriodOptions] = useState<string[]>([])

  useEffect(() => {
    fetchDevices({ deviceName: '', serviceType: '', deviceType: '', sortColum })
    getSelectBoxContents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDevices = async (payload: SearchPayload) => {
    try {
      setLoading(true)
      const res = await apiGetDeviceListSearchUser(payload)
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

      // 🔧 상태 옵션 로딩 제거
      // const periodOptionRes = await apiGetSelectBoxPeriod()
      // setPeriodOptions(periodOptionRes.result || [])
    } catch (err) {
      console.error(err)
    }
  }

  // -----------------------------
  // Pagination state & helpers
  // -----------------------------
  const [page, setPage] = useState(1)
  const pageSize = 8 // 고정 8행

  const total = devices.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return devices.slice(start, start + pageSize)
  }, [devices, page, pageSize])

  const visiblePages = useMemo(() => {
    const maxButtons = 5
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages))

  // -----------------------------
  // 검색 필터(로컬 상태)
  // -----------------------------
  const [filters, setFilters] = useState<SearchPayload>({
    deviceName: '',
    serviceType: '',
    deviceType: '',
    sortColum, // 유지
  })

  const handleSearch = async () => {
    setPage(1)
    await fetchDevices(filters)
  }

  // ⌨️ 엔터 제출 핸들러
  const onSubmitSearch: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!loading) await handleSearch()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] cursor-default">
        <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[1406px] h-[628px] shadow-xl text-gray-800 relative z-[99999] ">
          <CloseButton
            absolute
            className="ltr:right-4 rtl:left-6 top-3"
            onClick={onClose}
          />
          <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:border-[#2C2C2C]">장치관리</h2>

          {/* 검색 부분 */}
          <form onSubmit={onSubmitSearch} className="w-full h-[54px] bg-[#EBECEF] my-[11px] flex items-center px-4 dark:bg-[#3F3F3F]">
            <div className="flex items-center gap-3 w-full">
              {/* 제품 명 */}
              <label className="flex items-center gap-2">
                <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">제품 명</span>
                <input
                  value={filters.deviceName}
                  onChange={(e) => setFilters((s) => ({ ...s, deviceName: e.target.value }))}
                  type="text"
                  placeholder="제품 명을 입력하세요."
                  className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400
                             dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
                />
              </label>

              {/* 서비스 종류 */}
              <label className="flex items-center gap-2">
                <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">서비스 종류</span>
                <div className="relative">
                  <select
                    value={filters.serviceType}
                    onChange={(e) => setFilters((s) => ({ ...s, serviceType: e.target.value }))}
                    className="h-8 w-56 appearance-none rounded border border-gray-300 bg-white pr-8 pl-3 text-sm
                               dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
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

              {/* 제품 종류 */}
              <label className="flex items-center gap-2">
                <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">제품 종류</span>
                <div className="relative">
                  <select
                    value={filters.deviceType}
                    onChange={(e) => setFilters((s) => ({ ...s, deviceType: e.target.value }))}
                    className="h-8 w-56 appearance-none rounded border border-gray-300 bg-white pr-8 pl-3 text-sm
                               dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
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

              {/* 🔧 상태(유지보수 만료일) 필터 제거 */}

              <div className="mx-2 ml-[250px] h-8 w-px bg-gray-300 dark:bg-[#141414]" />

              {/* 검색 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="h-8 rounded bg-[#4F73C8] ml-[55px]  px-4 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60 select-none
                           dark:bg-[#647DB7] dark:text-[#EBECEF]"
              >
                {loading ? '검색 중…' : '검색'}
              </button>
            </div>
          </form>

          {/* 테이블 부분 */}
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white dark:bg-[#141414] dark:border-none">
            <table className="w-full text-sm text-center text-gray-700 dark:text-[#E0E0E0]">
              <thead className="bg-[#EBECEF] text-xs font-medium text-gray-600 uppercase dark:bg-[#3F3F3F] dark:text-[#E0E0E0]">
                <tr>
                  <th className="px-4 py-3">제품명</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">서비스 종류</th>
                  <th className="px-4 py-3">제품 종류</th>
                  <th className="px-4 py-3">설치일</th>
                  {/* 🔧 유지보수 만료일/상태 컬럼 제거 */}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">로딩 중…</td>
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
                      <td className="px-4 py-3">{d.installation_date ?? '-'}</td>
                      {/* 🔧 유지보수 만료일/상태 셀 제거 */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이징 */}
          <div className="w-[1358px] h-[56px] bg-[#EBECEF] absolute bottom-[15px] flex items-center justify-center px-4 select-none dark:bg-[#3F3F3F]">
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

        </div>
      </div>
    </>
  )
}
