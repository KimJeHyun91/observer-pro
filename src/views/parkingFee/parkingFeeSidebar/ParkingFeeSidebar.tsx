import { useNavigationConfig } from '@/configs/navigation.config'
import { useEffect } from 'react';
import { parkingFeeOutsideInfo } from "@/@types/parkingFee";
import { MdOutlineScreenshotMonitor } from "react-icons/md";
import type { IconType } from "react-icons";
import { FaCar } from "react-icons/fa6";
import { IoStatsChart } from "react-icons/io5";

type Props = {
  selectedKey: string;
  setSelectedKey: (key: string) => void;
  selectedParking: parkingFeeOutsideInfo | null;
}


const ParkingFeeSidebar = ({ selectedKey, setSelectedKey, selectedParking } : Props) =>  {
  const navItems = useNavigationConfig()
  const parkingFeeMenu = navItems.find((item) => item.key === 'parkingFee')
  const parkingFeeIcons: Record<string, IconType> = {
    carManagement: FaCar,
    dashboard: IoStatsChart,
  }

  const baseMenu = {
    key: 'main',
    title: '모니터링',
    icon: MdOutlineScreenshotMonitor,
  }
  
  const subMenus = parkingFeeMenu?.subMenu ?? []

  useEffect(() => {
    if (!selectedParking && selectedKey !== 'main') {
      setSelectedKey('main');
    }
  }, [selectedParking, selectedKey, setSelectedKey]);

  return (
    <div className="w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-900 h-full flex flex-col mr-2">
      <div className="flex flex-col gap-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-2">
          <div key={baseMenu.key}>
              <button
                className={`flex items-center justify-center p-2 rounded h-12 w-[87%] ml-1
                ${selectedKey === baseMenu.key
                  ? 'bg-[#D5E1FD] text-white dark:bg-[#C9C9CE]'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                }`}
                onClick={() => setSelectedKey(baseMenu.key)}
              >
                <span className="text-[30px]">
                  <baseMenu.icon />
                </span>
              </button>
              <p className={`text-center text-[clamp(0.6rem,0.3vw,0.3rem)] w-full pt-2
                ${selectedKey === baseMenu.key
                  ? 'text-blue-500'
                  : 'text-gray-600 dark:text-gray-400'
                }`}>
                {baseMenu.title}
              </p>
          </div>
      </div>

      <div className="flex flex-col gap-2 p-1 mt-1 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow mb-2">
          {subMenus.map((menu) => {
              const isActive = menu.key === selectedKey
              const IconComponent = parkingFeeIcons[menu.icon];

              return (
                <div key={menu.key}>
                  <button
                      className={`flex items-center justify-center p-2 rounded h-12 w-[87%] ml-1 
                        ${isActive 
                          ? 'bg-[#D5E1FD] text-white dark:bg-[#C9C9CE]' 
                          : selectedParking 
                            ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                            : 'bg-gray-300 text-gray-400 cursor-not-allowed dark:opacity-30'
                      }`}
                      disabled={!selectedParking}
                      onClick={() => setSelectedKey(menu.key)}
                  >
                    <span className="text-[25px]">
                      {IconComponent ? <IconComponent /> : null}
                    </span>
                  </button>
                  <p className={`text-center text-[clamp(0.6rem,0.3vw,0.3rem)] w-full pt-2 
                    ${isActive 
                      ? 'text-blue-500' 
                      : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {menu.title}
                  </p>
                </div>
              )
          })}
      </div>
    </div>
  )
}

export default ParkingFeeSidebar
