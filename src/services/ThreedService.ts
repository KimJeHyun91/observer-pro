import endpointConfig from '@/configs/endpoint.config'
import ApiService from './ApiService'
import { ApiResultObjectArray } from '@/@types/api';
import { FloorInsertPayload } from '@/@types/threeD'

export async function apiGlbFileUpload<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.glbModelsUpload,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}

export async function getModelsList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getGlbModels,
        method: 'post',
        data: data,
    });
}

export async function saveDefaultModel<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.saveDefaultModel,
        method: 'post',
        data: data,
    });
}

export async function savePositionModel<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.savePositionModel,
        method: 'post',
        data: data,
    });
}

export async function deleteModel<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.deleteModel,
        method: 'post',
        data: data,
    });
}

export async function threedDeleteDevice<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.threedDeleteDevice,
        method: 'post',
        data: data,
    });
}

export async function addDeviceMapping<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addDeviceMapping,
        method: 'post',
        data: data,
    });
}

export async function getDeviceMappings<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getDeviceMappings,
        method: 'post',
        data: data,
    });
}

export async function getAllDeviceMappings<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getAllDeviceMappings,
        method: 'post',
        data: data,
    });
}

export async function deleteDeviceMapping<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.deleteDeviceMapping,
        method: 'post',
        data: data,
    });
}

export async function addModelFloors(data: FloorInsertPayload[]) {
  return ApiService.fetchDataWithAxios({
    url: endpointConfig.addModelFloors,
    method: 'post',
    data: data,
  })
}

export async function apiGlbDevicesUpload<T>(formData: FormData) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.glbDevicesUpload,
        method: 'post',
        data: formData,
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })
}