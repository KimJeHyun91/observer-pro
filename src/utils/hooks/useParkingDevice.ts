import useSWR from 'swr';

export function useParkingDeviceList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'parkingDevice',
      url: '/parking/getDeviceIpList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
    }
  );

  return { data: data?.result, error, isLoading, mutate };
}

export function useParkingUnDeviceList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'parkingDevice',
      url: '/parking/getUnUseDeviceList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
    }
  );

  return { data: data?.result, error, isLoading, mutate };
}