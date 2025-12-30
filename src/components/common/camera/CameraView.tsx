// @ts-ignore: 타입 정의 파일이 없음
import JSMpeg from 'jsmpeg-player';
import { useRef, useState, useEffect, useMemo } from 'react'
import loadingImage from '@/assets/styles/images/loading.gif';
import StreamingFail from '@/components/common/camera/StreamingFail';
import useResponsive from '@/utils/hooks/useResponsive';
import { CameraInfo } from '@/types/camera'

type Props = {
  cameraInfo: CameraInfo;
}

export default function CameraView({ cameraInfo }: Props) {
  const prevCameraIdRef = useRef<string | null>(null);            // 이전에 연결한 cameraId 저장용
  const canvasRef = useRef<HTMLCanvasElement | null>(null) as {   // canvas 요소 참조
    current: HTMLCanvasElement | null
  };
  const playerRef = useRef<JSMpeg.Player | null>(null);           // JSMpeg 플레이어 인스턴스
  const controlSocketRef = useRef<WebSocket | null>(null);        // WebSocket 인스턴스 참조
  const [isReady, setIsReady] = useState(false);                  // 스트리밍 준비 완료 여부
  const [connectionDelay, setConnectionDelay] = useState(false);  // 연결 지연 여부
  const hasConnectedRef = useRef(false);                          // StrictMode에서 중복 연결 방지를 위한 ref
  const serverIP = window.location.hostname;                      // 현재 실행 중인 서버의 IP 자동 감지
  const socketURL = `ws://${serverIP}:4200`;                      // WebSocket 주소 동적 생
  const [failMsg, setFailMsg] = useState('');                     // 연결 실패 메시지
  const responsive = useResponsive();
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(prev => !prev);
    }, 750);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cameraInfo || !cameraInfo.cameraId) return;
    // 동일 카메라라면 다시 연결 안 함
    if (prevCameraIdRef.current === cameraInfo.cameraId && hasConnectedRef.current) return;
    prevCameraIdRef.current = cameraInfo.cameraId;

    let isCancelled = false;

    setIsReady(false);
    setConnectionDelay(false);
    setFailMsg('');
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 성능 최적화를 위한 2D context 설정
    canvas.getContext('2d', { willReadFrequently: true });

    const controlSocket = new WebSocket(`${socketURL}/control`);
    hasConnectedRef.current = true;
    controlSocketRef.current = controlSocket;

    // 소켓 연결이 성공되면 서버에 스트리밍 요청 전송
    controlSocket.onopen = () => {
      // 소켓 연결이 완료되었더라도 바로 닫고 요청을 보내지 않음
      if (isCancelled) {
        try {
          controlSocket.close();
        } catch (err) {
          console.warn('WebSocket close 에러:', err);
        }
        return;
      }

      try {
        controlSocket.send(JSON.stringify({
          type: 'start',
          ...cameraInfo
        }));
      } catch (err) {
        console.warn('WebSocket send 에러:', err);
      }
    };

    // 서버로부터 메시지를 받을 경우
    controlSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 에러 수신 시 연결 지연 처리
        if (data.type === 'error' && data.cameraId === cameraInfo.cameraId) {
          setIsReady(true);
          setConnectionDelay(true);
          setFailMsg(data.message);
          return;
        }


        // 스트리밍 준비 완료 수신 시 JSMpeg 플레이어 생성
        if (data.type === 'ready' && data.cameraId === cameraInfo.cameraId) {
          let streamUrl;
          if (cameraInfo.startDateTime) {
            streamUrl = `${socketURL}/stream/${cameraInfo.cameraId}?vms=${cameraInfo.vms_name}&mainServiceName=${cameraInfo.main_service_name}&streamType=${cameraInfo.streamType}&startDateTime=${cameraInfo.startDateTime}`;
          } else {
            streamUrl = `${socketURL}/stream/${cameraInfo.cameraId}?vms=${cameraInfo.vms_name}&mainServiceName=${cameraInfo.main_service_name}&streamType=${cameraInfo.streamType}&accessPoint=${cameraInfo.access_point}&cameraIp=${cameraInfo.camera_ip}`;
          }

          try {
            const player = new JSMpeg.Player(streamUrl, {
              canvas: canvas,
              autoplay: true,
              loop: false,
              audio: false,
              disableWebGL: false,
              decodeFirstFrame: false,
              preserveDrawingBuffer: true,
              disableGl: true,
              videoBufferSize: 512 * 1024,
              progressive: false,
            });
            playerRef.current = player;
            setIsReady(true);
          } catch (err) {
            console.error("Player 생성 실패:", err);
            setIsReady(false);
          }
        }
      } catch (err) {
        console.warn('JSON 파싱 오류:', err);
        setIsReady(false);
      }
    };

    // 연결 실패 시 상태 업데이트
    controlSocket.onerror = () => {
      setIsReady(false);
    };

    // 연결 해제 및 정리 함수
    const cleanup = () => {
      if (controlSocketRef.current) {
        const sock = controlSocketRef.current;

        try {
          // 연결 중일 경우 open 이후 안전하게 close
          if (sock.readyState === WebSocket.CONNECTING) {
            sock.addEventListener('open', () => {
              try {
                sock.close();
              } catch (err) {
                console.warn('WebSocket close 에러:', err);
              }
            });
          } else if (sock.readyState === WebSocket.OPEN) {
            sock.close();
          }
        } catch (err) {
          console.warn('WebSocket 정리 중 에러:', err);
        }
        controlSocketRef.current = null;
      }

      // JSMpeg 플레이어 해제
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.warn('JSMpeg 플레이어 정리 중 에러:', err);
        }
        playerRef.current = null;
      }

      setIsReady(false);
      setConnectionDelay(false);
      setFailMsg('');

      // 연결 상태 초기화
      hasConnectedRef.current = false;
    };

    // 언마운트 또는 cameraId 변경 시 cleanup
    return () => {
      isCancelled = true;
      cleanup();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraInfo]);

  const fullScreen = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const isCanvasFullscreen = document.fullscreenElement === canvas;

    if (isCanvasFullscreen) {
      document.exitFullscreen();
    } else {
      if ('webkitRequestFullscreen' in canvas) {
        (canvas as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      }
    }
  }

  const containerWidthClass = useMemo(() => {
    if (cameraInfo.main_service_name === 'inundation') {
      const { windowHeight } = responsive;

      if (windowHeight < 500) return 'w-[400px]';
      if (windowHeight < 800) return 'w-[600px]';
      if (windowHeight >= 1000) return 'w-[800px]';

      return 'w-[600px]';
    }

    return 'w-full';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsive.windowHeight, cameraInfo.main_service_name]);

  const inundationCheck = cameraInfo.main_service_name === 'inundation';

  return (
    <div className={`${containerWidthClass} h-full border border-gray-400 shadow rounded overflow-hidden relative`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onDoubleClick={fullScreen}
      />

      {connectionDelay && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50 ${inundationCheck ? 'z-20' : 'z-30'}`}>
          <StreamingFail message={failMsg || '스트리밍 요청 시간이 초과 했습니다.'} />
        </div>
      )}

      {!isReady && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50 ${inundationCheck ? 'z-20' : 'z-30'}`}>

          {cameraInfo.main_service_name === 'inundation' ?
            <p
              className={`bg-[#17A36F] rounded text-center text-xl transition-opacity duration-300 text-white ${isVisible ? 'opacity-100' : 'opacity-60'}`}
              style={{ width: `${(cameraInfo?.area_name?.length || 0) * 10 + 60}px` }}
            >
              {cameraInfo?.area_name}
            </p>
            :
            <img src={loadingImage} alt="loading" />}
        </div>
      )}
    </div>
  );
}