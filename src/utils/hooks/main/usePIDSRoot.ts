import useSWR from 'swr';

export function usePIDSRoot() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'pidsRoot',
      url: 'observer/pids/root',
      revalidateOnFocus: false,
      method: 'get'
    }
  );
  return { pidsRootList: data, error, isLoading, mutate };
}