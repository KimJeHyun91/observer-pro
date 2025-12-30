import inundationIcon from '@/configs/inundation-icon.config'
import React, { useState } from 'react'
import MoveMap from './components/MoveMap'

const TunnelLeftSidebar = ({ onMapViewClick }: { onMapViewClick: (data: any) => void }) => {

  const [moveMapModal, setMoveMapModal] = useState(false)

  return (
    <div className="w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-900 h-full flex flex-col mr-1">
      <div className="flex flex-col gap-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <button
          className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
          onClick={() => {
            onMapViewClick(null);
          }}
        >
          <span className="text-[30px] text-gray-700 dark:text-gray-200">
            {inundationIcon.checkIcon}
          </span>
        </button>
        <p className="text-center text-[clamp(0.5rem,0.8vw,0.8rem)] text-gray-600 dark:text-gray-400 w-full">
          전체지도
        </p>

      </div>

      <div className="flex flex-col gap-2 p-1 mt-2 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow mb-2">

        <div>
          <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-[87%] ml-1"
            onClick={() => setMoveMapModal(true)}
          >
            <span className="text-[30px] text-gray-700 dark:text-gray-200">
              {inundationIcon.checkIcon}
            </span>
          </button>
          <p className="text-center text-[clamp(0.6rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full pt-2">
            지도 위치 검색
          </p>
        </div>
      </div>

      <MoveMap isOpen={moveMapModal} onClose={() => setMoveMapModal(false)} />
    </div>
  )
}

export default TunnelLeftSidebar
