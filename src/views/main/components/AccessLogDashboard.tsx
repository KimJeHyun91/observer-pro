import { useCallback, useState } from 'react';
import AccessLogDetailSelected from './AccessLogDetailSelected';
import AccessLogDashboardData from './AccessLogDashboardData';

export type SelectedAccessLog = {
  LogIDX: number | null;
  LogStatus: string | null;
  LogStatusName: string | null;
  LogPersonLastName: string | null;
  LogTitleName: string | null;
  LogDateTime: string | null;
  LogDoorName: string | null;
  userImage: string | null;
  camera_id?: string | null;
};

export default function AccessLogDashboard() {
  const [selectedAccessLog, setSelectedAccessLog] = useState<SelectedAccessLog>({
    LogIDX: null,
    LogStatus: null,
    LogStatusName: null,
    LogPersonLastName: null,
    LogTitleName: null,
    LogDateTime: null,
    LogDoorName: null,
    userImage: null,
    camera_id: null
  });

  const selectAccessLog = useCallback(({
    LogIDX,
    LogStatus,
    LogStatusName,
    LogPersonLastName,
    LogTitleName,
    LogDateTime,
    LogDoorName,
    userImage,
    camera_id,
  }: SelectedAccessLog) => {
    setSelectedAccessLog({
      LogIDX,
      LogStatus,
      LogStatusName,
      LogPersonLastName,
      LogTitleName,
      LogDateTime,
      LogDoorName,
      userImage,
      camera_id
    })
  }, []);

  return (
    <section className={`bg-white dark:bg-[#262626] rounded-sm h-[60%]`}>
      <div>
        <h3 className='text-[1.03rem] font-bold pl-2 pt-1'>출입 기록</h3>
        <div className='w-[10/12] bg-[#616A79] h-[2px] m-1' />
      </div>
      <>
        <AccessLogDetailSelected selectedAccessLog={selectedAccessLog} />
        <AccessLogDashboardData selectAccessLog={selectAccessLog} />
      </>
    </section>
  );

}