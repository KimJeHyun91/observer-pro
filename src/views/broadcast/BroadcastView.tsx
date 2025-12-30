import Header from '@/components/shared/Header'
import React, { useEffect, useRef, useState } from 'react'
import BroadcastStatus from './broadcastStatus/BroadcastStatus'
import BroadcastLeftSidebar from './broadcastLeftSidebar/BroadcastLeftSidebar'
import BaseMapLayer from '@/components/map/BaseMapLayer'
import BroadcastMap from './broadcastMap/BroadcastMap'
import { useAreaStore } from '@/store/Inundation/useAreaStore'
import { BroadcastAreaResponse, SpeakerStatus } from '@/@types/broadcast'
import { apiSpeakerStatus } from '@/services/BroadcastService'
import { useBroadcastArea, useBroadcastEventTypeList } from '@/utils/hooks/useBroadcast'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useViewMode } from '@/utils/hooks/useViewMode'
import { Dialog } from '@/components/ui'
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore'
import { PiBroadcastDuotone } from "react-icons/pi";

interface SelectedObject {
    id: number
    type: string
    name?: string
    position: [number, number]
}

const BroadcastView = () => {
    const { handleViewModeChange } = useViewMode('broadcast');
    const { setSiteId } = useBroadcastStore(state => ({
        setSiteId: state.setSiteId
    }));
    const { areaList, mutate } = useBroadcastArea()
    const { 
        isReserveBroadcastStatus, 
        reserveBroadcastTypeName,
        setIsReserveBroadcastStatus,
        updateBroadcastStatus 
    } = useBroadcastStore(state => ({
        isReserveBroadcastStatus: state.isReserveBroadcastStatus,
        reserveBroadcastTypeName: state.reserveBroadcastTypeName,
        setIsReserveBroadcastStatus: state.setIsReserveBroadcastStatus,
        updateBroadcastStatus: state.updateBroadcastStatus
    }));
    const {eventTypeList, mutate: getEventTypeList} = useBroadcastEventTypeList()
    const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(
        null,
    )
    const { socketService } = useSocketConnection();
    const [speakerStatus, setSpeakerStatus] = useState<SpeakerStatus>({
        on_count: '',
        off_count: '',
        disconnected: '',
        });

    const getValidOutsideSiteIds = (data: BroadcastAreaResponse[]) => {
        return [...new Set(
            data
                ?.filter(item => item.outside_site_transmitter_id !== null)
                .map(item => item.outside_site_id)
        )];
    }

    useEffect(()=>{
        const fetchStatus = async() => {
        const res = await apiSpeakerStatus()
        if(!res?.result[0]) return
        setSpeakerStatus(res.result[0])
        mutate()
        setSiteId(getValidOutsideSiteIds(areaList?.result))
        }
        fetchStatus()
    },[areaList])
    

    // 예약/정기 방송 시작 상태 감지 
    useEffect(() => {
        if (!socketService) {
            return;
        }

        const fetchEventTypeList = async () => {
            await getEventTypeList();
        };

        fetchEventTypeList();

        let prevStatus: string | null = null;

        const reserveSocket = socketService.subscribe('vb_reserve_broadcast-update', (received) => {
            if (received && received.broadcastStatus.status !== prevStatus) {
            const matchingEventType = eventTypeList?.result.find(list => list.event_type_id === received.broadcastStatus.type);
 
            prevStatus = received.broadcastStatus.status;
            if (!matchingEventType?.use_popup) {
                updateBroadcastStatus(received.broadcastStatus.status, matchingEventType.event_type, false);
                return;
            }
            updateBroadcastStatus(received.broadcastStatus.status, matchingEventType.event_type, true);
            }
        });

        return () => {
            reserveSocket();
        };

    }, [socketService, updateBroadcastStatus, eventTypeList]);


    const handleObjectSelect = (data: SelectedObject) => {
        setSelectedObject(data)
    }


    return (
        <section className="h-full flex flex-col">
            <Header
                onViewModeChange={handleViewModeChange}
                currentView="main"
                serviceType="broadcast"
            >
                <BroadcastStatus  />
            </Header>
            <div className="flex flex-1 overflow-hidden h-full">
                <BroadcastLeftSidebar />
                <div className="flex-1 h-full flex flex-col">
                    <BroadcastMap
                        onObjectSelect={handleObjectSelect}
                        onMapClick={function (coordinates: {
                            lat: number
                            lng: number
                        }): void {
                            throw new Error('Function not implemented.')
                        }}
                    />
                </div>
            </div>
    
            <Dialog isOpen={isReserveBroadcastStatus} closable={false} onClose={() => setIsReserveBroadcastStatus(false)} width={400}>
                <div className="flex flex-col items-center gap-6 py-4">
                    <PiBroadcastDuotone className="text-6xl text-blue-500 animate-pulse" />
                    <h5 className="text-lg font-medium">{`등록된 ${reserveBroadcastTypeName}이 시작 되었습니다.`}</h5>
                    <button 
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        onClick={() => setIsReserveBroadcastStatus(false)}
                    >
                        확인
                    </button>
                </div>
            </Dialog>
     
        </section>
    )
}

export default BroadcastView










