import { useState, useEffect } from 'react';
import { useDataStatusStore } from '@/store/useDataStatusStore';
import { IoMdHome } from 'react-icons/io';
import Header from '@/components/shared/Header';
import ParkingField from './parkingField/ParkingField';
import ParkingDetail from './parkingDetail/ParkingDetail';
import ParkingLeftSidebar from './parkingLeftSidebar/ParkingLeftSidebar';
import ParkingStatus from './parkingStatus/ParkingStatus';
import { Building } from '@/@types/building';
import { useParkingStore } from '@/store/parking/useParkingStore';
import { useViewMode } from '@/utils/hooks/useViewMode';
import { CameraStreamProvider } from '@/context/cameraStreamContext';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { EventPopup } from '@/@types/event';
import { useParkingBuildingList } from '@/utils/hooks/useParkingArea';

export default function ParkingView() {
  const { handleViewModeChange } = useViewMode('parking');
  const { socketService } = useSocketConnection();
  const parkingState = useDataStatusStore((state) => state.tabs.parking);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>();
  const setParkingBuildingState = useParkingStore(
    (state) => state.setParkingBuildingState
  );
  const [eventPopup, setEventPopup] = useState<EventPopup | null>(null);

  const { data: buildingsData } = useParkingBuildingList();

  const buildingClick = (building: Building) => {
    setParkingBuildingState({
      buildingIdx: building.idx,
      floorIdx: 0,
      mapImageURL: building.map_image_url ? `http://${window.location.hostname}:4200/images/pm_buildingplan/${building.map_image_url}` : null,
    });
    setSelectedBuilding(building);
  };

  const backClick = () => {
    setSelectedBuilding(null);
  };

  useEffect(() => {
    if (!socketService) {
      return;
    };

    const eventPopupSocket = socketService.subscribe('pm_events-update', (received) => {
      if (received.eventPopup == null) {
        return;
      };
      const {
        eventIdx,
        eventName,
        location,
        outsideIdx,
        insideIdx,
        deviceIdx,
        deviceType,
        deviceName,
        ipaddress,
        cameraId,
        topLocation,
        leftLocation,
        severityId,
        mapImageURL,
        mainServiceName,
        vmsName,
        service_type
      } = received.eventPopup;

      if (outsideIdx == null || insideIdx == null) {
        return;
      };

      if (outsideIdx === 0 && insideIdx === 0) {
        setSelectedBuilding(null);
      }else{
        if (buildingsData?.result) {
          const targetBuilding = buildingsData.result.find((building: Building) => building.idx === outsideIdx);
          
          if (targetBuilding) {
            setParkingBuildingState({
              buildingIdx: targetBuilding.idx,
              floorIdx: 0,
              mapImageURL: targetBuilding.map_image_url
                ? `http://${window.location.hostname}:4200/images/pm_buildingplan/${targetBuilding.map_image_url}`
                : null,
            });
            setSelectedBuilding(targetBuilding);
          }
        }
      }
      
      setTimeout(() => {
        setEventPopup({
          eventIdx,
          eventName,
          location,
          outsideIdx,
          insideIdx,
          deviceIdx,
          deviceType,
          deviceName,
          ipaddress,
          cameraId,
          topLocation,
          leftLocation,
          severityId,
          mapImageURL,
          mainServiceName,
          vmsName,
          service_type
        });
      }, 100);
      
      return;
    });

    return () => {
      eventPopupSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService, buildingsData]);

  return (
    <section className="h-full flex flex-col">
      <Header
        currentView='main'
        serviceType='parking'
        onViewModeChange={handleViewModeChange}
      >
        <div className="flex items-center space-x-2">
          {selectedBuilding && (
            <div
              className="p-1 bg-[#BEC3CC] rounded-md dark:bg-[#404040] cursor-pointer"
              onClick={backClick}
            >
              <IoMdHome className="text-white" size={25} />
            </div>
          )}
          <ParkingStatus />
        </div>
      </Header>
      <div className="flex flex-1 overflow-hidden h-full">
        <>
          {!selectedBuilding && parkingState.data && (
            <ParkingLeftSidebar />
          )}

          <div className="flex-1 h-full flex flex-col">
            <CameraStreamProvider>
              {!selectedBuilding ? (
                <ParkingField eventPopup={eventPopup} clearEventPopup={() => setEventPopup(null)} onBuildingClick={buildingClick} />
              ) : (
                <ParkingDetail seletedBuilding={selectedBuilding} eventPopup={eventPopup} clearEventPopup={() => setEventPopup(null)}/>
              )}
            </CameraStreamProvider>
          </div>
        </>
      </div>
    </section>
  );
}
