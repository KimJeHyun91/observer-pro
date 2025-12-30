import { ApiResultObjectArray } from '@/@types/api';
import useSWR from 'swr';

type SOPStage = {
  idx: number;
  sop_stage: number;
  sop_stage_name: string;
  sop_stage_description: string;
}

export function useSOPStageList(idx: number) {
  const { data, error, isLoading, mutate } = useSWR<ApiResultObjectArray<SOPStage>>(
    {
      key: 'SOPStageList',
      url: '/common/SOPStageList',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      method: 'post',
      data: {
        sopIdx: idx
      }
    }
  );
  return { data, error, isLoading, mutate };
}