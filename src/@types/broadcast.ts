export type BroadcastAddSpeakerRequest = {
    areaName: string
    areaLocation: string
    areaCamera: string
    areaSpeaker: string
    leftLocation: string
    topLocation: string
    serviceType: string
}

export type BroadcastAreaResponse =  {
    outside_idx: number;
    outside_site_id: string;
    outside_site_transmitter_id: string;
    outside_name: string | null;
    outside_location: string | null;
    outside_left_location: string;
    outside_top_location: string;
    outside_camera_id: number;
    speaker_idx: number ;
    speaker_name: string | null;
    speaker_ip: string;
    speaker_msg: string | null;
    speaker_status: string;
    speaker_linked_status: boolean;
    camera_idx: number | null;
    camera_id: string | null;
    vms_name: string | null;
    camera_name: string | null;
    camera_ip: string | null;
    camera_angle: string | null;
    camera_linked_status: boolean | null;
    guardianlite_ip: string;
    guardianlite_name: string | null;
    guardianlite_status: boolean;
    user_id: string;
    user_pw: string;
    ch1: string | null;
    ch2: string | null;
    ch3: string | null;
    ch4: string | null;
    ch5: string | null;
    ch6: string | null;
    ch7: string | null;
    ch8: string | null;
    temper: string | null;
    ch1_label: string | null;
    ch2_label: string | null;
    ch3_label: string | null;
    ch4_label: string | null;
    ch5_label: string | null;
    ch6_label: string | null;
    ch7_label: string | null;
    ch8_label: string | null;
    group_names: string[];
}



export type SpeakerStatus = {
    on_count: string;
    off_count: string;
    disconnected: string;
  };


export type EventTypeList ={
    event_type_id: number,
    event_type: string,
    service_type: string,
    use_warning_board: boolean,
    use_popup: boolean,
    use_event_type: boolean,
    severity_id: number,
    severity: string,
    severity_color: "red"
}

export type DeviceGroup =  {
    group_idx: number,
    group_name: string,
    outside_count: string
}

export type DeviceGroupList =  DeviceGroup[]

export type DetailDeviceGroup = {
    group_idx: number,
    group_name: string,
    outside_idx: number,
    outside_name: string,
    outside_location: string,
    outside_service_type: "broadcast"
}

export type SpeakerList = {
    speaker_idx: number;
    outside_idx: number;
    outside_name: string;
    speaker_ip: string;
    speaker_linked_status: boolean;
    speaker_status: 'ON' | 'OFF'
}

// 정기/예약
export interface Reservation {
    idx: number;              
    title: string;          
    description: string | null; 
    target: string;           
    group_idx: number;      
    outside_group_idx: number[] | null; 
    outside_idx: number | null;         
    start_at: string;         
    end_at: string;         
    device_control: string;   // 방송 형식 ex) "음원"
    audio_file_idx: number;  
    speaker_msg: string
    created_at: string;       
    updated_at: string;       
    repeat_type: string | null; // 반복 유형 
    day_of_week: number | null; // 요일 
    day_of_month: number | null; // 월별 반복일 
    week_of_month: number | null; // 월별 반복 주차 
    repeat_count: number | null; // 반복 횟수
    repeat: number | null
    repeat_interval: number | null
    voice_type: string
    start_chime_option: 'ON' | 'OFF'
    end_chime_option: 'ON' | 'OFF'
    type: '예약' | '정기'             
  }
  

  export interface BroadcastLogData  {
    id: string;
    type: string;
    createdTime: number;
    broadcastPhoneNumber: string | null;
    url: string;
    displayText: string | null;
    startChimeOption: boolean;
    endChimeOption: boolean;
    repeatInterval: number;
    displayTextOption: boolean;
    repeat: number;
    broadcastLogs: {
      id: string;
      transmitterId: string;
      transmitterName: string;
      status: string;
      message: string;
      startTime: number;
      endTime: number;
    }[];
    siteId: string;
  }

  // 대시보드 데이터 차트
  export interface BroadcastDashboardTransmissionStatusData {
    successRate: number;
    failureRate: number;
    totalLogs: number;
    successCount: number;
    failureCount: number;
  }
  