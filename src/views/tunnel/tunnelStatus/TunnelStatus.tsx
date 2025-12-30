import { useEffect, useState } from 'react';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { apiTunnelUnLinkBarrierList } from '@/services/TunnelService';

type TunnelStatusData = {
    connected: string;
    disconnected: string;
}

const tunnelTypes = [
    { key: 'connected', label: '정상', color: 'text-blue-500' },
    { key: 'disconnected', label: '연결 끊김', color: 'text-red-400' },
];

const defaultTunnelStatus: TunnelStatusData = {
    connected: '0',
    disconnected: '0',
};

export default function TunnelStatus() {
    const { socketService } = useSocketConnection();
    const [status, setStatus] = useState<TunnelStatusData>(defaultTunnelStatus);

    useEffect(() => {
        getStatusData();
    }, []);

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const tunnelSocket = socketService.subscribe('tm_areaList-update', (received) => {
            if (received) {
                getStatusData()
            }
        })

        const waterLevelSocket = socketService.subscribe('tm_waterLevel-update', (received) => {
            if (received) {
                getStatusData()
            }
        })
       

        return () => {
            tunnelSocket();
            waterLevelSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    const getStatusData = async () => {
        try {
            const res = await apiTunnelUnLinkBarrierList<TunnelStatusData>();

            if (!res || !res.result || res.result.length === 0) {
                setStatus(defaultTunnelStatus);
                return;
            }
          
            setStatus(res.result[0]);
        } catch (error) {
            console.error('터널관리 전체 현황 API 에러: ', error);
            return;
        }
    };

    return (
        <div className={`flex items-center gap-4 p-2 rounded bg-[#ebecef] dark:bg-[#404040]`}>
            <span className={`font-bold text-black ml-2 dark:text-[#FFFFFF]`}>
                현황
            </span>
            <div className="flex gap-2">

                {tunnelTypes.map((type) => (
                    <div
                        key={type.key}
                        className={`text-center py-1 font-semibold rounded w-[5vw] bg-white dark:bg-[#737373] dark:text-[#FFFFFF]`}
                    >
                        <span className={type.color}>{type.label}</span>
                        <span className="ml-3 text-black-500">{status[type.key as keyof TunnelStatusData]}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
