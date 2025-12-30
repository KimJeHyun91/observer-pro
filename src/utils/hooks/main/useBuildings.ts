import { ApiResultObjectArray } from '@/@types/api';
import { Building } from '@/@types/building';
import { ThreedModel } from '@/@types/threeD';
import useSWR from 'swr';

type BuildingType = Building | ThreedModel;

export function useBuildings(urlParams: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiResultObjectArray<BuildingType>>(
    {
      key: 'building',
      url: `observer/${urlParams}`,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      method: 'post',
      data: {
        serviceType: 'origin',
      },
    }
  );
  return { data, error, isLoading, mutate };
}