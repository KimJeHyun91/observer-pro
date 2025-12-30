import useSWR from 'swr';

export function useEbells({ outside_idx, inside_idx, dimension_type }: { outside_idx?: number, inside_idx?: number, dimension_type?: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'ebells',
      url: 'observer/ebell',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        outside_idx,
        inside_idx,
        dimension_type
      }
    }
  );
  return { ebells: data?.result, error, isLoading, mutate };
}