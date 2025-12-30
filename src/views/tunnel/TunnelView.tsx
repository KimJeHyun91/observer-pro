import React, { useEffect, useState } from 'react'
import Header from '@/components/shared/Header'
import { useViewMode } from '@/utils/hooks/useViewMode';
import BroadcastMap from '../broadcast/broadcastMap/BroadcastMap';
import { SelectedObject } from '@/@types/tunnel';
import TunnelLeftSidebar from './tunnelLeftSidebar/TunnelLeftSidebar';
import TunnelMap from './tunnelMap/TunnelMap';
import TunnelDetail from './tunnelDetail/tunnelDetail';
import TunnelStatus from './tunnelStatus/TunnelStatus';

const TunnelView = () => {
  const { handleViewModeChange } = useViewMode('tunnel');

  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(
        null,
    )

  const handleObjectSelect = (data: SelectedObject) => {
    setSelectedObject(data)
  }

  return (
    <section className="h-full flex flex-col">
      <Header
          onViewModeChange={handleViewModeChange}
          currentView="main"
          serviceType="tunnel"
      >
        <TunnelStatus  />
      </Header>
      <div className="flex flex-1 overflow-hidden h-full">
          <TunnelLeftSidebar onMapViewClick={setSelectedObject}/>
          <div className="flex-1 h-full flex flex-col">
            {selectedObject ?
              <TunnelDetail 
                data={selectedObject} 
                onObjectSelect={handleObjectSelect}
              />
            : <TunnelMap
                onObjectSelect={handleObjectSelect}
                // onMapClick={function (coordinates: {
                //     lat: number
                //     lng: number
                // }): void {
                //     throw new Error('Function not implemented.')
                // }}
              />}
          </div>
      </div>
    </section>
  )
}

export default TunnelView
