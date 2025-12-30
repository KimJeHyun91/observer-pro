import { useEffect, useMemo, useState } from 'react'
import UserPopUp from './UserPopUp'
import device_manager_alarm from '@/assets/styles/images/device_manager_alarm.png'

type UserAlarmPopUpProps = {
  onClose?: () => void
  alarmList: any
}



export default function UserAlarmPopUp({ onClose, alarmList }: UserAlarmPopUpProps) {

  const [selectTab, setSelectTab] = useState<"alarm" | "list">("alarm");


  useEffect(() => {
    setPopUpSize();
  }, [alarmList])

  const setPopUpSize = () => {
    if (!Array.isArray(alarmList)) return 730
    if (alarmList.length === 2) return 542
    if (alarmList.length === 3) return 658
    return 730
  }

  return (
    <>
      {/* 542 */}
      {/* 658 */}
      {/* 730 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] cursor-default">
        {selectTab == 'alarm' && (
          <div
            className={`bg-white dark:bg-gray-800 rounded-xl px-6 pb-3 w-[596px] shadow-xl text-gray-800 relative z-[99999]`}
            style={{ height: `${setPopUpSize()}px` }} 
          >
            {/* 알림 */}
            <div className='px-1 h-[70px] relative  mt-[57px] '>
              <img src={device_manager_alarm} className=' absolute left-[20px]' />
              <div className='text-[27px] font-semibold text-[#4E4A4A] text-center dark:text-[#E0E0E0]'>
                유지보수 기간 만료 안내
              </div>
              <div className='text-[18px] text-[#616A79] text-center pl-4 dark:text-[#F5F5F5]'>
                유지보수 기간이{' '}
                {(() => {
                  const lm = alarmList?.[alarmList.length - 1]?.lastMessage?.trim()
                  return (
                    <>
                      <a className='text-[20px] font-semibold'>{lm ?? '-'}</a>
                      {(lm === '1일' || lm === '7일') && (
                        <span className='text-[18px] font-normal'> 남은</span>
                      )}
                    </>
                  )
                })()}
                {' '}제품이 {[alarmList.length - 1]}개 있습니다.
              </div>
            </div>

            {/* 상세페이지 이동 */}
            <div className='w-full text-right text-[#D76767] text-[17px] mt-[24px] mb-[14px] pr-[11px] '>
              <span className='cursor-pointer'
                onClick={() => {
                  setSelectTab("list");
                }}
              >
                장치 관리 페이지 바로 가기 →
              </span>
            </div>

            {/* contents */}
            {Array.isArray(alarmList) && alarmList.length === 2 ? (
              // ✅ 2개일 때: 주석에 있던 레이아웃 사용 (마지막 요소 제외 → 1개만 표시)
              <div className='w-[532px] h-[262px] absolute left-1/2 -translate-x-1/2 '>
                {alarmList.slice(0, -1).slice(0, 1).map((d: any, i: number) => (
                  <ul key={i} className='w-full h-[262px] bg-[#F2F5F9] flex flex-col gap-2 justify-center dark:bg-[#3F3F3F] '>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>제품명</span>
                      <span
                        className='block w-[352px] h-[34px] border border-[#E3E6EB] bg-white leading-[33px] pl-[10px] 
                        dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'
                        title={typeof d?.device_name === 'string' ? d.device_name : '-'}
                      >
                        {typeof d?.device_name === 'string'
                          ? (d.device_name.length > 30 ? d.device_name.slice(0, 30) + '..' : d.device_name)
                          : '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>서비스 종류</span>
                      <span className='block w-[352px] h-[34px] border border-[#E3E6EB] bg-white leading-[33px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.service_type ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>제품 종류</span>
                      <span className='block w-[352px] h-[34px] border border-[#E3E6EB] bg-white leading-[33px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.device_type ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>설치일</span>
                      <span className='block w-[352px] h-[34px] border border-[#E3E6EB] bg-white leading-[33px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.installation_date ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>유지보수 만료일</span>
                      <span className='block w-[352px] h-[34px] border border-[#E3E6EB] bg-white leading-[33px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.maintenance_end_date ?? '-'}
                      </span>
                    </li>
                  </ul>
                ))}
              </div>
            ) : (
              // ✅ 3개 이상 또는 그 외: 스크롤 리스트 (마지막 요소 제외)
              <div className='w-[542px] h-[440px] overflow-y-auto scroll-container'>
                {(Array.isArray(alarmList) ? alarmList.slice(0, -1) : []).map((d: any, i: number) => (
                  <ul key={i} className='w-full h-[182px] bg-[#F2F5F9] flex flex-col gap-2 justify-center mb-2 dark:bg-[#3F3F3F]'>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>제품명</span>
                      <span
                        className='block w-[352px] h-[26px] border border-[#E3E6EB] bg-white leading-[25px] pl-[10px]
                        dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'
                        title={typeof d?.device_name === 'string' ? d.device_name : '-'}
                      >
                        {typeof d?.device_name === 'string'
                          ? (d.device_name.length > 30 ? d.device_name.slice(0, 30) + '..' : d.device_name)
                          : '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>서비스 종류</span>
                      <span className='block w-[352px] h-[26px] border border-[#E3E6EB] bg-white leading-[25px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.service_type ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>제품 종류</span>
                      <span className='block w-[352px] h-[26px] border border-[#E3E6EB] bg-white leading-[25px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.device_type ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>설치일</span>
                      <span className='block w-[352px] h-[26px] border border-[#E3E6EB] bg-white leading-[25px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.installation_date ?? '-'}
                      </span>
                    </li>
                    <li className='flex items-center justify-center'>
                      <span className='block w-[120px] text-[#716E6E] text-[14px] font-semibold text-right pr-[15px] dark:text-[#BEBEBE]'>유지보수 만료일</span>
                      <span className='block w-[352px] h-[26px] border border-[#E3E6EB] bg-white leading-[25px] pl-[10px]
                      dark:bg-[#141414] dark:text-[#BEBEBE] dark:border-none'>
                        {d?.maintenance_end_date ?? '-'}
                      </span>
                    </li>
                  </ul>
                ))}
              </div>
            )}


            {/* 버튼 */}
            <div className='w-[120px] h-[34px] bg-[#EBEBEB] text-[#616A79] text-center rounded-sm leading-[34px]  left-1/2 -translate-x-1/2 absolute bottom-[30px] cursor-pointer
            dark:bg-[#696C72] dark:text-[#EBECEF]'
              onClick={onClose}
            >확인
            </div>
          </div>
        )}

        {selectTab == 'list' && (
          <UserPopUp
            onClose={onClose}
            sortColum='remainingDays'
          />
        )}

      </div>
    </>
  )
}
