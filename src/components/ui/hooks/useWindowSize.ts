import { useState, useEffect } from 'react'

export default function useWindowSize() {
    const [windowSize, setWindowSize] = useState<{
        width?: number;
        height?: number;
        isFullScreen: boolean;
    }>({
        width: undefined,
        height: undefined,
        isFullScreen: false,
    });

    useEffect(() => {
        function handleResize() {
            const isFullScreen = document.fullscreenElement !== null || 
                               (document as any).webkitFullscreenElement !== null ||
                               (document as any).mozFullScreenElement !== null ||
                               (document as any).msFullscreenElement !== null;

            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
                isFullScreen,
            });
        }

        window.addEventListener('resize', handleResize);
        document.addEventListener('fullscreenchange', handleResize);
        document.addEventListener('webkitfullscreenchange', handleResize);
        document.addEventListener('mozfullscreenchange', handleResize);
        document.addEventListener('MSFullscreenChange', handleResize);

        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('fullscreenchange', handleResize);
            document.removeEventListener('webkitfullscreenchange', handleResize);
            document.removeEventListener('mozfullscreenchange', handleResize);
            document.removeEventListener('MSFullscreenChange', handleResize);
        }
    }, []);

    return windowSize;
}
// import { useState, useEffect } from 'react'

// export default function useWindowSize() {
//     const [windowSize, setWindowSize] = useState<{
//         width?: number
//         height?: number
//     }>({
//         width: undefined,
//         height: undefined,
//     })
//     useEffect(() => {
//         function handleResize() {
//             setWindowSize({
//                 width: window.innerWidth,
//                 height: window.innerHeight,
//             })
//         }
//         window.addEventListener('resize', handleResize)
//         handleResize()
//         return () => window.removeEventListener('resize', handleResize)
//     }, [])

//     return windowSize
// }
