import { Building } from '@/@types/building';
import { ObCameraType } from '@/@types/camera';
import { DevicePopupType, ObDeviceType, ObGuardianliteType } from '@/@types/device';
import { Floor } from '@/@types/floor';
import { PIDS } from '@/@types/pids';
import Loading from '@/components/shared/Loading';
import { Menu } from '@/components/ui';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useBuildings } from '@/utils/hooks/main/useBuildings';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { useEbells } from '@/utils/hooks/main/useEbells';
import { useFloors } from '@/utils/hooks/main/useFloors';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import { usePIDS } from '@/utils/hooks/main/usePIDS';
import { useCameras } from '@/utils/hooks/useCameras';
import { BiCctv } from 'react-icons/bi';
import { FaBell, FaBuilding, FaPowerOff } from 'react-icons/fa';
import { IoLayers } from "react-icons/io5";
import { IoMdAlert } from 'react-icons/io';
import { MdFence } from 'react-icons/md';
import { BsFillDoorClosedFill } from 'react-icons/bs';
import { TbDeviceCctv } from 'react-icons/tb';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useEffect, useRef, useState } from 'react';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { ThreedModel } from '@/@types/threeD';
import UsePrevious from '@/utils/hooks/usePreviousVal';
import { ObGuardianlitePopup } from '@/views/main/types/guardianlite';

type Props = {
  searchValue: string;
  mode: 'map' | 'dashboard' | 'building-dashboard';
  floorIdx?: number;
  handleShowDevicePopup?: (value: DevicePopupType | ObGuardianlitePopup) => void;
};

const HeaderStyle = 'bg-[#FAFAFB] dark:bg-[#353637] py-1 h-[2rem] text-[#2E2E2E] dark:text-[#F5F5F5] rounded-t-2 rounded-b-none';
const HeaderFloorStyle = 'pl-5 py-1 h-[2rem] text-[#2E2E2E] dark:text-[#F3F3F3]';
const ItemStyle = 'py-1 text-[#2E2E2E] bg-[#EBECEF] dark:bg-[#2D2E2F] pl-[1.25rem] rounded-none dark:text-[#F3F3F3] h-full';
const ItemNameStyle = 'w-[16.5rem] dark:text-[#737373] whitespace-nowrap overflow-x-hidden text-ellipsis dark:text-[#F3F3F3]';

