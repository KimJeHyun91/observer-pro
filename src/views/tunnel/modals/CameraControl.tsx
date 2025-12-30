import { useCallback, useMemo, useRef, useEffect } from 'react'
import { apiCameraControl } from '@/services/TunnelService'
import arrowButton from '@/assets/styles/images/camera_control_button.png'

type SelectedCam = {
  main_service_name?: string
  vms_name?: string
  camera_id?: string | number
  camera_name?: string
  camera_ip?: string
}

type Props = {
  selectedCamera?: SelectedCam | null
  defaultMainServiceName?: string
  onClose?: () => void
  className?: string
}

export default function CameraControl({
  selectedCamera,
  defaultMainServiceName = 'tunnel',
  onClose,
  className = '',
}: Props) {
  const lastDirRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const camInfo = useMemo(() => {
    if (!selectedCamera) return null
    const mainServiceName = selectedCamera.main_service_name || defaultMainServiceName
    const vmsName = selectedCamera.vms_name || ''
    const cameraId = selectedCamera.camera_id
    const cameraIp = selectedCamera.camera_ip || ''
    if (cameraId == null) return null
    return { mainServiceName, vmsName, cameraId, cameraIp }
  }, [selectedCamera, defaultMainServiceName])

  const disabled = !camInfo

  const normalize = (action: string) => {
    switch (action) {
      case 'pan-left': return 'pan-left'
      case 'pan-right': return 'pan-right'
      case 'pan-up':
      case 'tilt-up': return 'pan-up'
      case 'pan-down':
      case 'tilt-down': return 'pan-down'
      case 'zoom-in': return 'zoom-in'
      case 'zoom-out': return 'zoom-out'
      case 'stop': return 'stop'
      default: return action
    }
  }

  const send = useCallback(
    async (direction: string, eventType: 'mousedown' | 'mouseup' | 'mouseleave') => {
      if (!camInfo) return
      try {
        await apiCameraControl({
          cameraId: camInfo.cameraId,
          direction,
          eventType,
          vmsName: camInfo.vmsName,
          mainServiceName: camInfo.mainServiceName,
          mode: 'continuous',
          // @ts-ignore
          cameraIp: camInfo.cameraIp || undefined,
        } as any)
      } catch (e) {
        console.error('apiCameraControl error:', e)
      }
    },
    [camInfo]
  )

  const PRESS_INTERVAL = 500
  const startKeepalive = (dir: string) => {
    stopKeepalive()
    intervalRef.current = setInterval(() => send(dir, 'mousedown'), PRESS_INTERVAL)
  }
  const stopKeepalive = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  const pressStart = async (action: string) => {
    if (disabled) return
    const direction = normalize(action)
    lastDirRef.current = direction
    await send(direction, 'mousedown')
    startKeepalive(direction)
  }
  const pressEnd = async (action: string) => {
    if (!camInfo) return
    stopKeepalive()
    lastDirRef.current = null
    await send(normalize(action), 'mouseup')
  }
  const handleLeave = async () => {
    stopKeepalive()
    if (lastDirRef.current && camInfo) {
      await send(lastDirRef.current, 'mouseleave')
      lastDirRef.current = null
    }
  }

  useEffect(() => () => stopKeepalive(), [])

  const bind = (action: string) => ({
    'data-action': action,
    onMouseDown: () => pressStart(action),
    onMouseUp: () => pressEnd(action),
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); pressStart(action) },
    onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); pressEnd(action) },
    disabled,
  })

  return (
    <div
      className={[
        'absolute left-[100%] top-[60px] z-10 select-none',
        'w-[160px] h-[201px] rounded-sm border bg-[#262626] shadow-xl',
        className,
      ].join(' ')}
      onMouseLeave={handleLeave}
    >
      {/* 헤더 */}
      <div className="h-8 px-2 flex items-center justify-between text-slate-100">
        <span className="text-[12px] font-medium mt-1">PTZ 제어</span>
        <button
          onClick={onClose}
          className="text-[18px] grid place-items-center rounded text-slate-300 mb-[4px]"
          aria-label="close"
        >
          ×
        </button>
      </div>

      {/* 본문 */}
      <div className="bg-[#404040] p-2 text-slate-100">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 place-items-center mb-2">
          <div />
          {/* ▲ 위쪽 */}
          <img
            src={arrowButton}
            alt="Up"
            className="w-8 h-8 cursor-pointer rotate-0 hover:opacity-80 active:opacity-60"
            {...bind('pan-up')}
            draggable={false}
          />
          <div />

          {/* ◀ 왼쪽 */}
          <img
            src={arrowButton}
            alt="Left"
            className="w-8 h-8 cursor-pointer -rotate-90 hover:opacity-80 active:opacity-60"
            {...bind('pan-left')}
            draggable={false}
          />

          {/* ● 가운데 (STOP) */}
          <div
            className="size-8 rounded-full bg-slate-500 hover:opacity-80 active:opacity-60  grid place-items-center cursor-pointer shadow"
            {...bind('stop')}
          >
            <span className="block size-3 rounded-full bg-slate-200" />
          </div>

          {/* ▶ 오른쪽 */}
          <img
            src={arrowButton}
            alt="Right"
            className="w-8 h-8 cursor-pointer rotate-90 hover:opacity-80 active:opacity-60"
            {...bind('pan-right')}
            draggable={false}
          />

          <div />
          {/* ▼ 아래쪽 */}
          <img
            src={arrowButton}
            alt="Down"
            className="w-8 h-8 cursor-pointer rotate-180 hover:opacity-80 active:opacity-60"
            {...bind('pan-down')}
            draggable={false}
          />
          <div />
        </div>

        {/* 줌 버튼 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            aria-label="Zoom In"
            className="h-8 rounded leading-7 bg-[#9EA4B6] shadow text-[18px] font-semibold text-white cursor-pointer  hover:opacity-80 active:opacity-60"
            {...bind('zoom-in')}
          >
            +
          </button>
          <button
            aria-label="Zoom Out"
            className="h-8 rounded leading-7 bg-[#9EA4B6]  shadow text-[18px] font-semibold text-white cursor-pointer hover:opacity-80 active:opacity-60"
            {...bind('zoom-out')}
          >
            –
          </button>
        </div>
      </div>
    </div>
  )
}
