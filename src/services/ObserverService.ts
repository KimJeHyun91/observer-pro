import endpointConfig from '@/configs/endpoint.config'
import ApiService from './ApiService'
import { Building } from '@/@types/building'
import { ApiResultBoolean, ApiResultObjectArray, ApiResultStatus } from '@/@types/api'
import { ServiceType } from '@/@types/common';
import { CameraUpdateData } from '@/@types/camera';
import { ObDeviceType, obDeviceUpdateData } from '@/@types/device';
import { doorLockControlData } from '@/views/main/types/door';
import { ObGuardianliteLocationData, ObGuardianliteUpdateData } from '@/views/main/types/guardianlite';

export interface PostFileFormDataBody {
    [key: string]: string | Blob;
}

export type AddGuardianliteData = {
    guardianlite_ip: string;
    guardianlite_name: string;
    outside_idx: number | null;
    inside_idx: number | null;
    top_location: string;
    left_location: string;
    ch1_label?: string;
    ch2_label?: string;
    ch3_label?: string;
    ch4_label?: string;
    ch5_label?: string;
    dimension_type: string | null;
};

export type AddMDET = {
    device_name: string;
    device_ip: string;
    device_location?: string | null;
    outside_idx: number;
    inside_idx: number;
    top_location: string;
    left_location: string;
};

export async function apiAddBuilding<T>({ outside_name, top_location, left_location, service_type }: Partial<Building>) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.addBuilding,
        method: 'post',
        data: {
            outside_name,
            top_location,
            left_location,
            service_type
        }
    })
}

export async function apiRemoveBuilding<T>(idx: number, main_service_id: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.removeBuilding,
        method: 'delete',
        data: {
            idx,
            main_service_id
        }
    })
}

export async function apiModifyBuilding<T>(
    {
        idx,
        outside_name, left_location, top_location, service_type, main_service_id }:
        { idx: number, outside_name?: string, left_location?: string, top_location?: string, service_type: string, main_service_id: number }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.modifyBuilding,
        method: 'post',
        data: {
            idx,
            outside_name,
            left_location,
            top_location,
            service_type,
            main_service_id
        }
    })
}

export async function apiUploadBuildingImage<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.uploadBuildingImage,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

export async function apiGetBuildingImage<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getBuildingImages,
        method: 'post',
    })
}

export async function apiAddObVms<T>(
    { vms_id, vms_pw, vms_ip, vms_port, mainServiceName }:
        { vms_id: string, vms_pw: string, vms_ip: string, vms_port: string, mainServiceName: ServiceType }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.addObVms,
        method: 'post',
        data: {
            vms_id,
            vms_pw,
            vms_ip,
            vms_port,
            mainServiceName
        }
    })
}

export async function apiSyncObVms<T>(
    { vms_id, vms_pw, vms_ip, vms_port, mainServiceName }:
        { vms_id: string, vms_pw: string, vms_ip: string, vms_port: string, mainServiceName: ServiceType }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.syncObVms,
        method: 'post',
        data: {
            vms_id,
            vms_pw,
            vms_ip,
            vms_port,
            mainServiceName
        }
    })
}

export async function apiModifyObVms<T>(
    { vms_id, vms_pw, prev_vms_ip, prev_vms_port, new_vms_ip, new_vms_port, mainServiceName }:
        { vms_id: string, vms_pw: string, prev_vms_ip: string, prev_vms_port: string, new_vms_ip: string, new_vms_port: string, mainServiceName: ServiceType }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.modifyObVms,
        method: 'post',
        data: {
            vms_id,
            vms_pw,
            prev_vms_ip,
            prev_vms_port,
            new_vms_ip,
            new_vms_port,
            mainServiceName
        }
    });
};

export async function apiDeleteObVms<T>(vmsNames: string[], mainServiceName: ServiceType) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.deleteObVms,
        method: 'delete',
        data: {
            vms_name: vmsNames,
            mainServiceName
        }
    })
}

