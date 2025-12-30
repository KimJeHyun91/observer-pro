import { TunnelOutsideResponse, billboardRequest, billboardInfo, waterLevelRequest } from '@/@types/tunnel';
import { useEffect, useState } from 'react';
import useSWR from 'swr'

export function useTunnelOutside() {
    const {
        data: outsideList,
        error,
        isLoading,
        mutate,
    } = useSWR<{ message: string; result: TunnelOutsideResponse[] | string }>({
        key: 'tunnelOutside',
        url: '/tunnel/getOutsideList',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { outsideList, error, isLoading, mutate }
}

// 터널 차단막 자동화 유무 전달
export function useTunnelOutsideAutomatic() {
    const {
        data: automatic,
        error,
        isLoading,
        mutate,
    } = useSWR<{ message: string; result:string }>({
        key: 'tunnelOutsideAutomatic',
        url: '/tunnel/getOutsideAutomatic',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { automatic, error, isLoading, mutate }
}


export function useWaterGaugeList(outsideIdx: number) {
    const shouldFetch = outsideIdx !== null;

    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch
            ? {
                key: `useParkingAreaList-${outsideIdx}`,
                url: '/tunnel/getWaterGaugeList',
                method: 'post',
                data: { outsideIdx },
                revalidateOnFocus: false,
                revalidateIfStale: false,
                shouldRetryOnError: false,
                refreshInterval: 0,
            }
            : null
    );

    return { data, error, isLoading, mutate };
}

// ajy add 전광판 리스트 가지고 오는 함수 추가
export function useBillboardList() {
    const {
        data: billboardList,
        error,
        isLoading,
        mutate,
    } = useSWR<{ message: string; result: billboardRequest[] | string }>({
        key: 'tunnelBillboard',
        url: '/tunnel/getBillboardList',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { billboardList, error, isLoading, mutate }
}

// ajy add 전광판 정보 가지고 오는 함수 추가
export function useBillboardInfo(outsideIdx: number) {
    const {
        data: billboardList,
        error,
        isLoading,
        mutate,
    } = useSWR<{ message: string; result: billboardInfo[] | string }>({
        key: 'tunnelBillboard',
        url: '/tunnel/getBillboardInfo',
        method: 'post',
        data: { outsideIdx },
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { billboardList, error, isLoading, mutate }
}

// 터널 이벤트 리스트가지고 오는 함수 추가
export function useTunnelEventTypeList() {
    const {
        data: eventTypeList,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'tunnelEventType',
        url: '/tunnel/getEventTypeList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { eventTypeList, error, isLoading, mutate }
}

// ajy add 수위계 리스트 가지고 오는 함수 추가
export function useWaterLevelList() {
    const {
        data: waterLevelList,
        error,
        isLoading,
        mutate,
    } = useSWR<{ message: string; result: waterLevelRequest[] | string }>({
        key: 'tunnelWaterLevel',
        url: '/tunnel/getWaterLevelList',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { waterLevelList, error, isLoading, mutate }
}

export function useWaterLevelMappingList(outsideIdx: number) {
    const shouldFetch = outsideIdx !== null;
    const [isControlIn, setIsControlIn] = useState(false);

    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch
            ? {
                key: `useWaterLevelList-${outsideIdx}`,
                url: '/tunnel/getWaterLevelMappingList',
                method: 'post',
                data: { outsideIdx },
                revalidateOnFocus: false,
                revalidateIfStale: false,
                shouldRetryOnError: false,
                refreshInterval: 0,
            }
            : null
    );

    useEffect(() => {
        if (data?.message === 'ok' && Array.isArray(data.result)) {
            const hasControlIn = data.result.some(
                (item: { communication?: string }) => item.communication === 'control_in'
            );
            setIsControlIn(hasControlIn);
        }
    }, [data]);

    return { data, error, isLoading, mutate, isControlIn };
}


export function useWaterLevelMappingOutsideList(waterLevelIdx: number) {
    const shouldFetch = waterLevelIdx !== null;

    const { data, error, isLoading, mutate } = useSWR(
        shouldFetch
            ? {
                key: `useWaterLevelMappingOutsideList-${waterLevelIdx}`,
                url: '/tunnel/getWaterLevelMappingOutsideList',
                method: 'post',
                data: { waterLevelIdx },
                revalidateOnFocus: false,
                revalidateIfStale: false,
                shouldRetryOnError: false,
                refreshInterval: 0,
            }
            : null
    );

    return { data, error, isLoading, mutate };
}

export function useWaterLevelLog(outsideIdx: number) {
    const {
        data: waterLevelLog,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'waterLevelLog',
        url: '/tunnel/getWaterLevelLog',
        method: 'post',
        data: { outsideIdx },
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { waterLevelLog, error, isLoading, mutate }

}

// 대시보드에서 장비 목록 가지고 오는 함수
export function useDeviceList() {
    const {
        data: deviceList,
        error,
        isLoading,
        mutate,
    } = useSWR({
         key: 'tunnelDashboardDevice',
        url: '/tunnel/getDashboardDeviceList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { deviceList, error, isLoading, mutate }
}

// 가디언라이트 정보 가지고 오는 함수
export function useGuardianliteInfo(ip: string) {
    const {
        data: guardianliteInfo,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'guardianliteInfo',
        url: '/tunnel/getGuardianliteInfo',
        method: 'post',
        data: { ip },
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { guardianliteInfo, error, isLoading, mutate }

}