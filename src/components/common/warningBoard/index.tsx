import { IoWarningOutline, IoSunny } from "react-icons/io5";
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useState } from 'react';
import { apiGetWarningBoard } from "@/services/CommonService";

type WarningBoardType = {
    event_name: string;
    location: string;
};

const WarningBoard = () => {
    const { socketService } = useSocketConnection();
    const [warningBoardData, setWarningBoardData] = useState<WarningBoardType | null>(null);
    const [currentDate, setCurrentDate] = useState<string>('');
    const [weather, setWeather] = useState('');

    useEffect(() => {
        getWarningBoardData();
        updateDateAndWeather();
    }, []);

    useEffect(() => {
        if (!socketService) {
            console.log('Socket service not available');
            return;
        }

        const warningBoardSocket = socketService.subscribe('cm_warningBoard-update', (received) => {
            if (!received) return;
            getWarningBoardData();
        });

        return () => {
            warningBoardSocket();
        };
    }, [socketService]);

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const warningBoardSocket = socketService.subscribe('cm_warningBoard-update', (received) => {
            if (!received) return;
            getWarningBoardData();
        });

        return () => {
            warningBoardSocket();
        };

    }, [socketService]);

    const getWarningBoardData = async () => {
        const res = await apiGetWarningBoard();

        if (!res || !res.result) {
            return
        }

        setWarningBoardData(res.result[0] as WarningBoardType);
    }

    const updateDateAndWeather = () => {
        const today = new Date();
        const formattedDate = today.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        setCurrentDate(formattedDate);

        const weatherOptions = [''];
        setWeather(weatherOptions[Math.floor(Math.random() * weatherOptions.length)]);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            updateDateAndWeather();
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const renderWeatherIcon = (weather: string) => {
        return <IoSunny size={24} className="text-yellow-500" />;
    };

    return (
        <>
            {warningBoardData ? (
                <>
                    <div className="flex items-center gap-1 bg-[#d76767] text-white rounded-3xl py-[3px] px-2.5">
                        <IoWarningOutline size={18} />
                        <p>Warning</p>
                    </div>
                    <p className="font-bold dark:text-white">
                        {warningBoardData.event_name} 이벤트 감지 ({warningBoardData.location || '-'})
                    </p>
                </>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        {renderWeatherIcon(weather)}
                        <p className="font-bold dark:text-white">{weather.charAt(0).toUpperCase() + weather.slice(1)}</p>
                    </div>
                    <p className="font-bold dark:text-white">{currentDate}</p>
                </div>
            )}
        </>
    );
};

export default WarningBoard;
