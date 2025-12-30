import { BroadcastDashboardTransmissionStatusData, BroadcastLogData, DetailDeviceGroup, SpeakerStatus } from '@/@types/broadcast';
import ApiService from './ApiService'
import { Sites } from '@/views/broadcast/settings/BroadcastSpeakerSettings';

export async function apiCreateArea(
    areaInformation: any,
): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addOutside',
        method: 'post',
        data: areaInformation,
    })
}

export async function apiGetArea<T>(): Promise<T[]> {
    return ApiService.fetchDataWithAxios<T[]>({
        url: '/broadcast/getOutsideList',
        method: 'post',
    })
}

export async function apiGetAreaInfo(idx:{idx:number}): Promise<{message: string; result: any}> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getOutsideInfo',
        method: 'post',
        data: idx
    })
}

export async function apiDeleteArea(idx:{idx:number}) {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/deleteOutside',
        method: 'delete',
        data: idx
    })
}


  

// 스피커 연결 상태
export async function apiSpeakerStatus():Promise<{message:string, result:SpeakerStatus[]}> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getSpeakerStatusCount',
        method: 'post',
    })
}

// 음성 문구 설정
export async function apiAddSpeakerMacro(data: {speakerMessage:string}): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addSpeakerMacro',
        method: 'post',
        data: data
    })
}

export async function apiModifySpeakerMacro(data: {speakerMessage:string; speakerMessageIdx:number}): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/modifySpeakerMacro',
        method: 'post',
        data: data
    })
}

export async function apiDeleteSpeakerMacro(data: {speakerMessageIdx:number}): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/deleteSpeakerMacro',
        method: 'delete',
        data: data
    })
}

// 이벤트 설정
export async function apiModifyEvent(data: {eventTypeId: number; severityId: number; useWarningBoard: boolean; usePopup: boolean; useEventType: boolean; }): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/modifyEventType',
        method: 'post',
        data: data
    })
}


// 개소 그룹화
export async function apiAddDeviceGroup(data: {groupIdx?:number | null; groupName: string; outsideIdxArray?:number[] }): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addgroup',
        method: 'post',
        data: data
    })
}

export async function apiDeleteDeviceGroup(data: {groupIdx:number;}): Promise<{ message: string; result: { status: boolean; message: string }  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/deleteGroup',
        method: 'delete',
        data: data
    })
}


export async function apiDetailDeviceGroup(data: {groupIdx:number;}): Promise<{ message: string; result: DetailDeviceGroup[] }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getGroupOutsideInfo',
        method: 'post',
        data: data
    })
}

// 음성 파일
export async function apiAddAudioFile(data: any) {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addAudioFile',
        method: 'post',
        data: data
    })
}

export async function apiDeleteAudioFile(data: number[]): Promise<{ message: string; result: { status: boolean; message: string }  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/deleteAudioFile',
        method: 'delete',
        data: data
    })
}

export async function apiModifyAudioFile(data: {audioFileIdx:number; audioFileName:string}): Promise<{ message: string; result: { status: boolean; message: string } }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/modifyAudioFile',
        method: 'post',
        data: data
    })
}

// 예약/정기 방송
export async function apiAddReserve(data: any) {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addReserve',
        method: 'post',
        data: data
    })
}

export async function apiDeleteReserve(data: {reserveIdx: number, broadcastType: string}): Promise<{ message: string; result: { status: boolean; message: string }  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/deleteReserve',
        method: 'delete',
        data: data
    })
}

export async function apiModifyReserve(data: any) {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/modifyReserve',
        method: 'post',
        data: data
    })
}

// 송신기 설정 info
export async function addSite(data: {siteId: string}): Promise<{ message: string; result: {status: boolean; message: string;}  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addSite',
        method: 'post',
        data: data
    })
}

// 방송
export async function addBroadcast(data: any): Promise<{ message: string; result: Sites[]  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/addBroadcast',
        method: 'post',
        data: data
    })
}

// 방송 로그
export async function getBroadcastLogList(data: {siteId: string; start: string; end:string, status?: string, type?: string, startTime?: string, endTime?: string}): Promise<{ message: string; result: BroadcastLogData[]  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getBroadcastLogList',
        method: 'post',
        data: data
    })
}
// 이벤트 로그
export async function getEventLogList(data: {eventType: string; start: string; end:string, startTime?: string, endTime?: string}): Promise<{ message: string; result: BroadcastLogData[]  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getEventLogList',
        method: 'post',
        data: data
    })
}

// 대시보드
export async function getNetworkStatus(): Promise<{ message: string; result: any  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getNetworkStatus',
        method: 'get'
    })
}

export async function getDeviceStatus(data: {siteId: string}): Promise<{ message: string; result: BroadcastDashboardTransmissionStatusData  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getDeviceStatus',
        method: 'post',
        data: data
    })
}

export async function getBroadcastTransmissionStatus(data: {siteId: string; start: string; end:string}): Promise<{ message: string; result: BroadcastDashboardTransmissionStatusData  }> {
    return ApiService.fetchDataWithAxios({
        url: '/broadcast/getBroadcastTransmissionStatus',
        method: 'post',
        data: data
    })
}
