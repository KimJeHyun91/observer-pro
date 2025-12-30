import { apiParkingTypeCountUsedArea } from '@/services/ParkingService';
import { useEffect,useState } from 'react';
import { ParkingStatusData } from '@/@types/parking';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

const parkingTypes = [
	{ key: 'use_all', label: '전체', color: 'text-black-500' },
	{ key: 'use_general', label: '일반', color: 'text-blue-700' },
	{ key: 'use_compact', label: '경차', color: 'text-sky-500' },
	{ key: 'use_disabled', label: '장애인', color: 'text-yellow-500' },
	{ key: 'use_electric', label: '전기차', color: 'text-green-600' },
];

const defaultParkingStatus : ParkingStatusData = {
	use_all: '0',
	use_general: '0',
	use_compact: '0',
	use_disabled: '0',
	use_electric: '0',
};

export default function ParkingStatus() {
	const { socketService } = useSocketConnection();
	const [status, setStatus] = useState<ParkingStatusData>(defaultParkingStatus);
	
	useEffect(() => {
        getStatusData();
    }, []);

	useEffect(() => {
        if (!socketService) {
            return;
        }

        const parkingSocket = socketService.subscribe('pm_area-update', (received) => {
            if (received) {
                getStatusData()
            }
        })

        return () => {
            parkingSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    const getStatusData = async () => {
        try {
            const res = await apiParkingTypeCountUsedArea<ParkingStatusData>();

            if (!res || !res.result || res.result.length === 0) {
				setStatus(defaultParkingStatus);
				return;
			}
			
			setStatus(res.result[0]);
        } catch (error) {
            console.error('주차관리 전체 현황 API 에러: ', error);
            return;
        }
    };

	return (
		<div className={`flex items-center gap-4 p-2 rounded bg-[#ebecef] dark:bg-[#404040]`}>
			<span className={`font-bold text-black ml-2 dark:text-[#FFFFFF]`}>
				현황
			</span>
			<div className="flex gap-2">

				{parkingTypes.map((type) => (
					<div
						key={type.key}
						className={`text-center py-1 font-semibold rounded w-[5vw] bg-white dark:bg-[#737373] dark:text-[#FFFFFF]`}
					>
						<span className={type.color}>{type.label}</span>
						<span className="ml-3 text-black-500">{status[type.key as keyof ParkingStatusData]}</span>
					</div>
				))}                
			</div>
		</div>
	)
}
