import React, { useEffect, useState, useRef } from 'react';
import Header from '@/components/shared/Header';
import InundationLeftSidebar from '../LeftSidebar/InundationLeftSidebar';
import InundationDetailArea from '../Detail/InundationDetailArea';
import InundationMapLayer from '../MapLayer/InundationMapLayer';
import InundationStatus from '../NetworkStatus/InundationStatus';
import { useAreaStore } from '@/store/Inundation/useAreaStore';
import { useDataStatusStore } from '@/store/useDataStatusStore';
import { DetailAreaProps, SelectedObject, AreaInformation } from '@/types/inundation';
import { useViewMode } from '@/utils/hooks/useViewMode';

export default function InundationView() {
  const { handleViewModeChange } = useViewMode('inundation');
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const fetchAreas = useAreaStore((state) => state.fetchAreas);
  const inundationDataState = useDataStatusStore((state) => state.tabs.inundation);
  
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  useEffect(() => {
    const now = Date.now();
    
    if (isFetching.current || (now - lastFetchTime.current < 2000)) {
      console.log('InundationView: API 호출 제한');
      return;
    }

    isFetching.current = true;
    lastFetchTime.current = now;
    
    fetchAreas().finally(() => {
      isFetching.current = false;
    });
  }, [fetchAreas]);

  const handleObjectSelect = (data: SelectedObject) => {
      const transformedData: AreaInformation = {
        outside_idx: Number(data.id),
        outside_name: data.name || '',
        outside_location: data.location || '',
        outside_top_location: data.position[0].toString(),
        outside_left_location: data.position[1].toString(),
        // crossing_gate_status: data.crossing_gate_status ?? null,
        crossing_gate_status: data.crossing_gate_status,
        crossing_gate_ip: data.crossing_gate_ip || '',
        billboard_ip: data.billboard_ip || '',
        guardianlite_ip: data.guardianlite_ip || '',
        type: data.type || '',
        linked_status: data.linked_status ?? false,
        camera_linked_status: data.camera_linked_status ?? false,
        billboard_linked_status: data.billboard_linked_status ?? false,
        speaker_linked_status: data.speaker_linked_status ?? false,
        guardianlite_linked_status: data.guardianlite_linked_status ?? false,
        water_level_linked_status: data.water_level_linked_status ?? false,
        outside_linked_status: data.outside_linked_status,
        water_level_name: data.water_level_name,
        water_level_location: data.water_level_location,
        speaker_ip: data.speaker_ip,
        camera_id: data.camera_id,
        vms_name: data.vms_name,
        vms_ip: data.vms_ip,
        speaker_id: data.speaker_id,
        speaker_password: data.speaker_password,
        speaker_type: data.speaker_type,
        camera_name: data.camera_name,
        service_type: data.service_type,
        ch1: data.ch1,
        ch2: data.ch2,
        ch3: data.ch3,
        ch4: data.ch4,
        ch5: data.ch5,
        controller_model: data.controller_model,
        billboard_controller_model: data.billboard_controller_model,
        signboard_ip: data.signboard_ip,
        signboard_port: data.signboard_port,
        signboard_controller_model: data.signboard_controller_model,
      };
      setSelectedObject({ ...data, ...transformedData });
  };

  const handleMapViewClick = () => {
    setSelectedObject(null);
  };

  const handleMapClick = (coordinates: { lat: number; lng: number }) => {
    console.log('Map clicked:', coordinates);
  };

  return (
    <section className="h-full flex flex-col">
      <Header
        onViewModeChange={handleViewModeChange}
        currentView="main"
        serviceType='inundation'
      >
        <InundationStatus />
      </Header>
      <div className="flex flex-1 overflow-hidden h-full">
        {inundationDataState.data && (
          <InundationLeftSidebar onMapViewClick={handleMapViewClick} />
        )}
        <div className="flex-1 h-full flex flex-col">
          {selectedObject ? (
            <InundationDetailArea
              data={selectedObject}
              onObjectSelect={handleObjectSelect}
            />
          ) : (
            <InundationMapLayer
              onObjectSelect={handleObjectSelect}
              onMapClick={handleMapClick}
            />
          )}
        </div>
      </div>
    </section>
  );
}