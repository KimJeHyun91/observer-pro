import { useEffect, useState } from 'react';
import { IoAlert } from "react-icons/io5";
import { Floor } from '@/@types/floor';
import Loading from '@/components/shared/Loading';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useFloors } from '@/utils/hooks/main/useFloors';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

type Props = {
  buildingIdx?: number;
  threeDModelId?: number;
};

export default function AsideFloorList({ buildingIdx, threeDModelId }: Props) {
  const { setCanvasMapState, floorIdx } = useCanvasMapStore();
  const { socketService } = useSocketConnection();
  const { data, error, isLoading, mutate } = useFloors(buildingIdx, threeDModelId);
  const [floorList, setFloorList] = useState<Floor[]>([]);
  if (isLoading) {
    console.log(`get floors(outside_idx: ${buildingIdx}) loading...`);
  };
  if (error) {
    console.error(`get floors(outside_idx: ${buildingIdx}) error: `, error);
  }
  const floors: Floor[] = data?.result;
  const floorStyle = (listFloorIdx: number) => {
    return floorIdx === listFloorIdx ? 'bg-[#C0CFF3] dark:bg-[#C0CFF3]' : 'bg-[#EBECEF]'
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const FloorsSocket = socketService.subscribe('ob_floors-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      FloorsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  useEffect(() => {
    if (floors) {
      setFloorList(floors);
    }
  }, [floors])

  if (isLoading) {
    return (
      <>
        <Loading loading></Loading>
      </>
    )
  }
  else if (floors?.length === 0) {
    return (
      <div className='bg-[#EBECEF] w-full font-medium py-2 px-4 '>
        층/구역 데이터가 없습니다.
      </div>
    )
  } else if (Array.isArray(floors)) {
    return (
      <ul
        className='bg-[#EBECEF] dark:bg-[#272829] py-2 px-1 font-medium'
      >
        {floorList.map((floor) => (
          <li
            key={floor.idx}
            className={`cursor-pointer pl-2 mb-2 rounded-sm dark:bg-[#272829] dark:text-[#F5F5F5] ${floorStyle(floor.idx)} flex justify-between items-center`}
            value={floor.idx}
            onClick={() => {
              const current = useCanvasMapStore.getState();
              if (floor.three_d_model_id) {
                setCanvasMapState({
                  ...current,
                  threeDModelId: floor.three_d_model_id,
                  buildingName: floor.outside_name,
                  floorIdx: floor.idx,
                  floorName: floor.inside_name,
                  mapImageURL: floor.map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${floor.map_image_url}` : null,
                  mainServiceName: 'origin'
                })
              } else {
                setCanvasMapState({
                  ...current,
                  buildingIdx: floor.outside_idx,
                  buildingName: floor.outside_name,
                  floorIdx: floor.idx,
                  floorName: floor.inside_name,
                  mapImageURL: floor.map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${floor.map_image_url}` : null,
                  mainServiceName: 'origin'
                })
              }
            }}>
            <p className={`flex justify-between items-center ${floorIdx === floor.idx ? 'dark:text-[#1a1919]' : ''}`}>
              - {floor.inside_name}
            </p>
            {floor.alarm_status && (
              <p><IoAlert color='red' /></p>)}
          </li>
        ))}
      </ul>
    )
  }
}