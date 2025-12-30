// import { Button } from '@/components/ui';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import ModalSetting from '../modals/ModalSetting';
import { ModalType } from '@/@types/modal';
import { useEffect, useRef, useState } from 'react';
import AsideFloorList from './AsideFloorList';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useBuildings } from '@/utils/hooks/main/useBuildings';
import AddFloor from '@/components/common/AddFloor';
import { TargetEventPayload } from '@/@types/common';
import { apiAddObFloor, apiModifyObFloor, apiRemoveObFloor } from '@/services/ObserverService';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { IoAlert } from 'react-icons/io5';
import { ThreedModel } from '@/@types/threeD';
import { Building } from '@/@types/building';
import { Button } from '@/components/ui';

export default function IndoorAside() {
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const { setCanvasMapState, buildingIdx, threeDModelId, is3DView } = useCanvasMapStore();
  const buildingId = is3DView ? threeDModelId : buildingIdx;
  const { data, isLoading, error, mutate } = useBuildings(is3DView ? 'getBuilding3D' : 'getBuilding');
  const [buildingList, setBuildingList] = useState<ThreedModel[] | Building[]>([]);
  if (isLoading) {
    console.log('get buildings loading...');
  };
  if (error) {
    console.error('get buildings error');
  }
  const buildings = data?.result;
  const modalChildRef = useRef<HTMLDivElement>(null);
  const [modal, setModal] = useState<ModalType>({
    show: false,
    type: '',
    title: ''
  });
  const [treeToggleState, setTreeToggleState] = useState<Set<number>>(new Set());
  const ulRef = useRef<HTMLUListElement | null>(null);
  const [ulHeight, setUlHeight] = useState('auto');
  const toggleBuilding = (outside_idx: number) => {
    setTreeToggleState((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(outside_idx)) {
        newExpanded.delete(outside_idx);
      } else {
        newExpanded.add(outside_idx);
      }
      return newExpanded;
    });
  };

  const toggleModal = ({ show, title, type }: ModalType) => {
    setModal({
      show,
      title,
      type
    })
  }

  const closeFloorModalSetting = () => {
    setModal({
      show: false,
      title: '',
      type: ''
    })
  }

  const buildingStyle = (listBuildingIdx: number) => {
    return buildingId === listBuildingIdx ? 'bg-[#C0CFF3]' : 'bg-[#EBECEF]'
  }

  const actionFloorSetting = async (payload: TargetEventPayload) => {
    switch (payload.action) {
      case 'add':
        await apiAddObFloor(payload.data)
        break;
      case 'update':
        await apiModifyObFloor(payload.data.floorId, payload.data.updatedFloorName);
        break;
      case 'delete':
        await apiRemoveObFloor(payload.data.idx)
        break;
      default:
        return false;
        break;
    };
    return true;
  };

  const updateHeight = () => {
    const ul = ulRef.current;
    if (!ul) return;

    const rect = ul.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - rect.top - 14;

    if (availableHeight > 0) {
      setUlHeight(`${availableHeight}px`);
    }
  };

  useEffect(() => {
    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    const mutationObserver = new MutationObserver(() => {
      updateHeight();
    });

    const ul = ulRef.current;
    if (ul) {
      resizeObserver.observe(document.body);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener('resize', updateHeight);
    setTimeout(updateHeight, 300); // fallback 강제 적용 (DOM 안정화 이후)

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const buildingSocket = socketService.subscribe('ob_buildings-update', (received) => {
      if (received) {
        mutate();
      }
    })
    return () => {
      buildingSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  useEffect(() => {
    if (buildings && is3DView) {
      setBuildingList(buildings as unknown as ThreedModel[]);
    } else if (buildings && !is3DView) {
      setBuildingList(buildings as unknown as Building[]);
    }
  }, [buildings, is3DView])

  if (is3DView) {
    return (
      <aside className='w-[14.5rem] px-[9px] bg-white dark:bg-[#1E1E20] rounded-md flex flex-col justify-between'>
        <div>
          <h6 className='my-1 mt-2 ml-1'>위치 안내</h6>
          <div className='bg-[#B8B8B8] w-full h-[2px]'></div>
          <ul
            className='scroll-container overflow-x-hidden overflow-y-auto h-full py-1 px-2 mr-1.5'
            style={{
              height: ulHeight
            }}
          >
            {buildingList && (buildingList as ThreedModel[]).filter((building) => building.id).map((building) => (
              <li
                key={building.id}
                className='text-black font-semibold'
              >
                <div className='rounded-md mb-2'>
                  <div className={`flex justify-between ${buildingStyle(building.id)} items-center py-1 px-3`}>
                    <span
                      className='w-11/12 cursor-pointer'
                      onClick={() => {
                        const current = useCanvasMapStore.getState();
                        setCanvasMapState({
                          ...current,
                          threeDModelId: building.id,
                          buildingName: building.name,
                          mapImageURL: null,
                          floorIdx: 0,
                        })
                      }}
                    >
                      {building.name}
                    </span>
                    <span
                      className='w-1/12 cursor-pointer'
                      onClick={
                        () => toggleBuilding(building.id)
                      }
                    >
                      {treeToggleState.has(building.id) ? '▲' : '▼'}
                    </span>
                  </div>
                  {(treeToggleState.has(building.id) || (buildingId === building.id)) ? (
                    <AsideFloorList threeDModelId={building.id} />
                  )
                    :
                    ''
                  }
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside >
    )
  } else {
    return (
      <aside className='w-[14.5rem] px-[9px] bg-white dark:bg-[#1E1E20] rounded-md flex flex-col justify-between'>
        <div>
          <h6 className='my-1 mt-2 ml-1'>위치 안내</h6>
          <div className='bg-[#B8B8B8] w-full h-[2px]'></div>
          <ul
            className='scroll-container overflow-x-hidden overflow-y-auto h-full py-1 px-2 mr-1.5'
            style={{
              height: ulHeight
            }}
          >
            {buildingList && (buildingList as Building[]).map((building) => (
              <li
                key={building.idx}
                className='text-black font-semibold'
              >
                <div className='rounded-md mb-2'>
                  <div className={`flex justify-between ${buildingStyle(building.idx)} items-center py-1 px-3`}>
                    <span
                      className='w-11/12 cursor-pointer'
                      onClick={() => {
                        const current = useCanvasMapStore.getState();
                        setCanvasMapState({
                          ...current,
                          buildingIdx: building.idx,
                          buildingName: building.outside_name,
                          mapImageURL: building.map_image_url != null ? `http://${window.location.hostname}:4200/images/buildingplan/${building.map_image_url}` : null,
                          floorIdx: 0,
                        })
                      }}
                    >
                      {building.outside_name}
                    </span>
                    {building.alarm_status && (
                      <IoAlert color='red' />
                    )}
                    <span
                      className='w-1/12 cursor-pointer'
                      onClick={
                        () => toggleBuilding(building.idx)
                      }
                    >
                      {treeToggleState.has(building.idx) ? '▲' : '▼'}
                    </span>
                  </div>
                  {(treeToggleState.has(building.idx) || (buildingIdx === building.idx)) ? (
                    <AsideFloorList buildingIdx={building.idx} />
                  )
                    :
                    ''
                  }
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className='bg-[#E0E0E0] w-full h-[1px] mb-2'></div>
          <Button
            variant='default'
            className='text-[#505050] bg-[#EFEFF1] w-full text-[13px] p-2 rounded-none mb-2'
            onClick={() => toggleModal({ show: true, title: '건물 층/구역 설정', type: 'building-setting' })}
          >
            건물 층/구역 설정
          </Button>
        </div>
        {
          modal.show && (
            <ModalSetting
              modal={modal}
              toggle={toggleModal}
              noHeaderLine={true}
            >
              <div ref={modalChildRef} className='h-[24.5rem]'>
                <AddFloor
                  type='ob_building'
                  buildingData={{ result: (data?.result ?? []) as Building[] }}
                  closeModal={closeFloorModalSetting}
                  targetEvent={(payload: TargetEventPayload) => actionFloorSetting(payload)}
                  selectBuildingIdx={buildingIdx}
                />
              </div>
            </ModalSetting>
          )
        }
      </aside >
    )
  }
}