export type TunnelOutsideRequest = {
  outsideName: string;
  outsideLocation: string;
  barrierIp: string;
  leftLocation: string;
  topLocation: string;
  direction: string;
  billboardVMSIds: string[]
  billboardLCSIds: string[]
  guardianLightIp?: string
}


export type TunnelOutsideForm = {
  name: string;
  location: string;
  barrierIp: string;
  direction: string;
  billboardLCSIds: string[];
  billboardVMSIds: string[];
  guardianLightIp?: string;
}

export type SortedTunnel = {
  id: number;
  name: string;
  direction: string;
  waterLevel?: number | string; // API에 따라 string/number 대응
  barrierStatus?: string;
};


export type TunnelOutsideResponse = {
  // 필수 최소값(폼/키링크에서 꼭 쓰는 것들)
  idx: string | number
  outside_name: string
  direction: string

  // 선택 필드들(서버 응답 전부를 요구하지 않도록 완화)
  barrier_ip?: string | null
  location?: string | null
  barrier_status?: boolean
  left_location?: string | null
  top_location?: string | null
  service_type?: string
  alarm_status?: boolean
  created_at?: string
  updated_at?: string

  // 상태/수위
  barrierStatus?: string
  barrier_status_text?: string
  barrier_status_time?: string | null
  waterlevel?: string | number

  // 수위계(옵션)
  water_gauge_idx?: number
  water_gauge_name?: string
  water_gauge_port?: string
  water_gauge_baudrate?: number
  water_gauge_slaveid?: number
  water_gauge_address?: number
  water_gauge_top_location?: string | null
  water_gauge_left_location?: string | null
  water_gauge_use_status?: boolean

  // 전광판: 배열 또는 쉼표 문자열 모두 허용
  billboard_idx_list_lcs?: string[]
  billboard_idx_list_vms?: string[]  

  // 가디언라이트: 두 키 모두 지원
  guardianlite_ip?: string
  guardianLightIp?: string
}



export interface SelectedObject extends Partial<TunnelOutsideResponse> {
  id: string | number;
  type: 'tunnel' | 'waterlevel' | 'broadcast' | 'broadcast_devices' | string;
  name?: string;
  location: string;                  // 소켓에서 항상 문자열로 넘기므로 string으로 유지
  position: [number, number];
  isSocket?: boolean;
  event_device_type?: string;
  barrier_ip?: string;
}


export type WaterGaugeType = {
  idx: number;
  outside_idx: number;
  water_gauge_name: string;
  water_gauge_port: string;
  water_gauge_baudrate: number;
  water_gauge_slaveid: number;
  water_gauge_address: number;
  top_location: string | null;
  left_location: string | null;
  use_status: boolean;
  created_at: string;
  updated_at: string;
  type: string;
};

export type WaterGaugeRequest = {
  outsideIdx: number;
  name: string;
  port: string;
  baudRate: string;
  slaveId: string;
  registerAddress: string;
  topLocation: string | null;
  leftLocation: string | null;
  use_status: boolean;
};

export type ModifyWaterGauge = Pick<WaterGaugeRequest, 'topLocation' | 'leftLocation'> & {
  idx: number;
};

export interface eventLogRequest {
  eventType: string;
  deviceType: string;
  deviceName: string;
  location: string
  start: string;
  end: string;
  startTime: string;
  endTime: string;
}

// ajy add 전광판 타입 추가
export interface billboardRequest {
  idx?: number;
  ip: string;
  port: string;
  name: string;
  row: string;
  col: string;
  type: 'LCS' | 'VMS' | ''
  manufacturer?: string;
}

export interface billboardVMSRequest {
  [idx: number]: {
    userId: string;
    ip: string;
    port: string;
    msg: string;
    color: string;
  };
}

export interface billboardLCSRequest {
  [laneName: string]: {
    idx: number;
    ip: string;
    port: string;
    direction: string;
    msg: string;
    userId: string;
  }
}

export interface billboardInfo {
  idx?: number;
  ip: string;
  port: string;
  name: string;
  row: string;
  col: string;
  type: 'LCS' | 'VMS' | ''
  color: string;
  msg?: string;
  direction?: string;
  manufacturer: string;
}

export type WaterLevelType = {
  idx: number;
  outside_idx: number;
  water_level_name: string;
  top_location: string | null;
  left_location: string | null;
  use_status: boolean;
  communication: string;
  created_at: string;
  updated_at: string;
  type: string;
};


// ajy add 수위계 타입 추가
export interface waterLevelRequest {
  idx?: number;
  name: string;
  location: string;
  ip: string;
  port: string;
  id: string;
  password: string;
  communication?: 'control_in' | 'control_out' | ''
  outside_info?: any[]
}