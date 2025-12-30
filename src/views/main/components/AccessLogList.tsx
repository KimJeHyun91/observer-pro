import Loading from '@/components/shared/Loading';
import { useAccessLog } from '@/utils/hooks/main/useAccessLog';
import dayjs from 'dayjs';
import AccessLogDetail from './AccessLogDetail';
import { memo } from 'react';

type Props = {
  showOpenDialog: ({ title, width, height, params }: { title: string, width: number, height: number, params: string }) => void
}

export default memo(function AccessLogList({ showOpenDialog }: Props) {

  const startDateTime = dayjs().subtract(1, 'day');
  const startDate = dayjs(startDateTime).format('YYYYMMDD');
  const startTime = dayjs(startDateTime).format('HHmmss');
  const { isLoading, accessLog, error: errorAccessLog, mutate } = useAccessLog({ startDateTime: `${startDate}T${startTime}` });
  if (errorAccessLog) {
    console.log('access log custom hook error');
  };

  return (
    <>
      {
        isLoading ? (
          <Loading loading={isLoading} />
        )
          :
          <ul
            className={'flex flex-col scroll-container overflow-x-hidden overflow-y-auto py-1 pl-2 pr-1 mr-1.5 gap-y-2 h-[calc(100%-50px)]'}
          >
            <AccessLogDetail
              accessLogData={accessLog}
              mutateAccessLog={mutate}
              mode='map'
              showOpenDialog={showOpenDialog}
            />
          </ul >
      }
    </>
  )
})