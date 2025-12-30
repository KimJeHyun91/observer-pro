import { ChangeEvent, useState } from 'react';
import { AiOutlineMinusSquare } from "react-icons/ai";
import { FaRegPlusSquare } from "react-icons/fa";
import { Button } from '@/components/ui';
import SOPStageSetting from './SOPStageSetting';
import { ModalNotifyType } from '@/@types/modal';
import ModalNotify from '@/views/main/modals/ModalNotify';
import { apiModifySOP } from '@/services/ObserverService';
import { SOP } from '@/@types/main';

type Props = {
  selectedSOP: SOP;
  SOPList: SOP[];
};

const GuideBoxStyle = 'w-[42.375rem] bg-white border-[2px] border-solid border-[#D9DCE3] rounded-sm py-1 px-3 self-center';

export default function AddSOPProcedure({ selectedSOP: { idx, sop_name }, SOPList }: Props) {
  const [showGuide, setShowGuide] = useState<boolean>(true);
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
    if (disabledModify) {
      return;
    };

    const isExist = SOPList.find((SOP) => SOP.sop_name === updateSOPName);
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
    <section>
      <div className='py-3 m-auto'>
        <div className='flex flex-col w-[45rem] min-h-[3.1875rem] max-h-[17.625rem] bg-[#EBECEF] rounded-md p-3 relative -left-1'>
          <div className='flex justify-between items-center'>
            <h6 className='text-md'>✅ SOP 설정 예시</h6>
            <div className='cursor-pointer' onClick={() => setShowGuide(!showGuide)}>
              {showGuide ? <AiOutlineMinusSquare size={25} color='#B6BBC4' /> : <FaRegPlusSquare size={25} color='#B6BBC4' />}
            </div>
          </div>
          {showGuide && (
            <div className='mt-2'>
              <div className={`${GuideBoxStyle} h-[2.375rem] mb-2 text-[#895F1E] text-lg font-semibold flex justify-center items-center`}>
                SOP 제목
              </div>
              <div className={`${GuideBoxStyle} h-[2rem] text-[#4A4A4A] mb-1.5`}>
                SOP 1단계
              </div>
              <div className={`${GuideBoxStyle} h-[8.5rem] my-1.5 flex items-center`}>
                <div className='flex flex-col gap-1 text-[#4A4A4A]'>
                  <div className='flex'>
                    <div className={`w-[8.625rem] h-[1.625rem] bg-[#D9DCE3] mr-1.5 flex justify-center items-center font-semibold`}>목록</div>
                    <div className={`w-[32.1875rem] h-[1.625rem] bg-[#D9DCE3] flex justify-center items-center font-semibold`}>상세 내용</div>
                  </div>
                  <div className='flex'>
                    <div className={`w-[8.625rem] h-[1.625rem] bg-[#EDF0F6] mr-1.5 flex justify-center items-center`}>참여 기관명</div>
                    <div className={`w-[32.1875rem] h-[1.625rem] bg-[#EDF0F6] flex justify-center items-center`}>남양주 소방서</div>
                  </div>
                  <div className='flex'>
                    <div className={`w-[8.625rem] h-[1.625rem] bg-[#EDF0F6] mr-1.5 flex justify-center items-center`}>참여자</div>
                    <div className={`w-[32.1875rem] h-[1.625rem] bg-[#EDF0F6] flex justify-center items-center`}>현장지휘단장</div>
                  </div>
                  <div className='flex'>
                    <div className={`w-[8.625rem] h-[1.625rem] bg-[#EDF0F6] mr-1.5 flex justify-center items-center`}>연락관</div>
                    <div className={`w-[32.1875rem] h-[1.625rem] bg-[#EDF0F6] flex justify-center items-center`}>지휘조사 팀장</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`w-[45rem] ${showGuide ? 'max-h-[29rem]' : 'max-h-[44rem]'} border-2 border-[#D9DCE3] rounded-md mt-4 relative -left-1 p-2 flex flex-col gap-y-3`}>
          <h6 className='text-md ml-2 mb-2'>✅ SOP 절차 등록</h6>
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
          <div className='bg-[#EBECEF] rounded-[4px] w-[43.75rem] min-h-[14.4375rem] mt-1 p-2'>
            <SOPStageSetting
              idx={idx}
              showGuide={showGuide}
            />
          </div>
        </div>
      </div>
      {modalNotify.show && (
        <ModalNotify
          modal={modalNotify}
          toggle={toggleNotifyModal}
        >
          <p>{notifyMsg}</p>
        </ModalNotify>
      )}
    </section>
  );
};