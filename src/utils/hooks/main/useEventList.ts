import { ApiResultObjectArray } from '@/@types/api';
import { EventInfo } from '@/@types/main';
import useSWR from 'swr';

type Data = {
  sort: string;
  filter: string
  outsideIdx?: number;
}

export function useEventList({ sort, filter, outsideIdx }: Data) {
  const { data, error, isLoading, mutate } = useSWR<ApiResultObjectArray<EventInfo>>(
    {
      key: 'building',
      url: '/observer/events/list',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      method: 'post',
      data: {
        sort,
        filter,
        outsideIdx
      }
    }
  );
  return { data, error, isLoading, mutate };
}