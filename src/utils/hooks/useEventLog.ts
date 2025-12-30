import useSWR from 'swr';

export function useEventLogList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'commonEventLogList',
      url: '/common/getEventLogList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      revalidateOnMount: false,
      refreshInterval: 0,
    }
  );
  return { data, error, isLoading, mutate };
}
