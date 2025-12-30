import { DeviceState } from '@/@types/inundation';
import ScrollBar from '@/components/ui/ScrollBar';
import { useNetworkStatusStore } from '@/store/Inundation/useNetworkStatusStore';
import { useEffect, useState } from 'react';

interface DeviceNetworkStateInfo extends DeviceState {
	name: string;
	location: string;
	ipaddress: string;
	device_type: string;
}

export const NetworkStatus = () => {
	const unlinkedDevices = useNetworkStatusStore((state) => state.unlinkedDevices);
	const getUnLinkedDeviceList = useNetworkStatusStore((state) => state.getUnLinkedDeviceList);
	const [deviceStatuses, setDeviceStatuses] = useState<DeviceNetworkStateInfo[]>([]);


	useEffect(() => {
		const fetchData = async () => {
			try {
				await getUnLinkedDeviceList();
			} catch (error) {
				console.error('Error fetching unlinked devices:', error);
			}
		};
		fetchData();
	}, [getUnLinkedDeviceList]);

	useEffect(() => {
		if (unlinkedDevices) {
			const transformedDevices = unlinkedDevices.map((device) => ({
				name: device.name || '',
				location: device.location || '',
				ipaddress: device.ipaddress || '',
				device_type: device.device_type || '',
			})) as DeviceNetworkStateInfo[];
			setDeviceStatuses(transformedDevices);
		}
	}, [unlinkedDevices]);

	return (
		<ScrollBar className='h-full'>
			<div className="space-y-2 mt-2">
				{deviceStatuses.map((device, index) => (
					<div key={index} className="p-2 bg-gray-200 dark:bg-gray-700 rounded">
						<div className="text-sm font-medium text-red-500 font-semibold">
							{device.name} ({device.device_type})
						</div>
						<div className="text-xs text-gray-500">
							<div>위치: {device.location ? device.location : '등록 안됨'}</div>
						</div>
					</div>
				))}
				{deviceStatuses.length === 0 && (
					<div className="text-gray-500 text-center items-center">
						모든 장치가 정상 동작중입니다.
					</div>
				)}
			</div>
		</ScrollBar>
	);
};
