import { useEffect, useState } from 'react'
import CloseButton from '@/components/ui/CloseButton'
import calendar from '@/assets/styles/images/calendar.png'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ko } from 'date-fns/locale'
import { apiModifyInstallHistory, apiGetInstallHistory } from '@/services/DeviceManagerService'
import { AlertDialog } from '@/components/shared/AlertDialog';

type InstallHistoryProps = { onClose?: () => void }

export default function InstallHistory({ onClose }: InstallHistoryProps) {
  const [fieldManagerName, setFieldManagerName] = useState<string>('')       // 현장 담당자
  const [completionDate, setCompletionDate] = useState<Date | null>(null)    // 현장 준공일
  const [relatedCompanies, setRelatedCompanies] = useState<string>('')       // 연관 업체

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<"blue"|"red">('blue');

  // 안전한 날짜 파서 (yyyy-MM-dd 또는 ISO 모두 허용)
  const parseYYYYMMDD = (s?: string | null): Date | null => {
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

  const formatDateYYYYMMDD = (d: Date | null) => {
    if (!d) return '' // 비어 있어도 그대로 보냄
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // 공통: 서버에서 불러와 상태 세팅 (조용히)
  const fetchInstallHistory = async () => {
    try {
      const res = await apiGetInstallHistory()
      const data: any = (res as any)?.result || {}

      // ✅ snake_case → state 매핑
      setFieldManagerName(data.field_manager_name ?? '')
      setCompletionDate(parseYYYYMMDD(data.completion_date))
      setRelatedCompanies(data.related_companies ?? '')
    } catch (e) {
      console.error('apiGetInstallHistory error:', e)
    }
  }

  useEffect(() => {
    fetchInstallHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    try {
      await apiModifyInstallHistory({
        fieldManagerName,
        completionDate: formatDateYYYYMMDD(completionDate),
        relatedCompanies,
      })
      // 저장 후 서버 값으로 다시 동기화 (조용히 재조회)
      await fetchInstallHistory();
      setStatus('blue');
      setMessage('현장 정보가 저장되었습니다.');
      setIsAlertOpen(true);

    } catch (e) {
      setStatus('red');
      setMessage('현장 정보 저장에 실패하였습니다.');
      setIsAlertOpen(true);
      console.error('apiModifyInstallHistory error:', e)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        status={status}
        onClose={() => setIsAlertOpen(false)}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[580px] h-[365px] shadow-xl text-gray-800 relative z-[99999] ">
        <CloseButton absolute className="ltr:right-4 rtl:left-6 top-3" onClick={onClose} />
        <h2 className="text-[17px] font-bold border-b-2 pb-1 dark:text-[#E0E0E0] dark:border-[#3F3F3F]">현장 정보</h2>

        <ul className="w-full h-auto">
          {/* 현장 담당자 */}
          <li className="w-full h-[34px] flex mt-[20px]">
            <div className="w-[19%] h-full leading-[34px] text-[#716E6E] text-[15px] text-right font-semibold dark:text-[#E0E0E0] ">
              현장 담당자
            </div>
            <div className="w-[81%] h-full pl-4">
              <input
                type="text"
                value={fieldManagerName}
                onChange={(e) => setFieldManagerName(e.target.value)}
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F5F5F5] pl-2 dark:bg-[#565962] dark:text-[#EBECEF] dark:border-none"
              />
            </div>
          </li>

          {/* 현장 준공일 */}
          <li className="w-full h-[34px] flex mt-2">
            <div className="w-[19%] h-full leading-[34px] text-[#716E6E] text-[15px] text-right font-semibold dark:text-[#E0E0E0]">
              현장 준공일
            </div>
            <div className="w-[81%] h-full pl-4 flex gap-[21px] items-center relative">
              <DatePicker
                selected={completionDate}
                onChange={(date) => setCompletionDate(date)}
                locale={ko}
                dateFormat="yyyy-MM-dd"
                className="w-[400px] h-[34px] outline-none border border-[#E3E6EB] bg-[#F5F5F5] pl-2 dark:bg-[#565962] dark:text-[#EBECEF] dark:border-none"
                placeholderText="날짜를 선택하세요"
              />
              <img
                src={calendar}
                className="w-[28px] absolute right-[20px]"
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLElement
                  input?.focus()
                }}
                alt="달력 열기"
              />
            </div>
          </li>

          {/* 연관 업체 */}
          <li className="w-full h-[114px] flex mt-2">
            <div className="w-[19%] h-full leading-[34px] text-[#716E6E] text-[15px] text-right font-semibold dark:text-[#E0E0E0]">
              연관 업체
            </div>
            <div className="w-[81%] h-full pl-4">
              <textarea
                value={relatedCompanies}
                onChange={(e) => setRelatedCompanies(e.target.value)}
                className="w-[400px] h-full resize-none outline-none border border-[#E3E6EB] bg-[#F5F5F5] pl-2 py-1  dark:bg-[#565962] dark:text-[#EBECEF] dark:border-none"
              />
            </div>
          </li>
        </ul>

        {/* 버튼 영역 */}
        <div className="w-full h-[60px] mt-[20px] border-t-2 flex gap-2 justify-end items-center dark:border-[#3F3F3F] ">
          <div className="bg-[#EDF0F6] border border-[#D9DCE3] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#696C72] cursor-pointer
           dark:border-none dark:bg-[#696C72] dark:text-[#EBECEF]" 
          onClick={onClose}>
            닫기
          </div>
          <div className="bg-[#17A36F] border border-[#BEC8BA] w-[122px] h-[34px] text-center leading-[34px] text-[17px] text-[#ECECEC] cursor-pointer
          dark:border-none" 
          onClick={handleSave}>
            저장
          </div>
        </div>
      </div>
    </div>
  )
}
