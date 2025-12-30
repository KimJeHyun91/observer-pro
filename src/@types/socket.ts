import { Floor } from './floor';
import { Building } from './building';
import { ParkingArea } from './parking';
import { parkingFeeOutsideInfo } from './parkingFee';
import { EventLogType, ServiceType } from './common';
import { Waterlevel, AreaInformation } from './inundation';
import { Key, SetStateAction } from 'react';
import { CameraType } from './camera';
import { AccessCtlLog } from '@/views/main/types/accessCtl';
import { GuardianliteChannelControl } from './device';
import { BroadcastAreaResponse, Reservation, SpeakerList } from './broadcast';
import { EventPopup } from './event';
import { SOP, SOP_Stage } from './main';
import { TunnelOutsideResponse } from './tunnel';

export interface DeviceBase {
    id: string;
    status: boolean;
    use_status: boolean;
    timestamp: number;
    location?: string;
    ipaddress: string;
    serviceType: string;
    left_location?: string;
    top_location?: string;
    type: string;
}

export interface CrossingGate extends DeviceBase {
    crossing_gate_ip: any;
    linked_status: boolean;
    crossingGates: SetStateAction<boolean>;
    gateStatus: 'open' | 'close';
    idx: number;
    crossing_gate_status: boolean;
    outside_idx: number;
    location: string;
    outside_name: string;
}

export interface Camera extends DeviceBase {
    vmsName: string;
    vendor: string;
    model: string;
    accessPoing: string;
    idx: string;
    camera_id: string;
    camera_ip: string;
    camera_name: string;
    access_point: string;
    camera_idx: number;
    service_type: string;
    vms_name: string;
    left_location: string;
    top_location: string;
    location: string;
    mainServiceName: string;
}

export interface Billboard extends DeviceBase {
	billboard_idx: number;
	billboard_msg: string;
	billboard_color: string;
    content?: string;
    // billboardMessageIdx: string;
    // billboardMessage: string;
    // billboardMessageColor: string;
    // billboardMessageIp: string;
}

export interface Speaker extends DeviceBase {
    speaker_msg: string;
    speaker_idx: number;
    content?: string;
    speakerMessageIdx: number;
    speakerMessage: string;
}

export interface WaterlevelLog {
    water_level_idx: number;
    water_level_ip: string;
    water_level: string;
    created_at: string;
}

export interface Guardianlite {
    id: string;
    password: string;
    guardianliteIdx?: string;
    guardianliteIp?: string;
    guardianliteId?: string;
    guardianlitePassword?: string;
    cmd: string;
    channel?: string;
    ch1?: string;
    ch2?: string;
    ch3?: string;
    ch4?: string;
    ch5?: string;
    ch1_label?: string;
    ch2_label?: string;
    ch3_label?: string;
    ch4_label?: string;
    ch5_label?: string;
    temper?: string;
    guardianlite_ip?: string;
    operatorId: string;
}

export interface VmsRequestBase {
    mainServiceName: string;
    vms_name: string;
}

export interface VmsDeleteParams extends VmsRequestBase {
    vms_name: string;
}

export interface VmsListParams {
    mainServiceName: string;
}

export interface Vms extends DeviceBase {
    idx: Key | null | undefined;
    vmsIdx: string;
    vmsName: string;
    vms_name?: string;
    prev_vms_ip: string;
    prev_vms_port: string;
    new_vms_ip: string;
    new_vms_port: string;
    vms_id: string;
    vms_pw: string;
    vms_ip: string;
    vms_port: string;
    mainServiceName: string;
}

export interface VmsAddRequest extends VmsRequestBase {
    vms_ip: string;
    vms_port: string;
    vms_id: string;
    vms_pw: string;
}

export interface VmsModifyRequest extends Omit<Vms, 'mainServiceName'> {
    mainServiceName: string;
}

export interface VmsSyncRequest {
    vms_ip: string;
    vms_port: string;
    vms_id: string;
    vms_pw: string;
    mainServiceName: string;
}

export interface Ebell extends DeviceBase {

}

export interface Door extends DeviceBase {

}

export interface Acu extends DeviceBase {

}

export interface Pids extends DeviceBase {

}

export interface Vehicle extends DeviceBase {

}

export interface MDET extends DeviceBase {

}

export interface BuildingImpl extends Building {
    id: string;
}

export interface ParkingAreaImpl extends ParkingArea {
    id: string;
}
export interface ParkingFieldImpl extends Building {
    id: string;
}

export interface BroadcastAreaImpl extends BroadcastAreaResponse {
    id: string;
}
export interface FloorImpl extends Floor {
    id: string;
}

export interface TunnelAreaImpl extends TunnelOutsideResponse {
    id: string;
}

export interface CameraImpl extends CameraType {
    id: string;
}

