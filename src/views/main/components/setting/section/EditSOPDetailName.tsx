import { ModalNotifyType } from '@/@types/modal';
import { Button } from '@/components/ui';
import { apiModifySOP } from '@/services/ObserverService';
import { ChangeEvent, useState } from 'react';
import ModalNotify from '@/views/main/modals/ModalNotify';
import { useSOPList } from '@/utils/hooks/useSOPList';
import { SOP } from '@/@types/main';

type Props = {
  idx: number;
  sop_name: string;
};

export default function EditSOPDetailName({
  idx,
  sop_name,
}: Props) {
  const { error: errorSOP, data } = useSOPList();

  if (errorSOP) {
    console.error('SOP list error');
  };

  const SOPList: SOP[] = data?.result || [];
  const [updateSOPName, setUpdateSOPName] = useState(sop_name);
  const [modalNotify, setModalNotify] = useState<ModalNotifyType>({
    show: false,
    title: ''
  });
  const [notifyMsg, setNotifyMsg] = useState('');

  const disabledModify = (updateSOPName === '' || updateSOPName === sop_name);

  const handleChangeSOPName = (e: ChangeEvent<HTMLInputElement>) => {
    setUpdateSOPName(e.target.value);
  };

  const toggleNotifyModal = ({ show, title }: { show: boolean, title: string }) => {
    setModalNotify({
      show,
      title
    });
  };

  const handleModifySOPName = async () => {
    if (disabledModify || !SOPList) {
      return;
    };

    const isExist = SOPList.find((SOP: SOP) => SOP.sop_name === updateSOPName);
    if (isExist) {
      setNotifyMsg(`SOP ${updateSOPName}이(가) 이미 있습니다.`);
      toggleNotifyModal({
        show: true,
        title: 'SOP 이름 중복'
      });
    };

    await apiModifySOP({
      idx,
      sopName: updateSOPName
    });
  };

  return (
    <>
      <h5 className='w-[42.25rem] h-[2.375rem] m-auto bg-white flex justify-center items-center text-[#895F1E] font-semibold rounded-sm border-2 border-[#D9DCE3] border-solid'>
        {sop_name}
      </h5>
      <div className='w-full bg-[#EBECEF] rounded-sm mx-auto py-2 px-3'>
        <div className='flex justify-between'>
          <span className='w-[34.125rem] h-[2rem] border-[1px] border-solid border-[#D9DCE3] py-2 pl-4 bg-white flex items-center'>
            {sop_name}
          </span>
          <Button
            className={`w-[7.5rem] h-[2rem] flex items-center justify-center bg-[#F7F7F7] border-2 border-[#D9DCE3] ${!disabledModify ? 'text-[#17A36F]' : ''}`}
            disabled={disabledModify}
            onClick={handleModifySOPName}
          >
            {disabledModify ? 'SOP 제목 수정' : 'SOP 제목 저장'}
          </Button>
        </div>
        <input
          className='w-[42.375rem] border-[1px] border-[#D9DCE3] border-solid rounded-sm h-[3.75rem] mt-1 pl-4'
          value={updateSOPName}
          onChange={handleChangeSOPName}
        />
      </div>
      {modalNotify.show && (
        <ModalNotify
          modal={modalNotify}
          toggle={toggleNotifyModal}
        >
          <p>{notifyMsg}</p>
        </ModalNotify>
      )}
    </>
  );
}