import { useDataStatusStore } from '@/store/useDataStatusStore';
import { TreeNode, ParkingTypeCountAreaList, ParkingTypeSumAreaList, ParkingAccessLog } from '@/@types/parking';
import { useEffect, useState } from 'react';
import { apiParkingTypeCountAreaList, apiParkingTypeSumAreaList, apiBuildingAccessLogList } from '@/services/ParkingService';
import ParkingAll from '../../../assets/styles/images/parking_All.png';
import ParkingIcon from '@/configs/parking-icon.config';
import Progress from '@/components/ui/Progress'
import dayjs from 'dayjs';
import { useParkingStore } from '@/store/parking/useParkingStore';
import DefaultBuildingImage from '../../../assets/styles/images/BuildingImage.png';
import CustomDatePicker from "@/components/common/customDatePicker";
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import Loading from '@/components/shared/Loading'

type Props = {
    selectedNode: TreeNode | null; 
    onAreaMove: (updatedNode: TreeNode) => void;
};

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
    totalAll: 0,
    totalUseAll: 0,
};

export default function ParkingDetailParent({ selectedNode, onAreaMove } : Props) {
    const {service} = useDataStatusStore((state) => state.tabs.parking);
    const [floorData, setFloorData] = useState<ParkingTypeCountAreaList[]>([]);
    const [floorTotalData, setFloorTotalData] = useState(defaultFloorTotal);
    const [graphData, setGraphData] = useState<ParkingTypeSumAreaList[]>([]);
    const [graphTotalData, setGraphTotalData] = useState(defaultGraphTotal);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const [parkingAccessLog, setParkingAccessLog] = useState<ParkingAccessLog[]>([]);
    const { mapImageURL } = useParkingStore((state) => state.buildingState);
    const { socketService } = useSocketConnection();
    const [isLoadingParking, setIsLoadingParking] = useState(true);  
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true); 

    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: yesterday,
        endDate: today,
    });

    useEffect(() => {
        if (selectedNode) {
            getParkingTypeCountAreaInfo();
            getParkingTypeSumAreaList();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedNode]);

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const parkingSocket = socketService.subscribe('pm_area-update', (received) => {
            if (received) {
                getParkingTypeCountAreaInfo();
                getParkingTypeSumAreaList();
            }
        })

        return () => {
            parkingSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(() => {
        if (dates.startDate && dates.endDate) {
            const timeout = setTimeout(() => {
                getBuildingAccessLogList();
            }, 150);
    
            return () => clearTimeout(timeout);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dates]);
    

    const getBuildingAccessLogList = async () => {
        if (!dates.startDate || !dates.endDate) {
            return;
        }

        setIsLoadingLogs(true);
        try {
            const data = {
                idx: selectedNode?.outside_idx,
                startDate: dayjs(dates.startDate).format('YYYYMMDD'),
                endDate: dayjs(dates.endDate).format('YYYYMMDD'),
            } as unknown as ParkingAccessLog ;
    
            const res = await apiBuildingAccessLogList<ParkingAccessLog>(data);
    
            if (!res || !res.result) {
                return;
            }
            
            setParkingAccessLog(res.result);
        } catch (e) {
            console.error('주차장 세부 현황 API 에러:', e);
            setParkingAccessLog([]);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const getParkingTypeCountAreaInfo = async () => {
        setIsLoadingParking(true);
        try {
            const data = {
                outsideIdx: selectedNode?.outside_idx,
            };
        
            const res = await apiParkingTypeCountAreaList<ParkingTypeCountAreaList>(data);
            
            if (!res || !res.result) {
                resetData('floor');
                return;
            }

            const resultData = res.result;

            setFloorData(resultData);
            setFloorTotalData(calcFloorTotals(resultData));
        } catch (e) {
            console.error('주차장 세부 현황 API 에러:', e);
            setFloorData([]);
            setFloorTotalData(defaultFloorTotal);
        } finally {
            setIsLoadingParking(false);
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
    
    const getParkingTypeSumAreaList = async () => {
        setIsLoadingGraph(true);
        try {
            const data = {
                outsideIdx: selectedNode?.outside_idx,
            };
            
            const res = await apiParkingTypeSumAreaList<ParkingTypeSumAreaList>(data);
            
            if (!res || !res.result) {
                resetData('graph');
                return;
            }

            const resultData = res.result;

            setGraphData(resultData);
            setGraphTotalData(calcGraphTotals(resultData));
        } catch (e) {
            console.error('주차장 층별 그래프 현황 API 에러:', e);
            setGraphData([]);
            setGraphTotalData(defaultGraphTotal);
        } finally {
            setIsLoadingGraph(false);
        }
    };

    const calcGraphTotals = (data: ParkingTypeSumAreaList[]) =>
        data.reduce(
            (acc, curr) => ({
                totalAll: acc.totalAll + Number(curr.all),
                totalUseAll: acc.totalUseAll + Number(curr.use_all),
            }),
        { ...defaultGraphTotal }
    );

    const areaMove = (floor: ParkingTypeCountAreaList) => {
        if (!floor.outside_idx || !floor.inside_idx) {
            return;
        }

        const updatedNode: TreeNode = {
            outside_idx: parseInt(floor.outside_idx, 10),
            outside_name: selectedNode?.outside_name || "",
            inside_idx: floor.inside_idx,
            inside_name: floor.inside_name,
            step: selectedNode?.step || "",
        };

        onAreaMove(updatedNode);
    };

    const resetData = (type : string) => {
        if(type === 'floor'){
            setFloorData([]);
            setFloorTotalData(defaultFloorTotal);
        }else if(type === 'graph'){
            setGraphData([]);
            setGraphTotalData(defaultGraphTotal);
        }
    };
    
    const dateChange = (dates: { startDate: Date | null; endDate: Date | null }) => {
        setDates(dates);
    };
    
    return (
        <>
            {/* 하단 위쪽 (40%) */}
            <div className="flex-[4] basis-4/10 flex mb-2">
                {/* 왼쪽 영역 (60%) */}
                <div className={`w-[952px] mr-2 p-2 h-[253px] rounded-md shadow-md bg-gray-100 dark:bg-[#404040]`}>
                    <h3 className="text-sm font-bold text-black dark:text-white">
                        전체 주차장 세부 현황
                    </h3>

                    {isLoadingParking ? (
                        <Loading loading={true} />
                    ) : (
                        <>
                            {/* 위쪽 박스: 층별 데이터 */}
                            <div className={`scroll-container flex-1  overflow-y-auto  p-2 rounded-md mt-1 bg-white dark:bg-[#A9A9A9] dark:text-[#FFFFFF]
                                h-[160px]
                            `}> 
                                {floorData.map((floor,index) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center p-2"
                                    >
                                        <span className="w-10 text-sm font-bold">{floor.floor_order}</span>

                                        <div className='flex'>
                                            <img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-2" /> 
                                            <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                                {floor.use_all} / {floor.all}
                                            </span>
                                        </div>
                                        
                                        <div className='flex'>
                                            <ParkingIcon.generalCar className='w-[20px] h-[20px] mr-2'/>
                                            <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                                {floor.use_general} / {floor.general}
                                            </span>
                                        </div>
                                        
                                        <div className='flex'>
                                            <ParkingIcon.compactCar className='w-[25px] h-[25px] mr-2'/>
                                            <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                                {floor.use_compact} / {floor.compact}
                                            </span>
                                        </div>
                                        
                                        <div className='flex'>
                                            <ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-2'/>
                                            <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                                {floor.use_disabled} / {floor.disabled}
                                            </span>
                                        </div>
                                        
                                        <div className='flex'>
                                            <ParkingIcon.electricCar className='w-[23px] h-[22px] mr-2'/>
                                            <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                                {floor.use_electric} / {floor.electric}
                                            </span>
                                        </div>
                                        
                                        <button className={`w-20 text-white text-sm px-2 py-1 rounded bg-[#647DB7] dark:bg-[#696969]`} 
                                            onClick={()=> areaMove(floor)}>
                                            구역 설정
                                        </button>
                                    </div>
                                ))}

                                {floorData.length === 0 && (
                                    <div className={`mt-1 font-normal text-black dark:text-[#FFFFFF]`}>
                                        층 데이터가 없습니다.
                                    </div>
                                )}
                            </div>

                            {/* 아래쪽 박스: 전체 데이터 */}
                            <div className="mt-3">
                                <div className={`flex justify-between items-center p-2 rounded-md bg-white dark:bg-[#A9A9A9] dark:text-[#FFFFFF]'}
                                `}>
                                    <span className="w-10 text-sm font-bold">전체</span>
                                    <div className='flex'>
                                        <img src={ParkingAll} alt="All Parking" className="w-5 h-5 mr-2" /> 
                                        <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                            {floorTotalData.totalUseAll} / {floorTotalData.totalAll}
                                        </span>
                                    </div>
                                    <div className='flex'>
                                        <ParkingIcon.generalCar className='w-[20px] h-[20px] mr-2 text-[#1F40D6]'/>
                                        <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                            {floorTotalData.totalUseGeneral} / {floorTotalData.totalGeneral}
                                        </span>
                                    </div>
                                    
                                    <div className='flex'>
                                        <ParkingIcon.compactCar className='w-[25px] h-[25px] mr-2 text-[#0DC5E0]'/>
                                        <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                            {floorTotalData.totalUseCompact} / {floorTotalData.totalCompact}
                                        </span>
                                    </div>
                                    
                                    <div className='flex'>
                                        <ParkingIcon.disabledCar className='w-[20px] h-[20px] mr-2 text-[#E9B707]'/>
                                        <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                            {floorTotalData.totalUseDisabled} / {floorTotalData.totalDisabled}
                                        </span>
                                    </div>
                                    
                                    <div className='flex'>
                                        <ParkingIcon.electricCar className='w-[23px] h-[22px] mr-2 text-[#099B3F]'/>
                                        <span className="w-[100px] text-sm text-gray-700 border text-center rounded-md">
                                            {floorTotalData.totalUseElectric} / {floorTotalData.totalElectric}
                                        </span>
                                    </div>

                                    <span className="w-20 text-sm text-gray-700"></span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 오른쪽 영역 (40%) */}
                <div className={`w-[640px] p-2 h-[253px] flex flex-col rounded-md shadow-md bg-gray-100 dark:bg-[#404040]`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-black dark:text-white mb-1">
                            층별 주차 현황 그래프
                        </h3>

                        <div className="flex items-center gap-2  p-1 rounded-md mb-[3px] mt-[-6px]">
                            <div className="flex items-center gap-1 mr-3 ml-2">
                                <span className="w-16 h-4 bg-green-500 mr-1"></span>
                                <span className="text-xs text-gray-700 dark:text-white">여유</span>
                            </div>
                            <div className="flex items-center gap-1 mr-3 ml-3">
                                <span className="w-16 h-4 bg-yellow-500 mr-1"></span>
                                <span className="text-xs text-gray-700 dark:text-white">보통</span>
                            </div>
                            <div className="flex items-center gap-1 mr-2 ml-3">
                                <span className="w-16 h-4 bg-red-500 mr-1"></span>
                                <span className="text-xs text-gray-700 dark:text-white">만차</span>
                            </div>
                        </div>
                    </div>

                    {isLoadingGraph ? (
                            <Loading loading={true} /> 
                    ) : (
                        <>
                            {/* 위쪽 박스: 층별 막대 그래프 */}
                            <div className={`flex-1 overflow-y-auto scroll-container mr-1 bg-white p-1 rounded-md dark:bg-[#A9A9A9] dark:text-[#FFFFFF]
                                ${service ? "max-h-[160px]" : "max-h-[180px]"}`}>
                                {graphData.map((item, index, arr) => {
                                    const percentage = item.use_all === 0 ? 0 : (item.use_all / item.all) * 100;
                                    
                                    const barColor =
                                            percentage === 100 ? 'bg-red-500'
                                                : percentage >= 60 ? 'bg-yellow-500'
                                                : 'bg-green-500';

                                    return (
                                        <div key={index} className='m-2'>
                                            <div className={`flex items-center ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
                                                <span className="w-[8%] text-sm font-bold">{item.inside_name}</span>
                                                
                                                {Number(item.use_all) === 0 && Number(item.all) === 0 ? (
                                                    <span className="w-[100%] text-sm text-gray-500 dark:text-[#FFFFFF]">
                                                        주차 면구역이 없습니다
                                                    </span>
                                                ) : (
                                                    <>
                                                        <div className="w-[100%] h-3 mt-1">
                                                            <Progress
                                                                customColorClass={barColor}
                                                                percent={percentage}
                                                                className="mb-4"
                                                                size="md"
                                                                showInfo={false} 
                                                            />
                                                        </div>

                                                        <span className="w-[12%] text-sm text-gray-700 text-right dark:text-[#FFFFFF]">
                                                            {item.use_all}/{item.all}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {graphData.length === 0 && (
                                    <div className="ml-1 mt-2 font-normal text-black dark:text-[#FFFFFF]">
                                        층 데이터가 없습니다.
                                    </div>
                                )}
                            </div>
                                
                            {/* 아래쪽 박스: 전체 데이터 */}
                            <div className="mt-2 pt-1">
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
                                            <div className="flex justify-between items-center p-2 bg-white rounded-md h-[41px] dark:bg-[#A9A9A9]">
                                                <span className="w-[8%] text-sm font-bold dark:text-[#FFFFFF]">전체</span>

                                                <div className="w-[100%] h-3 mt-1">
                                                    <Progress
                                                        customColorClass={barColor}
                                                        percent={percentage}
                                                        className="mb-4"
                                                        size="md"
                                                        showInfo={false} 
                                                    />
                                                </div>

                                                <span className="w-[12%] text-sm text-gray-700 text-right dark:text-[#FFFFFF]">
                                                    {graphTotalData.totalUseAll}/{graphTotalData.totalAll}
                                                </span>
                                            </div>
                                        )
                                    })()
                                }
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 하단 아래쪽 (60%) */}
            <div className="flex-[6] basis-6/10 flex">
                {/* 왼쪽 영역 (70%) */}
                <div className={`w-[1108px] bg-gray-100 mr-2 p-2 flex items-center justify-center rounded-md shadow-md dark:bg-[#A9A9A9]
                  ${service ? "h-[calc(100vh-569px)]" : "h-[calc(100vh-510px)]"}`}>
                    <img
                        src={mapImageURL || DefaultBuildingImage}
                        alt="BuildingImage"
                        className="w-[700px] h-full object-contain rounded-md py-2"
                    />
                </div>

                {/* 오른쪽 영역 (30%) */}
                <div className="w-[484px] bg-gray-100 p-2 flex flex-col rounded-md shadow-md dark:bg-[#A9A9A9]">
                    <div className="flex justify-between items-center pb-2">
                        <h3 className="text-sm font-bold text-black dark:text-white">
                            차량 출입 기록
                        </h3>
                    </div>
                    <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8] dark:border-[#ccc9c9]" />
                    <div className="flex justify-end mt-1">
                        <CustomDatePicker
                            title={{
                                text: "",
                                className: "mr-2",
                            }}
                            startDate={dates.startDate}
                            endDate={dates.endDate}
                            className='rounded'
                            height={25}
                            onChange={dateChange}
                        />
                    </div>


                    <div 
                     className={`scroll-container mt-1 pr-1 overflow-y-auto ${
                        service ? "h-[calc(100vh-660px)]" : "h-[calc(100vh-610px)]"
                    }`}>
                        <div className="flex-1 space-y-1 h-full">  
                            {isLoadingLogs ? (
                                <div className="flex justify-center items-center h-full w-full">
                                    <Loading loading={true} />
                                </div>
                            ) : parkingAccessLog.length === 0 ? (
                                <div className="ml-1 mt-2 font-normal text-black dark:text-[#FFFFFF]">
                                    차량 출입 기록이 없습니다.
                                </div>
                            ) : (
                                <>
                                    {parkingAccessLog.map((item,index)=> (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between bg-white p-3 shadow-md rounded-md border border-gray-200 dark:bg-[#EBECEF]"
                                        >
                                            <div className="flex items-center gap-3 w-full">
                                                <div className="w-[35px] h-[32px] flex items-center justify-center bg-gray-100 rounded-full border">
                                                    <span className="text-lg font-bold text-gray-500">✓</span>
                                                </div>
                                                <div className="flex flex-col w-full">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-bold text-gray-700">{item.outside_name + ' - ' + item.inside_name + ' 주차장'}</span>
                                                        <span className="text-xs text-gray-500"></span>
                                                    </div>
                                                    <div className="flex items-center w-full mt-1">
                                                        <div className="flex-1 border-t border-gray-300"></div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className='mt-1'>
                                                            <span className="text-xs text-gray-500 mt-1">차량 번호 : {item.vehicle_number}</span><br />
                                                            <span className="text-xs text-gray-500">출입 시간 : {dayjs(item.in_at).format('YYYY-MM-DD HH:mm:ss')}</span>
                                                        </div>

                                                        <div className="flex items-center justify-center w-8 h-8 bg-[#909090] mt-2.5 rounded-sm">
                                                            <ParkingIcon.parkingMarker className='w-[20px] h-[25px] text-white '/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
