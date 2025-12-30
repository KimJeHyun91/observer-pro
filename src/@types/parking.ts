import { ServiceType } from '@/@types/common';

export type ParkingArea =  {
    idx? : number;
    area_name: string;
    outside_idx: number;
    inside_idx: number;
    parking_type_id: number;
    left_location: string;
    top_location: string;
    icon_width: string;
    icon_height: string;
    type?: string;
    use_area :boolean;
    device_idx : number;
    linked_status : boolean;
}

export type TreeNode = {
    outside_idx: number;
    outside_name: string;
    inside_idx: number;
    inside_name: string;
    step : string;
};

export type ParkingType = {
    id: number;
    parking_type_name: string;
    parking_type_image: string;
    parking_type_color: string; 
}

export type ParkingTypeCount = {
    all : number;
    use_all : number;
    general: number;
    use_general: number;
    compact: number;
    use_compact: number;
    disabled: number;
    use_disabled: number;
    electric: number;
    use_electric: number;
};

export type ParkingStatusData = {
	use_all: string;
	use_general: string;
	use_compact: string;
	use_disabled: string;
	use_electric: string;
}

export type ParkingTypeCountAreaList = {
    outside_idx: string;
    inside_idx: number;
    inside_name: string; 
    all: string;         
    use_all: string;     
    general: string;     
    use_general: string; 
    compact: string;     
    use_compact: string; 
    disabled: string;    
    use_disabled: string;
    electric: string;    
    use_electric: string;
    floor_order: number; 
};

export type ParkingTypeSumAreaList = {
    inside_name : string;
    all : number;
    use_all : number;
    floor_order : number;
};

export type ParkingAccessLog = {
    access_log_idx: number;
    vehicle_number: string;
    in_at: string;
    out_at: string;
    vehicle_image: string;
    area_idx: number;
    area_name: string;
    use_area: boolean;
    area_left_location: string;
    area_top_location: string;
    outside_idx: number;
    outside_name: string;
    inside_idx: number;
    inside_name: string;
    parking_type_id: number;
    parking_type_name: string;
}

export type PreviewImage = {
    path: string;
    file: File;
}

export type ParkingBuilding = {
    buildingIdx: number;
    floorIdx: number;
    buildingName?: string;
    floorName?: string;
    mapImageURL: string | null;
}

export type FloorInfo = {
    outside_idx: number;
    outside_name: string;
    outside_left_location: string;
    outside_top_location: string;
    outside_service_type: string;
    outside_alarm_status: boolean;
    inside_name: string;
    inside_map_image_url: string;
    inside_alarm_status: boolean;
}

export type ChartDataType = {
    every_hour: string;
    use_all: string;
    use_general: string;
    use_compact: string;
    use_disabled: string;
    use_electric: string;
}

export type VehicleNumberSearchPreviewResult = {
	vehicle_number: string;
};

export type VehicleNumberSearchResult = {
    access_log_idx: string;
    area_idx: number;
    area_name: string;
    in_at: string;
    out_at: string;
    inside_idx: number;
    inside_name: string;
    outside_idx: number;
    outside_name: string;
    parking_type_id: number;
    parking_type_name: string;
    vehicle_image: string;
    vehicle_number: string;
};

export type DeviceType =  {
    idx: number
    user_id: string
    user_pw: string
    device_ip: string
    device_port: string
    device_no16: string
    device_no10: number
}

export type unDeviceType = {
    device_idx: number;
    user_id: string;
    user_pw: string;
    device_ip: string;
    device_port: string;
    device_no16: string;
    device_no10: number;
    device_type: string;
    device_location: string;
    device_linked_status: boolean;
}

export type SensorType = {
    message: string; 
    auth: {
        devNo: number;
        userID: string | null;
        userPW: string | null;
    };
    sensorData: {
        _id: {
            Timestamp: number;
            Machine: number;
            Pid: number;
            Increment: number;
            CreationTime: string;
        };
        pdt: string;
        dev: number;
        ver: number;
        pkn: number;
        pkr: number;
        sec: number;
        evi: number;
        evn: number;
        age: number;
        sok: boolean;
        tmp: number;
        vtg: number;
        det: boolean;
        dec: number;
        nbr: number;
        nbf: number;
        nbs: string;
        rds: string;
        lvs: string;
        ise: number;
        ilv: number;
        ose: number;
        olv: number;
    };
}

export type DevicePopupType = {
    show: boolean;
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
    service_type? : string | '';
}

export type EventList ={
    event_type: string
    event_type_id: number
    service_type: string
    severity: string
    severity_color: string
    severity_id: number
    use_event_type: boolean
    use_popup: boolean
    use_warning_board: boolean
    check? : boolean
}

export type EventLogData ={
    idx: number;
    event_name?: string;
    description?: string;
    location?: string;
    event_idx?: number;
    event_type_id?: number;
    main_service_name?: string;
    device_type?: string;
    event_occurrence_time: string;
    event_end_time?: string;
    severity_id?: number;
    is_acknowledge: boolean;
    acknowledge_user?: string;
    acknowledged_at?: string;
    sop_idx?: number;
    false_alarm_idx?: number;
    CONNECTION: boolean;
    outside_idx?: number;
    inside_idx?: number;
    water_level_idx?: number;
    device_idx?: number;
    camera_id?: string;
    snapshot_path?: string;
    created_at: Date;
    updated_at: Date;
    pmDevice_idx :  number;
    device_ip :  string;
    device_no16 :  string;
}