export interface CameraStreamResImpl {
    cameraId: string;
    data: string;
}
export interface EventLogImpl extends EventLogType {
    id: string;
}

export interface WarningBoardImpl {
    id: string;
}

export interface ParkingFeeImpl extends parkingFeeOutsideInfo {
    id: string;
}

export interface DeviceManager {
    id : string;
    products:[]
}

type CameraStreamErr = {
    cameraId: string;
    message: string;
};

type ArchiveStreamErr = {
    cameraId: string;
    startDateTime: string;
    message: string;
};

export interface ArchiveStreamResImpl {
    cameraId: string;
    data: string;
    startDateTime: string;
}

interface WaterlevelThreshold {
    waterlevelIdx: string;
    location: string;
    treshold: string;
}

interface EventLists {
    id: string;
}

interface NearbyEvent {
    outside_idx: any;
    location: string;
    message: string;
}

interface TunnelEvent {
    use_popup: string;
    outside_idx: string;
    outside_name : string;
    outside_location : string;
    lat : string;
    lng : string;
    device_type?:string;
    outside_ip?:string;
}

export type DeviceType =
    | 'fl_cameras'
    | 'fl_waterlevels'
    | 'fl_crossingGates'
    | 'fl_billboards'
    | 'fl_signboards'
    | 'fl_speakers'
    | 'fl_guardianlites'
    | 'fl_vms'
    | 'fl_eventThreshold'
    | 'fl_events'
    | 'fl_nearby_alert'
    | 'fl_waterLevelAutoControlResult'
    | 'ob_ebells'
    | 'ob_doors'
    | 'ob_acu'
    | 'ob_pids'
    | 'ob_vehicles'
    | 'ob_buildings'
    | 'pm_area'
    | 'pm_buildings'
    | 'ob_floors'
    | 'ob_cameras'
    | 'pm_cameras'
    | 'tm_cameras'
    | 'vb_areaList'
    | 'vb_speaker'
    | 'vb_reserve'
    | 'vb_broadcast'
    | 'vb_reserve_broadcast'
    | 'vb_event'
    | 'cm_event_log'
    | 'cm_warningBoard'
    | 'pm_event'
    | 'tm_event'
    | 'tm_areaList'
    | 'tm_waterGauges'
    | 'tm_waterLevel'
    | 'tm_billboard'
    | 'pf_parkings'
    | 'pf_lpr'
    | 'pf_gate_state'
    | 'pf_fee_calculation_result'
    | 'prm_notification'

export type DeviceTypeToData = {
    fl_cameras: CameraImpl;
    fl_waterlevels: Waterlevel;
    fl_crossingGates: CrossingGate;
    fl_billboards: Billboard;
    fl_speakers: Speaker;
    fl_guardianlites: Guardianlite;
    fl_events: EventLists;
    fl_vms: Vms;
    fl_nearby_alert: NearbyEvent;
    ob_ebells: Ebell;
    ob_doors: Door;
    ob_acu: Acu;
    ob_pids: Pids;
    ob_vehicles: Vehicle;
    ob_buildings: BuildingImpl;
    pm_area: ParkingAreaImpl;
    pm_event: ParkingAreaImpl;
    pm_buildings: ParkingFieldImpl;
    ob_floors: FloorImpl;
    ob_cameras: CameraImpl;
    pm_cameras: CameraImpl;
    cm_event_log: EventLogImpl;
    cm_warningBoard: WarningBoardImpl;
    pf_parkings: ParkingFeeImpl;
    pf_lpr: ParkingFeeImpl;
    pf_gate_state: ParkingFeeImpl;
    pf_fee_calculation_result: ParkingFeeImpl;
    tm_event: TunnelEvent;
};


export type Device =
    | CrossingGate
    | CameraImpl
    | Waterlevel
    | Billboard
    | Speaker
    | Guardianlite
    | Vms
    | Ebell
    | Door
    | Acu
    | Pids
    | Vehicle
    | BuildingImpl
    | ParkingAreaImpl
    | ParkingFieldImpl
    | FloorImpl
    | EventLogImpl
    | WarningBoardImpl;
