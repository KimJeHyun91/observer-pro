import { useEffect, useState } from 'react';
import TunnelStatus from '../tunnelStatus/TunnelStatus';
import { DeviceList } from './components/DeviceList';
import { WaterLevelList } from './components/WaterLevelList';
import {BillboardList} from './components/BillboardList'
import { WaterLevelThresholdList } from './components/WaterLevelThresholdList';
import { EventList } from './components/EventList';
import { NetworkErrorList } from './components/NetworkErrorList';

import Header from '@/components/shared/Header';

export default function TunnelDashboard() {


  return (
    <section className="h-screen flex flex-col">

      <Header
        onViewModeChange={() => { }}
        currentView="main"
        serviceType="tunnel"
      >
        <TunnelStatus />
      </Header>
      <div className='w-full h-full mb-[7vh] mt-[5px] min-h-[820px] flex justify-between min-w-[1900px]'>
        {/* 장치목록 */}
        <DeviceList />
        {/* 2번째 */}
        <ul className='w-[1204px] h-full flex flex-col justify-between'>
          <li className='w-full h-[362px] flex justify-between'>
            <div className='w-[249px] h-full rounded-md'>
              <NetworkErrorList/>
            </div>
            <div className='w-[554px] h-full bg-white rounded-md'>
              <BillboardList/>
            </div>
            <div className='w-[360px] h-full rounded-md'>
              <WaterLevelThresholdList/>
            </div> 
          </li>
          <li className='w-full h-[439px]'>
            <WaterLevelList />
          </li>
        </ul>
        <div className='w-[328px] h-full'>
          <EventList/>
        </div>
      </div>
    </section>
  );
}