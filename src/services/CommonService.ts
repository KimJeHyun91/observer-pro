import ApiService from './ApiService';
import endpointConfig from '@/configs/endpoint.config';
import { ApiResultBoolean, ApiResultObjectArray } from '@/@types/api';

export async function apiGetNotificationCount() {
    return ApiService.fetchDataWithAxios<{
        count: number
    }>({
        url: '/notification/count',
        method: 'get',
    })
}

export async function apiGetNotificationList() {
    return ApiService.fetchDataWithAxios<
        {
            id: string
            target: string
            description: string
            date: string
            image: string
            type: number
            location: string
            locationLabel: string
            status: string
            readed: boolean
        }[]
    >({
        url: '/notification/list',
        method: 'get',
    })
}

export async function apiGetSearchResult<T>(params: { query: string }) {
    return ApiService.fetchDataWithAxios<T>({
        url: '/search/query',
        method: 'get',
        params,
    })
}

export async function apiServiceList<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.service,
        method: 'post',
    })
}

export async function apiObserverServiceList<T>() {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.observerService,
        method: 'post'
    })
}

export async function apiAddEventLog<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addEventLog,
        method: 'post',
        data: data,
    });
}

export async function apiEventLogCheck<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.eventLogCheck,
        method: 'post',
        data: data,
    });
}

export async function apiWarningBoardDelete<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.warningDelete,
        method: 'delete',
    })
}

export async function apiGetWarningBoard<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.getWarningBoard,
        method: 'post',
    })
}

export async function apiCheckUseWarningBoard<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.checkUseWarningBoard,
        method: 'post',
        data: data,
    });
}

export async function apiInsertWarningBoard<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.insertWarningBoard,
        method: 'post',
        data: data,
    });
}

export async function apiAddUser<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/common/addUser',
        method: 'post',
        data: data,
    });
}

export async function apiModifyUser<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/common/modifyUser',
        method: 'post',
        data: data,
    });
}

export async function apiDeleteUser<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/common/deleteUser',
        method: 'delete',
        data: data,
    });
}

export async function apiGetSigunguBoundaryControl<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/common/getSigunguBoundaryControl',
        method: 'post',
    })
}

export async function apiSetSigunguBoundaryControl<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: '/common/setSigunguBoundaryControl',
        method: 'post',
        data: data,
    });
}


/**
 * common settings
 * table main_setting
 * @param settingName 
 *
 * @returns boolean
 */
export async function apiModifySetting(settingName: string, settingValue: string) {
    return ApiService.fetchDataWithAxios<ApiResultBoolean>({
        url: endpointConfig.modifySetting,
        method: 'put',
        data: {
            settingName,
            settingValue
        }
    });
};