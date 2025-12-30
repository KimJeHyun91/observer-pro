import { memo, useEffect, useRef, useState } from 'react';
import { useAccessLog } from '@/utils/hooks/main/useAccessLog';
import { SelectedAccessLog } from './AccessLogDashboard';
import AccessLogDetail from './AccessLogDetail';
import Loading from '@/components/shared/Loading';
import { AccessCtlLog } from '../types/accessCtl';
import { useFullScreenStore } from '@/store/common/useFullScreenStore';

type Props = {
  selectAccessLog: ({
    LogIDX,
    LogStatus,
    LogStatusName,
    LogPersonLastName,
    LogTitleName,
    LogDateTime,
    LogDoorName,
    userImage
  }: SelectedAccessLog) => void;
};

export default memo(function AccessLogDashboardData({ selectAccessLog }: Props) {
  const { isFullscreen } = useFullScreenStore();
  const ulRef = useRef<HTMLUListElement | null>(null);
  const [ulHeight, setUlHeight] = useState('auto');
  const { isLoading, accessLog, error: errorAccessLog, mutate } = useAccessLog({ limit: 100 });
  if (errorAccessLog) {
    console.log('access log custom hook error');
  };

  useEffect(() => {
    if (accessLog && Array.isArray(accessLog) && accessLog.length > 0) {
      const accessLogData: AccessCtlLog[] = accessLog;
      const { LogIDX, LogStatus, LogStatusName, LogDoorName, LogPersonLastName, LogDateTime, LogTitleName, LogPersonID } = accessLogData[0];
      selectAccessLog({
        LogIDX,
        LogStatus,
        LogStatusName,
        LogDoorName,
        LogPersonLastName,
        LogDateTime,
        LogTitleName,
        userImage: LogPersonID ?
          `http://${window.location.hostname}:4200/images/access_control_person/${LogPersonID}.png` :
          null
      })
    };
  }, [selectAccessLog, accessLog]);

  const updateHeight = () => {
    const ul = ulRef.current;
    if (!ul) return;

    const rect = ul.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - rect.top - 10;

    if (availableHeight > 0) {
      setUlHeight(`${availableHeight}px`);
    };
  };

  useEffect(() => {
    let retries = 10;
    const interval = setInterval(() => {
      if (ulRef.current) {
        updateHeight();
        clearInterval(interval);
      } else {
        retries--;
        if (retries <= 0) clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isFullscreen]);

  if (isLoading) {
    return (
      <div className='h-[19.5rem] flex items-center justify-center'>
        <Loading loading={isLoading} />
      </div>
    )
  } else {
    return (
      <ul
        ref={ulRef}
        className={'flex flex-col scroll-container overflow-x-hidden overflow-y-auto h-full py-1 pl-2 pr-1 mr-1.5 gap-y-2'}
        style={{
          height: ulHeight
        }}
      >
        <AccessLogDetail
          accessLogData={accessLog}
          mutateAccessLog={mutate}
          mode='dashboard'
          selectAccessLog={selectAccessLog}
        />
      </ul>
    )
  }
})