export async function apiAddObFloor<T>(
    { inside_name, outside_idx, map_image_url }:
        { inside_name: string, outside_idx: number, map_image_url?: string }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.addObFloor,
        method: 'post',
        data: {
            inside_name,
            outside_idx,
            map_image_url
        }
    })
}

export async function apiGetObFloors<T>(
    { idx, outside_idx }:
        { idx?: number, outside_idx?: number }): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getObFloor,
        method: 'post',
        data: {
            idx,
            outside_idx
        }
    })
}

export async function apiRemoveObFloor<T>(idx: number) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.removeObFloor,
        method: 'delete',
        data: {
            idx
        }
    })
}

export async function apiModifyObFloor<T>(idx: number, inside_name: string) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.modifyObFloor,
        method: 'post',
        data: {
            idx,
            inside_name
        }
    })
}

export async function apiUploadFloorImage<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.uploadFloorImage,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

export async function apiGetFloorImage<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getFloorImages,
        method: 'post',
    })
}

export async function apiModifyCamera(CameraData: CameraUpdateData): Promise<ApiResultBoolean> {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifyCamera,
        method: 'post',
        data: CameraData
    })
}

export async function apiDeleteCamera(data: { idx: number; mainServiceName: string }): Promise<ApiResultBoolean> {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.deleteCamera,
        method: 'delete',
        data
    })
}

/**
 *  출입통제
 */

export async function apiModifyDoor(deviceData: obDeviceUpdateData) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifyDoor,
        method: 'put',
        data: deviceData
    })
}

export async function apiDoorLockControl(doorLockControlData: doorLockControlData) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.doorLockControl,
        method: 'post',
        data: doorLockControlData
    })
}

export async function apiGetAcus() {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<ObDeviceType>>({
        url: endpointConfig.getAcus,
        method: 'post'
    })
}

/**
 *  비상벨
 */

export async function apiModifyEbell(deviceData: obDeviceUpdateData) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifyEbell,
        method: 'put',
        data: deviceData
    })
}

/**
 *  가디언라이트
 */

export async function apiAddGuardianlite(data: AddGuardianliteData) {
    return ApiService.fetchDataWithAxios<ApiResultStatus>({
        url: endpointConfig.addGuardianlite,
        method: 'post',
        data
    });
};

export async function apiRemoveGuardianlite<T>(guardianliteIp: string) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.removeGuardianlite,
        method: 'delete',
        data: {
            guardianliteIp
        }
    })
}

export async function apiModifyGuardianlite({ guardianlite_ip, new_guardianlite_ip, guardianlite_name, ch1_label, ch2_label, ch3_label, ch4_label, ch5_label }:
    ObGuardianliteUpdateData
) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifyGuardianlite,
        method: 'put',
        data: {
            guardianlite_ip,
            new_guardianlite_ip,
            guardianlite_name,
            ch1_label,
            ch2_label,
            ch3_label,
            ch4_label,
            ch5_label
        }
    })
}

export async function apiModifyGuardianliteLocation({ guardianlite_ip, top_location, left_location }:
    ObGuardianliteLocationData
) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifyGuardianliteLocation,
        method: 'put',
        data: {
            guardianlite_ip,
            top_location,
            left_location
        }
    })
}

export async function apiControlGuardianlite({ guardianlite_ip, id, password, channel, cmd }:
    {
        guardianlite_ip: string,
        id: string,
        password: string,
        channel: number;
        cmd: 'ON' | 'OFF' | ''
    }
) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.controlGuardianlite,
        method: 'put',
        data: {
            guardianlite_ip,
            id,
            password,
            channel,
            cmd
        }
    })
}

/**
 *  PIDS
 */

export type PIDSUpdateData = {
    idx: number;
    line_x1?: string | null;
    line_x2?: string | null;
    line_y1?: string | null;
    line_y2?: string | null;
    camera_id?: string | null;
}

