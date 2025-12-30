import { CameraTypes } from '@/@types/camera';

export type CameraUpdateParams = {
  mainServiceName: string;
  vms_name: string;
  camera_id: string;
  outside_idx: number | null;
  inside_idx: number | null;
  left_location: string;
  top_location: string;
  camera_angle?: string | null;
  camera_type?: CameraTypes | null;
  dimension_type?: '2d' | '3d' | null;
}