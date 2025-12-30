import { useCanvasMapStore } from '@/store/canvasMapStore';
import { IoMdHome } from 'react-icons/io';

export default function HomeIcon() {
  const { setCanvasMapState, is3DView } = useCanvasMapStore();
  return (
    <div className='p-1 mr-2 bg-[#BEC3CC] dark:bg-[#484848] rounded-md'>
      <IoMdHome
        className='text-[#F3F3F3]'
        size={25}
        onClick={() => {
          const current = useCanvasMapStore.getState();
          if (is3DView) {
            setCanvasMapState({
              ...current,
              floorIdx: 0,
              mapImageURL: null
            })
          } else {
            setCanvasMapState({
              ...current,
              buildingIdx: 0,
              floorIdx: 0,
              mapImageURL: `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
              buildingName: '실외',
              floorName: '',
            })
          }
        }}
      />
    </div>
  );

}