export interface SocketEventMap {
    'fl_areaList-update': AreaInformation;
    'fl_crossingGates-update': CrossingGate;
    'fl_cameras-update': Camera;
    'fl_cameras-batch-update': Camera;
    'fl_waterlevels-update': Waterlevel;
    'fl_billboards-update': Billboard;
    'fl_signboards-update': Billboard;
    'fl_speakers-update': Speaker;
    'fl_guardianlites-update': Guardianlite;
    'fl_vms-update': Vms;
    'fl_eventThreshold-update': WaterlevelThreshold;
    'fl_events-update': EventLists;
    'fl_nearby_alert': NearbyEvent;
    'fl_water_level_log-update': WaterlevelLog;
    'tm_event-update': TunnelEvent;
    'ob_ebells-update': Ebell;
    'ob_doors-update': Door;
    'ob_acu-update': Acu;
    'ob_guardianlites-update': {
        'guardianlites': number;
        'modify': number;
        'modify-location': number;
        'popup': GuardianliteChannelControl;
    },
    'ob_mdets-update': MDET;
    'ob_pids-update': Pids;
    'ob_vehicles-update': Vehicle;
    'ob_buildings-update': BuildingImpl;
    'ob_floors-update': FloorImpl;
    'pm_area-update': ParkingAreaImpl;
    'pm_event-update': ParkingAreaImpl;
    'pm_buildings-update': ParkingAreaImpl;
    'ob_cameras-update': CameraImpl;
    'pm_cameras-update': CameraImpl;
    'tm_cameras-update': CameraImpl;
    'fl_waterLevelAutoControlResult-update': any;

    /* device manager */
    'prm_notification-update' :DeviceManager;

    /* camera stream */
    'ob_cameraStream': CameraStreamResImpl,
    'ob_archiveStream': ArchiveStreamResImpl,
    'ob_archiveStreamSOP': ArchiveStreamResImpl,
    'pm_cameraStream': CameraStreamResImpl,
    'fl_cameraStream': CameraStreamResImpl,
    'ob_cameraStreamErr': CameraStreamErr;
    'ob_archiveStreamErr': ArchiveStreamErr;
    'ob_archiveStreamSOPErr': ArchiveStreamErr;

    /* camera event stream */
    'ob_cameraStreamEvent': CameraStreamResImpl,
    'ob_cameraStreamEventErr': CameraStreamErr,

    // accessCtl log
    'ob_accessCtlLog': {
        accessControlLog: AccessCtlLog[];
    };
    'vb_areaList-update': { areaList: { 'remove': number } };
    'vb_speaker-update': SpeakerList;
    'vb_reserve-update': Reservation;
    'vb_broadcast-update': { broadcastStatus: { status: string } };
    'vb_event-update': BroadcastAreaImpl;
    'vb_reserve_broadcast-update': { broadcastStatus: { type: number, status: string } };
    'tm_areaList-update': TunnelAreaImpl;
    'tm_waterGauges-update': TunnelAreaImpl;
    'tm_waterLevel-update': TunnelAreaImpl;
    'tm_billboard-update': TunnelAreaImpl;
    'ob_events-update': {
        'eventList': {
            'create': {
                idx: number
            },
            'update': number;
        },
        'eventPopup': EventPopup
    },
    'pm_events-update': {
        'eventList': {
            'create': {
                idx: number
            },
            'update': number;
        },
        'eventPopup': EventPopup
    },
    'ob_event_types-update': {
        'eventType': {
            'modify': number;
        }
    },
    'cm_event_log-update': EventLogImpl,
    'cm_warningBoard-update': WarningBoardImpl;
    'cm_sop-update': {
        'SOP': {
            'create': {
                idx: number;
            },
            'modify': {
                idx: number;
                sop_name: string;
            };
        };
    };
    'cm_sop_stage-update': {
        'SOPStage': {
            'create': {
                sop_idx: number;
            },
            'modify': {
                sop_idx: number;
            },
            'remove': {
                sop_idx: number;
            }
        };
    },
    'cm_sop_falseAlarm-update': {
        'falseAlarm': {
            'create': {
                idx: number;
            },
            'modify': {
                idx: number;
            },
        };
    },
    'ob_events-SOP': {
        'SOPEvent': {
            SOPIdx: number | null,
            eventIdx: number,
            eventName: string;
            occurDateTime: string;
            severityId: 0 | 1 | 2 | 3;
            eventTypeId: number;
            mainServiceName: ServiceType;
            eventCameraId: string | null;
            locationInfo?: {
                location: string;
                mapImageURL: string | null;
            };
            outsideIdx?: number;
            insideIdx?: number;
            dimensionType?: string;
            isAck?: boolean;
        };
    },
    'ob_anpr_vehicleNumber': {
        vehicleNum: string;
        vmsName: string;
        cameraId: string;
    },
    'ob_accessCtl_sms-fail': {
        message: string;
    },

    /* parkingFee */
    'pf_parkings-update': ParkingFeeImpl;
    'pf_lpr-update': ParkingFeeImpl;
    'pf_gate_state-update': ParkingFeeImpl;
    'pf_fee_calculation_result-update' : ParkingFeeImpl;
}
export interface GateControlResponse {
    status: boolean;
    message: string;
    ipaddress?: string;
    cmd?: string;
    type?: 'all' | 'single';
    successList?: string[];
    errorList?: Array<{
        ipaddress: string;
        message: string;
    }>;
}