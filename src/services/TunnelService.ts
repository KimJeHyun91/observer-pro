import {
    ModifyWaterGauge, TunnelOutsideRequest, WaterGaugeRequest, billboardRequest, billboardVMSRequest,
    billboardLCSRequest, eventLogRequest, waterLevelRequest
} from '@/@types/tunnel';
import ApiService from './ApiService'
import { ApiResultObjectArray } from '@/@types/api';

export async function apiAddOutside(
    data: TunnelOutsideRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addOutside',
        method: 'post',
        data,
    })
}

export async function apiModifyOutside(
    data: { idx: number; outsideName: string; location: string; barrierIp: string; direction: string; billboardLCSIds: string[]; billboardVMSIds: string[]; guardianLightIp: string; },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/updateOutside',
        method: 'put',
        data,
    })
}

export async function apiDeleteOutside(idx: { idx: number }) {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/deleteOutside',
        method: 'delete',
        data: idx
    })
}

export async function apiModifyOutsideAutomatic(
    data: { automatic: boolean;},
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/updateOutsideAutomatic',
        method: 'put',
        data,
    })
}

export async function apiTunnelUnLinkBarrierList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/tunnel/getUnLinkBarrierList',
        method: 'get',
    });
}

export async function apiAddWaterGauge(
    data: WaterGaugeRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addWaterGauge',
        method: 'post',
        data,
    })
}

export async function apiModifyWaterGauge(
    data: ModifyWaterGauge,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyWaterGauge',
        method: 'put',
        data,
    })
}

export async function apiDeleteWaterGauge(
    data: { idx: number },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/removeWaterGauge',
        method: 'delete',
        data,
    })
}


export async function apiControlBarrier(
    data: { ip: string; action: string; },
): Promise<{ status: boolean; message: string; }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/controlBarrier',
        method: 'post',
        data,
    })
}

// ajy add 전광판 관련 api 추가
export async function apiAddBillboard(
    data: { name: string; ip: string; port: string; row: string; col: string; type: string; },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addBillboard',
        method: 'post',
        data,
    })
}

export async function apiModifyBillboard(
    data: billboardRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyBillboard',
        method: 'put',
        data,
    })
}

export async function apiDeleteBillboard(
    data: number[],
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/removeBillboard',
        method: 'delete',
        data,
    })
}

export async function apiModifyVMSBillboard(
    data: billboardVMSRequest,
): Promise<{ message: string; result: { status: boolean; message: string }, lanes: string; }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyVMSBillboard',
        method: 'put',
        data,
        timeout: 120000
    })
}

export async function apiModifyLCSBillboard(
    data: billboardLCSRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyLCSBillboard',
        method: 'put',
        data,
        timeout: 120000
    })
}

// ajy add 이벤트 관련 api 추가
export async function apiTunnelEventModify<T extends Record<string, unknown>>(data: T): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyEventType',
        method: 'post',
        data: data,
    });
}


export async function apiTunnelGetEventList(
    data: eventLogRequest
): Promise<{ message: string; result: [] }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/getEventList',
        method: 'post',
        data: data
    })
}

// ajy add 수위계 관련 api 추가
export async function apiAddWaterLevel(
    data: waterLevelRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addWaterLevel',
        method: 'post',
        data,
    })
}

export async function apiModifyWaterLevel(
    data: waterLevelRequest,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyWaterLevel',
        method: 'put',
        data,
    })
}

export async function apiDeleteWaterLevel(
    data: number[],
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/removeWaterLevel',
        method: 'delete',
        data,
    })
}

export async function apiGetWaterLevelListSearch(
    data: { name: string, ip: string, communication: string }
): Promise<{ message: string; result: [] }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/getWaterLevelListSearch',
        method: 'post',
        data: data
    })
}

export async function apiAddWaterLevelControlIn(
    data: { outsideIdx: number, ip: string, location: string, name?: string, communication?: string, topLocation: string, leftLocation: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addWaterLevelCountrolIn',
        method: 'post',
        data,
    })
}

export async function apiAddWaterLevelMappingControlOut(
    data: { outsideIdx: number, waterLevelIdx: number, topLocation: string, leftLocation: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/addWaterLevelMappingCountrolOut',
        method: 'post',
        data,
    })
}

export async function apiModifyWaterLevelPosition(
    data: { outsideIdx: number, waterLevelIdx: number, topLocation: string, leftLocation: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyWaterLevelPosition',
        method: 'put',
        data,
    })
}

export async function apiModifyWaterLevelThreshold(
    data: { waterLevelIdx: number, threshold: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyWaterLevelThreshold',
        method: 'put',
        data,
    })
}

export async function apiDeleteWaterLevelMapping(
    data: { outsideIdx: number, waterLevelIdx: number }
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/removeWaterLevelMapping',
        method: 'delete',
        data,
    })
}


export async function apiModifyGuardianliteLabel(
    data: { guardianlite_ip: string, ch1_label: string, ch2_label: string, ch3_label: string, ch4_label: string, ch5_label: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyGuardianliteLabel',
        method: 'put',
        data,
    })
}

export async function apiModifyGuardianliteChannel(
    data: { guardianlite_ip: string, channel: string, cmd: string },
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/tunnel/modifyGuardianliteChannel',
        method: 'put',
        data,
    })
}

// PTZ 카메라 제어
export async function apiCameraControl(
  data: {
    cameraId: string | number
    direction: string                     // 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'zoom-in' | 'zoom-out' | 'focus-in' | 'focus-out' | 'stop' 등
    eventType: 'mousedown' | 'mouseup' | 'mouseleave'
    vmsName: string
    mainServiceName: string
    mode?: 'continuous' | 'relative' | 'absolute'
  }
): Promise<{ message: string; result: { success: boolean } }> {
  return ApiService.fetchDataWithAxios({
    url: '/tunnel/ptzCameraControl',
    method: 'post',
    data,
    timeout: 8000,
  })
}


