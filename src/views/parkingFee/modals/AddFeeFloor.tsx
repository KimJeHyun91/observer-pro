import { ChangeEvent, useState, useEffect, useRef } from 'react';
import { 
    parkingFeeOutsideInfo,
    Floor
} from "@/@types/parkingFee";
import parkingIcon from '@/configs/parking-icon.config';
import Button from '@/components/ui/Button'
import { 
    setFloorInfo,
    getFloorList,
    deleteFloorInfo,
    updateFloorInfo
} from '@/services/ParkingFeeService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { ModalType } from '@/@types/modal';
import Modal from '../modals/Modal';
import RemoveData from '../modals/RemoveData';

type Props = {
  selectedParking: parkingFeeOutsideInfo;
}

const AddFeeFloor = ({ selectedParking }: Props) => {
    const { socketService } = useSocketConnection();
    const [floorName, setFloorName] = useState('');
    const [editStatus, setEditStatus] = useState<boolean>(false);
    const [editFloorId, setEditFloorId] = useState<number | null>(null);
    const [editFloorName, setEditFloorName] = useState<string>('');
    const [floors , setFloors] = useState<Floor[]>([]);
    const [targetFloor , setTargetFloor] = useState<Floor | null>(null);
    const modalChildRef = useRef<HTMLDivElement>(null);
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: ''
    });

    useEffect(() => {
        if (!socketService) {
            return;
        }
  
        const parkingFeeFloorSocket = socketService.subscribe('pf_parkings-update', (received) => {
            if (
                received &&
                typeof received === 'object' &&
                'floorList' in received
            ) {
                getInFloorList();
            }
        })
  
        return () => {
            parkingFeeFloorSocket();
        }
  
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(()=>{
        getInFloorList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParking])
    
    const getInFloorList = async () => {
        const payload ={
            outside_idx : selectedParking.idx
        }

        try {
            const res = await getFloorList(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                setFloors([]);
                return;
            }
            
            setFloors(res.result as Floor[]);
        } catch (error) {
            console.error('주차장 층 List API 에러: ', error);
            setFloors([]);
            return;
        }
    }

    const floorAdd = async () => {
        if (!floorName.trim()) return;

        const payload = {
            outside_idx: selectedParking.idx,
            inside_name: floorName,
        };

        try {
            const res = await setFloorInfo(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

        } catch (error) {
            console.error('주차장 층 Add API 에러: ', error);
            return;
        }

        setFloorName('');
        setEditStatus(false);
    };
    
    const onChangeAddFloorName = (e: ChangeEvent<HTMLInputElement>) => {
        setFloorName(e.target.value);
    }

    const onEditStart = (floorId: number, name: string) => {
        setEditFloorId(floorId);
        setEditFloorName(name);
    };

    const modifyFloorName = async (floorId: number) => {
        if (!editFloorName.trim()) return;

        const payload ={
            inside_idx : floorId,
            inside_name : editFloorName
        }

        try {
            const res = await updateFloorInfo(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }
        } catch (error) {
            console.error('주차장 층 Update API 에러: ', error);
            return;
        }

        reset();
    };

    const remove = async () => {
        const payload ={
            inside_idx : targetFloor?.idx
        }

        try {
            const res = await deleteFloorInfo(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차장 층 Delete API 에러: ', error);
            return;
        }
    };

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const closeModal = () => {
        toggleModal({ show: false, type: '', title: '' });
        reset();
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'removeFloor':
                return (
                    targetFloor && (
                        <RemoveData
                            remove={remove}
                            closeModal={closeModal}
                            type="parkingFeeFloor"
                            deleteTarget={{
                                id : (targetFloor.idx).toString(),
                                title : targetFloor.inside_name
                            }}
                        />
                    )
                )
            default:
                break
        }
    }

    const reset = () => {
        setTargetFloor(null);
        setFloorName('');
        setEditFloorId(null);
        setEditFloorName('');
        setEditStatus(false);
    };

    return (
      <div>
          <div className="absolute left-0 right-0 border-t border-gray-200 border-2 dark:border-gray-500 mt-[-17px]"></div>

          <div className="mt-7">
              <div className="w-full bg-[#D2D6DE] dark:bg-[#A9A9A9] text-sm font-semibold text-center text-black dark:text-white px-3 py-2 rounded">
                  {selectedParking.outside_name}
              </div>
          </div>

          <div className="grid grid-cols-5 items-start gap-4 pt-2">
              <div className="col-span-5 relative">
                  <div className="bg-[#F2F5F9] p-2 border rounded w-full h-[320px] overflow-y-auto scroll-container overflow-x-hidden min-h-[260px] dark:bg-[#404040] dark:border-[#404040]">
                      <Button
                          className="w-[100%] h-[34px] bg-[#D2D6DE] rounded dark:bg-[#A9A9A9] dark:text-[#000]"
                          size="sm"
                          disabled={editStatus || editFloorId !== null}
                          onClick={()=> {
                              setEditStatus(true)
                          }}
                      >
                          층 목록 추가
                      </Button>

                      <ul>
                          {editStatus && (
                              <li
                                  key={-1}
                                  className='w-full flex mt-2 justify-around'
                              >
                                  <input
                                      type='text'
                                      className='w-[24rem] h-[1.9rem] border-[1px] border-[#E3E6EB] border-solid pl-2 rounded-sm dark:text-[#000]'
                                      placeholder='추가하는 층/구역의 이름을 입력하세요.'
                                      value={floorName}
                                      minLength={2}
                                      maxLength={20}
                                      onChange={onChangeAddFloorName}
                                  />

                                  <div className='flex justify-around items-center gap-1.5 ml-1'>
                                      <div className="cursor-pointer text-[#57AF68] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                          onClick={() => floorAdd()}
                                      >
                                          <parkingIcon.check className="w-[1.3rem] h-[1.3rem]" />
                                      </div>
                                      <div className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                          onClick={() => reset()}
                                      >
                                          <parkingIcon.close className="w-[1.5rem] h-[1.5rem] " />
                                      </div>
                                  </div>
                              </li>
                          )}

                          {floors.map(floor => (
                              <li key={floor.idx} className="w-full flex mt-2 justify-around">
                                  {editFloorId === floor.idx ? (
                                       <>
                                            <input
                                                type="text"
                                                className="w-[24rem] h-[1.9rem] border-[1px] border-[#E3E6EB] border-solid pl-2 rounded-sm dark:text-[#000]"
                                                value={editFloorName}
                                                onChange={(e) => setEditFloorName(e.target.value)}
                                            />
                                            <div className="flex justify-around items-center gap-1.5 ml-1">
                                                <div
                                                    className={`
                                                        cursor-pointer
                                                        ${editFloorName.trim() === '' || editFloorName === floor.inside_name
                                                        ? 'pointer-events-none opacity-50'
                                                        : 'text-[#57AF68] hover:bg-[#647DB7] hover:text-white'
                                                        }
                                                        flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm
                                                    `}
                                                    onClick={
                                                        editFloorName.trim() === '' || editFloorName === floor.inside_name
                                                        ? undefined
                                                        : () => modifyFloorName(floor.idx)
                                                    }
                                                >
                                                    <parkingIcon.check className="w-[1.3rem] h-[1.3rem]" />
                                                </div>
                                                <div className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                                    onClick={reset}
                                                >
                                                    <parkingIcon.close className="w-[1.5rem] h-[1.5rem]" />
                                                </div>
                                            </div>
                                        </>
                                  ) : (
                                      <>
                                          <span className="bg-[#E7EBF1] flex items-center w-[24rem] h-[1.9rem] pl-2 rounded-sm">{floor.inside_name}</span>
                                          <div className="flex justify-around items-center gap-1.5 ml-1">
                                              <div className={`cursor-pointer ${editStatus ? 'pointer-events-none opacity-50' : 'text-[#647DB7] hover:bg-[#647DB7] hover:text-white'} flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm`}
                                                  onClick={() => onEditStart(floor.idx, floor.inside_name)}
                                              >
                                                  <parkingIcon.edit className="w-[1.3rem] h-[1.3rem]" />
                                              </div>
                                              <div className={`cursor-pointer ${editStatus ? 'pointer-events-none opacity-50' : 'text-[#D76767] hover:bg-[#647DB7] hover:text-white'} flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm`}
                                                    onClick={() => {
                                                        setTargetFloor(floor)
                                                        toggleModal({ show: true, title: '층 삭제', type: 'removeFloor' })
                                                    }}
                                              >
                                                  <parkingIcon.trash className="w-[1.2rem] h-[1.2rem]" />
                                              </div>
                                          </div>
                                      </>
                                  )}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
          </div>
          
          <Modal
              modal={modal}
              toggle={toggleModal}
              modalChildRef={modalChildRef}
          >
              <div ref={modalChildRef}>
                  {setModalChild(modal.type)}
              </div>
          </Modal>  
      </div>
    );
};

export default AddFeeFloor;