export async function apiAddPIDS<T>(
    { ipaddress, name, location }:
        { ipaddress: string, name: string, location: string }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.PIDS,
        method: 'post',
        data: {
            ipaddress,
            name,
            location
        }
    });
};

export async function apiModifyPIDS({ idx, line_x1, line_x2, line_y1, line_y2, camera_id }:
    PIDSUpdateData
) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.PIDS,
        method: 'put',
        data: {
            idx,
            line_x1,
            line_x2,
            line_y1,
            line_y2,
            camera_id
        }
    })
};

export async function apiRemovePIDS<T>(
    { idxs }:
        { idxs: number[] }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.PIDS,
        method: 'delete',
        data: {
            idxs
        }
    });
};

/**
 *  M-DET
*/

export async function apiAddMDET(data: AddMDET) {
    return ApiService.fetchDataWithAxios<ApiResultStatus>({
        url: endpointConfig.addMDET,
        method: 'post',
        data
    });
};

/**
 *  이벤트
 */

export async function apiEventsGroupByImportance<T>(startDate?: string, endDate?: string, outsideIdx?: number): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getEventsGroupByImportance,
        method: 'post',
        data: {
            startDate,
            endDate,
            outsideIdx
        }
    });
};

export async function apiEventsGroupByDevice<T>(startDate?: string, endDate?: string, outsideIdx?: number): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getEventsGroupByDevice,
        method: 'post',
        data: {
            startDate,
            endDate,
            outsideIdx
        }
    });
};

export async function apiEventsGroupByEventName<T>(startDate?: string, endDate?: string): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getEventsGroupByEventName,
        method: 'post',
        data: {
            startDate,
            endDate,
        }
    });
};

export async function apiEventsGroupByAck<T>(startDate?: string, endDate?: string, outsideIdx?: number): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getEventsGroupByAck,
        method: 'post',
        data: {
            startDate,
            endDate,
            outsideIdx
        }
    });
};

export async function apiModifyEventType(data: {
    id: number;
    severity_id: number;
    use_warning_board: boolean;
    use_popup: boolean;
    use_event_type: boolean;
    use_sop: boolean;
    main_service_name: ServiceType;
    sop_idx: number | null;
}): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/common/modifyEventTypes',
        method: 'post',
        data: data
    })
};

/**
 * SOP
 */

export async function apiCreateSOP(data: { sopName: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOP,
        method: 'post',
        data
    });
};

export async function apiRemoveSOP(data: { idx: number }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOP,
        method: 'delete',
        data
    });
};

export async function apiModifySOP(data: { idx: number, sopName: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOP,
        method: 'put',
        data
    });
};

export async function apiCreateSOPStage(data: { sopIdx: number, sopStage: number, sopStageName: string, sopStageDescription: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOPStage,
        method: 'post',
        data
    });
};

export async function apiModifySOPStage(data: { idx: number, sopStageName: string, sopStageDescription: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOPStage,
        method: 'put',
        data
    });
};

export async function apiRemoveSOPStage(data: { idx?: number, sopIdx?: number, sopStage?: number }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiSOPStage,
        method: 'delete',
        data
    });
};

export async function apiCreateFalseAlarm(data: { type: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiFalseAlarm,
        method: 'post',
        data
    });
};

export async function apiRemoveFalseAlarm(data: { idx: number }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiFalseAlarm,
        method: 'delete',
        data
    });
};

export async function apiModifyFalseAlarm(data: { idx: number, type: string }) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiFalseAlarm,
        method: 'put',
        data
    });
};

/**
 * 이벤트
 */

type AckEventData = {
    idx: number
};

export async function apiAckEvent(data: {
    idxArray: AckEventData[],
    userId: string,
    outsideIdx?: number,
    falseAlarmIdx?: number | null;
    ackCount?: number;
    isSOP?: boolean;
}) {
    return ApiService.fetchDataWithAxios({
        url: endpointConfig.apiAckEvent,
        method: 'put',
        data
    });
};

