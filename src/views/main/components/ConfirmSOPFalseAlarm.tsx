import { AlertDialog } from '@/components/shared/AlertDialog';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui';
import { apiDownloadSOPLogDetail } from '@/services/ObserverService';
import { useFalseAlarm } from '@/utils/hooks/useFalseAlarm';
import { useState } from 'react';

type Props = {
  params: string;
  close: () => void;
};

export default function ConfirmSOPFalseAlarm({ params, close }: Props) {
  const falseAlarmIdx = parseInt(params.split('/')[0]);
  const eventIdx = parseInt(params.split('/')[1]);
  const { isLoading, data, error } = useFalseAlarm(falseAlarmIdx);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'blue' | 'red'>('blue');
  const falseAlarmList = data?.result;
  if (error) {
    console.log('get SOP List error');
  };

  const handleDownload = async (form: 'pdf' | 'xlsx') => {

    try {
      // 서버에 다운로드 요청
      setIsDownloading(true);
      let fileData;
      if (form === 'pdf') {
        fileData = await apiDownloadSOPLogDetail<Uint8Array>({
          idx: eventIdx, // 예시: 다운로드할 SOP 로그 ID
          form: 'pdf',
        });
      } else {
        fileData = await apiDownloadSOPLogDetail<ArrayBuffer>({
          idx: eventIdx, // 예시: 다운로드할 SOP 로그 ID
          form: 'xlsx',
        });
      }
      const arrayBuffer = fileData as ArrayBuffer;

      const blob = new Blob([arrayBuffer], {
        type:
          form === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // 파일 다운로드 처리
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        form === 'pdf'
          ? `SOP_처리_결과_보고서_${eventIdx}.pdf`
          : `SOP_처리_내역서_${eventIdx}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage('다운로드에 성공했습니다.');
      setStatus('blue');
      setIsDownloading(false);
      setIsAlertOpen(true);
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      setMessage('파일 다운로드에 실패했습니다. 다시 시도해주세요.');
      setStatus('red');
      setIsDownloading(false);
      setIsAlertOpen(true);
    }
  };

  return (
    <section className='w-full flex flex-col justify-between gap-2 py-4'>
      {isLoading && (<Loading loading={isLoading} />)}
      <div className='flex justify-end gap-3 mr-4'>
        <Button
          size='sm'
          disabled={isDownloading}
          onClick={() => handleDownload('pdf')}
        >
          PDF 다운로드
        </Button>
        <Button
          size='sm'
          disabled={isDownloading}
          onClick={() => handleDownload('xlsx')}
        >
          EXCEL 다운로드
        </Button>
      </div>
      {(falseAlarmList && Array.isArray(falseAlarmList) && falseAlarmList.length === 1) && (
        <p className='bg-[#EBECEF] w-9/10 mx-2 h-[12.125rem] p-2 scroll-container overflow-x-hidden overflow-y-auto gap-y-2'>
          {falseAlarmList[0].type}
        </p>
      )}
      <Button
        className='w-[6.375rem] h-[1.875rem] rounded-sm border-[1px] border-[#D9DCE3] bg-[#17A36F] text-white flex items-center justify-center relative top-2.5 left-[30rem]'
        onClick={close}
      >
        확인
      </Button>
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        status={status}
        onClose={() => setIsAlertOpen(false)}
      />
    </section>
  );

}