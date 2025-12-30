import ApiService from './ApiService';
import { AreaInformation, AreaModifyFormInput, ControlAllCrossingGateRequest, ControlCrossingGateRequest, GroupData, PtzControlState, UpdateBillboardRequest, UpdateSingleBillboardRequest, UpdateSingleSpeakerRequest, UpdateSpeakerRequest } from '@/@types/inundation';
import { Vms, Speaker, Billboard, Guardianlite, VmsDeleteParams, VmsModifyRequest, VmsSyncRequest, VmsRequestBase } from '@/@types/socket';
import { Waterlevel, BillboardMacro } from '@/@types/inundation';
import { WaterlevelRequest } from '@/@types/inundation';

export interface ApiResponse<T = any> {
    data: any;
    initialLat: any;
    initialLng: any;
    status: boolean;
    result: T | null;
    message?: string;
    error?: string;
}

// area
export async function apiCreateArea(areaInformation: AreaInformation): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/createArea',
        method: 'post',
        data: areaInformation,
    });
}
export async function apiGetArea(): Promise<ApiResponse<AreaInformation[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getArea',
        method: 'post',
    });
}
export async function apiModifyArea(areaInformation: AreaModifyFormInput): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyArea',
        method: 'post',
        data: areaInformation,
    });
}
export async function apiRemoveArea(areaInformation: AreaModifyFormInput): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteArea',
        method: 'delete',
        data: areaInformation,
    });
}
export async function apiSaveAreaGroup(groupData: GroupData): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: groupData.id ? `/inundation/updateAreaGroup` : '/inundation/createAreaGroup',
        method: 'post',
        data: groupData,
    });
}
export async function apiGetAllAreaGroup(): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getAllAreaGroup',
        method: 'post',
    });
}
export async function apiDeleteAreaGroup(groupData: GroupData): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteAreaGroup',
        method: 'post',
        data: groupData,
    });
}
export async function apiAddWaterlevelGaugeToMap(areaInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addWaterLevelToMap',
        method: 'post',
        data: areaInformation,
    });
}
export async function apiRemoveWaterlevelToMap(waterlevel: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/removeWaterlevelToMap',
        method: 'delete',
        data: waterlevel,
    });
}

export async function apiGetTargetWaterlevelLog(waterlevelIdx: number): Promise<ApiResponse<Array<{ water_level: string; created_at: string; }>>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getTargetWaterlevelLog',
        method: 'post',
        data: { water_level_idx: waterlevelIdx },
    });
}
export async function apiGetAllWaterlevelLog(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getAllWaterlevelLog',
        method: 'post',
    });
}

// crossinggate
export async function apiGetCrossinggate(): Promise<ApiResponse<[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getCompactOutSideList',
        method: 'post',
    });
}

// vms
export async function apiAddVms(vmsInformation: Vms): Promise<{
    result: any; message: string
}> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/addVms',
        method: 'post',
        data: vmsInformation,
    });
}
export async function apiGetVms(params: VmsRequestBase): Promise<ApiResponse<Vms[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/getVmsList',
        method: 'post',
        data: params
    });
}
export async function apiModifyVms(params: VmsModifyRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/modifyVms',
        method: 'post',
        data: params
    })
}
export async function apiDeleteVms(params: VmsDeleteParams): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/deleteVms',
        method: 'delete',
        data: params
    })
}
export async function apiGetCameras(mainServiceName: string): Promise<ApiResponse<Vms[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/getAllCameraList',
        method: 'post',
        data: mainServiceName
    });
}
export async function apiSynchronizeVms(params: VmsSyncRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/observer/syncVms',
        method: 'post',
        data: params
    })
}

// billboard
export async function apiAddBillboardMessage(billboardInformation: BillboardMacro): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addBillboardMacro',
        method: 'post',
        data: billboardInformation
    })
}
export async function apiModifyBillboardMacroMessage(billboardInformation: BillboardMacro): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyBillboardMacro',
        method: 'post',
        data: billboardInformation
    })
}
export async function apiGetBillboardMessage(): Promise<ApiResponse<Billboard[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getBillboardMacroList',
        method: 'post',
    })
}
export async function apiDeleteBillboardMessage(billboardInformation: Pick<BillboardMacro, "billboardMessageIdx">): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteBillboardMacro',
        method: 'delete',
        data: billboardInformation
    })
}

