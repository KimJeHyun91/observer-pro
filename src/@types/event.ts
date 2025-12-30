import { ServiceType } from './common';

export type EventPopup = {
  eventIdx: number;
  eventName: string;
  location: string;
  outsideIdx: number | null;
  insideIdx: number | null;
  deviceIdx: number | null;
  dimensionType?: string | null;
  deviceType: 'camera' | 'ebell' | 'door' | 'guardianlite' | 'pids' | 'parkingArea';
  deviceName: string | null;
  ipaddress: string;
  cameraId: string;
  topLocation: string;
  leftLocation: string;
  severityId: number;
  mapImageURL: string | null;
  mainServiceName: ServiceType;
  vmsName: string;
  service_type: string;
};

export type EventsDataByImportance = {
  severity_id: 0 | 1 | 2 | 3;
  severity_per_count: string;
};