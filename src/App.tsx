import { BrowserRouter } from 'react-router-dom'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import { AuthProvider } from '@/auth'
import { SocketProvider } from '@/components/providers/socket/SocketProvider';
import Views from '@/views'
import appConfig from './configs/app.config'
import './locales'
import SWRConfigContext from './context/SWRConfigContext';
import WindowManager from '@/components/shared/WindowManager/WindowManager';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { useDeviceStore } from '@/store/common/useDeviceStore';
import { useEffect } from 'react'

if (appConfig.enableMock) {
    import('./mock')
}

function App() {
    const { setFullscreen } = useFullScreenStore();

    useEffect(() => {
        const fullscreenChange = (event: Event) => {
            const isFull = !!document.fullscreenElement;
            if (event.target instanceof HTMLImageElement) {
                return
            }
            setFullscreen(isFull);
        };

        const keyDown = (event: KeyboardEvent) => {
            if (event.code === "F11") {
                event.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
            }
        };

        window.addEventListener("keydown", keyDown);
        document.addEventListener("fullscreenchange", fullscreenChange);

        return () => {
            window.removeEventListener("keydown", keyDown);
            document.removeEventListener("fullscreenchange", fullscreenChange);
        };

    }, [setFullscreen]);

    useEffect(() => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        useDeviceStore.getState().setIsMobile(isMobile);
    }, [])
    
    return (
        <Theme>
            <BrowserRouter>
                <AuthProvider>
                    <SocketProvider>
                        <SWRConfigContext>
                            <WindowManager>
                                <Layout>
                                    <Views />
                                </Layout>
                            </WindowManager>
                        </SWRConfigContext>
                    </SocketProvider>
                </AuthProvider>
            </BrowserRouter>
        </Theme>
    )
}

export default App
