import useSWR from 'swr';

export function useGuardianlites({ inside_idx, outside_idx, dimension_type }: { inside_idx?: number, outside_idx?: number | null, dimension_type?: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'guardianlites',
      url: 'observer/getGuardianliteList',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        outside_idx,
        inside_idx,
        dimension_type
      }
    }
  );
  return { guardianlites: data?.result, error, isLoading, mutate };
}