import { DeviceFilter } from '../DeviceList';
import DevicesByType from './section/DevicesByType';
import DevicesByLocation from './section/DevicesByLocation';
import DevicesBuildingDashboard from './section/DevicesBuildingDashboard';

type Props = {
  filter: DeviceFilter;
  searchValue: string;
  mode: 'dashboard' | 'map' | 'building-dashboard';
  outsideIdx?: number;
  floorIdx?: number;
}

export default function Devices({ filter, searchValue, mode, outsideIdx, floorIdx }: Props) {

  if (mode === 'building-dashboard' && outsideIdx) {
    return (
      <DevicesBuildingDashboard searchValue={searchValue} mode={mode} outsideIdx={outsideIdx} />
    );
  } else if (filter === 'type') {
    return (
      <DevicesByType searchValue={searchValue} mode={mode} />
    );
  } else {
    return (
      <DevicesByLocation searchValue={searchValue} mode={mode} floorIdx={floorIdx} />
    );
  };
};