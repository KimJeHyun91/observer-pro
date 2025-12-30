import { AlertDialog } from '@/components/shared/AlertDialog';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui';
import { apiDownloadSOPLogDetail } from '@/services/ObserverService';
import { useSOPList } from '@/utils/hooks/useSOPList';
import { useState } from 'react';

type Props = {
  params: string;
  close: () => void;
};

const COMMON_BOX_STYLE = 'w-[36.625rem] mx-auto bg-[#EBECEF] rounded flex items-center';
const COMMON_CONTENT_BOX_STYLE = 'rounded-sm border-2 border-[#D9DCE3] font-semibold bg-[#FFFFFF] flex items-center';

export default function ConfirmSOPProcess({ params, close }: Props) {
  const SOPIdx = parseInt(params.split('/')[0]);
  const isClearSOPStage = params.split('/')[1];
  const eventIdx = parseInt(params.split('/')[2]);
  const { isLoading, data, error } = useSOPList(SOPIdx);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [status, setStatus] = useState<'blue' | 'red'>('blue');

  const SOP = data?.result[0];
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
    <section className='w-full flex flex-col justify-between gap-2 pb-4'>
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
      <div className={`h-[8.125rem] ${COMMON_BOX_STYLE}`}>
        {SOP && (
          <div className='w-[34.25rem] h-[6.1875rem] flex flex-col justify-between mx-auto'>
            <div className={`${COMMON_CONTENT_BOX_STYLE} justify-center h-[2.375rem] text-[#895F1E] text-2xl`}>
              {SOP.sop_name}
            </div>
            <div className={`${COMMON_CONTENT_BOX_STYLE} h-[3.125rem] text-[#616A79] text-xl pl-7`}>
              SOP 절차 {SOP.count}단계
            </div>
          </div>
        )}
      </div>
      <div className={`h-[4.375rem] ${COMMON_BOX_STYLE}`}>
        <div className={`${COMMON_CONTENT_BOX_STYLE} justify-center w-[34.1875rem] h-[2.375rem] m-auto text-[#647DB7] text-xl`}>
          SOP 절차 {isClearSOPStage}단계 진행 완료
        </div>
      </div>
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