import { apiControlBarrier } from '@/services/TunnelService'
import { AlertDialog } from '@/components/shared/AlertDialog';
import CheckBarrierControl from '@/views/tunnel/modals/CheckBarrierControl'
import React, { useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

// ajy 수정
// const controlOptions = [
//   { label: '상승', color: 'bg-blue-600', hover: 'hover:bg-blue-700', action: '상승' },
//   { label: '정지', color: 'bg-gray-600', hover: 'hover:bg-gray-700', action: '정지' },
//   { label: '하강', color: 'bg-red-600', hover: 'hover:bg-red-700', action: '하강' },
// ]
const controlOptions = [
  { label: '해제', color: 'bg-blue-600', hover: 'hover:bg-blue-700', action: '해제' },
  { label: '정지', color: 'bg-gray-600', hover: 'hover:bg-gray-700', action: '정지' },
  { label: '작동', color: 'bg-red-600', hover: 'hover:bg-red-700', action: '작동' },
]

type Props = {
  barrierIp: string
  location: string
  crossinggateData: boolean
}

const TunnelBarrierControl = ({ barrierIp, location, crossinggateData }: Props) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'blue' | 'red' | undefined>('blue')
  const [isCheckOpen, setIsCheckOpen] = useState(!!crossinggateData);

  // 디테일 페이지에서 차단막 자동제어 팝업창 띄우는작업 임시 삭제
  const { socketService } = useSocketConnection();
    useEffect(() => {

      const tunnelEventSocket = socketService.subscribe('tm_event-update', (received) => {
        if(received.device_type==='crossinggate' && received.outside_ip === barrierIp){
         setIsCheckOpen(true);
        }
      })
      return () => {
        tunnelEventSocket();
      }
  
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

  useEffect(() => {
    setIsCheckOpen(!!crossinggateData)
  }, [crossinggateData])


  const handleControlConfirm = async () => {
    if (!confirmAction) return
    // setSelectedAction(confirmAction)
    console.log(confirmAction, barrierIp)
    try {
      setLoading(true);
      const res = await apiControlBarrier({ ip: barrierIp, action: confirmAction })

      if (res?.status) {
        setMessage(`${confirmAction} 제어를 성공하였습니다.`);
        setStatus('blue');
      } else {
        setMessage(`차단막과의 연결이 끊겼습니다.`);
        setStatus('red');
      }
      setIsAlertOpen(true);
    } catch (err: any) {
      alert(`${confirmAction} 제어 실패: ${err.message}`)
    } finally {
      setSelectedAction(null)
      setConfirmAction(null)
      setLoading(false);
    }
  }

  return (
    <>

      {loading && (
        <div className='fixed left-[50%] top-[45%]'>
          <Spinner size={50} />
        </div>
      )}
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
        status={status}
      />
      <div className="flex justify-between items-center bg-[#f5f5f5] dark:bg-gray-700 border dark:border-gray-600 rounded shadow p-4">
        <div>
          <h4 className="font-bold mb-2 text-xl text-gray-900 dark:text-white">터널 차단막</h4>
          <p className="text-xs text-gray-700 dark:text-gray-300">{barrierIp}</p>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{location}</div>
        </div>

        <div className="flex gap-3">
          {controlOptions.map((btn) => (
            <button
              key={btn.label}
              className={`w-[100px] h-[60px] ${btn.color} ${btn.hover} text-white rounded font-semibold text-sm`}
              onClick={() => setConfirmAction(btn.action)}
              disabled={selectedAction !== null}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[12vh]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-[500px] overflow-hidden">
            <div className="p-3 border-b dark:border-gray-600">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">차단막 제어</h4>
            </div>

            <h4 className="font-bold text-center text-lg mb-10 mt-10 dark:text-white">
              <span
                className={`${confirmAction === '해제'
                  ? 'text-blue-600'
                  : confirmAction === '정지'
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-red-500'
                  } text-xl`}
              >
                {confirmAction}
              </span>
              제어를 실행하시겠습니까?
            </h4>

            <div className="flex justify-center gap-4 border-t dark:border-gray-600 p-4">
              <button
                className="px-7 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded"
                onClick={() => setConfirmAction(null)}
              >
                취소
              </button>
              <button
                className="px-7 py-2 bg-[#17A36F] hover:bg-green-700 text-white rounded"
                onClick={handleControlConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <CheckBarrierControl open={isCheckOpen} onClose={() => setIsCheckOpen(false)} />

    </>

  )
}

export default TunnelBarrierControl
