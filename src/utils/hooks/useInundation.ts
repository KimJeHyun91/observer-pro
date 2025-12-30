import useSWR from 'swr'
import { useRef, useCallback } from 'react'

export function useInundationEventTypeList() {
	const {
		data: eventTypeList,
		error,
		isLoading,
		mutate,
	} = useSWR({
		key: 'inundationEventType',
		url: '/inundation/getEventTypeList',
		method: 'post',
		revalidateOnFocus: false,
		revalidateIfStale: false,
		shouldRetryOnError: false,
		refreshInterval: 0,
	})

	return { eventTypeList, error, isLoading, mutate }
}

export function useOptimizedApiCall() {
	const lastCallTime = useRef<number>(0);
	const isCalling = useRef<boolean>(false);

	const callWithDebounce = useCallback(async (apiFunction: () => Promise<any>, delay: number = 2000) => {
		const now = Date.now();
		if (isCalling.current || (now - lastCallTime.current < delay)) {
			console.log('API 호출 제한');
			return null;
		}

		isCalling.current = true;
		lastCallTime.current = now;

		try {
			const result = await apiFunction();
			return result;
		} finally {
			isCalling.current = false;
		}
	}, []);

	return { callWithDebounce };
}