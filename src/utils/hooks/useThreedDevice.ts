import useSWR from 'swr';

export function ThreedDeviceList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'threedDevice',
      url: '/threed/threedDeviceList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
    }
  );

  return { data: data?.result, error, isLoading, mutate };
}
