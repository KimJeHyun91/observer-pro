import { Building } from '@/@types/building';
import { ObCameraType } from '@/@types/camera';
import { ObDeviceType, ObGuardianliteType } from '@/@types/device';
import { Floor } from '@/@types/floor';
import Loading from '@/components/shared/Loading';
import { Menu } from '@/components/ui';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useBuildings } from '@/utils/hooks/main/useBuildings';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { useEbells } from '@/utils/hooks/main/useEbells';
import { useFloors } from '@/utils/hooks/main/useFloors';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import { useCameras } from '@/utils/hooks/useCameras';
import { FaBell, FaBuilding, FaPowerOff } from 'react-icons/fa';
import { IoLayers } from "react-icons/io5";
import { IoMdAlert } from 'react-icons/io';
import { BsFillDoorClosedFill } from 'react-icons/bs';
import { TbDeviceCctv } from 'react-icons/tb';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect } from 'react';

type Props = {
  searchValue: string;
  mode: 'map' | 'dashboard' | 'building-dashboard';
  outsideIdx: number;
}

const HeaderStyle = 'bg-[#EBECEF] dark:bg-[#343638] py-1 h-[2rem] text-[#2E2E2E] rounded-t-2 rounded-b-none mb-1.5';
const HeaderFloorStyle = 'pl-5 py-1 h-[2rem] text-[#2E2E2E] bg-[#EBECEF] dark:bg-[#353637] dark:text-[#F3F3F3] mb-1';
const ItemStyle = 'py-1 text-[#2E2E2E] bg-[#FFFFFF] dark:bg-[#313233] pl-[1.25rem] rounded-none dark:text-[#F3F3F3]';
const ItemNameStyle = 'w-[16.5rem] whitespace-nowrap overflow-x-hidden text-ellipsis dark:text-[#F3F3F3]';

