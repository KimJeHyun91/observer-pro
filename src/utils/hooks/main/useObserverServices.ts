import useSWR from 'swr';
import { apiObserverServiceList } from '@/services/CommonService';

export function useObserverServices<T>() {
  const { data, error, isLoading } = useSWR(
    'apiObserverServiceList',
    () => apiObserverServiceList<T>(),
    {
      revalidateOnFocus: false
    }
  );
  return { data, error, isLoading };
}