export default function DevicesByLocation({ searchValue, mode, floorIdx, handleShowDevicePopup }: Props) {
  const { setCanvasMapState } = useCanvasMapStore();
  const { socketService } = useSocketConnection();
  const { isFullscreen } = useFullScreenStore();
  const prevIsFullScreen = UsePrevious(isFullscreen);
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState('auto');
  const { data: buildings, error: errorBuilding, mutate: mutateBuildings } = useBuildings('getBuilding');
  const { data: buildings3D } = useBuildings('getBuilding3D');
  const { data: floors, error: errorFloor, mutate: mutateFloors } = useFloors();

  const { cameras, isLoading: camerasLoading, error: camerasError, mutate: mutateCamera } = useCameras('origin');
  const { ebells, isLoading: ebellsLoading, error: ebellsError, mutate: mutateEbell } = useEbells({});
  const { doors, isLoading: doorsLoading, error: doorsError, mutate: mutateDoors } = useDoors();
  const { guardianlites, isLoading: guardianlitesLoading, error: guardianlitesError, mutate: mutateGuardianlites } = useGuardianlites({});
  const { pidsList, isLoading: pidsLoading, error: pidsError, mutate: mutatePIDS } = usePIDS();

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
  }

  if (pidsError) {
    console.log('use PIDS list error');
  }

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
    const current = useCanvasMapStore.getState();
    if (dimension_type === '3d') {
      setCanvasMapState({
        ...current,
        threeDModelId: outside_idx,
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
        buildingIdx: outside_idx,
        buildingName: outside_name,
        floorIdx: inside_idx,
        floorName: inside_name,
        mainServiceName: 'origin',
        mapImageURL: map_image_url != null ? `http://${window.location.hostname}:4200/images/floorplan/${map_image_url}` : `http://${window.location.hostname}:4200/images/outdoorplan/outdoor.png`,
        is3DView: false
      })
    };
  };

  const HeightSize = () => {
    if (mode === 'dashboard') {
      return 'h-[calc(100%-1rem)] mb-2';
    } else if (mode === 'map' && floorIdx) {
      return 'h-[calc(100%-5.8rem)]';
    } else {
      return 'h-[calc(100%-6rem)]';
    }
  }

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
    const pidsSocket = socketService.subscribe('ob_pids-update', (received) => {
      if (received) {
        mutatePIDS();
      }
    });
    return () => {
      buildingSocket();
      floorSocket();
      cameraSocket();
      doorSocket();
      ebellSocket();
      guardianliteSocket();
      pidsSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  const updateHeight = () => {
    const ul = navRef.current;
    if (!ul) return;
    const windowHeight = window.innerHeight;
    const top = ul.offsetTop;
    const availableHeight = windowHeight - top - 70;

    if (availableHeight > 0) {
      setNavHeight(`${availableHeight}px`);
    }
  };

  useEffect(() => {
    if (prevIsFullScreen === isFullscreen) return;
    updateHeight();
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    const mutationObserver = new MutationObserver(() => {
      updateHeight();
    });

    const ul = navRef.current;
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
  }, [isFullscreen, prevIsFullScreen]);

  if (!floorIdx) {
    return (
      <div className={`scroll-container overflow-x-hidden overflow-y-auto ${HeightSize()} py-1 px-2 mr-2`}>
        <Menu
          ref={navRef}
          // className={(mode === 'dashboard') ? `scroll-container overflow-x-hidden overflow-y-auto h-full py-1 px-2 mr-2` : ''}
          style={{
            height: navHeight
          }}
        >
          <Menu.MenuCollapse
            key='outdoor'
            className={HeaderStyle}
            label="실외"
            eventKey="item-1"
            expanded={true}
          >
            {camerasLoading ? (
              <Loading className='flex w-5 justify-center' loading={true} />)
              :
              cameras
                .filter((camera: ObCameraType) => camera.outside_idx === 0)
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
                      outside_name: camera.outside_name || camera.model_name,
                      inside_idx: camera.inside_idx,
                      inside_name: camera.inside_name,
                      map_image_url: camera.inside_map_image_url,
                      dimension_type: camera.dimension_type
                    })}
                  >
                    <span className='flex justify-between w-full'>
                      -
                      &nbsp;
                      <BiCctv size={20} color='#737373' />
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
                .filter((camera: ObCameraType) => camera.outside_idx === 0)
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
                      inside_idx: ebell.inside_idx,
                      outside_name: ebell.outside_name || ebell.model_name,
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
            {guardianlitesLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
              :
              guardianlites
                .filter((guardianlite: ObGuardianliteType) => guardianlite.outside_idx == null)
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
            {pidsLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
              :
              pidsList
                .filter((pids: PIDS) => pids.pids_id
                  .includes(searchValue))
                .map((pids: PIDS) => (
                  <Menu.MenuItem
                    key={pids.pids_id}
                    eventKey={`pids-${pids.pids_id}`}
                    className={ItemStyle}
                    style={{
                      height: '32px'
                    }}
                  >
                    <span className='flex justify-between w-full'>
                      -
                      &nbsp;
                      <MdFence size={20} color='#737373' />
                      &nbsp;
                      <p
                        title={pids.pids_id}
                        className={ItemNameStyle}
                      >
                        {pids.pids_id}
                      </p>
                      {!(pids.alarm_status || pids.linked_status) ? <IoMdAlert size={20} color='#D76767' /> : ''}
                    </span>
                  </Menu.MenuItem>
                ))}
          </Menu.MenuCollapse>
          {buildings?.result && buildings.result.filter((building): building is Building => 'idx' in building).map((building: Building) => (
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
                            outside_idx: guardianlite.outside_idx,
                            outside_name: guardianlite.outside_name || guardianlite.model_name,
                            inside_idx: guardianlite.inside_idx,
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
          {buildings3D?.result && buildings3D.result.filter((building): building is ThreedModel => 'id' in building).map((building: ThreedModel) => (
            <Menu.MenuCollapse
              key={building.id}
              className={HeaderStyle}
              label={
                <div className='flex'>
                  <FaBuilding size={20} color='#737373' />
                  &nbsp;
                  {building.name}
                </div>
              }
              eventKey={`building-${building.id}`}
              expanded={true}
            >
              {floors?.result && floors.result.filter((floor: Floor) => floor.three_d_model_id === building.id).map((floor: Floor) => (
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
                            outside_idx: guardianlite.outside_idx,
                            outside_name: guardianlite.outside_name || guardianlite.model_name,
                            inside_idx: guardianlite.inside_idx,
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
  } else {
    return (
      <div className={`scroll-container overflow-x-hidden overflow-y-auto ${HeightSize()} py-1 px-2 mr-2`}>
        <Menu
          ref={navRef}
          // className={(mode === 'dashboard') ? 'h-full py-1 px-2 mr-2' : ''}
          style={{
            height: navHeight
          }}
        >
          {floors?.result && floors.result.filter((floor: Floor) => floor.idx === floorIdx).map((floor: Floor) => (
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
                      onSelect={() => handleShowDevicePopup && handleShowDevicePopup({
                        show: true,
                        main_service_name: camera.main_service_name,
                        vms_name: camera.vms_name,
                        camera_id: camera.camera_id,
                        ip: camera.camera_ip,
                        name: camera.camera_name,
                        on_event: false,
                        top_location: camera.top_location,
                        left_location: camera.left_location,
                        icon_width: 31,
                        icon_height: 31,
                        canvas_width: 0,
                        canvas_height: 0,
                        type: 'camera',
                        map_type: 'indoor',
                        access_point: camera.access_point,
                        service_type: camera.service_type,
                      })}
                    >
                      <span className='flex justify-between w-full'>
                        <span className='flex gap-3 w-full'>
                          <span className='flex gap-1'>
                            -
                            <TbDeviceCctv size={20} color='#737373' />
                          </span>
                          <p
                            className={ItemNameStyle}
                            title={camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}>
                            {camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}
                          </p>
                        </span>
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
                      onSelect={() => handleShowDevicePopup && handleShowDevicePopup({
                        show: true,
                        ip: ebell.device_ip,
                        name: ebell.device_name,
                        main_service_name: 'origin',
                        vms_name: ebell.camera_id ? ebell.camera_id.split(':')[1] : undefined,
                        camera_id: ebell.camera_id ? ebell.camera_id.split(':')[2] : undefined,
                        on_event: false,
                        top_location: ebell.top_location!,
                        left_location: ebell.left_location!,
                        icon_width: 31,
                        icon_height: 31,
                        canvas_width: 0,
                        canvas_height: 0,
                        type: 'ebell',
                        map_type: 'indoor',
                        service_type: ebell.service_type,
                      })}
                    >
                      <span className='flex justify-between w-full'>
                        <span className='flex gap-3 w-full'>
                          <span className='flex gap-1'>
                            -
                            <FaBell size={20} color='#737373' />
                          </span>
                          <p
                            title={`${ebell.device_id}.${ebell.device_name}(${ebell.device_ip})`}
                            className={ItemNameStyle}
                          >
                            {`${ebell.device_id}.${ebell.device_name}(${ebell.device_ip})`}
                          </p>
                        </span>
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
                      onSelect={() => handleShowDevicePopup && handleShowDevicePopup({
                        show: true,
                        ip: door.device_ip,
                        device_id: door.device_id,
                        name: door.device_name,
                        main_service_name: 'origin',
                        vms_name: door.camera_id ? door.camera_id.split(':')[1] : undefined,
                        camera_id: door.camera_id ? door.camera_id.split(':')[2] : undefined,
                        on_event: false,
                        top_location: door.top_location!,
                        left_location: door.left_location!,
                        icon_width: 31,
                        icon_height: 31,
                        canvas_width: 0,
                        canvas_height: 0,
                        type: 'door',
                        map_type: 'indoor',
                        service_type: door.service_type,
                      })}
                    >
                      <span className='flex justify-between w-full'>
                        <span className='flex gap-3 w-full'>
                          <span className='flex gap-1'>
                            -
                            <BsFillDoorClosedFill size={20} color='#737373' />
                          </span>
                          <p
                            title={`${door.device_id}.${door.device_name}`}
                            className={ItemNameStyle}
                          >{`${door.device_id}.${door.device_name}`}
                          </p>
                        </span>
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
                      onSelect={() => handleShowDevicePopup && handleShowDevicePopup({
                        show: true,
                        name: guardianlite.guardianlite_name,
                        ip: guardianlite.guardianlite_ip,
                        id: guardianlite.user_id,
                        password: guardianlite.user_pw,
                        status: guardianlite.status,
                        ch1: guardianlite.ch1,
                        ch2: guardianlite.ch2,
                        ch3: guardianlite.ch3,
                        ch4: guardianlite.ch4,
                        ch5: guardianlite.ch5,
                        ch1_label: guardianlite.ch1_label,
                        ch2_label: guardianlite.ch2_label,
                        ch3_label: guardianlite.ch3_label,
                        ch4_label: guardianlite.ch4_label,
                        ch5_label: guardianlite.ch5_label,
                        temper: guardianlite.temper,
                        top_location: guardianlite.top_location,
                        left_location: guardianlite.left_location,
                        icon_width: 31,
                        icon_height: 31,
                        canvas_width: 0,
                        canvas_height: 0,
                        map_type: 'indoor',
                      })}
                    >
                      <span className='flex justify-between w-full'>
                        <span className='flex gap-3 w-full'>
                          <span className='flex gap-1'>
                            -
                            <FaPowerOff size={20} color='#737373' />
                          </span>
                          <p
                            title={`${guardianlite.guardianlite_name}(${guardianlite.guardianlite_ip}`}
                            className={ItemNameStyle}
                          >
                            {`${guardianlite.guardianlite_name}(${guardianlite.guardianlite_ip})`}
                          </p>
                        </span>
                        {!guardianlite.status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                      </span>
                    </Menu.MenuItem>
                  ))}
            </Menu.MenuCollapse>
          ))}
        </Menu>
      </div>
    );
  }
}