import { ChangeEvent, FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import ModalSetting from '../../modals/ModalSetting';
import { ModalConfirmType, ModalNotifyType, ModalType } from '@/@types/modal';
import { useSOPList } from '@/utils/hooks/useSOPList';
import Loading from '@/components/shared/Loading';
import { apiCreateSOP, apiRemoveSOP } from '@/services/ObserverService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import ModalConfirm from '../../modals/ModalConfirm';
import CustomModal from '../../modals/CustomModal';
import AddSOPProcedure from './section/AddSOPProcedure';
import EditSOPDetail from './section/EditSOPDetail';
import ModalNotify from '../../modals/ModalNotify';
import { SOP } from '@/@types/main';

type SOPDetailComponent = {
  show: boolean;
  width: number;
  title: string;
  type: 'add' | 'edit' | '';
};

export default function SOPProcedureSetting() {
  const { isLoading, error, data, mutate } = useSOPList();
  const { socketService } = useSocketConnection();
  const [sopName, setSopName] = useState('');
  const selectedSOP = useRef<SOP | null>(null);

  const [modalCreate, setModalCreate] = useState<ModalType>({
    show: false,
    type: '',
    title: ''
  });
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');
  const [modalSOPDetail, setModalSOPDetail] = useState<SOPDetailComponent>({
    show: false,
    width: 0,
    title: '',
    type: '',
  });
  const [modalNotify, setModalNotify] = useState<ModalNotifyType>({
    show: false,
    title: ''
  });
  const [notifyMsg, setNotifyMsg] = useState('');
  const SOPList: SOP[] = data?.result || [];

  const toggleModal = ({ show, title, type }: ModalType) => {
    setModalCreate({
      show,
      title,
      type
    })
  };

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const onChangeSopName = (e: ChangeEvent<HTMLInputElement>) => {
    setSopName(e.target.value);
  };

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement> | FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    e.preventDefault();
    const isExist = SOPList.find((SOP) => SOP.sop_name === sopName);
    if (isExist) {
      setNotifyMsg(`SOP ${sopName}이(가) 이미 있습니다.`);
      toggleNotifyModal({
        show: true,
        title: 'SOP 이름 중복'
      });
      return;
    };

    if (sopName === '' || sopName == null) {
      setNotifyMsg("SOP 이름을 입력하세요.");
      toggleNotifyModal({
        show: true,
        title: 'SOP 이름 미입력'
      });
      return;
    };

    try {
      const result = await apiCreateSOP({
        sopName
      });
      if (result === 'Created') {
        toggleModal({
          show: false,
          title: '',
          type: ''
        });
        setSopName('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const confirmRemove = async () => {
    if (selectedSOP.current) {
      try {
        await apiRemoveSOP({
          idx: selectedSOP.current.idx
        });
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        });
        selectedSOP.current = null;
        setConfirmMsg('');
      } catch (err) {
        console.error(err);
      };
    }
  };

  if (error) {
    console.log('get SOP List error');
  };

  const handleShowAddSOPDetail = async (title: string, type: 'add' | 'edit') => {
    setModalSOPDetail({
      show: true,
      title,
      width: 760,
      type
    });
  };

  const handleCloseSOPDetail = async () => {
    setModalSOPDetail({
      show: false,
      title: '',
      width: 0,
      type: ''
    });
  };

  const setSOPModalChild = (type: 'add' | 'edit' | '') => {
    if (selectedSOP.current == null) {
      return;
    }

    if (type === 'add') {
      return (
        <AddSOPProcedure
          selectedSOP={selectedSOP.current}
          SOPList={SOPList}
        />
      )
    } else if (type === 'edit') {
      return (
        <EditSOPDetail
          selectedSOP={selectedSOP.current}
          close={handleCloseSOPDetail}
        />
      );
    };
  };

  const toggleNotifyModal = ({ show, title }: { show: boolean, title: string }) => {
    setModalNotify({
      show,
      title
    });
  };

  useEffect(() => {
    if (!socketService) {
      return;
    }

    const SOPSocket = socketService.subscribe('cm_sop-update', (received) => {
      if (received) {
        mutate();
      };
      if (!selectedSOP.current || selectedSOP.current.idx == null) {
        return;
      }
      if (received.SOP.modify && (received.SOP.modify.idx === selectedSOP.current.idx)) {
        selectedSOP.current = {
          idx: received.SOP.modify.idx,
          sop_name: received.SOP.modify.sop_name,
          count: selectedSOP.current.count
        };
      };
    });

    const SOPStageSocket = socketService.subscribe('cm_sop_stage-update', (received) => {
      if (received) {
        mutate();
      };
    });

    return () => {
      SOPSocket();
      SOPStageSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketService]);

  return (
    <section className='m-auto flex flex-col items-center'>
      <h4 className='w-full flex ml-4'>SOP 목록</h4>
      <ul className='w-[45rem] min-h-[8.75rem] flex items-center my-4 flex-col scroll-container overflow-x-hidden overflow-y-auto h-[35rem]'>
        {!isLoading && SOPList.length > 0 ? (
          SOPList.map((SOP) => (
            <li
              key={SOP.idx}
              className='h-[11.5rem] min-h-[11.5rem] bg-[#EBECEF] w-full p-4 flex flex-col justify-around rounded-md my-2.5'
            >
              <p className='w-[42.375rem] h-[2.375rem] text-[#895F1E] text-lg font-semibold border-[#D9DCE3] border-[2px] border-solid rounded-sm bg-white flex justify-center items-center'>{SOP.sop_name}</p>
              <div className='flex w-[42.375rem] h-[3.125rem] justify-between items-center'>
                <p className='w-[35rem] h-full border-[#D9DCE3] border-[2px] border-solid text-[#616A79] pl-5 bg-[white] text-lg flex items-center'>{SOP.count > 0 ? `절차 ${SOP.count}단계` : 'SOP 절차를 등록하세요.'}</p>
                {SOP.count > 0 ? (
                  <Button
                    className='w-[6.25rem] rounded-sm border-[#D9DCE3] border-[2px] border-solid h-[2.75rem]'
                    onClick={() => {
                      selectedSOP.current = SOP;
                      handleShowAddSOPDetail('SOP 상세 정보', 'edit');
                    }}
                  >
                    상세 정보
                  </Button>
                ) :
                  <Button
                    className='w-[6.25rem] rounded-sm border-[#D9DCE3] border-[2px] border-solid h-[2.75rem]'
                    onClick={() => {
                      selectedSOP.current = SOP;
                      handleShowAddSOPDetail('SOP 절차 등록', 'add');
                    }}
                  >
                    절차 등록
                  </Button>
                }
              </div>
              <Button
                className='w-[42.375rem] h-[2rem] border-[#B6BBC4] border-[2px] border-solid text-[#D76767] flex justify-center items-center rounded-sm'
                onClick={() => {
                  selectedSOP.current = SOP;
                  setConfirmMsg('선택 SOP 상황 절차를 삭제합니다.');
                  toggleModalConfirm({
                    show: true,
                    title: 'SOP 삭제',
                    type: 'delete'
                  });
                }}
              >
                SOP 삭제
              </Button>
            </li>
          ))
        )
          :
          !isLoading ?
            <li>
              <p className='text-lg'>등록 된 SOP 절차 목록이 없습니다.</p>
            </li>
            :
            <li>
              <Loading loading={isLoading} />
            </li>
        }
      </ul>
      <Button
        className={`
          w-[45rem] h-[3.125rem] flex justify-center items-center text-lg text-[#647DB7] font-bold p-2 bg-[#F7F7F7] border-[2px] border-solid border-[#CCCCCC] rounded-sm`
        }
        onClick={() => {
          toggleModal({
            show: true,
            title: '✅ SOP 등록',
            type: 'sop-add'
          })
        }}
      >
        SOP 등록
      </Button>
      {modalCreate.show && (
        <ModalSetting modal={modalCreate} toggle={toggleModal} >
          <form
            className='bg-[#EBECEF] w-full rounded-sm p-3 flex flex-col'
            onSubmit={handleSubmit}
          >
            <p className='bg-white py-2 px-4 text-[#4A4A4A] border-[#D9DCE3] border-solid border-[1px] rounded-md font-bold'>SOP 저장 제목</p>
            <input
              className='p-2 h-[3.75rem] my-2'
              placeholder="제목을 입력하세요. &#13;&#10; 예시) 화재 상황 SOP 진행 절차"
              value={sopName}
              onChange={onChangeSopName}
            />
            <Button
              onClick={handleSubmit}
            >등록</Button>
          </form>
        </ModalSetting>
      )
      }
      {modalConfirm.show && (
        <ModalConfirm
          modal={modalConfirm}
          toggle={toggleModalConfirm}
          confirm={confirmRemove}
        // loading={loading}
        >
          <p>{confirmMsg}</p>
        </ModalConfirm>
      )}
      {modalSOPDetail.show && (
        <CustomModal
          show={modalSOPDetail.show}
          title={modalSOPDetail.title}
          width={modalSOPDetail.width}
          className={'max-h-[56.875rem]'}
          titleClassName={'mb-2'}
          contentBoxClassName={'flex flex-col h-full justify-between'}
          close={handleCloseSOPDetail}
        >
          <div className='w-[760px] bg-[#D9DCE3] h-[2px] my-2 relative -left-[1.5rem]' />
          {setSOPModalChild(modalSOPDetail.type)}
        </CustomModal>
      )}
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
}