// speaker
export async function apiAddSpeakerMessage(speakerInformation: Speaker): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addSpeakerMacro',
        method: 'post',
        data: speakerInformation
    })
}
export async function apiModifySpeakerMessage(speakerInformation: Speaker): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifySpeakerMacro',
        method: 'post',
        data: speakerInformation
    })
}
export async function apiGetSpeakerMessage(): Promise<ApiResponse<Speaker[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getSpeakerMacroList',
        method: 'post',
    })
}
export async function apiDeleteSpeakerMessage(speakerInformation: Pick<Speaker, "speakerMessageIdx">): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteSpeakerMacro',
        method: 'delete',
        data: speakerInformation
    })
}

// waterlevel
export async function apiAddWaterlevelGauge(waterlevelInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addWaterLevelDevice',
        method: 'post',
        data: waterlevelInformation
    })
}
export async function apiGetWaterlevelGauge(): Promise<ApiResponse<Waterlevel[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getWaterLevelDeviceList',
        method: 'post',
    })
}
export async function apiModifyWaterlevelGauge(WaterlevelGaugeInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyWaterLevelDevice',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiDeleteWaterlevelGauge(WaterlevelGaugeInformation: Pick<Waterlevel, "waterlevelIdx">): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteWaterLevel',
        method: 'delete',
        data: WaterlevelGaugeInformation
    })
}
export async function apiGetWaterlevelGaugeCrossinggates(): Promise<ApiResponse<Waterlevel[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getOutsideWaterLevelList',
        method: 'post',
    })
}
export async function apiLinkCrossinggateWithWaterlevelGauge(WaterlevelGaugeInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addOutsideWaterLevel',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiUpdateCrossinggateWithWaterlevelGauge(WaterlevelGaugeInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateOutsideWaterLevel',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiDeleteCrossinggateWithWaterlevelGauge(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addWaterLevelDevice',
        method: 'delete',
    })
}
export async function apiSettingThresholdToWaterlevelGauge(WaterlevelGaugeInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyThresholdWaterLevel',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiStatusValueChangeWaterlevelGauge(WaterlevelGaugeInformation: Pick<Waterlevel, "waterlevelIdx"> & { waterlevelStatus: boolean }): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/changeUseStatus',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiCalculatingWaterlevelRatio(WaterlevelGaugeInformation: Waterlevel): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getOutsideWaterLevelList',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiGetWaterLevelOutsideInfo(WaterlevelGaugeInformation: Pick<Waterlevel, "waterlevelIdx">): Promise<ApiResponse<Waterlevel[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getWaterLevelOutsideInfo',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}
export async function apiGetAllWaterLevelOutsideInfo() : Promise<ApiResponse<Waterlevel[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getAllWaterLevelOutsideInfo',
        method: 'post',
    })
}

export async function apiGetWaterLevelCameraInfo(WaterlevelGaugeInformation: Pick<Waterlevel, "waterlevelIdx">): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: 'inundation/getWaterLevelCameraInfo',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}

// guardianlite
export async function apiGetGuardianliteInfo(guardianliteInfo: Guardianlite): Promise<ApiResponse<Guardianlite[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getGuardianliteInfo',
        method: 'post',
        data: guardianliteInfo
    });
}
export async function apiGetGuardianliteList(): Promise<ApiResponse<Guardianlite[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getGuardianliteList',
        method: 'post',
    });
}
export async function apiModifyGuardianliteChannel(guardianliteInfo: Guardianlite): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyGuardianliteChannel',
        method: 'post',
        data: guardianliteInfo
    });
}
export async function apiModifyGuardianliteChannelLabel(guardianliteInfo: Guardianlite): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyGuardianliteChannelLabel',
        method: 'post',
        data: guardianliteInfo
    });
}

export async function apiGetUnLinkedDeviceList(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getUnLinkDeviceList',
        method: 'post',
    });
}
export async function apiDevicesStatusCount(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getLinkedStatusCount',
        method: 'post',
    });
}

