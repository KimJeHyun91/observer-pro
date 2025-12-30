import { useEffect, useMemo, useState } from 'react'
import { apiGetWorkLogSearch } from '@/services/DeviceManagerService'
import calendar from '@/assets/styles/images/calendar.png'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import WorkLogDeatil from './WorkLogDeatil'
import WorkLogInstall from './WorkLogInstall'

type SearchPayload = {
  title: string
  department: string
  workerName: string
  visitDateStart: string
  visitDateEnd: string
}

type WorkLogSearchProps = {
  showWorkLogInstall: boolean
  setShowWorkLogInstall: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function WorkLogSearch({ showWorkLogInstall, setShowWorkLogInstall }: WorkLogSearchProps) {
  const [workLogList, setWorkLogList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fmt = (d: Date | null) => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }

  const truncate = (text?: string | null, max = 50) => {
    if (text == null || text === '') return '-'
    const t = String(text)
    return t.length > max ? t.slice(0, max) + '…' : t
  }

  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [visitStart, setVisitStart] = useState<Date | null>(null)
  const [visitEnd, setVisitEnd] = useState<Date | null>(null)

  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)

  const [showWorkLogDeatail, setShowWorkLogDeatail] = useState(false)
  const [selectedRow, setSelectedRow] = useState<any | null>(null)

  useEffect(() => {
    fetchWorkLog({ title: '', department: '', workerName: '', visitDateStart: '', visitDateEnd: '' })
  }, [])

  const fetchWorkLog = async (payload: SearchPayload) => {
    try {
      setLoading(true)
      const res = await apiGetWorkLogSearch(payload)
      setWorkLogList(res.result || [])
    } catch (err) {
      console.error(err)
      setWorkLogList([])
    } finally {
      setLoading(false)
    }
  }

  const [page, setPage] = useState(1)
  const pageSize = 8
  const total = workLogList.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return workLogList.slice(start, start + pageSize)
  }, [workLogList, page, pageSize])

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

  const handleSearch = async () => {
    setPage(1)
    await fetchWorkLog({
      title,
      department,
      workerName,
      visitDateStart: fmt(visitStart),
      visitDateEnd: fmt(visitEnd),
    })
  }

  const onSubmitSearch: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!loading) await handleSearch()
  }

  return (
    <div className="w-full h-[580px] relative">
      {/* 검색 영역 */}
      <form
        onSubmit={onSubmitSearch}
        className="w-full h-[54px] bg-[#EBECEF] my-[11px] flex items-center px-4 dark:bg-[#3F3F3F]"
      >
        <div className="flex items-center gap-3 w-full">
          {/* 제목 */}
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              placeholder="제목을 입력하세요."
              className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400
                         dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
            />
          </label>

          {/* 소속 */}
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">소속</span>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              type="text"
              placeholder="소속을 입력하세요."
              className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400
                         dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
            />
          </label>

          {/* 작업자 */}
          <label className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">작업자</span>
            <input
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              type="text"
              placeholder="작업자를 입력하세요."
              className="h-8 w-56 rounded border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400
                         dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
            />
          </label>

          {/* 방문일 ~ 방문일 */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-600 whitespace-nowrap dark:text-[#E0E0E0]">방문일</span>

            {/* 시작일 */}
            <div className="relative">
              <DatePicker
                selected={visitStart}
                onChange={(d) => { setVisitStart(d); setOpenStart(false); }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                placeholderText="시작일"
                className="h-8 w-40 rounded border border-gray-300 bg-white pr-8 pl-3 text-sm
                           dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
                maxDate={visitEnd || undefined}
                open={openStart}
                onCalendarOpen={() => { setOpenStart(true); setOpenEnd(false); }}
                onClickOutside={() => setOpenStart(false)}
                onInputClick={() => { setOpenStart(true); setOpenEnd(false); }}
                shouldCloseOnSelect
                preventOpenOnFocus
              />
              <img
                src={calendar}
                alt="달력 열기"
                className="w-[28px] absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => { setOpenStart(true); setOpenEnd(false); }}
              />
            </div>

            <span className="text-gray-500 dark:text-[#E0E0E0]">~</span>

            {/* 종료일 */}
            <div className="relative">
              <DatePicker
                selected={visitEnd}
                onChange={(d) => { setVisitEnd(d); setOpenEnd(false); }}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                placeholderText="종료일"
                className="h-8 w-40 rounded border border-gray-300 bg-white pr-8 pl-3 text-sm
                           dark:bg-[#0D0D0D] dark:border-none dark:outline-none dark:text-[#E0E0E0]"
                minDate={visitStart || undefined}
                open={openEnd}
                onCalendarOpen={() => { setOpenEnd(true); setOpenStart(false); }}
                onClickOutside={() => setOpenEnd(false)}
                onInputClick={() => { setOpenEnd(true); setOpenStart(false); }}
                shouldCloseOnSelect
                preventOpenOnFocus
              />
              <img
                src={calendar}
                alt="달력 열기"
                className="w-[28px] absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => { setOpenEnd(true); setOpenStart(false); }}
              />
            </div>
          </div>

          {/* 구분선 + 검색 버튼 */}
          <div className="ml-[12px] mr-2 h-8 w-px bg-gray-300 dark:bg-[#141414]" />

          <button
            type="submit"
            disabled={loading}
            className="h-8 rounded bg-[#4F73C8] ml-[10px] px-4 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60 select-none
                       dark:bg-[#647DB7] dark:text-[#EBECEF]"
          >
            {loading ? '검색 중…' : '검색'}
          </button>
        </div>
      </form>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white dark:bg-[#141414] dark:border-none">
        <table className="w-full text-sm text-center text-gray-700 dark:text-[#E0E0E0]">
          <thead className="bg-[#EBECEF] text-xs font-medium text-gray-600 uppercase dark:bg-[#3F3F3F] dark:text-[#E0E0E0]">
            <tr>
              <th className="px-4 py-3">제목</th>
              <th className="px-4 py-3">접수일</th>
              <th className="px-4 py-3">방문일</th>
              <th className="px-4 py-3">소속</th>
              <th className="px-4 py-3">작업자</th>
              <th className="px-4 py-3">작업내용</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">로딩 중…</td>
              </tr>
            ) : pageItems.length > 0 ? (
              pageItems.map((w, i) => (
                <tr
                  key={i}
                  className="border-b transition-colors text-[#716E6E] even:bg-[#F5F5F5]
                             dark:even:bg-[#303030] dark:text-[#E0E0E0] dark:border-[#2C2C2C]"
                >
                  <td className="px-4 py-3">{w.title ?? '-'}</td>
                  <td className="px-4 py-3">{w.service_request_date ?? '-'}</td>
                  <td className="px-4 py-3">{w.visit_date ?? '-'}</td>
                  <td className="px-4 py-3">{w.department ?? '-'}</td>
                  <td className="px-4 py-3">{w.worker_name ?? '-'}</td>
                  <td className="px-4 py-3" title={w.work_detail || ''}>
                    {truncate(w.work_detail, 50)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 ml-2 hover:bg-gray-100
                                 h-[24px] leading-[18px]
                                 dark:bg-[#696C72] dark:border-none dark:text-[#E0E0E0]"
                      onClick={() => {
                        setSelectedRow(w)
                        setShowWorkLogDeatail(true)
                      }}
                    >
                      상세 정보
                    </button>
                  </td>
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
              <span className="px-2 text-gray-500 dark:text-[#E0E0E0]">…</span>
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
                  : 'border-gray-300 bg-white hover:bg-gray-100')
              }
            >
              {p}
            </button>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              <span className="px-2 text-gray-500 dark:text-[#E0E0E0]">…</span>
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

      {showWorkLogDeatail && (
        <WorkLogDeatil
          logInfo={selectedRow}
          onClose={() => { setShowWorkLogDeatail(false); setSelectedRow(null) }}
          onSaved={async () => {
            setPage(1)
            await fetchWorkLog({ title: '', department: '', workerName: '', visitDateStart: '', visitDateEnd: '' })
          }}
        />
      )}

      {showWorkLogInstall && (
        <WorkLogInstall
          onClose={() => { setShowWorkLogInstall(false); }}
          onSaved={async () => {
            setPage(1)
            await fetchWorkLog({ title: '', department: '', workerName: '', visitDateStart: '', visitDateEnd: '' })
          }}
        />
      )}
    </div>
  )
}
