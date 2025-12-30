import { ServiceType } from './common';

export type CameraTypes = '' | 'dome' | 'dome_elevator' | 'speed_dome' | 'bullet' | 'bullet_flame' | null;

export type CameraType = {
  idx: number;
  camera_id: string;
  vms_name: string;
  main_service_name: ServiceType;
  camera_name: string;
  camera_ip: string;
  camera_angle: string | null;
  outside_idx: number | null;
  inside_idx: number | null;
  water_level_idx: number | null;
  left_location: string;
  top_location: string;
  use_status: boolean;
  service_type: string;
  camera_vendor: string;
  camera_model: string;
  access_point: string;
  linked_status: boolean;
  alarm_status: boolean;
  type?: string;
  camera_type: CameraTypes;
  dimension_type: '2d' | '3d' | null;
};

export type ObCameraType = CameraType & {
  outside_name: string | null;
  model_name: string | null;
  inside_name: string | null;
  inside_map_image_url: string | null;
}

export type CameraUpdateData = {
  camera_id: string;
  vms_name: string;
  camera_angle?: string | null;
  outside_idx: number | null;
  inside_idx: number | null;
  water_level_idx?: number;
  left_location?: string | null;
  top_location?: string | null;
  mainServiceName: string;
  use_status?: boolean;
  camera_type?: CameraTypes;
  dimension_type?: string | null;
}

export type CameraInfo = {
  vms_name: string
  cameraId: string
  streamType: string
  main_service_name: string
  startDateTime?: string
  service_type?: string
  area_name?: string
  access_point?: string;
  camera_ip?: string;
  rewind?: number;
}

export type CameraIndependent = {
  idx: number;
  main_service_name: ServiceType;
  camera_name: string;
  camera_ip: string;
  access_point: string;
};

