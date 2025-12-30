import { ServiceType } from './common';

export type Device = null | 'building' | 'camera' | 'ebell' | 'guardianlite' | 'pids' | 'door';

export type ObDeviceType = {
  idx: number;
  device_id: string;
  device_name: string;
  device_ip: string;
  device_type: string;
  device_location: string;
  outside_idx: number | null;
  inside_idx: number | null;
  dimension_type: string | null;
  outside_name: string | null;
  inside_name: string | null;
  inside_map_image_url: string | null;
  model_name: string | null;
  left_location: string | null;
  top_location: string | null;
  camera_id: string | null;
  service_type: string;
  linked_status: boolean;
  alarm_status: boolean;
  type: string;
  is_lock?: boolean;
}

export type obDeviceUpdateData = {
  idx: number;
  outside_idx?: number | null;
  inside_idx?: number | null;
  left_location?: string | null;
  top_location?: string | null;
  camera_id?: string | null;
  dimension_type?: string | null;
}

export type ObGuardianliteType = {
  guardianlite_ip: string;
  guardianlite_name: string;
  status: boolean;
  user_id: string;
  user_pw: string;
  outside_idx: number;
  inside_idx: number;
  outside_name: string | null;
  inside_name: string | null;
  inside_map_image_url: string | null;
  model_name: string | null;
  top_location: string;
  left_location: string;
  ch1: string;
  ch2: string;
  ch3: string;
  ch4: string;
  ch5: string;
  ch6?: string;
  ch7?: string;
  ch8?: string;
  temper: string;
  ch1_label: string;
  ch2_label: string;
  ch3_label: string;
  ch4_label: string;
  ch5_label: string;
  ch6_label?: string;
  ch7_label?: string;
  ch8_label?: string;
  type: 'guardianlite';
  dimension_type: string | null;
}

export type GuardianliteChannelControl = {
  guardianlite_ip: string;
  guardianlite_name: string;
  status: boolean;
  temper: string;
  ch1: 'ON' | 'OFF';
  ch2: 'ON' | 'OFF';
  ch3: 'ON' | 'OFF';
  ch4: 'ON' | 'OFF';
  ch5: 'ON' | 'OFF';
  ch1_label: string;
  ch2_label: string;
  ch3_label: string;
  ch4_label: string;
  ch5_label: string;
}

export type DevicePopupType = {
  show: boolean;
  idx?: number | null;
  main_service_name?: ServiceType | '';
  vms_name?: string;
  camera_id?: string;
  name: string;
  ip: string;
  on_event?: boolean;
  top_location: string;
  left_location: string;
  icon_width: number;
  icon_height: number;
  canvas_width: number;
  canvas_height: number;
  map_type?: 'outdoor' | 'indoor' | '';
  type: string | '';
  service_type?: string | '';
  access_point?: string;
  startDateTime?: string;
  device_id?: string;
  timeout?: number;
  device_name?: string | null;
};