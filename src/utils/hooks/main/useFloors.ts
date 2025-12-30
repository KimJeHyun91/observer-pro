import useSWR from 'swr';

export function useFloors(outside_idx?: number, three_d_model_id?: number) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'floors',
      url: '/observer/getFloor',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        three_d_model_id,
        outside_idx
      }
    }
  );
  return { data, error, isLoading, mutate };
}