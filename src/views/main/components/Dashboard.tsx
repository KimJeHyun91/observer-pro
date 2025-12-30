import Header from '@/components/shared/Header';
import EventsByImportanceCount from './EventsByImportanceCount';
import { DeviceFilter, DeviceList } from './DeviceList';
import { useEffect, useState } from 'react';
import NetworkErrDevices from './NetworkErrDevices';
import AccessLogDashboard from './AccessLogDashboard';
import EventList from './EventList';
import { useServiceNavStore } from '@/store/serviceNavStore';
import DashboardDataCharts from './DashboardDataCharts';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
// eslint-disable-next-line import/no-unresolved
import { Notification, toast } from '@/components/ui';

export default function Dashboard() {
  const { setNavServiceState } = useServiceNavStore();
  const { socketService } = useSocketConnection();
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('type');
  useEffect(() => {
    setNavServiceState(true);

    return () => {
      setNavServiceState(false);
    }
  }, []);

  useEffect(() => {
    if (!socketService) {
      return
    };

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
      anprDetectVehicleNumberSocket();
      accessCtlSMSSocket();
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <section className='h-full'>
      <Header
        currentView="dashboard"
        serviceType="origin"
        onViewModeChange={() => { }}
      >
        <EventsByImportanceCount />
      </Header>
      <div className='flex justify-between'>
        <DeviceList filter={deviceFilter} changeFilter={setDeviceFilter} mode='dashboard' />
        <section className='flex flex-col justify-between w-[18.875rem] h-full gap-y-1.5'>
          <NetworkErrDevices />
          <AccessLogDashboard />
        </section>
        <DashboardDataCharts />
        <EventList />
      </div>
    </section>
  );
}