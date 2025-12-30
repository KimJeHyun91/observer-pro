import { useEffect, useState } from "react";
import ScrollBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { apiGetDashboardDeviceList } from '@/services/InundationService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

interface TreeNode {
	areaName: string;
	items: {
		floor: string;
		devices: { type: string; name: string; status: string; linkedStatus: boolean }[];
	}[];
}

interface DeviceListProps {
	viewMode: 'device' | 'location';
}

interface DeviceData {
	area_name: string;
	device_type: string;
	device_ip: string;
	status: string;
	outside_idx?: number;
	linked_status: boolean;
}

export function DeviceList({ viewMode }: DeviceListProps) {
	const [deviceData, setDeviceData] = useState<TreeNode[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { socketService } = useSocketConnection();

	useEffect(() => {
		const fetchDeviceData = async () => {
			setIsLoading(true);
			try {
				const response = await apiGetDashboardDeviceList();
				let data = response.result.result;

				if (!Array.isArray(data)) {
					data = data && typeof data === 'object' ? [data] : [];
				}
				const validDevices = data.filter(item => item.device_ip);

				const groupedData = validDevices.reduce((acc: TreeNode[], row) => {
					const { area_name, device_type, device_ip, status, linked_status } = row;
					if (!device_ip) return acc;

					let area = acc.find(item => item.areaName === area_name);
					if (!area) {
						area = { areaName: area_name, items: [{ floor: "", devices: [] }] };
						acc.push(area);
					}
					area.items[0].devices.push({
						type: device_type,
						name: device_ip,
						status,
						linkedStatus: linked_status
					});
					return acc;
				}, []);

				setDeviceData(groupedData);
			} catch (error) {
				console.error('디바이스 데이터 가져오기 오류:', error);
				setDeviceData([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchDeviceData();

		const cleanupFunction: (() => void)[] = [];

		const updateHandler = (updatedDevice: any) => {
			setDeviceData(prev => {
				return prev.map(area => {
					if (area.areaName === updatedDevice.outside_name) {
						return {
							...area,
							items: area.items.map(item => ({
								...item,
								devices: item.devices.map(device =>
									device.name === updatedDevice.device_ip
										? { ...device, linkedStatus: updatedDevice.linked_status }
										: device
								)
							}))
						};
					}
					return area;
				});
			});
		};

		cleanupFunction.push(socketService.subscribe('fl_crossingGates-update', updateHandler));
		cleanupFunction.push(socketService.subscribe('fl_billboards-update', updateHandler));
		cleanupFunction.push(socketService.subscribe('fl_signboards-update', updateHandler));
		cleanupFunction.push(socketService.subscribe('fl_speakers-update', updateHandler));
		cleanupFunction.push(socketService.subscribe('fl_guardianlites-update', updateHandler));
		cleanupFunction.push(socketService.subscribe('fl_cameras-update', updateHandler));

		return () => {
			cleanupFunction.forEach(cleanup => cleanup());
		};
	}, [socketService]);

	return (
		<div className="flex flex-col h-full">
			<ScrollBar className="h-full">
				<div className="flex-1 space-y-1">
					{isLoading ? (
						<div>로딩 중...</div>
					) : (
						<Tree
							tree={deviceData}
							viewMode={viewMode}
						/>
					)}
				</div>
			</ScrollBar>
		</div>
	);
}

interface TreeProps {
	tree: TreeNode[];
	viewMode: 'device' | 'location';
}

function Tree({ tree, viewMode }: TreeProps) {
	const [buildingToggleState, setBuildingToggleState] = useState(new Set());
	const [floorToggleState, setFloorToggleState] = useState(new Set());
	const [deviceToggleState, setDeviceToggleState] = useState(new Set());

	useEffect(() => {
		const initialBuildingState = new Set(tree.map((_, index) => index));
		const initialFloorState = new Set(
			tree.flatMap((building, buildingIndex) =>
				building.items.map((_, floorIndex) => `${buildingIndex}-${floorIndex}`)
			)
		);
		const initialDeviceState = new Set(
			deviceGroupTree().map((_, groupIndex) => groupIndex)
		);

		setBuildingToggleState(initialBuildingState);
		setFloorToggleState(initialFloorState);
		setDeviceToggleState(initialDeviceState);
	}, [tree]);

	const toggleBuilding = (buildingIndex: number) => {
		setBuildingToggleState((prev) => {
			const newState = new Set(prev);
			if (newState.has(buildingIndex)) newState.delete(buildingIndex);
			else newState.add(buildingIndex);
			return newState;
		});
	};

	const toggleFloor = (buildingIndex: number, floorIndex: number) => {
		const floorKey = `${buildingIndex}-${floorIndex}`;
		setFloorToggleState((prev) => {
			const newState = new Set(prev);
			if (newState.has(floorKey)) newState.delete(floorKey);
			else newState.add(floorKey);
			return newState;
		});
	};

	const toggleDeviceType = (deviceType: number) => {
		setDeviceToggleState((prev) => {
			const newState = new Set(prev);
			if (newState.has(deviceType)) newState.delete(deviceType);
			else newState.add(deviceType);
			return newState;
		});
	};

	const deviceGroupTree = () => {
		const deviceMap: { [deviceType: string]: { name: string; status: string; linkedStatus: boolean }[] } = {};

		tree.forEach((building) => {
			building.items.forEach((floor) => {
				floor.devices.forEach((device) => {
					if (device.name) {
						if (!deviceMap[device.type]) {
							deviceMap[device.type] = [];
						}
						deviceMap[device.type].push({
							name: device.name,
							status: device.status,
							linkedStatus: device.linkedStatus
						});
					}
				});
			});
		});

		return Object.entries(deviceMap).map(([deviceType, devices], index) => ({
			type: deviceType,
			id: index,
			devices,
		}));
	};

	const countDevices = (devices: { status: string; linkedStatus: boolean }[]) => {
		const total = devices.length;
		const errors = devices.filter((device) => device.status === "error" || !device.linkedStatus).length;
		return { total, errors };
	};

	return (
		<>
			{viewMode === "location" ? (
				tree.map((building, buildingIndex) => (
					<div key={`building-${buildingIndex}`} className="p-1 rounded-md bg-[#EBECEF]">
						<div
							className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${buildingToggleState.has(buildingIndex)
								? "bg-[#FAFBFB] border rounded-md"
								: "bg-[#EBECEF]"
								}`}
							onClick={() => toggleBuilding(buildingIndex)}
						>
							<span>{building.areaName}</span>
							<span className="text-[#8D8D8D]">
								{buildingToggleState.has(buildingIndex) ? "▲" : "▼"}
							</span>
						</div>

						{buildingToggleState.has(buildingIndex) &&
							building.items.map((item, floorIndex) => (
								<div key={`floor-${floorIndex}`} className="mt-1 ml-4">
									{item.floor ? (
										<div
											className={`font-semibold p-1 flex justify-between text-black cursor-pointer ${floorToggleState.has(`${buildingIndex}-${floorIndex}`)
												? "bg-[#FAFBFB] border rounded-md"
												: "bg-[#EBECEF]"
												}`}
											onClick={() => toggleFloor(buildingIndex, floorIndex)}
										>
											<span>{item.floor}</span>
											<span className="text-[#8D8D8D]">
												{floorToggleState.has(`${buildingIndex}-${floorIndex}`) ? "▲" : "▼"}
											</span>
										</div>
									) : null}

									{(item.floor === "" || floorToggleState.has(`${buildingIndex}-${floorIndex}`)) && (
										<ul className="ml-4 space-y-1">
											{item.devices.map((device, deviceIndex) => (
												<li
													key={`device-${deviceIndex}`}
													className="p-1 flex justify-between items-center"
												>
													<span
														className={`${device.status === "error" || !device.linkedStatus
															? "text-red-500"
															: "text-black-700"
															}`}
													>
														{device.name} ({device.type})
														{!device.linkedStatus}
													</span>
													{(device.status === "error" || !device.linkedStatus) && (
														<span className="text-red-500">!</span>
													)}
												</li>
											))}
										</ul>
									)}
								</div>
							))}
					</div>
				))
			) : (
				deviceGroupTree().map((group, groupIndex) => {
					const { total, errors } = countDevices(group.devices);
					return (
						<div key={`device-group-${groupIndex}`} className="p-1 rounded-md bg-[#EBECEF]">
							<div
								className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${deviceToggleState.has(groupIndex)
									? "bg-[#FAFBFB] border rounded-md"
									: "bg-[#EBECEF]"
									}`}
								onClick={() => toggleDeviceType(groupIndex)}
							>
								<span>{group.type}</span>
								<span className="flex items-center gap-2">
									<span className="text-[#737373] text-[10px]">전체 {total}개</span>
									<span className="text-[#FF755B] text-[10px]">연결 끊김 {errors}개</span>
									<span className="text-[#8D8D8D]">
										{deviceToggleState.has(groupIndex) ? "▲" : "▼"}
									</span>
								</span>
							</div>

							{deviceToggleState.has(groupIndex) && (
								<ul className="ml-4 space-y-1">
									{group.devices.map((device, deviceIndex) => (
										<li
											key={`device-${deviceIndex}`}
											className="p-1 flex justify-between items-center"
										>
											<span
												className={`${device.status === "error" || !device.linkedStatus
													? "text-red-500"
													: "text-green-500"
													}`}
											>
												{device.name}
												{!device.linkedStatus && " - 연결 끊김"}
											</span>
											{(device.status === "error" || !device.linkedStatus) && (
												<span className="text-red-500">!</span>
											)}
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})
			)}
		</>
	);
}