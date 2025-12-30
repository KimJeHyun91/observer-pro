import useSWR from 'swr';

export function useMDETs() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'mdet',
      url: 'observer/mdet',
      revalidateOnFocus: false,
      method: 'get'
    }
  );
  return { mdets: data?.result, error, isLoading, mutate };
};