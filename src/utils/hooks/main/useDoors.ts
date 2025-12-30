import useSWR from 'swr';

export function useDoors(inside_idx?: number, dimension_type?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'doors',
      url: 'observer/accesscontrolDoors',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        inside_idx,
        dimension_type
      }
    }
  );
  return { doors: data?.result, error, isLoading, mutate };
}