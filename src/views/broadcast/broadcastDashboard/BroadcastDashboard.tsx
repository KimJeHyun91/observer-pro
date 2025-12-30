import { Button, Card, Input, Menu, MenuItem, ScrollBar } from '@/components/ui'
import { IoChevronDown, IoChevronUp } from 'react-icons/io5'
import { MdError, MdErrorOutline } from 'react-icons/md'
import React, { useEffect, useMemo, useState } from 'react'
import NetworkDeviceError from './NetworkDeviceError'
import SpeakerControl from './SpeakerControl'
import Header from '@/components/shared/Header'
import BroadcastStatus from '../broadcastStatus/BroadcastStatus'
import { DeviceList } from './DeviceList'
import BroadcastTransmissionStatus from './BroadcastTransmissionStatus'
import SpeakerTransmissionStatus from './SpeakerTransmissionStatus'
import DeviceStatusTable from './DeviceStatus'
import WeeklyBroadcastSchedule from './WeeklyBroadcastSchedule'
import CustomDatePicker from '@/components/common/customDatePicker'
import WaterLevelChart from '@/views/inundation/Dashboard/components/WaterlevelChart'
import { ThresholdList } from '@/views/inundation/Dashboard/components/ThresholdList'
import { useServiceNavStore } from '@/store/serviceNavStore'
import { useEventLogList } from '@/utils/hooks/useEventLog'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import dayjs from 'dayjs';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore'
import { useBroadcastArea } from '@/utils/hooks/useBroadcast'
import { BroadcastAreaResponse } from '@/@types/broadcast'



