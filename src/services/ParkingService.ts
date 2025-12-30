import endpointConfig from '@/configs/endpoint.config'
import ApiService from './ApiService'
import { ApiResultObjectArray } from '@/@types/api';
import { ParkingTypeCount, FloorInfo } from '@/@types/parking'

export async function apiOutsideInsideTreeList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.outsideInsideTreeList,
        method: 'post'
    });
}

export async function apiParkingTypeList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTypeList,
        method: 'post'
    });
}

export async function apiAddParkingArea<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addParkingArea,
        method: 'post',
        data: data,
    });
}

export async function apiRemoveParkingArea<T extends Record<string, unknown>>(obj : T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.removeParkingArea,
        method: 'delete',
        data: obj
    })
}

export async function apiParkingTypeCountAreaInfo<T>(data: ParkingTypeCount): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTypeCountAreaInfo,
        method: 'post',
        data: data,
    });
}


export async function apiParkingAreaModify<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.modifyAreaInfo,
        method: 'post',
        data: data,
    });
}

export async function apiParkingFieldModify<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.modifyFieldInfo,
        method: 'post',
        data: data,
    });
}

export async function apiAddParkingField<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addParkingField,
        method: 'post',
        data: data,
    });
}

export async function apiRemoveParkingField<T>(idx: number): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.removeParkingField,
        method: 'delete',
        data: {
            idx
        }
    })
}

export async function apiParkingTypeCountUsedArea<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTypeCountUsedArea,
        method: 'post'
    });
}

export async function apiParkingTypeCountAreaList<T>(data:  { outsideIdx: number | undefined;}): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTypeCountAreaList,
        method: 'post',
        data: data,
    });
}

export async function apiParkingTypeSumAreaList<T>(data:  { outsideIdx: number | undefined;}): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTypeSumAreaList,
        method: 'post',
        data: data,
    });
}

export async function apiBuildingAccessLogList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.buildingAccessLogList,
        method: 'post',
        data: data,
    });
}

export async function apiAccessLogList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.accessLogList,
        method: 'post',
        data: data,
    });
}

export async function apiFloorList<T>(data:  { outsideIdx: number | undefined;}): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.floorList,
        method: 'post',
        data: data,
    });
}

export async function apiParkingModifyFloor<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingModifyFloor,
        method: 'post',
        data: data,
    });
}

export async function apiParkingDeleteInSide<T>(idx: number): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingDeleteInSide,
        method: 'delete',
        data: {
            idx
        }
    })
}

export async function apiParkingAddFloor<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingAddFloor,
        method: 'post',
        data: data,
    });
}

export async function apiFloorInfo<T>(data: FloorInfo): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.floorInfo,
        method: 'post',
        data: data,
    });
}

export async function apiBuildingImageUpload<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.buildingImageUpload,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

export async function apiFloorImageUpload<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.floorImageUpload,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

export async function apiAccessTimeZone<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.accessTimeZone,
        method: 'post',
        data: data,
    });
}

export async function apiVehicleNumberSearchPreview<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.vehicleNumberSearchPreview,
        method: 'post',
        data: data,
    });
}

export async function apiVehicleNumberSearch<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.vehicleNumberSearch,
        method: 'post',
        data: data,
    });
}

export async function apiAddDevice<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.addParkingDevice,
        method: 'post',
        data: data,
    });
}

export async function apiModifyDevice<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.modifyParkingDevice,
        method: 'post',
        data: data,
    });
}

export async function apiDeleteDevice<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.deleteDevice,
        method: 'post',
        data: data,
    });
}

export async function apiDeviceIpList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.deviceIpList,
        method: 'post',
        data: data,
    });
}

export async function apiParkingEventModify<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingModifyEventType,
        method: 'post',
        data: data,
    });
}

export async function apiGetEventLogList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingEventLogList,
        method: 'post'
    });
}

export async function apiGetTreeList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingTreeList,
        method: 'post'
    });
}

export async function apiParkingEventLogSearchList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingEventLogSearchList,
        method: 'post',
        data: data,
    });
}