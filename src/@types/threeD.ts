export const CAMERA_TYPES = ['dome', 'bullet'] as const;
export type CameraType = typeof CAMERA_TYPES[number];

export type ActivePanel =
  | 'none'
  | 'deviceList'
  | 'modelControl'

export type ModalTypeKey = 'removeModel' | 'manage'

export type ThreedModel = {
  id: number;
  name: string;
  filename: string;
  service_type: string;
  is_use: boolean;
  created_at: string;
  model_type: string; // main, floor 타입 구분위해 사용
  
  // 카메라 상태
  camera_pos_x: number;    // 카메라 위치 x
  camera_pos_y: number;    // 카메라 위치 y
  camera_pos_z: number;    // 카메라 위치 z
  camera_target_x: number; // 카메라 타겟 x
  camera_target_y: number; // 카메라 타겟 y
  camera_target_z: number; // 카메라 타겟 z
  camera_zoom: number;    // 카메라 줌
  mapping_name?: string;
};

export type ThreedDeviceMapping = {
  id: number;
  mapping_name: string;
  group_name: string;
  model_id: number;
  device_id: number;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  scale: number;
  created_at: string;
  linked_model_id: number;
};

export type FloorInsertPayload = {
  model_id: number
  building_group: string
  floor_name: string
  serviceType: string
}

export type ThreedDevice = {
  id: number;
  name: string;
  filename: string;
  type: string;
  description: string;
  created_at: string;
  mapping_name?: string;
  map_image_url?: string;
};

export type AddPayload =
  | { selectedTypeId: 0; targetData: ThreedDevice }
  | { selectedTypeId: 1; targetData: ThreedModel }
  | { selectedTypeId: 2; targetData: { id: number; mapping_name: string } };

export type ThreedDeviceMappingMixInfo = ThreedDeviceMapping & Pick<ThreedDevice, 'name' | 'filename' | 'type' | 'description' | 'map_image_url'>;