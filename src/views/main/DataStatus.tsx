import { useState } from 'react';
import AccessLog from './components/AccessLog';
import { DeviceFilter, DeviceList } from './components/DeviceList';
import EventsByImportance from './components/EventsByImportance';

export default function DataStatus() {
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('type');
  return (
    <section className={`w-full flex flex-col justify-around absolute h-full`}>
      <DeviceList filter={deviceFilter} changeFilter={setDeviceFilter} mode='map' />
      <EventsByImportance />
      <AccessLog />
    </section>
  );

}