import useSWR from 'swr';

export function useGetUser() {
	const { data, error, isLoading, mutate } = useSWR(
		{
			key: 'getUser',
			url: '/common/getUser',
			method: 'post',
			revalidateOnFocus: false,
			revalidateIfStale: false,
			shouldRetryOnError: false,
			revalidateOnMount: false,
			refreshInterval: 0,
		}
	);
	return { data, error, isLoading, mutate };
}