export default function DevicesBuildingDashboard({ searchValue, mode, outsideIdx }: Props) {
  const { setCanvasMapState } = useCanvasMapStore();
  const { socketService } = useSocketConnection();
  const { data: buildings, error: errorBuilding, mutate: mutateBuildings } = useBuildings('getBuilding');
  const { data: floors, error: errorFloor, mutate: mutateFloors } = useFloors();

  const { cameras, isLoading: camerasLoading, error: camerasError, mutate: mutateCamera } = useCameras('origin');
  const { ebells, isLoading: ebellsLoading, error: ebellsError, mutate: mutateEbell } = useEbells({ outside_idx: outsideIdx });
  const { doors, isLoading: doorsLoading, error: doorsError, mutate: mutateDoors } = useDoors();
  const { guardianlites, isLoading: guardianlitesLoading, error: guardianlitesError, mutate: mutateGuardianlites } = useGuardianlites({});
  if (errorFloor) {
    console.log('use floors error');
  }

  if (errorBuilding) {
    console.log('use buildings error');
  }

  if (camerasError) {
    console.log('use cameras error');
  }

  if (ebellsError) {
    console.log('use ebells error');
  }

  if (doorsError) {
    console.log('use doors error');
  }

  if (guardianlitesError) {
    console.log('use guardianlites error');
  };

  const handleSelect = (
    {
      outside_idx,
      inside_idx,
      outside_name,
      inside_name,
      map_image_url,
      dimension_type
    }
      :
      {
        outside_idx: number | null,
        inside_idx: number | null,
        outside_name: string | null,
        inside_name: string | null,
        map_image_url: string | null,
        dimension_type: string | null
      }) => {
    if (outside_idx == null || inside_idx == null || mode === 'dashboard') {
      return;
    }
    console.log(outside_idx, inside_idx, outside_name, inside_name, dimension_type, map_image_url)
    const current = useCanvasMapStore.getState();
    if (dimension_type === '3d') {
      setCanvasMapState({
        ...current,
        buildingIdx: outside_idx,
        buildingName: outside_name,
        floorIdx: inside_idx,
        floorName: inside_name,
        mainServiceName: 'origin',
        mapImageURL: map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${map_image_url}` : `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
        is3DView: true
      })
    } else {
      setCanvasMapState({
        ...current,
        threeDModelId: outside_idx,
        buildingName: outside_name,
        floorIdx: inside_idx,
        floorName: inside_name,
        mainServiceName: 'origin',
        mapImageURL: map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${map_image_url}` : `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
        is3DView: false
      })
    }

  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
    const buildingSocket = socketService.subscribe('ob_buildings-update', (received) => {
      if (received) {
        mutateBuildings();
      }
    });
    const floorSocket = socketService.subscribe('ob_floors-update', (received) => {
      if (received) {
        mutateFloors();
      }
    });
    const cameraSocket = socketService.subscribe('ob_cameras-update', (received) => {
      if (received) {
        mutateCamera();
      }
    });
    const ebellSocket = socketService.subscribe('ob_ebells-update', (received) => {
      if (received) {
        mutateEbell();
      }
    });
    const doorSocket = socketService.subscribe('ob_doors-update', (received) => {
      if (received) {
        mutateDoors();
      }
    });
    const guardianliteSocket = socketService.subscribe('ob_guardianlites-update', (received) => {
      if (received) {
        mutateGuardianlites();
      }
    });
    return () => {
      buildingSocket();
      floorSocket();
      cameraSocket();
      doorSocket();
      ebellSocket();
      guardianliteSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService])

  return (
    <div className={'scroll-container overflow-x-hidden overflow-y-auto h-[calc(100%-4.5rem)] py-1 px-2 mx-auto bg-white dark:bg-[#313233] rounded-[3px]'}>
      <Menu>
        {buildings?.result && buildings.result.filter((building): building is Building => 'idx' in building && building.idx === outsideIdx).map((building: Building) => (
          <Menu.MenuCollapse
            key={building.idx}
            className={HeaderStyle}
            label={
              <div className='flex'>
                <FaBuilding size={20} color='#737373' />
                &nbsp;
                {building.outside_name}
              </div>
            }
            eventKey={`building-${building.idx}`}
            expanded={true}
          >
            {floors?.result && floors.result.filter((floor: Floor) => floor.outside_idx === building.idx).map((floor: Floor) => (
              <Menu.MenuCollapse
                key={floor.idx}
                className={HeaderFloorStyle}
                label={
                  <div className='flex'>
                    <IoLayers size={20} color='#737373' />
                    &nbsp;
                    {floor.inside_name}
                  </div>
                }
                eventKey={`floor-${floor.idx}`}
                expanded={true}
              >
                {camerasLoading ? (
                  <Loading className='flex w-5 justify-center' loading={true} />)
                  :
                  cameras
                    .filter((camera: ObCameraType) => camera.inside_idx === floor.idx)
                    .filter((camera: ObCameraType) => (`${camera.camera_id}${camera.camera_name}${camera.vms_name}`)
                      .includes(searchValue))
                    .map((camera: ObCameraType) => (
                      <Menu.MenuItem
                        key={`${camera.main_service_name}:${camera.vms_name}:${camera.camera_id}`}
                        eventKey={`${camera.main_service_name}:${camera.vms_name}:${camera.camera_id}`}
                        className={ItemStyle}
                        style={{
                          height: '32px'
                        }}
                        onSelect={() => handleSelect({
                          outside_idx: camera.outside_idx,
                          inside_idx: camera.inside_idx,
                          outside_name: camera.outside_name || camera.model_name,
                          inside_name: camera.inside_name,
                          map_image_url: camera.inside_map_image_url,
                          dimension_type: camera.dimension_type
                        })}
                      >
                        <span className='flex justify-between w-full'>
                          -
                          &nbsp;
                          <TbDeviceCctv size={20} color='#737373' />
                          &nbsp;
                          <p
                            className={ItemNameStyle}
                            title={camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}>
                            {camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}
                          </p>
                          {!camera.linked_status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                        </span>
                      </Menu.MenuItem>
                    )
                    )}
                {ebellsLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
                  :
                  ebells
                    .filter((ebell: ObDeviceType) => ebell.inside_idx === floor.idx)
                    .filter((ebell: ObDeviceType) => `${ebell.device_id}${ebell.device_name}${ebell.device_ip}`
                      .includes(searchValue))
                    .map((ebell: ObDeviceType) => (
                      <Menu.MenuItem
                        key={ebell.idx}
                        eventKey={`ebell-${ebell.idx}`}
                        className={ItemStyle}
                        style={{
                          height: '32px'
                        }}
                        onSelect={() => handleSelect({
                          outside_idx: ebell.outside_idx,
                          outside_name: ebell.outside_name || ebell.model_name,
                          inside_idx: ebell.inside_idx,
                          inside_name: ebell.inside_name,
                          map_image_url: ebell.inside_map_image_url,
                          dimension_type: ebell.dimension_type
                        })}
                      >
                        <span className='flex justify-between w-full'>
                          -
                          &nbsp;
                          <FaBell size={20} color='#737373' />
                          &nbsp;
                          <p
                            title={`${ebell.device_id}.${ebell.device_name}(${ebell.device_ip})`}
                            className={ItemNameStyle}
                          >
                            {`${ebell.device_id}.${ebell.device_name}(${ebell.device_ip})`}
                          </p>
                          {!ebell.linked_status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                        </span>
                      </Menu.MenuItem>
                    ))}
                {doorsLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
                  :
                  doors
                    .filter((door: ObDeviceType) => door.inside_idx === floor.idx)
                    .filter((door: ObDeviceType) => `${door.device_id}${door.device_name}`
                      .includes(searchValue))
                    .map((door: ObDeviceType) => (
                      <Menu.MenuItem
                        key={door.idx}
                        eventKey={`door-${door.idx}`}
                        className={ItemStyle}
                        style={{
                          height: '32px'
                        }}
                        onSelect={() => handleSelect({
                          outside_idx: door.outside_idx,
                          outside_name: door.outside_name || door.model_name,
                          inside_idx: door.inside_idx,
                          inside_name: door.inside_name,
                          map_image_url: door.inside_map_image_url,
                          dimension_type: door.dimension_type
                        })}
                      >
                        <span className='flex justify-between w-full'>
                          -
                          &nbsp;
                          <BsFillDoorClosedFill size={20} color='#737373' />
                          &nbsp;
                          <p
                            title={`${door.device_id}.${door.device_name}`}
                            className={ItemNameStyle}
                          >{`${door.device_id}.${door.device_name}`}
                          </p>
                          {!door.linked_status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                        </span>
                      </Menu.MenuItem>
                    ))}
                {guardianlitesLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
                  :
                  guardianlites
                    .filter((guardianlite: ObGuardianliteType) => guardianlite.inside_idx === floor.idx)
                    .filter((guardianlite: ObGuardianliteType) => `${guardianlite.guardianlite_name}${guardianlite.guardianlite_ip}`
                      .includes(searchValue))
                    .map((guardianlite: ObGuardianliteType) => (
                      <Menu.MenuItem
                        key={guardianlite.guardianlite_ip}
                        eventKey={`guardianlite-${guardianlite.guardianlite_ip}`}
                        className={ItemStyle}
                        style={{
                          height: '32px',
                        }}
                        onSelect={() => handleSelect({
                          outside_idx: guardianlite.outside_idx ?? 0,
                          outside_name: guardianlite.outside_name || guardianlite.model_name,
                          inside_idx: guardianlite.inside_idx ?? 0,
                          inside_name: guardianlite.inside_name,
                          map_image_url: guardianlite.inside_map_image_url,
                          dimension_type: guardianlite.dimension_type
                        })}
                      >
                        <span className='flex justify-between w-full'>
                          -
                          &nbsp;
                          <FaPowerOff size={20} color='#737373' />
                          &nbsp;
                          <p
                            title={`${guardianlite.guardianlite_name}(${guardianlite.guardianlite_ip}`}
                            className={ItemNameStyle}
                          >
                            {`${guardianlite.guardianlite_name}(${guardianlite.guardianlite_ip})`}
                          </p>
                          {!guardianlite.status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                        </span>
                      </Menu.MenuItem>
                    ))}
              </Menu.MenuCollapse>
            ))}
          </Menu.MenuCollapse>
        ))}
      </Menu>
    </div>
  );
}