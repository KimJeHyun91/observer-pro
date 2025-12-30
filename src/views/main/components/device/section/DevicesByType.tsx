import { ObCameraType } from '@/@types/camera';
import { ObDeviceType, ObGuardianliteType } from '@/@types/device';
import { PIDS } from '@/@types/pids';
import Loading from '@/components/shared/Loading';
import { Menu } from '@/components/ui';
import { useCanvasMapStore } from '@/store/canvasMapStore';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { useDoors } from '@/utils/hooks/main/useDoors';
import { useEbells } from '@/utils/hooks/main/useEbells';
import { useGuardianlites } from '@/utils/hooks/main/useGuardianlites';
import { usePIDS } from '@/utils/hooks/main/usePIDS';
import { useCameras } from '@/utils/hooks/useCameras';
import UsePrevious from '@/utils/hooks/usePreviousVal';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { memo, useEffect, useRef, useState } from 'react';
import { BiCctv } from 'react-icons/bi';
import { BsFillDoorClosedFill } from 'react-icons/bs';
import { FaBell, FaPowerOff } from 'react-icons/fa';
import { IoMdAlert } from 'react-icons/io';
import { MdFence } from 'react-icons/md';
import { TbDeviceCctv } from 'react-icons/tb';

type Props = {
  searchValue: string;
  mode: 'map' | 'dashboard' | 'building-dashboard';
};

const HeaderStyle = 'bg-[#FAFAFB] dark:bg-[#353637] text-[#2E2E2E] dark:text-[#F5F5F5] py-1 h-[2rem] rounded-t-2 rounded-b-none';
const ItemStyle = 'py-1 text-[#2E2E2E] bg-[#EBECEF] pl-[1.25rem] dark:bg-[#2D2E2F] rounded-none dark:text-[#F3F3F3] h-full';
const ItemNameStyle = 'w-[16.5rem] whitespace-nowrap overflow-x-hidden text-ellipsis dark:text-[#F3F3F3]';

export default memo(function DevicesByType({ searchValue, mode }: Props) {
  const { setCanvasMapState } = useCanvasMapStore();
  const { isFullscreen } = useFullScreenStore();
  const { socketService } = useSocketConnection();
  const prevIsFullScreen = UsePrevious(isFullscreen);
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState('auto');
  const { cameras, isLoading: camerasLoading, error: camerasError, mutate: mutateCamera } = useCameras('origin');
  const { ebells, isLoading: ebellsLoading, error: ebellsError, mutate: mutateEbell } = useEbells({});
  const { doors, isLoading: doorsLoading, error: doorsError, mutate: mutateDoors } = useDoors();
  const { guardianlites, isLoading: guardianlitesLoading, error: guardianlitesError, mutate: mutateGuardianlites } = useGuardianlites({});
  const { pidsList, isLoading: pidsLoading, error: pidsError, mutate: mutatePIDS } = usePIDS();
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

  if (pidsError) {
    console.log('use PIDS list error');
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
  }
  const HeightSize = () => {
    if (mode === 'dashboard') {
      return 'h-full';
    };
    return 'h-[calc(100%-6rem)]';
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }
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

    const top = ul.offsetTop;
    const windowHeight = window.innerHeight;
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

  return (
    <div className={`scroll-container overflow-x-hidden overflow-y-auto ${HeightSize()} py-1 px-2 mr-2`}>
      <Menu
        ref={navRef}
        className={(mode === 'dashboard') ? `scroll-container overflow-x-hidden overflow-y-auto h-full py-1 px-2 mr-2` : ''}
        style={{
          height: navHeight
        }}
      >
        <Menu.MenuCollapse
          className={HeaderStyle}
          label="카메라"
          eventKey="item-1"
          expanded={true}
        >
          {camerasLoading ? (
            <Loading className='flex w-5 justify-center' loading={true} />)
            :
            cameras?.filter((camera: ObCameraType) => `${camera.camera_id}${camera.camera_name}${camera.vms_name}`
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
                    {(camera.outside_idx === 0 || camera.outside_idx == null) ?
                      <BiCctv size={20} color='#737373' />
                      :
                      <TbDeviceCctv size={20} color='#737373' />
                    }
                    &nbsp;
                    <p
                      className={ItemNameStyle}
                      title={camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}>
                      {camera.service_type === 'independent' ? `${camera.camera_name}` : `${camera.camera_id}.${camera.camera_name}(${camera.vms_name})`}
                    </p>
                    {!camera.linked_status ? <IoMdAlert size={20} color='#D76767' /> : ''}
                  </span>
                </Menu.MenuItem>
              ))}
        </Menu.MenuCollapse>
        <Menu.MenuCollapse
          className={HeaderStyle}
          label="출입문"
          eventKey="item-2"
          expanded={true}
        >
          {doorsLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
            :
            doors
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
        </Menu.MenuCollapse>
        <Menu.MenuCollapse
          className={HeaderStyle}
          eventKey="item-3"
          label="비상벨"
          expanded={true}
        >
          {ebellsLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
            :
            ebells
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
        </Menu.MenuCollapse>
        <Menu.MenuCollapse
          className={HeaderStyle}
          eventKey="item-4"
          label="가디언라이트"
          expanded={true}
        >
          {guardianlitesLoading ? (<Loading className='flex w-5 justify-center' loading={true} />)
            :
            guardianlites
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
        <Menu.MenuCollapse
          className={HeaderStyle}
          eventKey="item-5"
          label="PIDS"
          expanded={true}
        >
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
                  onSelect={() => handleSelect({
                    outside_idx: 0,
                    outside_name: null,
                    inside_idx: 0,
                    inside_name: null,
                    map_image_url: null,
                    dimension_type: '2d'
                  })}
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
      </Menu>
    </div>
  );
});