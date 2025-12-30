import { ApiResultObjectArray } from '@/@types/api';
import useSWR from 'swr';

type FalseAlarm = {
  idx: number;
  type: string;
}

export function useFalseAlarm(idx?: number) {
  const { data, error, isLoading, mutate } = useSWR<ApiResultObjectArray<FalseAlarm>>(
    {
      key: 'falseAlarm',
      url: '/common/getFalseAlarmList',
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