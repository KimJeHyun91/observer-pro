import Header from '@/components/shared/Header'
import { useViewMode } from '@/utils/hooks/useViewMode';
// import ParkingFeeStatus from './parkingFeeStatus/ParkingFeeStatus';
import ParkingFeeSidebar from './parkingFeeSidebar/ParkingFeeSidebar';
import { useState, useEffect } from 'react';
import CarManagement from './components/CarManagement'
import Dashboard from './components/Dashboard'
import SeasonTicket from './components/SeasonTicket'
import ParkingFeeMain from './components/ParkingFeeMain'
import { IoMdHome } from 'react-icons/io';
import ParkingFeeDetail from './components/ParkingFeeDetail'
import { parkingFeeOutsideInfo } from "@/@types/parkingFee";
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { 
  getParkingFeeList,
} from '@/services/ParkingFeeService';

const ParkingFeeView = () => {
  const { socketService } = useSocketConnection();
  const { handleViewModeChange } = useViewMode('parkingFee');
  const [selectedKey, setSelectedKey] = useState<string>('main');
  const [selectedParking, setSelectedParking] = useState<parkingFeeOutsideInfo | null>(null);
  const [parkings, setParkings] = useState<parkingFeeOutsideInfo[]>([]);

  const renderContent = () => {
      if (!selectedParking) {
        return <ParkingFeeMain 
                parkings={parkings} 
                setSelectedParking={setSelectedParking} 
              />;
      }

      switch (selectedKey) {
        case 'parkingFee.carManagement':
          return <CarManagement 
                    selectedParking={selectedParking}
                 />
        case 'parkingFee.dashboard':
          return <Dashboard 
                    selectedParking={selectedParking}
                 />
        case 'parkingFee.seasonTicket':
          return <SeasonTicket 
                    selectedParking={selectedParking}
                 />
        default:
          return <ParkingFeeDetail 
                    parkings={parkings} 
                    selectedParking={selectedParking} 
                    setSelectedParking={setSelectedParking}
                  />
      }
  }

  const backClick = () => {
    setSelectedParking(null);
  };

  useEffect(()=>{
      parkingFeeList();
  }, [])

  const parkingFeeList = async () => {
      try {
          const res = await getParkingFeeList();

          if (!res || !res.result) {
              return;
          }

          setParkings(res.result as parkingFeeOutsideInfo[]);
      } catch (error) {
          console.error('주차장 List API 에러: ', error);
      }
  }

  useEffect(() => {
      if (!socketService) {
          return;
      }

      const parkingFeeSocket = socketService.subscribe('pf_parkings-update', (received) => {
          if (
              received &&
              typeof received === 'object' &&
              'parkingList' in received
          ) {
              parkingFeeList();
          }
      })

      return () => {
          parkingFeeSocket();
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <section className="h-full flex flex-col">
        <Header
          currentView='dashboard'
          serviceType="parkingFee"
          onViewModeChange={handleViewModeChange}
        >
          <div className="flex items-center space-x-2">
              {selectedParking && (
                  <div
                    className="p-1 bg-[#BEC3CC] rounded-md dark:bg-[#404040] cursor-pointer"
                    onClick={backClick}
                  >
                      <IoMdHome className="text-white" size={25} />
                  </div>
              )}
              {/* <ParkingFeeStatus /> */}
          </div>
        </Header>
      <div className="flex flex-1 overflow-hidden h-full">
          <ParkingFeeSidebar 
            setSelectedKey={setSelectedKey} 
            selectedKey={selectedKey}
            selectedParking={selectedParking}
          />
          <div className="flex-1 h-full flex flex-col">
              {renderContent()}
          </div>
      </div>
    </section>
  )
}

export default ParkingFeeView