// device control
export async function apiUpdateMessageToSpeakr(data: UpdateSingleSpeakerRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateMessageToSpeaker',
        method: 'post',
        data
    });
}
export async function apiUpdateMessageToAllSpeakers(data: UpdateSpeakerRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateMessageToAllSpeakers',
        method: 'post',
        data
    });
}
export async function apiUpdateMessageToBillboard(data: UpdateSingleBillboardRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateMessageToBillboard',
        method: 'post',
        data
    });
}
export async function apiUpdateMessageToAllBillboards(data: UpdateBillboardRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateMessageToAllBillboards',
        method: 'post',
        data
    });
}
export async function apiUpdateMessageToGreenParkingBillboard(data: UpdateSingleBillboardRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateMessageToGreenParkingBillboard',
        method: 'post',
        data
    });
}
// export async function apiControlCrossingGate(data: ControlCrossingGateRequest): Promise<ApiResponse<null>> {
//     return ApiService.fetchDataWithAxios({
//         url: '/inundation/controlCrossinggate',
//         method: 'post',
//         data
//     });
// }
// export async function apiControlAllCrossingGates(data: ControlAllCrossingGateRequest): Promise<ApiResponse<null>> {
//     return ApiService.fetchDataWithAxios({
//         url: '/inundation/controlAllCrossinggate',
//         method: 'post',
//         data
//     });
// }


// device list
export async function apiGetBillboardList(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getBillboardList',
        method: 'post',
    });
}
export async function apiGetSpeakerList(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getSpeakerList',
        method: 'post',
    });
}

export async function apiPtzCameraControl(data: PtzControlState): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/ptzCameraControl',
        method: 'post',
        data
    });
}
export async function apiGetCameraPreset(data: any) {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getPresetList',
        method: 'post',
        data
    });
}
export async function apiSetPresetPosition(data: any) {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/setPresetPosition',
        method: 'post',
        data
    });
}

// export async function apiCallInitialMapPosition(): Promise<ApiResponse<null>> {
//     return ApiService.fetchDataWithAxios({
//         url: '/config',
//         method: 'get',
//     });
// }

export async function apiCallInitialMapPosition(
    mainServiceName: string
): Promise<ApiResponse<{ lat: number; lng: number }>> {
    return ApiService.fetchDataWithAxios({
        url: '/common/getInitialPosition',
        method: 'post',
        data: { mainServiceName },
    });
}


export async function apiSetInitialMapPosition(
    mainServiceName: string,
    lat: number,
    lng: number,
    zoom: number
): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/common/setInitialPosition',
        method: 'put',
        data: { mainServiceName, lat, lng, zoom },
    });
}



export async function apiBroadcastingSpeaker(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/speakers',
        method: 'get',
    });
}

export async function apiUpdateAreaPosition(data: PtzControlState): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateAreaPosition',
        method: 'post',
        data
    });
}
export async function apiUpdateWaterlevelPosition(data: PtzControlState): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateWaterlevelPosition',
        method: 'post',
        data
    });
}

export async function apiGetEventList(data: { start: string; end: string, type?: string, startTime?: string, endTime?: string, deviceType: string, mainServiceName?: string, eventLocation: string }): Promise<{ message: string; result: [] }> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getEventList',
        method: 'post',
        data: data
    })
}

export async function apiGetOperationLogList(data: { start: string; end: string; logType: string; }) {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getOperationLogList',
        method: 'post',
        data: data
    })
}

export async function apiGetWaterLevelLocations(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getWaterLevelLocations',
        method: 'post',
    })
}

export async function apiGetOutsideLocations(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getOutsideLocations',
        method: 'post',
    })
}

export async function apiInundationEventModify<T extends Record<string, unknown>>(data: T): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyEventType',
        method: 'post',
        data: data,
    });
}

export async function apiGetDashboardDeviceList(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getDashboardDevices',
        method: 'post',
    });
}

export async function apiUpdateGroupBillboards<T extends Record<string, unknown>>(data: T): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/updateGroupBillboards',
        method: 'post',
        data
    });
}

export async function apiSocketServiceReset(): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/resetSocket',
        method: 'post',
    });
}

