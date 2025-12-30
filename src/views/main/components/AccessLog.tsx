import { useCallback, useState } from 'react';
import { OpenDialog } from '@/@types/modal';
import CustomModal from '../modals/CustomModal';
import ArchiveVideo from './ArchiveVideo';
import AccessLogList from './AccessLogList';

export default function AccessLog() {

  const [openDialog, setOpenDialog] = useState<OpenDialog>({
    show: false,
    title: '',
    width: 0,
    height: 0,
    params: '',
    close: () => { }
  });

  const showOpenDialog = useCallback(({ title, width, height, params }: { title: string, width: number, height: number, params: string }) => {
    setOpenDialog({
      show: true,
      title,
      width,
      height,
      params,
      close: closeOpenDialog
    });
  }, []);

  const closeOpenDialog = () => {
    setOpenDialog({
      show: false,
      title: '',
      width: 0,
      height: 0,
      params: '',
      close: () => { }
    });
  };

  return (
    <section className={`relative h-1/3 w-[20.5rem] bg-white dark:bg-[#262626] rounded-sm`}>
      <h3 className='text-[1.03rem] font-semibold pl-2 pt-1'>출입 기록(24시간)</h3>
      <div className='w-[10/12] bg-[#616A79] h-[2px] m-1' />
      <AccessLogList
        showOpenDialog={showOpenDialog}
      />
      {openDialog.show && (
        <CustomModal
          show={openDialog.show}
          title={openDialog.title}
          width={openDialog.width}
          height={openDialog.height}
          contentClassName={'rounded-md border-2 border-[#D9DCE3] px-0 py-3'}
          titleClassName='px-4 py-1'
          close={openDialog.close}
        >
          <div className='bg-[#EDF0F6] w-full h-0.5 my-2' />
          <ArchiveVideo
            params={openDialog.params}
            rewind={3}
          />
        </CustomModal>
      )}
      {/* </div> */}
    </section >
  );
};