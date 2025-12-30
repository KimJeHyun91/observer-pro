import useSWR from 'swr'

export function useEventTypeList() {
  const {
    data: eventTypeList,
    error,
    isLoading,
    mutate,
  } = useSWR({
    key: 'commonEventType',
    url: '/common/getEventTypeList',
    method: 'post',
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    refreshInterval: 0,
  })

  return { eventTypeList, error, isLoading, mutate }
}