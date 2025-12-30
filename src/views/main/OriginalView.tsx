import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/shared/Header';
import OutdoorMap from './OutdoorMap';
import { useDataStatusStore } from '@/store/useDataStatusStore';
import DataStatus from './DataStatus';
import { useCanvasMapStore } from '@/store/canvasMapStore';
// import Building from './BuildingDashboard';
import IndoorMap from './IndoorMap';
import { CameraStreamProvider } from '../../context/CameraStreamContext';
import EventsByImportanceCount from './components/EventsByImportanceCount';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { EventPopup } from '@/@types/event';
import { ArchiveStreamProvider } from '@/context/ArchiveStreamContext';
import CustomModal from './modals/CustomModal';
import { SOPEvent, SOPPopup } from '@/@types/main';
import SOPEventDetail from './components/SOPEventDetail';
import { Notification, toast } from '@/components/ui';
import { useSOPEventStore } from '@/store/main/SOPEventStore';
import ThreeJSCanvas from '@/components/common/threeJs';
import BuildingDashboard from './BuildingDashboard';

export default function OriginalView() {
  const originState = useDataStatusStore((state) => state.tabs.origin);
  const { socketService } = useSocketConnection();
  const { buildingIdx, floorIdx, setCanvasMapState, is3DView, threeDModelId } = useCanvasMapStore();
  const [eventPopup, setEventPopup] = useState<EventPopup | null>(null);
  const prevEventPopupRef = useRef<EventPopup | null>(null);
  const [SOPPopup, setSOPPopup] = useState<SOPPopup>({
    show: false,
    title: '',
    width: 1092,
    height: 780,
    SOP: true,
    close: () => { }
  });
  const { SOPEvent, setSOPEventState, prevSOPEvent } = useSOPEventStore();
  const prevSOPEventRef = useRef<SOPEvent | null>(null);
  const viewMap = () => {
    if (buildingIdx == null || floorIdx == null) {
      return;

    } else if ((buildingIdx === 0 || (is3DView && threeDModelId)) && floorIdx === 0) {
      return is3DView ? <ThreeJSCanvas serviceType='origin' /> : <OutdoorMap canvasKey={buildingIdx} eventPopup={eventPopup} setEventPopup={setEventPopup} />
    } else if ((buildingIdx || threeDModelId) && floorIdx === 0) {
      return is3DView ? <ThreeJSCanvas serviceType='origin' /> : <BuildingDashboard />
    } else if ((buildingIdx || threeDModelId) && floorIdx) {
      return <IndoorMap eventPopup={eventPopup} setEventPopup={setEventPopup} />
    }
  };

  const useDataMenu = (originState.data && ((buildingIdx != null && buildingIdx === 0) || (is3DView && threeDModelId !== undefined && threeDModelId > 0)) && floorIdx === 0) ? true : false;

  const handleViewModeChange = () => {
    window.open('/main/dashboard', '_blank', 'noopener,noreferrer')
  };

  const handleCloseSOPPopup = useCallback(() => {
    setSOPPopup({
      show: false,
      title: '',
      width: 1092,
      height: 780,
      SOP: true,
      close: () => { }
    });
    setSOPEventState({
      SOPIdx: null,
      eventIdx: null,
      eventName: null,
      occurDateTime: null,
      location: null,
      outsideIdx: null,
      insideIdx: null,
      dimensionType: null,
      eventTypeId: null,
      severityId: null,
      mapImageURL: null,
      eventCameraId: null,
      mainServiceName: 'origin',
    });
  }, [setSOPEventState]);

  const handleShowSOPEvent = useCallback((SOPEventData: SOPEvent) => {
    const {
      SOPIdx,
      eventIdx,
      eventName,
      occurDateTime,
      location,
      eventTypeId,
      mainServiceName,
      severityId,
      outsideIdx,
      insideIdx,
      dimensionType,
      mapImageURL,
      eventCameraId
    } = SOPEventData;
    console.log(outsideIdx, insideIdx, mapImageURL, dimensionType);
    if (outsideIdx != null && insideIdx != null && mapImageURL !== undefined) {
      if (dimensionType === '3d') {
        const current = useCanvasMapStore.getState();
        setCanvasMapState({
          ...current,
          threeDModelId: outsideIdx,
          floorIdx: insideIdx,
          mapImageURL: mapImageURL != null ? `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}` : null,
          mainServiceName,
          is3DView: true
        });
      } else {
        const current = useCanvasMapStore.getState();
        setCanvasMapState({
          ...current,
          buildingIdx: outsideIdx,
          floorIdx: insideIdx,
          mapImageURL: mapImageURL != null ? `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}` : null,
          mainServiceName,
          is3DView: false
        });
      }
    };
    if (SOPIdx && occurDateTime && eventName && severityId) {
      setSOPEventState({
        SOPIdx,
        eventIdx,
        eventName,
        occurDateTime,
        location: location,
        outsideIdx: outsideIdx,
        insideIdx: insideIdx,
        eventTypeId,
        severityId,
        mapImageURL: mapImageURL,
        eventCameraId,
        mainServiceName,
        dimensionType
      });
      setSOPPopup((prev) => ({
        ...prev,
        show: true,
        title: 'SOP 이벤트 알림',
        close: handleCloseSOPPopup
      }));
    }
  }, [setCanvasMapState, setSOPPopup, handleCloseSOPPopup, prevSOPEvent, setSOPEventState]);

  useEffect(() => {
    if (!socketService) {
      return;
    };

    const eventPopupSocket = socketService.subscribe('ob_events-update', (received) => {
      if (received.eventPopup == null) {
        return;
      };
      const {
        outsideIdx,
        insideIdx,
        dimensionType,
        severityId,
        mapImageURL,
        mainServiceName,
      } = received.eventPopup;
      if (outsideIdx == null || insideIdx == null || severityId == null) {
        return;
      };
      if ((prevEventPopupRef.current != null && prevEventPopupRef.current.severityId != null) && prevEventPopupRef.current.severityId > severityId) {
        return;
      };

      const current = useCanvasMapStore.getState();
      if (dimensionType === '3d') {
        setCanvasMapState({
          ...current,
          threeDModelId: outsideIdx,
          floorIdx: insideIdx,
          mapImageURL: mapImageURL != null ? `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}` : null,
          mainServiceName,
          is3DView: true
        });
      } else {
        setCanvasMapState({
          ...current,
          buildingIdx: outsideIdx,
          floorIdx: insideIdx,
          mapImageURL: mapImageURL != null ? `http://${window.location.hostname}:4200/images/floorplan/${mapImageURL}` : null,
          mainServiceName,
          is3DView: false
        });
      }
      setTimeout(() => {
        setEventPopup(received.eventPopup);
      }, 500);
      return;
    });

    const SOPSocket = socketService.subscribe('ob_events-SOP', (received) => {
      if (received == null || received.SOPEvent == null) {
        return;
      }

      const {
        SOPIdx,
        eventIdx,
        eventName,
        occurDateTime,
        locationInfo,
        eventTypeId,
        mainServiceName,
        severityId,
        outsideIdx,
        insideIdx,
        eventCameraId,
        isAck,
        dimensionType
      } = received.SOPEvent;

      if ((prevSOPEventRef.current != null && prevSOPEventRef.current.severityId != null) && prevSOPEventRef.current.severityId > received.SOPEvent.severityId) {
        return;
      };

      handleShowSOPEvent({
        SOPIdx,
        eventIdx,
        eventName,
        occurDateTime,
        location: locationInfo?.location || null,
        eventCameraId,
        eventTypeId,
        outsideIdx: outsideIdx != null ? outsideIdx : null,
        insideIdx: insideIdx != null ? insideIdx : null,
        mainServiceName,
        mapImageURL: locationInfo?.mapImageURL || null,
        severityId,
        isAck,
        dimensionType
      });
    });

    const anprDetectVehicleNumberSocket = socketService.subscribe('ob_anpr-vehicleNumber', (received) => {
      if (received) {
        toast.push(
          <Notification
            closable
            type='info'
            duration={3000}
          >
            <p className='font-bold'>
              {received.vehicleNum}<br />
              VMS: {received.vmsName}<br />
              CameraID: {received.cameraId}
            </p>
          </Notification>
        )
      };
    });
    const accessCtlSMSSocket = socketService.subscribe('ob_accessCtl_sms-fail', (received) => {
      if (received) {
        toast.push(
          <Notification
            closable
            type='warning'
            duration={10000}
          >
            <p className='font-bold'>
              {received.message}<br />
            </p>
          </Notification>
        )
      };
    });

    return () => {
      eventPopupSocket();
      SOPSocket();
      anprDetectVehicleNumberSocket();
      accessCtlSMSSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  useEffect(() => {
    if (SOPEvent.eventIdx != null && (prevSOPEventRef.current == null || prevSOPEventRef.current.eventIdx !== SOPEvent.eventIdx)) {
      handleShowSOPEvent(SOPEvent);
    };
  }, [SOPEvent, handleShowSOPEvent, prevSOPEvent]);

  useEffect(() => {
    prevSOPEventRef.current = prevSOPEvent;
  }, [prevSOPEvent]);

  useEffect(() => {
    prevEventPopupRef.current = eventPopup;
  }, [eventPopup]);

  return (
    <section className='w-full h-full'>
      <Header
        currentView='main'
        serviceType='origin'
        onViewModeChange={handleViewModeChange}
      >
        <EventsByImportanceCount />
      </Header>
      <section className='flex w-full h-[calc(100%-3rem)] relative'>
        {useDataMenu && (
          <aside className={'w-[20.5rem] min-w-[20.5rem] mr-[14px] h-full`'}>
            <DataStatus />
          </aside>
        )}
        <main className={`origin-main w-full h-full ${useDataMenu ? 'false' : 'absolute'}`}>
          <CameraStreamProvider>
            <ArchiveStreamProvider>
              {viewMap()}
              {/* <ThreeJSCanvas serviceType='origin' /> */}
            </ArchiveStreamProvider>
          </CameraStreamProvider>
          {(SOPPopup.show && SOPEvent.SOPIdx) && (
            <CustomModal
              show={SOPPopup.show}
              title={SOPPopup.title}
              width={SOPPopup.width}
              height={SOPPopup.height}
              SOP={SOPPopup.show}
              contentClassName={'rounded-[4px] border-2 border-[#D9DCE3] p-0'}
              close={handleCloseSOPPopup}
            >
              <SOPEventDetail
                SOPIdx={SOPEvent.SOPIdx}
                eventName={SOPEvent.eventName}
                eventIdx={SOPEvent.eventIdx}
                occurDateTime={SOPEvent.occurDateTime}
                location={SOPEvent.location}
                outsideIdx={SOPEvent.outsideIdx}
                insideIdx={SOPEvent.insideIdx}
                eventTypeId={SOPEvent.eventTypeId}
                severityId={SOPEvent.severityId}
                mapImageURL={SOPEvent.mapImageURL}
                eventCameraId={SOPEvent.eventCameraId}
                mainServiceName={SOPEvent.mainServiceName}

                close={handleCloseSOPPopup}
              />
            </CustomModal>
          )}
        </main>
      </section>
    </section>
  );
}