import { useState } from 'react';

const parkingTypes = [
	{ key: 'in', label: '입차', color: 'text-blue-500' },
	{ key: 'out', label: '출차', color: 'text-red-400' },
];

type ParkingFeeStatusData = {
    in: string;
    out: string;
}

const defaultParkingStatus : ParkingFeeStatusData = {
	in: '0',
    out: '0',
};

export default function ParkingFeeStatus() {
	const [status] = useState<ParkingFeeStatusData>(defaultParkingStatus);

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
						<span className="ml-3 text-black-500">{status[type.key as keyof ParkingFeeStatusData]}</span>
					</div>
				))}                
			</div>
		</div>
	)
}
