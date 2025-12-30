import useSWR from 'swr';

export function usePIDS() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'pids',
      url: 'observer/pidsList',
      revalidateOnFocus: false,
      method: 'post'
    }
  );
  return { pidsList: data, error, isLoading, mutate };
}