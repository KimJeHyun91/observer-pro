import useSWR from 'swr';

type Props = {
  startDate: string;
  endDate: string;
}

export function useEventsBySOP({ startDate, endDate }: Props) {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'sop',
      url: 'observer/events/bySOP',
      revalidateOnFocus: false,
      method: 'post',
      data: {
        startDate,
        endDate
      }
    }
  );
  return { eventsBySOP: data, error, isLoading, mutate };
};