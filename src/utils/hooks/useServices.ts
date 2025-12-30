import useSWR from 'swr';
import { apiServiceList } from '@/services/CommonService';

export function useServices<T>() {
  const { data, error, isLoading } = useSWR(
    'apiServiceList',
    () => apiServiceList<T>(),
    {
      revalidateOnFocus: false
    }
  );
  return { data, error, isLoading };
}