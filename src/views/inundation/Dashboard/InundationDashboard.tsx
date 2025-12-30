import { useEffect, useState } from 'react';
import { NetworkStatus } from './components/NetworkStatus';
import { useServiceNavStore } from '@/store/serviceNavStore';
import { ScrollBar } from '@/components/ui';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { ControlStatus } from './components/ControlStatus';
import { WaterlevelLinkCrossingGates } from './components/WaterlevelLinkCrossingGates';
import { WaterLevelStatusGroup } from './components/WaterLevelStatusGroup';
import { ThresholdList } from './components/ThresholdList';
import { EventList } from './components/EventList';
import { DeviceList } from './components/DeviceList';
import WaterLevelChart from './components/WaterlevelChart';
import Header from '@/components/shared/Header';
import InundationStatus from '../NetworkStatus/InundationStatus';
import { useWaterlevelLiveSocketListener } from '@/store/Inundation/useWaterlevelLiveStore';

export default function InundationDashboard() {
    const { socketService } = useSocketConnection();
    useWaterlevelLiveSocketListener(socketService);
    const { setNavServiceState } = useServiceNavStore();
    const [errorMessage, setErrorMessage] = useState('');
    const [viewMode, setViewMode] = useState<'device' | 'location'>('location');

    const {
        getCrossinggateList,
        getWaterlevelGaugeList,
        getWaterlevelGaugeCrossinggates,
        crossingGateList
    } = useSettingsStore();

    useEffect(() => {
        const initializeData = async () => {
            try {
                await Promise.all([
                    getWaterlevelGaugeList(),
                    getWaterlevelGaugeCrossinggates(),
                    getCrossinggateList()
                ]);
            } catch (error) {
                setErrorMessage('데이터를 불러오는 중 오류가 발생했습니다.');
                // setAlertOpen(true);
            }
        };
        initializeData();
    }, [getWaterlevelGaugeList, getWaterlevelGaugeCrossinggates, getCrossinggateList]);

    useEffect(() => {
        if (socketService) {
            const waterlevelUnsubscribe = socketService.subscribe('fl_waterlevels-update', getWaterlevelGaugeList);
            const crossingGateUnsubscribe = socketService.subscribe('fl_crossingGates-update', getWaterlevelGaugeCrossinggates);

            return () => {
                waterlevelUnsubscribe();
                crossingGateUnsubscribe();
            };
        }
    }, [socketService, getWaterlevelGaugeList, getWaterlevelGaugeCrossinggates]);

    useEffect(() => {
        setNavServiceState(true);

        return () => {
            setNavServiceState(false);
        };
    }, [setNavServiceState]);

    return (
        <section className="h-screen flex flex-col">
            <Header
                currentView="dashboard"
                serviceType="inundation"
                onViewModeChange={() => {}}
            >
                <InundationStatus />
            </Header>
            <div className="flex-1 flex p-2 gap-2 overflow-hidden mb-[4rem]">
                <div className="w-[15%] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
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
                        <div className="border-t-2 border-gray-500 dark:border-gray-700 mx-1"></div>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                        <DeviceList viewMode={viewMode} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2" style={{ height: 'calc(50vh - 4rem)' }}>
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                            <h5 className="font-semibold dark:text-gray-200">네트워크 장애 현황</h5>
                            <div className="h-[calc(100%-40px)]">
                                <NetworkStatus />
                            </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                            <h5 className="font-semibold dark:text-gray-200">차단기 상태</h5>
                            <div className="h-[calc(100%-40px)]">
                                <ControlStatus crossingGateList={crossingGateList} />
                            </div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
                            <h5 className="font-semibold dark:text-gray-200">수위계 연동 현황</h5>
                            <div className="h-[calc(100%-40px)]">
                                <WaterlevelLinkCrossingGates />
                            </div>
                        </div>
                        <div className="flex-[1.5] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md rounded-lg">
                            <div className="flex justify-between items-center w-full border-b-2 border-gray-500 dark:border-gray-700 my-[0.125rem]">
                                <h5 className="font-semibold dark:text-gray-200">수위계 상태 구분</h5>
                            </div>
                            <div className="h-[calc(100%-40px)]">
                                <WaterLevelStatusGroup />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2" style={{ height: 'calc(48vh - 3.5rem)' }}>
                        <div className="flex-[7] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md rounded-lg">
                            <div className="flex justify-between items-center w-full border-b-2 border-gray-500 dark:border-gray-700 my-[0.125rem]">
                                <h5 className="font-semibold dark:text-gray-200">전체 수위계 현황</h5>
                                <div className="flex items-center gap-2">
                                    <span>범위</span>
                                    <span>최대 측정</span>
                                </div>
                            </div>
                            <div className="h-[calc(100%-40px)]">
                                <WaterLevelChart />
                            </div>
                        </div>

                        <div className="flex-[3] bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md flex flex-col">
                            <h5 className="font-semibold dark:text-gray-200 mb-2">임계치 목록</h5>
                            <div className="flex-1 overflow-hidden">
                                <ThresholdList />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-[18%] flex flex-col gap-2">
                    <div className="flex-1 bg-white shadow-md rounded-lg p-3 overflow-hidden dark:bg-[#262626]">
                        <h5 className="font-semibold dark:text-gray-200">실시간 이벤트 - 침수 이벤트</h5>
                        <div className="border-b-2 border-[#B8B8B8] my-2"></div>
                        <div className="flex-1 overflow-auto">
                            <ScrollBar className="h-full">
                                <EventList />
                            </ScrollBar>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}