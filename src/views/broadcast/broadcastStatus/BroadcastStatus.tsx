import { SpeakerStatus } from '@/@types/broadcast'
import { apiSpeakerStatus } from '@/services/BroadcastService'
import { useThemeStore } from '@/store/themeStore'
import { useBroadcastArea } from '@/utils/hooks/useBroadcast'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import React, { useEffect, useState } from 'react'



const BroadcastStatus = () => {
    const mode = useThemeStore((state) => state.mode)
    const { socketService } = useSocketConnection()

    const { areaList, mutate } = useBroadcastArea()
    const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>({
        on_count: '',
        off_count: '',
        disconnected: '',
        });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
            const res = await apiSpeakerStatus();
            if (res.result[0]) {
                setSpeakerStatus(res.result[0]);
                mutate();
            }
            } catch (error) {
            console.error("Failed to fetch speaker status:", error);
            }
        };
    
        fetchStatus();
    
        if (!socketService) return;
    
        const speakerSocket = socketService.subscribe("vb_speaker-update", (received) => {
            if (received) {
            mutate();
            }
        });
    
        return () => {
            speakerSocket();
        };
        }, [areaList, socketService]);
     
    return (
        <div
            className={`flex items-center gap-4 p-2 rounded
        ${mode === 'light' ? 'bg-[#ebecef]' : 'bg-gray-800 text-white'}`}
        >
            <span
                className={`min-w-[120px] font-bold ${mode === 'light' ? 'text-black' : 'text-white'}`}
            >
                스피커 연결 상태
            </span>
            <div className="flex gap-2">
                <div
                    className={`px-3 py-1 font-semibold rounded w-[7vw] min-w-[130px]
                ${
                    mode === 'light'
                        ? 'bg-white text-green-500'
                        : 'bg-gray-600 text-green-300'
                }`}
                >
                    활성화
                    <span
                        className={`ml-5  ${
                            mode === 'light'
                                ? 'bg-white text-gray-500'
                                : 'bg-gray-600 text-gray-300'
                        } `}
                    >
                        {speakerStatus?.on_count}
                    </span>
                </div>

                <div
                    className={`px-3 py-1 font-semibold rounded w-[7vw] min-w-[130px]
                ${
                    mode === 'light'
                        ? 'bg-white text-red-500'
                        : 'bg-gray-600 text-red-300'
                }`}
                >
                    연결끊김
                    <span
                        className={`ml-5  ${
                            mode === 'light'
                                ? 'bg-white text-gray-500'
                                : 'bg-gray-600 text-gray-300'
                        } `}
                    >
                           {speakerStatus?.off_count}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default BroadcastStatus
