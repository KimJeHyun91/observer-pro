import { ServiceType } from './common';

export type EventInfo = {
  idx: number;
  event_name: string;
  description: string;
  location: string;
  event_idx: number;
  event_type_id: number;
  main_service_name: ServiceType | '';
  event_occurrence_time: string;
  event_end_time: string | null;
  severity_id: 0 | 1 | 2 | 3 | null;
  is_acknowledge: boolean;
  acknowledge_user: string | null;
  acknowledged_at: string | null;
  sop_idx: number | null;
  false_alarm_idx: number | null;
  connection: boolean;
  outside_idx: number;
  inside_idx: number;
  map_image_url: string | null;
  device_type: string | null;
  device_name: string | null;
  device_ip: string | null;
  camera_id: string;
  use_sop: boolean;
};

export type SOP = {
  idx: number;
  sop_name: string;
  count: number;
};


export type SOP_Stage = {
  idx: number;
  sop_stage: number;
  sop_stage_name: string;
  sop_stage_description: string;
};

export type SOPPopup = {
  show: boolean;
  title: string;
  width: number;
  height: number;
  SOP: boolean;
  close: () => void
};

export type SOPEvent = {
  SOPIdx: number | null;
  eventIdx: number | null,
  eventName: string | null,
  occurDateTime: string | null,
  location: string | null,
  mapImageURL: string | null,
  eventTypeId: number | null,
  outsideIdx: number | null;
  insideIdx: number | null;
  dimensionType?: string | null;
  severityId: 0 | 1 | 2 | 3 | null,
  eventCameraId: string | null;
  mainServiceName: ServiceType;
  isAck?: boolean;
};

export type PIDSData = {
  name: string;
  ipAddress: string;
  location: string;
};