const BroadcastDashboard = () => {
    const [viewMode, setViewMode] = useState<'device' | 'location'>('location');
    const { setNavServiceState } = useServiceNavStore();
    const {data: eventLogList, mutate: getEventLogList} = useEventLogList()
    const { socketService } = useSocketConnection();
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    const [dateRange, setDateRange] = useState<{
        startDate: Date | null;
        endDate: Date | null;
    }>({
        startDate: oneWeekAgo,
        endDate: today
    });
    const {areaList, mutate} = useBroadcastArea()

    const getValidOutsideSiteIds = (data: BroadcastAreaResponse[]) => {
        return [...new Set(
            data
                ?.filter(item => item.outside_site_transmitter_id !== null)
                ?.map(item => item.outside_site_id)
        )];
    }

    const siteId = useMemo(() => getValidOutsideSiteIds(areaList?.result), [areaList]);

    useEffect(()=>{
        mutate()
    },[])

    const chartDateChange = (dates: { startDate: Date | null; endDate: Date | null }) => {
        setDateRange(dates);
    };

    useEffect(() => {
        setNavServiceState(true);

        return () => {
            setNavServiceState(false);
        };
    }, [setNavServiceState]);

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const eventLogSocket = socketService.subscribe('vb_event-update', (received) => {
            if (!received) return;
            
            getEventLogList();
           
        })

        return () => {
            eventLogSocket();
        }

    }, [socketService])


    const eventData = eventLogList?.result.filter(event => event.main_service_name === 'broadcast').map((event, idx) => ({
        id: event.idx,
        type: event.event_name,
        deviceType: event.device_type,
        location: event.location,
        deviceName: event.device_name,
        ip: event.ip,
        date: dayjs(event.event_occurrence_time).format('YYYY년 MM월 DD일 HH:mm:ss') ,
        time: event.event_time,
    }));
  
    return (
      <section className="h-full flex flex-col">
      <Header
          onViewModeChange={()=> {}}
          currentView="dashboard"
          serviceType="broadcast"
      >
        <BroadcastStatus />
      </Header>
      <div className="h-screen max-h-screen flex flex-1 p-2 gap-2 overflow-hidden">
          <div className="w-[15%] flex flex-col overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="px-3 pt-3">
                  <div className="flex justify-between items-center">
                      <h5 className="font-semibold dark:text-gray-200">장치 목록</h5>
                      <select
                          className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 mb-1"
                          value={viewMode}
                          onChange={(e) => setViewMode(e.target.value as 'device' | 'location')}
                      >
                          <option value="location">위치별</option>
                          <option value="device">장치별</option>
                      </select> 
                  </div>
                  <div className="border-t-2 border-[#b8b8b8] dark:border-gray-700 mx-1"></div>
              </div>

              <div className="h-[calc(100%-40px)]">
                  <div className="h-full p-3">
                  {/* <NestedMenu /> */}
                  <DeviceList viewMode={viewMode} areaList={areaList?.result}/>
                  </div>
              </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 ">
              <div className="flex gap-2" style={{ height: '400px' }}>
                  <div className="flex-[0.8] min-h-[380px] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                      <div className="flex justify-between items-center w-full mb-3 border-b-2 border-[#b8b8b8] dark:border-gray-700 my-[0.125rem]">
                          <h5 className="font-semibold dark:text-gray-200">네트워크 장애 현황</h5>
                          <div><MdError color="red" size={19} /></div>
                      </div>
                      <div className="h-[calc(100%-40px)]">
                         <NetworkDeviceError siteId={siteId} />
                      </div>
                  </div>

             

                  <div className="flex-[0.8] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                      <div className="flex justify-between items-center w-full mb-3 border-b-2 border-[#b8b8b8] dark:border-gray-700 my-[0.125rem]">
                          <h5 className="font-semibold dark:text-gray-200">스피커 현황</h5>
                      </div>
                      <div className="flex gap-2">
                      </div>
                      <div className="h-[calc(100%-40px)]">
                         <SpeakerControl />
                      </div>
                  </div>
                <div className='flex flex-[1.8] flex-col gap-1'>
                  <div className="h-[49%] bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md">
                      <div className="flex justify-between items-center w-full  border-b-2 border-[#b8b8b8] dark:border-gray-700 ">
                          <h5 className="font-semibold dark:text-gray-200">장치 현황</h5>
                      </div>
                      <div className="h-full flex items-start p-2"> 
                        <DeviceStatusTable siteId={siteId} />
                      </div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-md">
                      <div className="flex justify-between items-center w-full mb-0 border-b-2 border-[#b8b8b8] dark:border-gray-700 my-[0.125rem]">
                          <h5 className="font-semibold dark:text-gray-200">주간 발송 스케줄</h5>
                      </div>
                      <div className="h-[calc(100%-40px)] mt-2">
                        <WeeklyBroadcastSchedule/>
                      </div>
                  </div>
                </div>
              </div>
{/* 
              <div className="flex-[19] basis-19/20 mb-1 flex flex-row gap-2.5">
                  <div className="flex-[7] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                      <div className="flex justify-between items-center w-full  mb-2 border-b-2 border-[#b8b8b8] dark:border-gray-700 my-[0.125rem]">
                          <h5 className="font-semibold dark:text-gray-200">데이터 차트</h5>
                          <div className="flex items-center gap-1">
                            <CustomDatePicker
                              title={{
                                text: "조회 기간 설정",
                                className: "ml-1 mr-1 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
                              }}
                              startDate={dateRange.startDate}
                              endDate={dateRange.endDate}
                              className='rounded bg-[#EBECEF] mt-1 mb-1 dark:bg-[#A9A9A9]'
                              height={25}
                              onChange={chartDateChange}
                            />
                          </div>
                      </div>

                    <div className="h-[calc(100%-50px)] flex flex-col md:flex-row gap-2 overflow-hidden">
                        <div className="w-full md:w-[35%] h-full flex min-h-0">
                            <div className="flex-1 bg-[#ebecef] p-2 rounded-lg ">
                              <BroadcastTransmissionStatus dateRange={dateRange} />
                            </div>
                        </div>

                        <div className="w-full md:w-[65%] h-full flex min-h-0">
                            <div className="flex-1 bg-[#ebecef] p-2 rounded-lg ">
                              <SpeakerTransmissionStatus dateRange={dateRange}  />
                            </div>
                        </div>
                        </div>    
                    </div>
              
                  </div>     */}
                  <div className='h-full bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md'>
                    {/* 데이터 차트 */}
                        <div className="h-[12%] flex justify-between items-center w-full  mb-2 border-b-2 border-[#b8b8b8] dark:border-gray-700 my-[0.125rem]">
                          <h5 className="font-semibold dark:text-gray-200">데이터 차트</h5>
                          <div className="flex items-center gap-1">
                          <CustomDatePicker
                            title={{
                            text: "조회 기간 설정",
                            className: "ml-1 mr-1 text-[#A1A1AA] text-xs dark:text-[#FFFFFF]",
                            }}
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            className='rounded bg-[#EBECEF] mt-1 mb-1 dark:bg-[#A9A9A9]'
                            height={25}
                            onChange={chartDateChange}
                          />
                          </div>
                        </div>

                        <div className="flex h-[84%] gap-2 overflow-hidden">
                          <div className="w-[35%] flex min-h-0">
                            <div className="flex-1 bg-[#ebecef] dark:bg-gray-600 p-2 rounded-lg">
                              <BroadcastTransmissionStatus siteId={siteId} dateRange={dateRange} />
                            </div>
                          </div>

                          <div className="w-[65%] flex min-h-0">
                            <div className="flex-1 bg-[#ebecef] dark:bg-gray-600 p-2 rounded-lg">
                              <SpeakerTransmissionStatus siteId={siteId} dateRange={dateRange} />
                            </div>
                          </div>
                        </div>
                      
                  </div>
            </div>

          <div className="flex flex-col w-[18%] gap-2">
              <div className="w-full h-[100%] bg-white dark:bg-[#262626] shadow-md rounded-lg p-3">
                  <h5 className="font-semibold dark:text-gray-200">실시간 이벤트 - 마을 방송 이벤트</h5>
                  <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />
                  <div className="h-[calc(100%-48px)]">
                      <ScrollBar className="h-full">
                          <div className="space-y-2 scroll-container overflow-y-auto h-[calc(100vh-180px)] mt-2">							
							{
								(()=> {
                                    // const eventData = Array.from({ length: 15 }, (_, i) => ({
                                    //     id: i + 1,
                                    //     type: i % 3 === 0 ? '정기 방송' : i % 3 === 1 ? '예약 방송' : '파일 업로드',
                                    //     deviceType: i % 2 === 0 ? '스피커' : '마이크',
                                    //     location: `위치 ${i + 1}`,
                                    //     deviceName: `장치 ${String(i + 1).padStart(2, '0')}`,
                                    //     ip: `192.168.1.${100 + i}`,
                                    //     date: `2023-10-${String(i + 1).padStart(2, '0')}`,
                                    //     time: `10:${String(i * 4).padStart(2, '0')}`,
                                    // }));

									return (
	
										<>
											{eventData?.map((event,idx) => (
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
																<span className="text-sm font-bold text-gray-700 -mb-0.5">{event.type}</span>
																<button
																	className="text-sm bg-[#B1B5C0] rounded-md"
																	// onClick={() => eventToggle(idx)}
																>
																</button>
															</div>
															<div className="flex items-center w-full mt-1">
																<div className="flex-1 border-t border-gray-300"></div>
															</div>
															<div className="flex items-center justify-between">
																<div className="table text-xs text-gray-500 mt-1">
																	<div className="table-row">
																		<span className="table-cell text-right pr-1">발생 일시 :</span>
																		<span className="table-cell text-left">{event.date} {event.time}</span>
																	</div>
																	<div className="table-row">
																		<span className="table-cell text-right pr-1">발생 위치 :</span>
																		<span className="table-cell text-left">{event.location}</span>
																	</div>

																	
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
                      </ScrollBar>
                  </div>
              </div>
          </div>
      </div>
  </section>
    )
}

export default BroadcastDashboard

interface NestedMenuItemProps {
    label: React.ReactNode
    children?: React.ReactNode
    isActive?: boolean
}

const NestedMenuItem: React.FC<NestedMenuItemProps> = ({
    label,
    children,
    isActive = false,
}) => {
    const [isOpen, setIsOpen] = useState(true)

    const toggleMenu = () => {
        setIsOpen(!isOpen)
    }

    return (
        <div className=''>
            <MenuItem
                className={`${isOpen && 'mt-1'} `}
                isActive={isActive}
                // dotIndent
                onSelect={(e) => {
                    toggleMenu()
                }}
            >
                <div className={`${isOpen && 'bg-white p-[2px]'} flex justify-between items-center w-full rounded-lg bg-white`}>
                    <span
                    // className={`${isOpen && 'bg-white'} w-full`}
                        // style={{
                        //     fontSize: 16,
                        //     background:'black'
                        // }}
                    >
                        {label}
                    </span>
                    {children && (
                        <span className="text-gray-500">
                            {isOpen ? '▲' : '▼'}
                        </span>
                        // <span>
                        //     {isOpen ? (
                        //         <IoChevronUp className="text-lg" />
                        //     ) : (
                        //         <IoChevronDown className="text-lg" />
                        //     )}
                        // </span>
                    )}
                </div>
            </MenuItem>
            {isOpen && (
                <div className="ml-6 mt-2">
                    {React.Children.map(children, (child) => {
                        return (
                            <>
                                <div className="mb-2">{child}</div>
                            </>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const menuData = [
    {
        label: 'Parent 1',
        children: [{ label: 'Child 1', type: 'warning' }, { label: 'Child 2' }],
    },
    {
        label: 'Parent 2',
        children: [
            {
                label: 'Sub Parent 1',
                children: [{ label: 'Sub Child 1' }, { label: 'Sub Child 1' }],
            },
            {
                label: 'Sub Parent 2',
                children: [{ label: 'Sub Child 2' }, { label: 'Sub Child 2' }],
            },
        ],
    },
    {
        label: 'Parent 3',
        children: [{ label: 'Child 3', type: 'warning' }, { label: 'Child 3' }],
    },
]

const NestedMenu = () => {
    const renderMenu = (
        menuItems: Array<{ label: string; type?: string; children?: any }>,
    ) => {
        return menuItems.map((item) => {
            const textStyle =
                item.type === 'warning' ? 'text-red-500' : 'text-gray'

            if (item.children) {
                return (
                    <NestedMenuItem
                        key={item.label}
                        label={
                            <div className="flex items-center justify-between">
                                <span
                                    className={textStyle}
                                    style={{ fontSize: '15px' }}
                                >
                                    {item.label}
                                </span>
                            </div>
                        }
                    >
                        {renderMenu(item.children)}
                    </NestedMenuItem>
                )
            }
            return (
                <MenuItem
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '10px',
                        pointerEvents: 'none',
                    }}
                    key={item.label}
                    className={textStyle}
                >
                    <p> {item.label}</p>
                    <p>
                        {item.type === 'warning' && (
                            <MdError color="#ef4444" size={19} />
                            // <MdErrorOutline color="red" size={18} />
                        )}
                    </p>
                </MenuItem>
            )
        })
    }

    return (
        <>
            {menuData.map((menu) => (
                <div
                    key={menu.label}
                    className="menu-container mb-4 bg-[#ebecef] border rounded-md shadow"
                >
                    {renderMenu([menu])}
                </div>
            ))}
        </>
    )
}
