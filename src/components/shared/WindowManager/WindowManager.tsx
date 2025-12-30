import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface WindowManagerProps {
    children: React.ReactNode;
}

const WindowManager = ({ children }: WindowManagerProps) => {
    const location = useLocation();
    const isDashboard = location.pathname.includes('/dashboard');

    useEffect(() => {
        // 브로드캐스트 채널 설정
        const bc = new BroadcastChannel('observer-pro-sync');

        // 현재 창의 상태 변경 감지 및 동기화
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                bc.postMessage({
                    type: 'window-focus',
                    path: location.pathname,
                    timestamp: Date.now()
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 다른 창에서의 메시지 수신
        bc.onmessage = (event) => {
            const { type, path } = event.data;
            if (type === 'window-focus' && isDashboard) {
                // 상태 업데이트 로직 적용 필요 (ex. 이벤트 처리)
            }
        };

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            bc.close();
        };
    }, [location.pathname, isDashboard]);

    return <>{children}</>;
};

export default WindowManager;
