
import { ServiceType } from '@/@types/common';
import useSWR from 'swr';

export function useObVms(mainServiceName: ServiceType) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'obVms',
      url: 'observer/getVmsList',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        mainServiceName
      }
    }
  );
  return { data: data?.result, error, isLoading, mutate };
}