{/**
    데이터 조회
 */}

type SearchConditionData = {
    eventName?: string;
    severityId?: 0 | 1 | 2 | 3;
    location?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    deviceType?: string;
    deviceName?: string;
    deviceIp?: string;
    isAck?: boolean;
};

type SearchSOPConditionData = {
    eventName?: string;
    isTruePositive?: boolean;
    location?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    deviceType?: string;
    deviceName?: string;
    deviceIp?: string;
};

type SearchAccessLogConditionData = {
    status?: string;
    doorId?: string;
    personName?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    noLimit?: boolean;
};

export async function apiSearchEvents<T>({
    eventName,
    severityId,
    startDate,
    startTime,
    endDate,
    endTime,
    location,
    deviceType,
    deviceName,
    deviceIp,
    isAck
}: SearchConditionData): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.apiSearchEvents,
        method: 'post',
        data: {
            eventName,
            severityId,
            location,
            startDate,
            startTime,
            endDate,
            endTime,
            deviceType,
            deviceName,
            deviceIp,
            isAck
        }
    });
};

export async function apiSearchEventsSOP<T>({
    eventName,
    isTruePositive,
    startDate,
    startTime,
    endDate,
    endTime,
    location,
    deviceType,
    deviceName,
    deviceIp
}: SearchSOPConditionData): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.apiSearchEventsSOP,
        method: 'post',
        data: {
            eventName,
            isTruePositive,
            location,
            startDate,
            startTime,
            endDate,
            endTime,
            deviceType,
            deviceName,
            deviceIp
        }
    });
};

export async function apiSearchAccessCtlLog<T>({
    status,
    doorId,
    personName,
    startDate,
    endDate,
    startTime,
    endTime,
    noLimit
}: SearchAccessLogConditionData): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.apiSearchAccessCtlLog,
        method: 'post',
        data: {
            status,
            doorId,
            personName,
            startDate,
            endDate,
            startTime,
            endTime,
            noLimit
        }
    });
};

/**
 *  개별 카메라
 */

export async function apiCreateCamera<T>(data: {
    mainServiceName: ServiceType,
    name: string,
    ipAddress: string,
    id: string,
    pw: string
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.apiCamera,
        method: 'post',
        data
    });
};

export async function apiUpdateCamera<T>(data: {
    idx: number,
    name: string,
    ipAddress: string,
    id: string,
    pw: string,
    mainServiceName: ServiceType,
    profileTokens: string,
    profileToken: string
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.apiCamera,
        method: 'put',
        data
    });
};

export async function apiRemoveCamera<T>(data: {
    idxs: number[],
    mainServiceName: ServiceType
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.apiCamera,
        method: 'delete',
        data
    });
};

export async function apiUploadOutdoorImage<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.uploadOutdoorImage,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export async function apiModifyAccessCtlPerson<T>(data: {
    idx: number,
    next_of_kin_name: string,
    next_of_kin_contact1: string,
    next_of_kin_contact2: string,
    use_sms: boolean,
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.accessCtlPerson,
        method: 'put',
        data
    });
};

export async function apiGetAccessCtlPerson<T>(data: {
    studentId?: string,
    studentName?: string,
    className?: string
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.accessCtlPerson,
        method: 'post',
        data
    });
};

export async function apiRemoveAccessCtlPerson<T>(data: {
    idx: number
}) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.accessCtlPerson,
        method: 'delete',
        data
    });
};


export async function apiDownloadSOPLogDetail<T extends Uint8Array | ArrayBuffer>(
    data: { idx: number, form: 'xlsx' | 'pdf' },
): Promise<Uint8Array | ArrayBuffer> {
    return ApiService.fetchDataWithAxios<T>({
        url: '/observer/events/export/sop',
        method: 'post',
        data,
        responseType: 'blob'
    })
}
