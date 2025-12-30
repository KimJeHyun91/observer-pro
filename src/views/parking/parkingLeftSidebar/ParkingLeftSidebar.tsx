import ParkingIcon from '@/configs/parking-icon.config';
import { useState, useEffect } from 'react';
import { ParkingAccessLog, ParkingStatusData, ChartDataType } from '@/@types/parking';
import dayjs from 'dayjs';
import { useDataStatusStore } from '@/store/useDataStatusStore';
import { apiAccessTimeZone, apiAccessLogList, apiParkingTypeCountUsedArea } from '@/services/ParkingService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import LineChart  from "../components/LineChart"
import CustomDatePicker from "@/components/common/customDatePicker";

export default function ParkingLeftSidebar() {
    const defaultParkingStatus : ParkingStatusData = {
      use_all: '0',
      use_general: '0',
      use_compact: '0',
      use_disabled: '0',
      use_electric: '0',
    };
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const [parkingAccessLog, setParkingAccessLog] = useState<ParkingAccessLog[]>([]);
    const {service} = useDataStatusStore((state) => state.tabs.parking);
    const [status, setStatus] = useState<ParkingStatusData>(defaultParkingStatus);
    const { socketService } = useSocketConnection();
    const [chartSeries, setChartSeries] = useState<{ name: string; data: number[] }[]>([]);
    const [chartCategories, setChartCategories] = useState<string[]>([]);
    const [dates, setDates] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: yesterday,
        endDate: today,
    });

    const carStateData = (status: ParkingStatusData) => [
      {
        name: '일반 차량',
        icon : <ParkingIcon.generalCar className='w-[30px] h-[30px] text-white dark:text-[#ccc9c9]'/> ,
        iconBgColor : '#1F40D667',
        count: status.use_general || 0,
      },
      {
        name: '경차',
        icon : <ParkingIcon.compactCar className='w-[40px] h-[40px] text-white dark:text-[#ccc9c9]'/> ,
        iconBgColor : '#0DC5E063',
        count: status.use_compact || 0,
      },
      {
        name: '장애인 등록 차량',
        icon : <ParkingIcon.disabledCar className='w-[30px] h-[30px] text-white dark:text-[#ccc9c9]'/>,
        iconBgColor : '#E9B7076D',
        count: status.use_disabled || 0,
      },
      {
        name: '전기 차량',
        icon : <ParkingIcon.electricCar className="w-[40px] h-[35px] text-white dark:text-[#ccc9c9]" />,
        iconBgColor : '#099B3F75',
        count: status.use_electric || 0,
      },
    ];
    
    const carState = carStateData(status);
    
    useEffect(() => {
        getStatusData();
        getChartData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (dates.startDate && dates.endDate) {
            getBuildingAccessLogList();
        } 

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dates]);

    useEffect(() => {
      if (!socketService) {
          return;
      }

      const parkingSocket = socketService.subscribe('pm_area-update', async (received) => {
            if (received) {
              getStatusData();
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

    const getChartData = async () => {
        try{
            const data = {
                startDate: dayjs(new Date()).format('YYYYMMDD'),
                endDate: dayjs(new Date()).format('YYYYMMDD'),
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

    const getBuildingAccessLogList = async () => {
      if (!dates.startDate || !dates.endDate) {
          return;
      }
      
      try {
          const data = {
              startDate: dayjs(dates.startDate).format('YYYYMMDD'),
              endDate: dayjs(dates.endDate).format('YYYYMMDD'),
          } as unknown as ParkingAccessLog ;

          const res = await apiAccessLogList<ParkingAccessLog>(data);

          if (!res || !res.result) {
              return;
          }
          
          setParkingAccessLog(res.result);
      } catch (e) {
          console.error('주차장 차량 출입 현황 API 에러:', e);
          setParkingAccessLog([]);
      }
  };

  const dateChange = (dates: { startDate: Date | null; endDate: Date | null }) => {
      setDates(dates);
  };

  return (
    <div className="w-96 flex-shrink-0 bg-gray-100 dark:bg-gray-900 h-full flex flex-col pb-2">
      {/* 상단: 현황 요약 */}
      <div className="flex flex-col gap-1 p-3 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-2">
        <span className="font-bold text-black dark:text-white">현황</span>
        <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
        
        <div className="grid grid-cols-2 gap-2">
          {carState.map((item,index)=> (
            <div key={index} className="flex items-center p-3 bg-gray-100 rounded-md shadow dark:bg-[#737373]">
              {/* 왼쪽 아이콘 박스 */}
              <div
                className={`w-12 h-12 rounded-md flex items-center justify-center mr-3`}
                style={{ backgroundColor: item.iconBgColor }}
              >  {item.icon}            
              </div>

              {/* 오른쪽 텍스트 */}
              <div className="flex flex-col items-end ml-auto">
                <span className="text-xs text-black dark:text-[#FFFFFF]">{item.name}</span>
                <span className="text-2xl font-bold text-black dark:text-[#FFFFFF]">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 중간: 데이터 및 그래프 */}
      <div className="flex flex-col gap-1 p-3 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-2">
        <span className="font-bold text-black dark:text-white">데이터</span>
        <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
        <div className=" bg-gray-100  rounded-md shadow h-[200px] dark:bg-[#EBECEF]">
            <LineChart series={chartSeries} categories={chartCategories} height={200} />
        </div>
      </div>

      {/* 하단: 차량 출입 기록 */}
      <div className="flex flex-col gap-1 p-3 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow">
          <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-black dark:text-white">
                  차량 출입 기록
              </h3>
          </div>
          <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />

          <CustomDatePicker
              title={{
                text: "조회 기간 설정",
                className: "ml-1 mr-1 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
              }}
              startDate={dates.startDate}
              endDate={dates.endDate}
              className='rounded bg-[#EBECEF] mt-1 mb-1 dark:bg-[#A9A9A9]'
              height={25}
              width={120}
              onChange={dateChange}
          />
          <div 
            className={`scroll-container  pr-1 overflow-y-auto ${
              service ? "h-[calc(100vh-770px)]" : "h-[calc(100vh-710px)]"
          }`}>
              <div className="flex-1 space-y-1">                        
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
                                     <span className="text-sm font-bold text-gray-700">
                                        {(() => {
                                          const outside = item.outside_name || '';  
                                          const inside = item.inside_name || '';

                                          return `${outside} ${inside}`.trim() ? `${outside} - ${inside} 주차장` : '주차장';
                                        })()}
                                      </span>

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

                  {parkingAccessLog.length === 0 && (
                      <div className="ml-1 mt-2 font-normal text-black dark:text-[#FFFFFF]">
                          차량 출입 기록이 없습니다.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}
