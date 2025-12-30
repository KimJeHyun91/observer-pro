// eslint-disable-next-line import/named
import { FabricObject } from 'fabric';
import { Building } from './building';
import { ParkingArea } from './parking';
import { CameraType } from './camera';
import { ObDeviceType, ObGuardianliteType } from './device';
import { PIDS } from './pids';
import { WaterGaugeType,WaterLevelType } from './tunnel';

export type ClickLocation = {
  x: number;
  y: number;
};

export type CameraAngle = {
  isTriangle: boolean;
  cameraId: string;
  type: 'triangle';
};

export type ClickObject = {
  idx: number;
  type: string;
  top_location: string;
  left_location: string;
  alarm_status: boolean;
} | Building | ParkingArea | CameraType | ObDeviceType | ObGuardianliteType | PIDS | CameraAngle | WaterGaugeType | WaterLevelType | null;

export type CanvasObject = FabricObject | null;

export type UpdateObjectLocationResult = {
  message: string;
  result: {
    success: boolean
  };
}

export type ObserverObject = Building | ParkingArea | CameraType | ObDeviceType | ObGuardianliteType | PIDS | CameraAngle | WaterGaugeType | WaterLevelType;

export type RemoveObjectResult = {
  message: string;
  result: number;
}