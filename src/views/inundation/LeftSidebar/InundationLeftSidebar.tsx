import { useState, useCallback } from 'react';
import inundationIcon from '../../../configs/inundation-icon.config';
import { AllBillboardControl } from './components/AllBillboardControl';
import { AllCrossinggateControl } from './components/AllCrossinggateControl';
import { AllSpeakerControl } from './components/AllSpeakerControl';
import { AllWaterlevelStatusBoard } from './components/AllWaterlevelStatusBoard';
import { GroupControl } from './components/GroupControl';
import { GroupManager } from './components/GroupManager';

interface LeftSidebarProps {
  onMapViewClick: () => void;
}

interface SidebarButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
}

const SidebarButton = ({ onClick, icon, label, subLabel }: SidebarButtonProps) => (
  <>
    <button
      type="button"
      className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded h-12 w-12"
      onClick={onClick}
    >
      <span className="text-[30px] text-gray-700 dark:text-gray-200">{icon}</span>
    </button>
    <p className="text-center text-[clamp(0.8rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full font-semibold">
      {label}
    </p>
    {subLabel && (
      <p className="text-center text-[clamp(0.8rem,0.3vw,0.3rem)] text-gray-600 dark:text-gray-400 w-full font-semibold">
        {subLabel}
      </p>
    )}
  </>
);

export default function LeftSidebar({ onMapViewClick }: LeftSidebarProps) {
  const [isCrossinggateDialogOpen, setIsCrossinggateDialogOpen] = useState(false);
  const [isBillboardDialogOpen, setIsBillboardDialogOpen] = useState(false);
  const [isSpeakerDialogOpen, setIsSpeakerDialogOpen] = useState(false);
  const [isGroupControlDialogOpen, setIsGroupControlDialogOpen] = useState(false);
  const [isGroupManagerDialogOpen, setIsGroupManagerDialogOpen] = useState(false);
  const [isAllWaterlevelStatusDialogOpen, setIsAllWaterlevelDialogStatusDialogOpen] = useState(false);

  const handleCrossinggateDialogToggle = useCallback(() => {
    setIsCrossinggateDialogOpen(prev => !prev);
  }, [])

  const handleBillboardDialogToggle = useCallback(() => {
    setIsBillboardDialogOpen(prev => !prev);
  }, [])

  const handleSpeakerDialogToggle = useCallback(() => {
    setIsSpeakerDialogOpen(prev => !prev);
  }, []);

  const handleGroupControlDialogToggle = useCallback(() => {
    setIsGroupControlDialogOpen(prev => !prev);
  }, [])

  const handleGroupManagerDialogToggle = useCallback(() => {
    setIsGroupManagerDialogOpen(prev => !prev);
  }, [])
  
  
  const manageAllWaterlevelStatus = useCallback(() => {
    setIsAllWaterlevelDialogStatusDialogOpen(prev => !prev);
  }, []);

  const handleSpeakerDialogClose = useCallback(() => {
    setIsSpeakerDialogOpen(false);
  }, []);

  const handleBillboardDialogClose = useCallback(() => {
    setIsBillboardDialogOpen(false);
  }, []);
  
  const handleCrossinggateDialogClose = useCallback(() => {
    setIsCrossinggateDialogOpen(false);
  }, []);

  const manageAllWaterlevelStatusDialogClose = useCallback(() => {
    setIsAllWaterlevelDialogStatusDialogOpen(false);
  }, []);

  const handleGroupControlDialogClose = useCallback(() => {
    setIsGroupControlDialogOpen(false);
  }, []);

  const handleGroupManagerDialogClose = useCallback(() => {
    setIsGroupManagerDialogOpen(false);
  }, []);


  return (
    <div className="w-20 flex-shrink-0 bg-gray-100 dark:bg-gray-900 h-full flex flex-col mr-1">
      <div className="flex flex-col items-center gap-2 p-1 bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <SidebarButton
          onClick={onMapViewClick}
          icon={inundationIcon.checkIcon}
          label="전체지도"
        />
        <SidebarButton
          onClick={manageAllWaterlevelStatus}
          icon={inundationIcon.checkIcon}
          label="수위 현황판"
        />
        <SidebarButton
          onClick={handleGroupManagerDialogToggle}
          icon={inundationIcon.checkIcon}
          label="그룹 관리"
        />
      </div>

      <div className="flex flex-col items-center gap-2 p-1 mt-2 bg-white dark:bg-gray-800 shadow-md rounded-lg flex-grow mb-2">
        <SidebarButton
          onClick={handleCrossinggateDialogToggle}
          icon={inundationIcon.checkIcon}
          label="차단기"
          subLabel="전체제어"
        />

        <SidebarButton
          onClick={handleBillboardDialogToggle}
          icon={inundationIcon.checkIcon}
          label="전광판"
          subLabel="전체제어"
        />

        <SidebarButton
          onClick={handleSpeakerDialogToggle}
          icon={inundationIcon.checkIcon}
          label="스피커"
          subLabel="전체제어"
        />
        <SidebarButton
          onClick={handleGroupControlDialogToggle}
          icon={inundationIcon.checkIcon}
          label="그룹 제어"
        />
      </div>
      <GroupManager 
        isOpen={isGroupManagerDialogOpen} 
        onClose={handleGroupManagerDialogClose}
      />
      <GroupControl
        isOpen={isGroupControlDialogOpen}
        onClose={handleGroupControlDialogClose}
      />
      <AllCrossinggateControl
        isOpen={isCrossinggateDialogOpen}
        onClose={handleCrossinggateDialogClose}
      />
      <AllBillboardControl
        isOpen={isBillboardDialogOpen}
        onClose={handleBillboardDialogClose}
      />
      <AllSpeakerControl
        isOpen={isSpeakerDialogOpen}
        onClose={handleSpeakerDialogClose}
      />
      <AllWaterlevelStatusBoard 
        isOpen={isAllWaterlevelStatusDialogOpen}
        onClose={manageAllWaterlevelStatusDialogClose}
      />
    </div>
  );
}