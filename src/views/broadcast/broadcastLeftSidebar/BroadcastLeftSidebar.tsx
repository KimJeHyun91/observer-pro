import { Dialog } from '@/components/ui'
import inundationIcon from '@/configs/inundation-icon.config'
import React, { useState } from 'react'
import DeviceGrouping from '../modals/DeviceGrouping'
import LiveBroadcast from '../modals/liveBroadcast/LiveBroadcast'
import ReservedBroadcast from '../modals/reservationBroadcast/ReservedBroadcast'

const BroadcastLeftSidebar = () => {

  const [deviceGroupingMenuOpen, setDeviceGroupingMenuOpen] = useState(false)
  const [liveBroadcastMenuOpen, setLiveBroadcastMenuOpen] = useState(false)
  const [reservationBroadcastMenuOpen, setReservationBroadcastMenuOpen] = useState(false)

  return (
    <div className="w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-900 h-full flex flex-col mr-1">
    <div className="flex flex-col gap-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <button
        className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
        // onClick={onMapViewClick}
      >
        <span className="text-[30px] text-gray-700 dark:text-gray-200">
          {inundationIcon.checkIcon}
        </span>
      </button>
      <p className="text-center text-[clamp(0.5rem,0.8vw,0.8rem)] text-gray-600 dark:text-gray-400 w-full">
        전체지도
      </p>
      {/* <button className="flex items-center justify-center p-2 
                        bg-gray-100 dark:bg-gray-700 
                        hover:bg-gray-200 dark:hover:bg-gray-600 
                        rounded h-12 w-[87%] ml-1">
        <span className="text-[30px] text-gray-700 dark:text-gray-200">
          {inundationIcon.checkIcon}
        </span>
      </button>
      <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full">
        개소 별 현황
      </p> */}
    </div>

    <div className="flex flex-col gap-2 p-1 mt-2 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow mb-2">
      {/* <div>
        <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1">
          <span className="text-[30px] text-gray-700 dark:text-gray-200">
            {inundationIcon.checkIcon}
          </span>
        </button>
        <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full">
          스피커<br /> 전체 제어
        </p>
      </div> */}
      <div>
      <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
        onClick={()=>setDeviceGroupingMenuOpen(true)}>
        <span className="text-[30px] text-gray-700 dark:text-gray-200">
          {inundationIcon.checkIcon}
        </span>
      </button>
      <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full pt-2">
        개소<br /> 그룹화
      </p>
      </div>
      <div>
      <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
        onClick={()=>setLiveBroadcastMenuOpen(true)}>
        <span className="text-[30px] text-gray-700 dark:text-gray-200">
          {inundationIcon.checkIcon}
        </span>
      </button>
      <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full pt-2">
        실시간<br /> 방송
      </p>
      </div>
      <div>
      <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
        onClick={()=>setReservationBroadcastMenuOpen(true)}>
        <span className="text-[30px] text-gray-700 dark:text-gray-200">
          {inundationIcon.checkIcon}
        </span>
      </button>
      <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full pt-2">
        예약/정기<br /> 방송 설정
      </p>
      </div>
    </div>

   <DeviceGrouping isOpen={deviceGroupingMenuOpen} onClose={()=>setDeviceGroupingMenuOpen(false)} />
   <LiveBroadcast isOpen={liveBroadcastMenuOpen} onClose={()=>setLiveBroadcastMenuOpen(false)} />
   <ReservedBroadcast isOpen={reservationBroadcastMenuOpen} onClose={()=>setReservationBroadcastMenuOpen(false)} />
  </div>
  )
}

export default BroadcastLeftSidebar
