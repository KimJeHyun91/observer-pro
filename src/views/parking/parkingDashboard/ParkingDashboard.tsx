import { useState, useEffect, useRef } from "react";
import ParkingIcon from '@/configs/parking-icon.config';
import { Button } from '@/components/ui'
import LineChart  from "../components/LineChart"
import dayjs from 'dayjs';
import { 
	ChartDataType, 
	ParkingTypeCountAreaList, 
	ParkingTypeSumAreaList, 
	VehicleNumberSearchPreviewResult, 
	VehicleNumberSearchResult,
	EventLogData
} from '@/@types/parking';
import { 
	apiVehicleNumberSearch, 
	apiVehicleNumberSearchPreview, 
	apiAccessTimeZone, 
	apiParkingTypeCountAreaList, 
	apiParkingTypeSumAreaList,
	apiGetEventLogList,
	apiGetTreeList
} from '@/services/ParkingService';
import { useParkingBuildingList } from '@/utils/hooks/useParkingArea'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import { Building } from '@/@types/building'
import ParkingAll from '../../../assets/styles/images/parking_All.png';
import Progress from '@/components/ui/Progress'
import { useServiceNavStore } from '@/store/serviceNavStore'
import CustomDatePicker from "@/components/common/customDatePicker";
import Header from '@/components/shared/Header';
import ParkingStatus from '../parkingStatus/ParkingStatus';

type Option = {
	value: string
	label: string
}

const defaultFloorTotal = {
	totalAll: 0,
    totalUseAll: 0,
    totalGeneral: 0,
    totalUseGeneral: 0,
    totalCompact: 0,
    totalUseCompact: 0,
    totalDisabled: 0,
    totalUseDisabled: 0,
    totalElectric: 0,
    totalUseElectric: 0,
};

const defaultGraphTotal = {
    totalAll : 0,
    totalUseAll: 0,
};

type TreeDevice = {
	vms_name: string;
	camera_id: string;
	camera_name: string;
	type: string;
	area_name: string;
	status: boolean;
	idx: number;
	service_type : string;
};

type TreeFloor = {
	floor: string;
	devices: TreeDevice[];
};

type TreeBuilding = {
	buildingName: string;
	items: TreeFloor[];
};

