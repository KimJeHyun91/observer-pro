import { ApiResultObjectArray } from '@/@types/api';
import useSWR from 'swr';

type SOP = {
  idx: number;
  sop_name: string;
  count: number;
}

export function useSOPList(idx?: number) {
  const { data, error, isLoading, mutate } = useSWR<ApiResultObjectArray<SOP>>(
    {
      key: 'SOPList',
      url: '/common/SOPList',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      method: 'post',
      data: {
        idx
      }
    }
  );
  return { data, error, isLoading, mutate };
}