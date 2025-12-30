import { ServiceType, ViewMode } from '@/@types/common';
import MenuBox from './MenuBox';
import HomeIcon from '../ui/icon/HomeIcon';
import WarningBoard from '@/components/common/warningBoard';

type Props = {
  children: React.ReactNode;
  onViewModeChange: (mode: ViewMode) => void;
  currentView: ViewMode;
  serviceType: ServiceType
}

const iconMap: Record<string, JSX.Element> = {
  origin: <HomeIcon />,
};

export default function Header({ children, onViewModeChange, currentView, serviceType }: Props) {

  return (
    <header className='flex w-full justify-between bg-white items-center px-2 py-2 rounded-md h-10 my-[6px] dark:bg-gray-800'>
      {currentView === 'main' && iconMap[serviceType] || null}
      {children}
      <div className='flex justify-center items-center gap-3 bg-gray-100 dark:bg-gray-600 p-1 flex-1 rounded-md mx-2 h-[35px]'>
        <WarningBoard />
      </div>
      <div className='flex'>
        <MenuBox type='service' serviceType={serviceType} currentView={currentView} />
        {currentView !== 'dashboard' && (
          <>
            <MenuBox type='common' serviceType={serviceType} currentView={currentView} />
            <MenuBox type='switchingMode' currentView={currentView} serviceType={serviceType} onViewModeChange={onViewModeChange} />
          </>
        )}
      </div>
    </header>
  );
}