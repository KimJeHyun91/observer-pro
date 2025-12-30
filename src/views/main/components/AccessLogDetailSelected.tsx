import { useState } from 'react';
import UnknownPerson from '../../../assets/styles/images/unknown.png';
import { formatDateTimeStringKorean } from '../service/formatDateTimeString';
import { SelectedAccessLog } from './AccessLogDashboard';
import { Button } from '@/components/ui';
import dayjs from 'dayjs';
import CustomModal from '../modals/CustomModal';
import ArchiveVideo from './ArchiveVideo';
import { FaVideo } from "react-icons/fa";
import { OpenDialog } from '@/@types/modal';

type Props = {
  selectedAccessLog: SelectedAccessLog;
};

const CENTER_STYLE = 'flex items-center justify-center';

export default function AccessLogDetailSelected({
  selectedAccessLog: {
    LogStatus,
    LogStatusName,
    LogPersonLastName,
    LogTitleName,
    LogDateTime,
    LogDoorName,
    userImage,
    camera_id
  }
}: Props) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>({
    show: false,
    title: '',
    width: 0,
    height: 0,
    params: '',
    close: () => { }
  });

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

  const showOpenDialog = ({ title, width, height, params }: { title: string, width: number, height: number, params: string }) => {
    setOpenDialog({
      show: true,
      title,
      width,
      height,
      params,
      close: closeOpenDialog
    });
  };

  return (
    <section
      className='flex items-center w-[18rem] h-[6.5rem] pl-1.5 pr-1 py-2 gap-y-4 bg-[#EBECEF] dark:bg-[#313233] rounded-sm ml-2 mr-2'
      style={{
        backgroundColor: LogStatus === '30' ? '#990507d9' : ''
      }}
    >
      <div className='bg-white p-[1px] rounded-sm overflow-hidden w-1/4 mr-1.5 h-[5.6rem] my-auto flex'>
        {userImage ? (
          <img src={userImage} className='w-[4.5rem]' />
        )
          :
          <img src={UnknownPerson} className='w-[4.5rem]' />
        }
      </div>
      <div className='flex flex-col text-[#010101] dark:text-[#F5F5F5] w-3/4'>
        <header className='flex relative'>
          <h4
            className='text-[0.85rem] mb-0 whitespace-nowrap overflow-hidden text-ellipsis w-50'
            title={LogStatusName || ''}
            style={{
              color: LogStatus === '30' ? '#FFDEAD' : ''
            }}
          >
            {LogStatusName ?? ''}
          </h4>
          {(camera_id && camera_id.split(':')[1]) && (
            <Button
              className={`absolute left-44 top-8 w-6 bg-[#B1B5C0] p-1.5 h-5 rounded-sm ${CENTER_STYLE}`}
              onClick={() => showOpenDialog({ title: '영상 다시보기', width: 680, height: 620, params: `${camera_id}/${LogDateTime}/${LogStatusName}(${LogPersonLastName})&${LogDoorName}&${dayjs(LogDateTime, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm:ss')}` })}
            >
              <FaVideo color='#fff' size={12} />
            </Button>
          )}
        </header>
        <div
          style={{
            color: LogStatus === '30' ? '#e1d8d8' : ''
          }}
        >
          <p className='text-[0.67rem]'>이름 : {LogPersonLastName ?? ''}</p>
          <p className='text-[0.67rem]'>직급 : {LogTitleName ?? ''}</p>
          <p className='text-[0.67rem]'>시간 : {LogDateTime ? formatDateTimeStringKorean(LogDateTime) : ''}</p>
          <p className='text-[0.67rem]'>출입위치 : {LogDoorName ?? ''}</p>
        </div>
      </div>
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
    </section>
  );
}