export const apiGetWaterlevelConnectionStatus = async () => {
    try {
        const response = await ApiService.fetchDataWithAxios({
            url: '/inundation/waterlevel/connection-status',
            method: 'get',
        });
        return response;
    } catch (error) {
        console.error('수위계 연결 상태 조회 오류:', error);
        throw error;
    }
};

export const apiGetWaterlevelConnectionStatusByIp = async (ip: string) => {
    try {
        const response = await ApiService.fetchDataWithAxios({
            url: `/inundation/waterlevel/connection-status/${ip}`,
            method: 'get',
        });
        return response;
    } catch (error) {
        console.error('수위계 연결 상태 조회 오류:', error);
        throw error;
    }
};

export const apiReconnectWaterlevel = async (ip: string, type: string) => {
    try {
        const response = await ApiService.fetchDataWithAxios({
            url: `/inundation/waterlevel/reconnect/${ip}`,
            method: 'post',
            data: { type },
        });
        return response;
    } catch (error) {
        console.error('수위계 재연결 오류:', error);
        throw error;
    }
};

export async function apiAddAiboxWaterLevelDevice(deviceData: {
    name: string;
    location: string;
    ip: string;
    port: number;
    threshold: number;
}): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addAiboxWaterLevelDevice',
        method: 'post',
        data: deviceData
    });
}

export async function apiGetAiboxWaterLevelDeviceList(): Promise<ApiResponse<any[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getAiboxWaterLevelDeviceList',
        method: 'post',
    });
}

// 수위계 그룹 관련 API
export async function apiGetWaterLevelGroups(): Promise<ApiResponse<any[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/waterLevelGroup/groups',
        method: 'get',
    });
}

export async function apiGetWaterLevelGroupDetail(groupId: number): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: `/waterLevelGroup/groups/${groupId}`,
        method: 'get',
    });
}

export async function apiGetAvailableWaterLevels(): Promise<ApiResponse<any[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/waterLevelGroup/available-water-levels',
        method: 'get',
    });
}

export async function apiCreateWaterLevelGroup(groupData: {
    groupName: string;
    waterLevelIds: number[];
    thresholdMode?: string;
    disableIndividualControl?: boolean;
}): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: '/waterLevelGroup/groups',
        method: 'post',
        data: {
            groupName: groupData.groupName,
            waterLevelIds: groupData.waterLevelIds,
            thresholdMode: groupData.thresholdMode || 'AND',
            disableIndividualControl: groupData.disableIndividualControl || false
        }
    });
}

export async function apiUpdateWaterLevelGroup(groupId: number, groupData: {
    groupName: string;
    waterLevelIds: number[];
    thresholdMode?: string;
    disableIndividualControl?: boolean;
}): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: `/waterLevelGroup/groups/${groupId}`,
        method: 'put',
        data: {
            groupName: groupData.groupName,
            waterLevelIds: groupData.waterLevelIds,
            thresholdMode: groupData.thresholdMode || 'AND',
            disableIndividualControl: groupData.disableIndividualControl || false
        }
    });
}

export async function apiDeleteWaterLevelGroup(groupId: number): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: `/waterLevelGroup/groups/${groupId}`,
        method: 'delete',
    });
}

export async function apiModifyAiboxWaterLevelDevice(deviceData: {
    water_level_idx: number;
    name: string;
    location: string;
    ip: string;
    port: number;
    threshold: number;
}): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/modifyAiboxWaterLevelDevice',
        method: 'post',
        data: deviceData
    });
}

export async function apiDeleteAiboxWaterLevelDevice(water_level_idx: number): Promise<ApiResponse<any>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/deleteAiboxWaterLevelDevice',
        method: 'delete',
        data: { water_level_idx }
    });
}

export async function apiAddWaterLevelAutoControl(WaterlevelGaugeInformation: WaterlevelRequest): Promise<ApiResponse<null>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/addWaterLevelAutoControl',
        method: 'post',
        data: WaterlevelGaugeInformation
    })
}

export async function apiGetWaterLevelAutoControl(): Promise<ApiResponse<Waterlevel[]>> {
    return ApiService.fetchDataWithAxios({
        url: '/inundation/getWaterLevelAutoControl',
        method: 'get'
    })
} 
