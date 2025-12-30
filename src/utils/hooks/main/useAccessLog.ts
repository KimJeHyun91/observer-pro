import useSWR from 'swr';

export function useAccessLog({ startDateTime, limit }: { startDateTime?: string, limit?: number }) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'accessLog',
      url: 'observer/accesscontrollog',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      method: 'post',
      data: {
        startDateTime,
        limit
      }
    }
  );
  return { accessLog: data?.result, error, isLoading, mutate };
}