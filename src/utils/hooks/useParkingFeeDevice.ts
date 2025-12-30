import useSWR from 'swr';

export function useParkingFeeDeviceList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'parkingFeeDevice',
      url: '/parkingFee/get/crossingGateDirectionList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
      data: {
        direction : 'in,out',
        is_used : [true,false],
      },
    }
  );

  return { data: data?.result, error, isLoading, mutate };
}