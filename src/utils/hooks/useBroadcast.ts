import { BroadcastAreaResponse, Reservation, SpeakerList } from '@/@types/broadcast'
import useSWR from 'swr'


export function useBroadcastAccessToken() {
    const {
        data: accessToken,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastToken',
        url: '/broadcast/getAccessToken',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { accessToken, error, isLoading, mutate }
}

export function useBroadcastSites() {
    const {
        data: sites,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastSites',
        url: '/broadcast/getSites',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { sites, error, isLoading, mutate }
}


export function useBroadcastArea() {
    const {
        data: areaList,
        error,
        isLoading, 
        mutate,
    } = useSWR<{message: string; result: BroadcastAreaResponse[]}>({
        key: 'broadcastArea',
        url: '/broadcast/getOutsideList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { areaList, error, isLoading, mutate }
}

export function useBroadcastSpeakerMacroList() {
    const {
        data: speakerList,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastSpeaker',
        url: '/broadcast/getSpeakerMacroList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { speakerList, error, isLoading, mutate }
}


export function useBroadcastEventTypeList() {
    const {
        data: eventTypeList,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastEventType',
        url: '/broadcast/getEventTypeList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { eventTypeList, error, isLoading, mutate }
}

export function useBroadcastDeviceGroupList() {
    const {
        data: groupList,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastDeviceGroup',
        url: '/broadcast/getGroupOutsideList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { groupList, error, isLoading, mutate }
}

export function useBroadcastAudioFileList() {
    const {
        data: fileList,
        error,
        isLoading,
        mutate,
    } = useSWR({
        key: 'broadcastAudioFile',
        url: '/broadcast/getAudioFileList',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { fileList, error, isLoading, mutate }
}

export function useBroadcastSpeakerList() {
    const {
        data: speakerList,
        error,
        isLoading,
        mutate,
    } = useSWR<{message: string; result: SpeakerList[]}>({
        key: 'broadcastSpeaker',
        url: '/broadcast/getSpeakerList',
        method: 'post',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { speakerList, error, isLoading, mutate }
}


export function useBroadcastReservationList() {
    const {
        data: reserveList,
        error,
        isLoading,
        mutate,
    } = useSWR<{message: string; result: Reservation[]}>({
        key: 'broadcastReserve',
        url: '/broadcast/getReserveList',
        method: 'get',
        revalidateOnFocus: false,
        revalidateIfStale: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
    })

    return { reserveList, error, isLoading, mutate }
}