export default function ParkingDashboard() {
	const [selectedTreeIdx, setSelectedTreeIdx] = useState<number>(1);
	const [chartSeries, setChartSeries] = useState<{ name: string; data: number[] }[]>([]);
    const [chartCategories, setChartCategories] = useState<string[]>([]);
	const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

	const [chartDates, setChartDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: yesterday,
        endDate: today,
    });

	const [carDates, setCarDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: yesterday,
        endDate: today,
    });

	const {
        data: buildings,
        isLoading: isLoadingBuilding,
        error: buildingsError,
        mutate,
    } = useParkingBuildingList();
	const { socketService } = useSocketConnection()
	const [floorData, setFloorData] = useState<ParkingTypeCountAreaList[]>([]);
    const [floorTotalData, setFloorTotalData] = useState(defaultFloorTotal);
	const [typeSelectedBuilding, setTypeSelectedBuilding] = useState<Building>({
		idx : -1,
		outside_name: '미선택',
		top_location: '',
		left_location: '',
		service_type: '',
		alarm_status: false,
	});

	const [graphData, setGraphData] = useState<ParkingTypeSumAreaList[]>([]);
    const [graphTotalData, setGraphTotalData] = useState(defaultGraphTotal);
	const [graphSelectedBuilding, setGraphSelectedBuilding] = useState<Building>({
		idx : -1,
		outside_name: '미선택',
		top_location: '',
		left_location: '',
		service_type: '',
		alarm_status: false,
	});

	const [carSearchInput, setCarSearchInput] = useState("");
	const [suggestions, setSuggestions] = useState<VehicleNumberSearchPreviewResult[]>([]);
	const [showSearchPrewview, setShowSearchPrewview] = useState(false);
	const [searchResult, setSearchResult] = useState<VehicleNumberSearchResult[]>([]);
	const typeSelectedBuildingRef = useRef(typeSelectedBuilding);
	const graphSelectedBuildingRef = useRef(graphSelectedBuilding);
	const [eventLog, setEventLog] = useState<EventLogData[]>([]);
	const [treeData, setTreeData] = useState<TreeBuilding[]>([]);
	if (isLoadingBuilding) {
        console.log('get pm_buildings loading...')
    }

    if (buildingsError) {
        console.error('get pm_buildings error')
    }

	const { setNavServiceState } = useServiceNavStore();

	useEffect(()=> {
		getEventLogData();
		getTreeData();
	}, [])
	
	useEffect(() => {
		setNavServiceState(true);

		return () => {
			setNavServiceState(false);
		}

	}, [setNavServiceState])

	useEffect(() => {
		typeSelectedBuildingRef.current = typeSelectedBuilding;
	}, [typeSelectedBuilding]);

	useEffect(() => {
		graphSelectedBuildingRef.current = graphSelectedBuilding;
	}, [graphSelectedBuilding]);
	
	useEffect(() => {
		if (!socketService) {
			return;
		}

		const buildingSocket = socketService.subscribe('pm_buildings-update', (received) => {
			if (received) {
				mutate();
				getTreeData();
			}
		})

		const parkingSocket = socketService.subscribe('pm_area-update', (received) => {
            if (received) {
				// 타입 별 세부 현황
				if(typeSelectedBuildingRef.current.idx !== -1){
					setTypeSelectedBuilding(typeSelectedBuildingRef.current);
					getParkingTypeCountAreaInfo(typeSelectedBuildingRef.current.idx.toString());
				}
				
				// 주차 현황
				if(graphSelectedBuildingRef.current.idx !== -1){
					setGraphSelectedBuilding(graphSelectedBuildingRef.current);
					getParkingTypeSumAreaList(graphSelectedBuildingRef.current.idx.toString());
				}
				getTreeData();
            }
        })

		const parkingEvnetSocket = socketService.subscribe('pm_event-update', (received) => {
			if (received) {
				getEventLogData();
			}
		})

		const cameraSocket = socketService.subscribe('pm_cameras-update', (received) => {
            if (received) {
                getTreeData();
            }
        })
		
		return () => {
			buildingSocket();
			parkingSocket();
			parkingEvnetSocket();
			cameraSocket();
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [socketService])

	const treeChange = (newValue: Option | null) => {
		if (newValue) {
			setSelectedTreeIdx(parseInt(newValue.value));
		}
	};
	
	useEffect(() => {
		if (chartDates.startDate && chartDates.endDate) {
			getChartData();
        } 

		// eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartDates]);

	const typeState = (buildingIdx : string) => {
		if(buildingIdx === '-1'){
			resetData('floor');
			return
		}

		const selectedBuilding = buildings?.result.find(
			(building : Building) => building.idx === parseInt(buildingIdx,10)
		);
				
		setTypeSelectedBuilding(selectedBuilding);
		getParkingTypeCountAreaInfo(buildingIdx);
	}

	const parkingState = (buildingIdx : string) => {
		if(buildingIdx === '-1'){
			resetData('graph');
			return
		}

		const selectedBuilding = buildings?.result.find(
			(building : Building) => building.idx === parseInt(buildingIdx,10)
		);

		setGraphSelectedBuilding(selectedBuilding);
		getParkingTypeSumAreaList(buildingIdx);
	}

	const getParkingTypeCountAreaInfo = async (buildingIdx : string) => {
        try {
            const data = {
                outsideIdx: parseInt(buildingIdx, 10) ,
            };
        
            const res = await apiParkingTypeCountAreaList<ParkingTypeCountAreaList>(data);
            
            if (!res || !res.result) {
                resetData('floor');
                return;
            }

            setFloorData(res.result);
            setFloorTotalData(calcFloorTotals(res.result));
        } catch (e) {
            console.error('주차장 세부 현황 API 에러:', e);
            resetData('floor');
        }
    };

	const getParkingTypeSumAreaList = async (buildingIdx : string) => {
        try {
            const data = {
                outsideIdx: parseInt(buildingIdx, 10) ,
            };
            
            const res = await apiParkingTypeSumAreaList<ParkingTypeSumAreaList>(data);
            
            if (!res || !res.result) {
                resetData('graph');
                return;
            }

            setGraphData(res.result);
            setGraphTotalData(calcGraphTotals(res.result));
        } catch (e) {
            console.error('주차장 층별 그래프 현황 API 에러:', e);
			resetData('graph');
        }
    };

	const calcFloorTotals = (data: ParkingTypeCountAreaList[]) =>
        data.reduce(
            (acc, curr) => ({
            totalAll: acc.totalAll + Number(curr.all),
            totalUseAll: acc.totalUseAll + Number(curr.use_all),
            totalGeneral: acc.totalGeneral + Number(curr.general),
            totalUseGeneral: acc.totalUseGeneral + Number(curr.use_general),
            totalCompact: acc.totalCompact + Number(curr.compact),
            totalUseCompact: acc.totalUseCompact + Number(curr.use_compact),
            totalDisabled: acc.totalDisabled + Number(curr.disabled),
            totalUseDisabled: acc.totalUseDisabled + Number(curr.use_disabled),
            totalElectric: acc.totalElectric + Number(curr.electric),
            totalUseElectric: acc.totalUseElectric + Number(curr.use_electric),
        }),
        { ...defaultFloorTotal }
    );
	
	const calcGraphTotals = (data: ParkingTypeSumAreaList[]) =>
        data.reduce(
            (acc, curr) => ({
                totalAll: acc.totalAll + Number(curr.all),
                totalUseAll: acc.totalUseAll + Number(curr.use_all),
            }),
        { ...defaultGraphTotal }
    );

	const resetData = (type : string) => {
        if(type === 'floor'){
			setTypeSelectedBuilding({
				idx : -1,
				outside_name: '미선택',
				top_location: '',
				left_location: '',
				service_type: '',
				alarm_status: false,
			})
			setFloorData([]);
            setFloorTotalData(defaultFloorTotal);
        }else if(type === 'graph'){
			setGraphSelectedBuilding({
				idx : -1,
				outside_name: '미선택',
				top_location: '',
				left_location: '',
				service_type: '',
				alarm_status: false,
			})
			setGraphData([]);
            setGraphTotalData(defaultGraphTotal);
		}
    };

    const getChartData = async () => {
		if (!chartDates.startDate || !chartDates.endDate) {
			return;
		}

        try{
            const data = {
                startDate: dayjs(chartDates.startDate).format('YYYYMMDD'),
                endDate: dayjs(chartDates.endDate).format('YYYYMMDD'),
            } as unknown as ChartDataType

            const res = await apiAccessTimeZone<ChartDataType>(data);

            if (!res || !res.result) {
                return;
            }
            
            const categories = Array.from(
				new Set(
				 	 res.result.map((item) => `${item.every_hour}`)
				)
			).sort();

            const series = [
                {
                  name: '전체',
                  data: res.result.map((item) => parseInt(item.use_all, 10) || 0),
                },
                {
                  name: '일반',
                  data: res.result.map((item) => parseInt(item.use_general, 10) || 0),
                },
                {
                  name: '경차',
                  data: res.result.map((item) => parseInt(item.use_compact, 10) || 0),
                },
                {
                  name: '장애인',
                  data: res.result.map((item) => parseInt(item.use_disabled, 10) || 0),
                },
                {
                  name: '전기',
                  data: res.result.map((item) => parseInt(item.use_electric, 10) || 0),
                },
            ];

            setChartCategories(categories);
            setChartSeries(series);
        } catch (error) {
            console.error('주차관리 전체 그래프 API 에러: ', error);
            return
        }
    }

	const searchPrewviewInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setCarSearchInput(inputValue);
	
		if (inputValue.length > 0) {
			getVehicleNumberSearchPreview(inputValue);
		} else {
			setSuggestions([]);
			setShowSearchPrewview(false);
		}
	};
	
	const getVehicleNumberSearchPreview = async (inputValue: string) => {
        try {
            const data = {
                vehicleNumber: inputValue
            } as unknown as VehicleNumberSearchPreviewResult;
            
            const res = await apiVehicleNumberSearchPreview<VehicleNumberSearchPreviewResult>(data);
            
            if (!res || !res.result) {
                return;
            }

			if(res?.result.length > 0){
				setSuggestions(res.result);
				setShowSearchPrewview(true);
			}else{
				setSuggestions([]);
				setShowSearchPrewview(false);
			}
        } catch (e) {
            console.error('주차 대시보드 차량번호 검색어 자동완성 API 에러:', e);
        }
	};

	const searchPrewviewSelect = (item: VehicleNumberSearchPreviewResult) => {
		setCarSearchInput(item.vehicle_number);
		setShowSearchPrewview(false);
	};
	
	const cartSearchClick = async () => {
		setShowSearchPrewview(false);
		if (!carDates.startDate || !carDates.endDate || !carSearchInput.trim()) {
			return;
		}

		try {
            const data = {
                vehicleNumber: carSearchInput,
				startDate: dayjs(carDates.startDate).format('YYYYMMDD'),
                endDate: dayjs(carDates.endDate).format('YYYYMMDD')
            } as unknown as VehicleNumberSearchResult;
            
            const res = await apiVehicleNumberSearch<VehicleNumberSearchResult>(data);
            
            if (!res || !res.result) {
                return;
            }

			if (res?.result?.length > 0) {
				setSearchResult(res.result);
			} else {
				setSearchResult([]);
			}
        } catch (e) {
            console.error('주차 대시보드 차량번호 검색 API 에러:', e);
        }
	}

	const chartDateChange = (dates: { startDate: Date | null; endDate: Date | null }) => {
		setChartDates(dates);
    };

	const carDateChange = (dates: { startDate: Date | null; endDate: Date | null }) => {
		setCarDates(dates);
    };
	
	const [targetIdx, setTargetIdx] = useState<number | null>(null);

	const eventToggle = (idx: number) => {
		setTargetIdx(targetIdx === idx ? null : idx);
	};
	
	const getEventLogData = async () =>{
		try {
            const res = await apiGetEventLogList();
            
            if (!res || !res.result) {
                return;
            }

			if (res?.result?.length > 0) {
				setEventLog(res.result as EventLogData[]);
			} else {
				setEventLog([]);
			}
        } catch (e) {
            console.error('주차 대시보드 주차 이벤트 log API 에러:', e);
        }
	}

	const getTreeData = async () => {
		try {
			const res = await apiGetTreeList();
            
            if (!res || !res.result) {
                return;
            }

			if (res?.result?.length > 0) {
				setTreeData(res.result as TreeBuilding[]);
			} else {
				setEventLog([]);
			}		
		} catch (e) {
			console.error('주차 대시보드 트리 List API 에러:', e);
		}
	}

	return (
		<section className="h-full flex flex-col">
			{/* 상단 헤더 */}
			<Header
                currentView="dashboard"
                serviceType="parking"
                onViewModeChange={()=> {}}
            >
                <ParkingStatus />
            </Header>
			<div className="h-screen max-h-screen flex flex-1 p-2 gap-2 overflow-hidden">
				{/* 왼쪽 사이드바 */}
				<div className="w-80 flex-shrink-0 mb-1">
					<div className="flex flex-col bg-white dark:bg-gray-800 shadow-md rounded-lg p-3">
						<div className="flex justify-between items-center">
							<span className="font-bold text-black dark:text-white">장치 목록</span>
							<select className="custom_select w-[80px] h-[25px] mt-[-10px]"
								onChange={(e) =>
									treeChange({
										value: e.target.value,
										label: e.target.options[e.target.selectedIndex].text,
									})
								}
							>
								<option value="1">위치</option>
								<option value="2">장치</option>
							</select>
						</div>
						<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />

						<div
							className={`scroll-container mt-2 pr-1 overflow-y-auto h-[calc(100vh-180px)]`}
						>
							<div className="flex-1 space-y-1">
								<Tree tree={treeData} type={selectedTreeIdx}/>
							</div>
						</div>
					</div>
				</div>

				{/* 중간 영역 */}
				<div className="flex-1 flex flex-col gap-2 ml-2">
					{/* 위쪽 박스 */}
					<div className="flex-[1] basis-1/20 flex flex-row gap-2">
						{/* 타입 별 세부 현황 박스 */}
						<div className="flex-[6] bg-white shadow-md rounded-lg p-3 h-[340px] mt-[-1px] dark:bg-[#262626]">
							<div className="flex  items-center">
								<span className="font-bold text-black dark:text-white">타입 별 세부 현황</span>
							</div>
							
							<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />

							<div className="flex justify-end items-end w-full">
								<select className="custom_select w-[80px] h-[25px] mt-1"
									onChange={(e) =>{
										typeState(e.target.value);
									}}
								>
									<option value="-1">건물 선택</option>
									{
										buildings?.result?.length > 0 && (
											<>
												{buildings.result.map((building: Building, index: number) => (
													<option key={index} value={building.idx}>
													{building.outside_name}
													</option>
												))}
											</>
										)
									}
								</select>
							</div>
							<div className={`w-full flex-1 bg-[#EBECEF] px-2 rounded-md mt-1 dark:bg-[#404040] dark:text-[#FFFFFF]`}>
								<div
									className="flex justify-between items-center p-2"
								>
									<span className="w-16 text-sm font-bold truncate"
										title={`${typeSelectedBuilding?.outside_name}`} 
									>
										{typeSelectedBuilding?.outside_name}
									</span>

									<div className='flex'>
										<img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-2" /> 
										<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
											{floorTotalData.totalUseAll} / {floorTotalData.totalAll}
										</span>
									</div>
									
									<div className='flex'>
										<ParkingIcon.generalCar className='w-[20px] h-[20px] mr-2 text-[#1F40D6]'/>
										<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
											{floorTotalData.totalUseGeneral} / {floorTotalData.totalGeneral}
										</span>
									</div>
																	
									<div className='flex'>
										<ParkingIcon.compactCar className='w-[25px] h-[25px] mr-2 text-[#0DC5E0]'/>
										<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
											{floorTotalData.totalUseCompact} / {floorTotalData.totalCompact}
										</span>
									</div>
									
									<div className='flex'>
										<ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-2 text-[#E9B707]'/>
										<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
											{floorTotalData.totalUseDisabled} / {floorTotalData.totalDisabled}
										</span>
									</div>
									
									<div className='flex'>
										<ParkingIcon.electricCar className='w-[23px] h-[22px] mr-2 text-[#099B3F]'/>
										<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
											{floorTotalData.totalUseElectric} / {floorTotalData.totalElectric}
										</span>
									</div>
								</div>
							</div>
							<div className={`w-full scroll-container flex-1 overflow-y-auto bg-[#EBECEF] p-2 rounded-md mt-1 h-[220px] dark:bg-[#404040] dark:text-[#FFFFFF]`}>
								{floorData.map((floor,index) => (
									<div
										key={index}
										className="flex justify-between items-center p-2"
									>
										<span
											className="w-16 text-sm font-bold truncate"
											title={(floor.floor_order).toString()} 
										>
											{floor.floor_order}
										</span>

										<div className='flex'>
											<img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-2" /> 
											<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
												{floor.use_all} / {floor.all}
											</span>
										</div>
										
										<div className='flex'>
											<ParkingIcon.generalCar className='w-[20px] h-[20px] mr-2'/>
											<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
												{floor.use_general} / {floor.general}
											</span>
										</div>
										
										<div className='flex'>
											<ParkingIcon.compactCar className='w-[25px] h-[25px] mr-2'/>
											<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
												{floor.use_compact} / {floor.compact}
											</span>
										</div>
										
										<div className='flex'>
											<ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-2'/>
											<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
												{floor.use_disabled} / {floor.disabled}
											</span>
										</div>
										
										<div className='flex'>
											<ParkingIcon.electricCar className='w-[23px] h-[22px] mr-2'/>
											<span className="w-[100px] text-sm text-gray-700 border text-center rounded-md bg-[#FFFFFF]">
												{floor.use_electric} / {floor.electric}
											</span>
										</div>
									</div>
								))}

								{floorData.length === 0 && (
									<div className="ml-2 mt-1 font-normal text-black dark:text-[#FFFFFF]">
										층 데이터가 없습니다.
									</div>
								)}
							</div>
						</div>

						{/* 주차 현황 박스 */}
						<div className="flex-[4] bg-white shadow-md rounded-lg p-3 h-[340px] mt-[-1px] w-[434px] dark:bg-[#262626]">
							<div className="flex justify-between items-center ">
								<span className="font-bold text-black dark:text-white">주차 현황</span>
								
								<div className="flex">
									<div className="flex items-center mt-[-6px]">
										<div className="flex items-center mr-2">
											<span className="w-6 h-2 bg-green-500 mr-1"></span>
											<span className="text-xs text-gray-700 dark:text-[#FFFFFF]">여유</span>
										</div>
										<div className="flex items-center mr-2">
											<span className="w-6 h-2 bg-yellow-500 mr-1"></span>
											<span className="text-xs text-gray-700 dark:text-[#FFFFFF]">보통</span>
										</div>
										<div className="flex items-center mr-2">
											<span className="w-6 h-2 bg-red-500 mr-1"></span>
											<span className="text-xs text-gray-700 dark:text-[#FFFFFF]">만차</span>
										</div>
									</div>
									
									
								</div>
							</div>
							<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
						
							<div className="flex justify-end items-end w-full">
								<select className="custom_select w-[80px] h-[25px] mt-1"
									onChange={(e) =>{
										parkingState(e.target.value);
									}}
								>
									<option value="-1">건물 선택</option>
									{
										buildings?.result?.length > 0 && (
											<>
												{buildings.result.map((building: Building, index: number) => (
													<option key={index} value={building.idx}>
													{building.outside_name}
													</option>
												))}
											</>
										)
									}
								</select>
							</div>
							<div className="flex-1 bg-[#EBECEF] rounded-md mt-1 dark:bg-[#404040] dark:text-[#FFFFFF]">
								{
									(() => {
										const percentage = graphTotalData.totalAll === 0 
											? 0 
											: (graphTotalData.totalUseAll / graphTotalData.totalAll) * 100;
										const barColor =
											percentage === 100 ? 'bg-red-500'
												: percentage >= 60 ? 'bg-yellow-500'
												: 'bg-green-500';

										return (
											<div className="flex justify-between items-center p-2 h-[41px]">
												<span className="w-16 text-sm font-bold truncate"
													title={`${graphSelectedBuilding?.outside_name}`} 
												>
													{graphSelectedBuilding?.outside_name}
												</span>

												<div className="w-[70%] h-3 mt-1">
													<Progress
														customColorClass={barColor}
														percent={percentage}
														className="mb-4"
														size="md"
														showInfo={false} 
													/>
												</div>

												<span className="w-[20%] text-sm text-gray-700 text-right mr-1 dark:text-[#FFFFFF]">
													{graphTotalData.totalUseAll}/{graphTotalData.totalAll}
												</span>
											</div>
										)
									})()
								}
							</div>

							<div className={`flex-1 overflow-y-auto scroll-container bg-[#EBECEF] mt-1 p-1 rounded-md h-[220px] dark:bg-[#404040] dark:text-[#FFFFFF]`}>
								{graphData.map((item, index, arr) => {
									const percentage = item.use_all === 0 ? 0 : (item.use_all / item.all) * 100;
									
									const barColor =
											percentage === 100 ? 'bg-red-500'
												: percentage >= 60 ? 'bg-yellow-500'
												: 'bg-green-500';

									return (
										<div key={index} className='mx-2 my-4'>
											<div className={`flex items-center ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
												<span className="w-16 text-sm font-bold">{item.inside_name}</span>
												
												{Number(item.use_all) === 0 && Number(item.all) === 0 ? (
													<span className="w-[90%] text-sm text-gray-500 dark:text-[#FFFFFF]">
														주차 면구역이 없습니다
													</span>
												) : (
													<>
														<div className="w-[70%] h-3 mt-1">
															<Progress
																customColorClass={barColor}
																percent={percentage}
																className="mb-4"
																size="md"
																showInfo={false} 
															/>
														</div>

														<span className="w-[20%] text-sm text-gray-700 text-right dark:text-[#FFFFFF]">
															{item.use_all}/{item.all}
														</span>
													</>
												)}
											</div>
										</div>
									);
								})}

								{graphData.length === 0 && (
									<div className="mx-2 mt-2 font-normal text-black dark:text-[#FFFFFF]">
										층 데이터가 없습니다.
									</div>
								)}
							</div>
						</div>
					</div>

					{/* 아래쪽 박스 */}
					<div className="flex-[19] basis-19/20 mb-1 flex flex-row gap-2.5">
						{/* 시간 별 출입 그래프 박스 */}
						<div className="flex-[7] bg-white shadow-md rounded-lg p-3 dark:bg-[#262626]">
							<span className="font-bold text-black dark:text-white mb-1">
								시간 별 출입 그래프
							</span>
							<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
							<div className="w-full flex justify-end">
								<CustomDatePicker
									title={{
										text: "조회 기간 설정",
										className: "ml-1 mr-1 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
									}}
									startDate={chartDates.startDate}
									endDate={chartDates.endDate}
									className='rounded bg-[#EBECEF] mt-1 mb-1 dark:bg-[#A9A9A9]'
									height={25}
									onChange={chartDateChange}
								/>
							</div>

							<div className="mt-2  h-[calc(100vh-570px)] overflow-hidden">
								<LineChart series={chartSeries} categories={chartCategories} height={'100%'} />
							</div>
						</div>

						{/* 차량 검색 박스 */}
						<div className="flex-[3] bg-white shadow-md rounded-lg p-3 dark:bg-[#262626] h-[calc(100vh-473px)]">
							<span className="font-bold text-black dark:text-white mb-1">
								차량 검색
							</span>
							<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
							<div className="flex ">
								<CustomDatePicker
									title={{
										text: "조회 기간 설정",
										className: "ml-0.5 text-[#A1A1AA] text-[10.5px] dark:text-[#FFFFFF]",
									}}
									startDate={carDates.startDate}
									endDate={carDates.endDate}
									className='rounded bg-[#EBECEF] mt-1 mb-1 w-full dark:bg-[#A9A9A9]'
									height={25}
									width={120}
									onChange={carDateChange}
								/>
							</div>
							
							
							{/* 입력 영역 */}
							<div className="items-center bg-[#EBECEF] w-full p-2 rounded-md dark:bg-[#A9A9A9]">
								<div className="flex gap-2">
									<div className="relative w-full">
										{/* 검색 입력창 */}
										<input
											type="text"
											placeholder="차량 번호를 입력하세요."
											value={carSearchInput}
											className="border p-2 rounded w-full"
											onFocus={() => carSearchInput && setShowSearchPrewview(true)}
											onChange={searchPrewviewInputChange}
										/>

										{/* 자동완성 박스 */}
										{showSearchPrewview && (
											<div className="absolute z-10 bg-white border w-full mt-1 rounded shadow-lg">
												{suggestions.map((item, index) => (
													<div
														key={index}
														className="p-2 hover:bg-gray-200 cursor-pointer"
														onClick={() => searchPrewviewSelect(item)}
													>
														{item.vehicle_number}
													</div>
												))}
											</div>
										)}
									</div>

									<Button
										className="mr-1 rounded-md w-[100px] bg-[#647DB7] text-[#FFFFFF] dark:bg-[#292929]"
										clickFeedback={false}
										size='sm'
										variant="plain"
										onClick={() => cartSearchClick()}
									>
										검색
									</Button>
								</div>
								
								<div className="mt-1 p-2 border rounded-md bg-[#FFFFFF]">
									<div className="space-y-2">
										<div className="flex justify-between items-center">
											<span className="font-bold text-zinc-400 ml-auto text-right w-1/3 mr-3 text-[12px]">
												차량 번호
											</span>
											<span className="text-gray-900 mr-auto w-2/3 text-[12px]">
												{searchResult.length > 0 ?  searchResult[0].vehicle_number : ''}
											</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="font-bold text-zinc-400 ml-auto text-right w-1/3 mr-3 text-[12px]">
												현재 주차 위치
											</span>
											<span
												className={`mr-auto w-2/3 text-[12px] ${
													searchResult.length > 0 && 
													dayjs(searchResult[0].out_at, 'YYYYMMDDTHHmmss').toDate() < new Date()
														? 'text-red-500 font-bold'
														: 'text-gray-900'
												}`}
											>
												{
													searchResult.length > 0 ? 
														dayjs(searchResult[0].out_at, 'YYYYMMDDTHHmmss').toDate() >= new Date()
															? `${searchResult[0].outside_name} ${searchResult[0].inside_name}`
															: '미주차'
														: ''
												}
											</span>
										</div>
										<div className="flex justify-between items-center">
											<span className="font-bold text-zinc-400 ml-auto text-right w-1/3 mr-3 text-[12px]">
												입차 시간
											</span>
											<span className="text-gray-900 mr-auto w-2/3 text-[12px]">
												{
													searchResult.length > 0 ? 
														dayjs(searchResult[0].out_at, 'YYYYMMDDTHHmmss').toDate() >= new Date()
															? dayjs(searchResult[0].in_at, 'YYYYMMDDTHHmmss').format('YYYY년 MM월 DD일 HH시 mm분')
															: '-'
														: ''
												}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="mt-1 items-center bg-[#EBECEF] w-full p-2 rounded-md h-[calc(100vh-710px)] scroll-container overflow-y-auto dark:bg-[#A9A9A9]">
								{searchResult.length > 0 ? (
									<>
										{searchResult.map((item, index) => (
											<div key={index} className="mt-1 p-2 border rounded-md bg-[#FFFFFF]">
												<div className="flex items-center space-x-3">
													<div className="w-[35px] h-[35px] flex items-center justify-center bg-gray-100 rounded-full border">
														<span className="text-lg font-bold text-gray-500">✓</span>
													</div>
													<div className="flex-1 space-y-2 ml-0">
														<div className="flex items-center">
															<span className="font-bold text-zinc-400 text-right w-1/4 text-[12px]">
																입차 시간
															</span>
															<span className="text-gray-900 text-left ml-2 text-[12px] flex-1">
																{dayjs(item.in_at, 'YYYYMMDDTHHmmss').format('YYYY년 MM월 DD일 HH시 mm분')}
															</span>
														</div>
														<div className="flex items-center">
															<span className="font-bold text-zinc-400 text-right w-1/4 text-[12px]">
																출차 시간
															</span>
															<span className="text-gray-900 text-left ml-2 text-[12px] flex-1">
																{dayjs(item.out_at, 'YYYYMMDDTHHmmss').format('YYYY년 MM월 DD일 HH시 mm분')}
															</span>
														</div>
														<div className="flex items-center">
															<span className="font-bold text-zinc-400 text-right w-1/4 text-[12px]">
																주차 위치
															</span>
															<span className="text-gray-900 text-left ml-2 text-[12px] flex-1">
																{(() => {
																	const outside = item.outside_name?.trim() || '';  
																	const inside = item.inside_name?.trim() || '';
																	const parking = item.parking_type_name?.trim() || '';

																	const combinedText = `${outside} ${inside} ${parking}`.trim();

																	return combinedText ? `${combinedText} 차량` : '미등록 주차위치';
																})()}
															</span>
														</div>
													</div>
												</div>
											</div>
										))}
									</>
								) : (
									<div className="p-1 dark:text-[#FFFFFF]">
										검색 결과가 없습니다.
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* 오른쪽 사이드 카드 */}
				<div className="flex flex-col w-[18%] gap-2 pl-2 pb-1">
					{/* 실시간 이벤트 - 주차 이벤트 박스 */}
					<div className="w-full  bg-white shadow-md rounded-lg p-3 dark:bg-[#262626] h-[calc(100vh-125px)]">
						<span className="font-bold text-black dark:text-white mb-1">
							실시간 이벤트 - 주차 이벤트
						</span>
						<li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />

						<div className="space-y-2 scroll-container overflow-y-auto h-[calc(100vh-180px)] mt-2">							
							{
								(()=> {
									return (
	
										<>
											{eventLog.map((item,idx) => (
												<div
													key={idx}
													className="flex items-center justify-between bg-white px-2 py-1 shadow-md rounded-md border border-gray-200 dark:bg-[#EBECEF]"
												>
													<div className="flex items-center gap-3 w-full">
														<div className="w-[35px] h-[32px] flex items-center justify-center bg-gray-100 rounded-full border">
															<span className="text-lg font-bold text-gray-500">✓</span>
														</div>
														<div className="flex flex-col w-full">
															<div className="flex justify-between items-center">
																<div className="text-sm font-bold text-gray-700 -mb-0.5 overflow-hidden whitespace-nowrap text-ellipsis max-w-[200px]">
																	{item.event_name?.includes(" - ") ? (
																		<>
																			<span className="truncate">{item.event_name.split(" - ")[0]}</span>
																			<span className="text-[11px] truncate" title={item.event_name.split(" - ")[1]}> - {item.event_name.split(" - ")[1]}</span>
																		</>
																	) : (
																		<span className="truncate" title={item.event_name}>{item.event_name || ""}</span>
																	)}
																</div>

																<button
																	className="text-sm bg-[#B1B5C0] rounded-md"
																	onClick={() => eventToggle(idx)}
																>
																	{targetIdx === idx ? 
																		<ParkingIcon.arrowLeftSquare className='w-[22px] h-[22px] p-0.5 text-[#FFFFFF]'/> : 
																		<ParkingIcon.arrowRightSquare className='w-[22px] h-[22px] p-0.5 text-[#FFFFFF]'/>
																	}
																</button>
															</div>
															<div className="flex items-center w-full mt-1">
																<div className="flex-1 border-t border-gray-300"></div>
															</div>
															<div className="flex items-center justify-between">
																<div className="table text-xs text-gray-500 mt-1">
																	<div className="table-row">
																		<span className="table-cell text-right pr-1">발생 일시 :</span>
																		<span className="table-cell text-left">{dayjs(item.event_occurrence_time).format('YYYY-MM-DD HH:mm:ss')}</span>
																	</div>
																	<div className="table-row">
																		<span className="table-cell text-right pr-1">발생 위치 :</span>
																		<span className="table-cell text-left">{item.location}</span>
																	</div>

																	{targetIdx === idx && item.event_type_id === 41 && (
																		<>
																			<div className="table-row">
																				<span className="table-cell text-right pr-1">장지 종류 :</span>
																				<span className="table-cell text-left">
																					{{
																						sensor: "주차면 센서",
																						camera: "카메라"
																					}[item.device_type as string] || ''}
																				</span>
																			</div>
																			<div className="table-row">
																				<span className="table-cell text-right pr-1">장치 이름 :</span>
																				<span className="table-cell text-left">{item.device_no16}</span>
																			</div>
																			<div className="table-row">
																				<span className="table-cell text-right pr-1">장치 IP :</span>
																				<span className="table-cell text-left">{item.device_ip}</span>
																			</div>
																		</>
																	)}
																</div>
															</div>
														</div>
													</div>
												</div>
											))}
										</>
										
									)
								})()
							}
						</div>
					</div>
				</div>
			</div>
        </section>
	)
}

type TreeProps = {
	tree: TreeBuilding[];
	type: number;
};

/**
 * @param { tree } : 트리 데이터
 * @param { type } : 1 : 위치 , 2 : 장치
 */
function Tree({ tree, type }: TreeProps) {
	const [buildingToggleState, setBuildingToggleState] = useState(new Set());
	const [floorToggleState, setFloorToggleState] = useState(new Set());
	const [deviceToggleState, setDeviceToggleState] = useState(new Set());

	const toggleBuilding = (buildingIndex : number) => {
		setBuildingToggleState((prev) => {
			const newState = new Set(prev);
			if (newState.has(buildingIndex)) newState.delete(buildingIndex);
			else newState.add(buildingIndex);
			return newState;
		});
	};
	
	const toggleFloor = (buildingIndex : number, floorIndex : number) => {
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
		const deviceMap: { [deviceType: string]: TreeDevice[] } = {};
		
		tree.forEach((building) => {
			building.items.forEach((floor) => {
				floor.devices.forEach((device) => {
					if (!deviceMap[device.type]) {
						deviceMap[device.type] = [];
					}
	
					deviceMap[device.type].push(device);
				});
			});
		});

		return Object.entries(deviceMap).map(([deviceType, devices], index) => ({
			type: deviceType,
			id: index,
			devices: deviceType === 'camera' ? devices.sort((a, b) => a.idx - b.idx) : devices,
		}));
	};

	const countDevices = (devices: { status: boolean }[]) => {
		const total = devices.length;
		const errors = devices.filter(device => device.status === false).length;
		return { total, errors };
	};
	
	return (
		<>
			{type === 1 ? 
				tree.map((building, buildingIndex) => (
					<div key={`building-${buildingIndex}`} className="p-1 rounded-md bg-[#EBECEF]">
						<div
							className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${
								buildingToggleState.has(buildingIndex) ? "bg-[#FAFBFB] border rounded-md border-gray-300" : "bg-[#EBECEF]"
							}`}
							onClick={() => toggleBuilding(buildingIndex)}
						>
							<span>{building.buildingName}</span>
							<span className="text-[#8D8D8D]">
								{buildingToggleState.has(buildingIndex) ? "▲" : "▼"}
							</span>
						</div>
						
						{buildingToggleState.has(buildingIndex) &&
							building.items.map((parkingLot, floorIndex) => (
								<div key={`parkingLot-${floorIndex}`} className="mt-1 ml-4">
									{parkingLot.floor ? (
										<div
											className={`font-semibold p-1 flex justify-between text-black cursor-pointer ${
												floorToggleState.has(`${buildingIndex}-${floorIndex}`)
													? "bg-[#FAFBFB] border rounded-md border-gray-300"
													: "bg-[#EBECEF]"
											}`}
											onClick={() => toggleFloor(buildingIndex, floorIndex)}
										>
											<span>{parkingLot.floor}</span>
											<span className="text-[#8D8D8D]">
												{floorToggleState.has(`${buildingIndex}-${floorIndex}`) ? "▲" : "▼"}
											</span>
										</div>
									) : (
										<ul className="ml-4 space-y-1">
											{parkingLot.devices.map((device, deviceIndex) => (
												<li
													key={`device-${deviceIndex}`}
													className="p-1 text-black flex justify-between items-center"
												>
													<span
														className={`${
															!device.status ? "text-red-500" : ""
														}`}
													>
														{device.type === "sensor"
														? `센서 - ${device.area_name}`
														: device.service_type === "mgist"
														? `CCTV - ${device.camera_id}.${device.camera_name}(${device.vms_name})`
														: `CCTV - ${device.camera_name} (개별 카메라)`}
													</span>
													{!device.status && (
														<ParkingIcon.exclamation className="w-[1rem] h-[1rem] text-red-500" />
													)}
												</li>
											))}
										</ul>
									)}

									{floorToggleState.has(`${buildingIndex}-${floorIndex}`) && (
										<ul className="ml-4 space-y-1">
											{parkingLot.devices.map((device, deviceIndex) => (
												<li
													key={`device-${deviceIndex}`}
													className="p-1 text-black flex justify-between items-center"
												>
													<span
														className={`${
															!device.status ? "text-red-500" : ""
														}`}
													>	
														{device.type === "sensor"
														? `센서 - ${device.area_name}`
														: device.service_type === "mgist"
														? `CCTV - ${device.camera_id}.${device.camera_name}(${device.vms_name})`
														: `CCTV - ${device.camera_name} (개별 카메라)`}
													</span>
													{!device.status && (
														<ParkingIcon.exclamation className="w-[1rem] h-[1rem] text-red-500" />
													)}
												</li>
											))}
										</ul>
									)}
								</div>
							))
						}
					</div>
				))
				: 
				deviceGroupTree().map((group, groupIndex) => {
					const { total, errors } = countDevices(group.devices);
					
					return (
						<div key={`device-group-${groupIndex}`} className="p-1 rounded-md bg-[#EBECEF]">
							<div
								className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${
									deviceToggleState.has(groupIndex) ? "bg-[#FAFBFB] border rounded-md border-gray-300" : "bg-[#EBECEF]"
								}`}
								onClick={() => toggleDeviceType(groupIndex)}
							>
								<span>
									{group.type === "sensor"
									? `센서`
									: `CCTV`}
								</span>

								<span className="flex items-center gap-2">
									<span className="text-[#737373] text-[10px]">전체 {total}개</span>
									{errors > 0 && (
										<span className="text-[#FF755B] text-[10px]">연결 끊김 {errors}개</span>
									)}
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
											className="p-1 text-black flex justify-between items-center"
										>
											<span className={`${!device.status ? "text-red-500" : ""}`}>
												{device.type === "sensor"
												? `센서 - ${device.area_name}`
												: device.service_type === "mgist"
												? `CCTV - ${device.camera_id}.${device.camera_name}(${device.vms_name})`
												: `CCTV - ${device.camera_name} (개별 카메라)`}
											</span>

											{!device.status && (
												<ParkingIcon.exclamation className="w-[1rem] h-[1rem] text-red-500" />
											)}
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})
			}
		</>
	);
}