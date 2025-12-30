

import { ObDeviceType } from '@/@types/device';
import { useEffect } from 'react';
import { AccessCtlLog } from '../types/accessCtl';

type Props = {
  doors: ObDeviceType[];
  currBuildingIdx: number;
  currFloorIdx: number;
  canvasWidth?: number;
  canvasHeight?: number;
  accessCtlLog: AccessCtlLog[];
};

export default function DoorAccessPerson({
  accessCtlLog,
  doors,
  currBuildingIdx,
  currFloorIdx,
  canvasWidth,
  canvasHeight
}: Props) {

  useEffect(() => {
    let timeoutId: number;
    if (accessCtlLog == null || !Array.isArray(accessCtlLog) || accessCtlLog.length === 0) {
      return;
    }
    accessCtlLog.map(enter => {
      const doorId = enter.LogDoorID;
      const personId = enter.LogPersonID;
      const popup: HTMLDivElement = document.getElementById('door' + doorId)! as HTMLDivElement;
      if (popup && popup.childNodes && personId && personId.length > 0) {
        const image: HTMLImageElement = popup.childNodes[0]! as HTMLImageElement;
        image.src = `http://${window.location.hostname}:4200/images/access_control_person/${personId}.png`;
        popup.style.display = 'initial';
        timeoutId = setTimeout(() => {
          popup.style.display = 'none';
        }, 10 * 1000);
      }
    });
  }, [accessCtlLog])

  if (doors && canvasWidth && canvasHeight) {
    const findDoors: ObDeviceType[] = doors.filter(device => {
      if (device.device_type === 'door' &&
        device.outside_idx === currBuildingIdx &&
        device.inside_idx === currFloorIdx &&
        device.top_location &&
        device.left_location) {
        return true;
      } else {
        return false;
      }
    });
    if (findDoors.length > 0) {
      return doors.map((door: ObDeviceType) => {
        const divStyle = {
          top: parseFloat(door.top_location! as string) * canvasHeight,
          left: parseFloat(door.left_location! as string) * canvasWidth,
          border: '1px solid black',
          animation: 'bounce_frames 0.5s',
          animationDirection: 'alternate',
          animationTimingFunction: 'cubic-bezier(.5, 0.05,1,.5)',
          animationIterationCount: 6,
        }
        return (
          <div key={door.idx} className='absolute border-1 border-solid border-black hidden z-20' id={'door' + door.device_id} style={divStyle} >
            <img src={`http://${window.location.hostname}:4200/images/access_control_person/${'1.png'}`} style={{ height: '90px', width: '80px' }} />
          </div>
        );
      });
    } else {
      return '';
    }
  }

}
