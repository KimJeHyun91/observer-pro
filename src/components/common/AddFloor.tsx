import { ChangeEvent, useState, useRef, useEffect } from 'react';
import { apiFloorList } from '@/services/ParkingService';
import parkingIcon from '@/configs/parking-icon.config';
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { Building } from '@/@types/building';
import { TargetEventPayload } from '@/@types/common';
import Dialog from '@/components/ui/Dialog'
import { apiGetObFloors } from '@/services/ObserverService';

type Option = {
  value: string
  label: string
}

type Floor = {
  idx: number;
  inside_name: string;
  outside_idx: number;
  map_image_url: string;
  alarm_status: boolean;
  floor_order: number;
}

type BuildingData = {
  result: Building[];
};

type Props = {
  targetEvent: (payload: TargetEventPayload) => Promise<boolean>;
  closeModal: () => void;
  buildingData: BuildingData;
  type: string;
  selectBuildingIdx: number;
};

const AddFloor = ({ targetEvent, closeModal, buildingData, type, selectBuildingIdx }: Props) => {
  const buildings: Building[] = buildingData.result;
  const options = buildings.map((building) => ({ label: building.outside_name, value: `${building.idx}` }))
  const selectedBuildingIdx = useRef<number>();
  const [floorList, setFloorList] = useState<Floor[]>([]);
  const [editStatus, setEditStatus] = useState<boolean>(false);
  const [newFloor, setNewFloor] = useState<string>('');
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [updatedFloorName, setUpdatedFloorName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [confirmShow, setConfirmShow] = useState<boolean>(false);
  const [deleteTargetFloor, setDeleteTargetFloor] = useState<Floor | null>(null);

  const floorEditShow = () => {
    setEditStatus(true);
  }

  const getFloorList = async () => {
    if (!selectedBuildingIdx.current) {
      return;
    }

    const data = {
      outsideIdx: selectedBuildingIdx.current,
    };

    try {
      const res =
        type === 'parking' ?
          await apiFloorList(data)
          : await apiGetObFloors({ outside_idx: data.outsideIdx })    // TODO : 빌딩 API 호출

      if (!res || !res.result) {
        return;
      }

      setFloorList(res.result as Floor[]);
    } catch (error) {
      console.error('주차관리 층 정보 API 에러: ', error);
    }
  }

  const buildingChage = (
    newValue: Option | null
  ) => {
    if (newValue) {
      selectedBuildingIdx.current = parseInt(newValue.value);
      reset();
      getFloorList();
    }
  }

  const onChangeAddFloorName = (e: ChangeEvent<HTMLInputElement>) => {
    setNewFloor(e.target.value);
  }

  const newFloorAdd = async () => {
    if (!selectedBuildingIdx.current || !newFloor) {
      return;
    }

    const data = {
      outside_idx: selectedBuildingIdx.current,
      inside_name: newFloor,
      mapImageUrl: ''
    };

    const isSuccess = await targetEvent({
      action: 'add',
      data: data,
    });

    if (!isSuccess) {
      console.error('층 생성에 실패했습니다.');
    } else {
      await getFloorList();
    }

    reset();
  }

  const startEditing = (floorId: number, currentName: string) => {
    setIsUpdating(true);
    setEditingFloorId(floorId);
    setUpdatedFloorName(currentName);
  };

  const removeFloor = async () => {
    if (!deleteTargetFloor) {
      return;
    }

    const data = {
      idx: deleteTargetFloor.idx,
    };

    const isSuccess = await targetEvent({
      action: 'delete',
      data: data,
    });

    if (!isSuccess) {
      console.error('층 삭제에 실패했습니다.');
    } else {
      const updatedList = floorList.filter((floor) => floor.idx !== deleteTargetFloor.idx);
      setFloorList(updatedList);
      setConfirmShow(false);
      setDeleteTargetFloor(null);
    }

    reset();
  }

  const modifyFloorName = async (floorId: number) => {
    const data = {
      floorId: floorId,
      updatedFloorName: updatedFloorName,
    };

    const isSuccess = await targetEvent({
      action: 'update',
      data: data,
    });

    if (!isSuccess) {
      console.error('층 이름 변경에 실패했습니다.');
    } else {
      const updatedList = floorList.map((floor) =>
        floor.idx === floorId ? { ...floor, inside_name: updatedFloorName } : floor
      );

      setFloorList(updatedList);
    }

    reset();
  };

  const reset = () => {
    setEditStatus(false);
    setIsUpdating(false);
    setNewFloor('');
    setEditingFloorId(null);
    setUpdatedFloorName('');
  };

  useEffect(() => {
    if(selectBuildingIdx){
      selectedBuildingIdx.current = selectBuildingIdx;
      reset();
      getFloorList();
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <div>
      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

      <div className="grid grid-cols-5 items-center gap-4 mb-4 mt-7">
        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">건물</span>
        <div className="col-span-4 flex space-x-12">
          <Select
            className='w-full h-full min-h-8 rounded'
            placeholder="건물을 선택하세요."
            size='xs'
            value={options.find((option) => parseInt(option.value) === selectedBuildingIdx.current && parseInt(option.value) == selectBuildingIdx)}
            options={options}
            onChange={buildingChage}
          />
        </div>
      </div>

      <div className="grid grid-cols-5 items-start gap-4 pt-2 mb-8">
        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">층 목록</span>
        <div className="col-span-4 relative">
          <div className="bg-[#F2F5F9] p-2 border rounded w-full max-h-40 overflow-y-auto scroll-container overflow-x-hidden min-h-[260px] dark:bg-[#404040] dark:border-[#404040]">
            <Button
              className="w-[100%] h-[34px] bg-[#D2D6DE] rounded dark:bg-[#A9A9A9] dark:text-[#000]"
              size="sm"
              disabled={editStatus || isUpdating || !selectedBuildingIdx.current}
              onClick={editStatus || isUpdating || !selectedBuildingIdx.current ? undefined : floorEditShow}
            >
              층 목록 추가
            </Button>

            <ul>
              {(editStatus && selectedBuildingIdx.current) && (
                <li
                  key={-1}
                  className='w-full flex mt-2 justify-around'
                >
                  <input
                    type='text'
                    className='w-[21.13rem] h-[1.9rem] border-[1px] border-[#E3E6EB] border-solid pl-2 rounded-sm dark:text-[#000]'
                    placeholder='추가하는 층/구역의 이름을 입력하세요.'
                    value={newFloor}
                    minLength={2}
                    maxLength={20}
                    onChange={onChangeAddFloorName}
                  />

                  <div className='flex justify-around items-center gap-1.5 ml-1'>
                    <div className="cursor-pointer text-[#57AF68] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                      onClick={() => newFloorAdd()}
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
              {floorList
                .filter((floor) =>
                  selectedBuildingIdx.current ? floor.outside_idx === selectedBuildingIdx.current : floor
                )
                .map((floor) => (
                  <li
                    key={floor.idx}
                    className="w-full flex mt-2 justify-around"
                  >
                    {editingFloorId === floor.idx ? (
                      <input
                        type="text"
                        className="bg-[#FFFFFF] flex-1 h-[1.9rem] pl-2 rounded-sm border border-gray-300 dark:text-[#000]"
                        value={updatedFloorName}
                        onChange={(e) => setUpdatedFloorName(e.target.value)}
                      />
                    ) : (
                      <span className="bg-[#E7EBF1] flex items-center w-[21.13rem] h-[1.9rem] pl-2 rounded-sm">
                        {floor.inside_name}
                      </span>
                    )}

                    <div className="flex justify-around items-center gap-1.5 ml-1">
                      {editingFloorId === floor.idx ? (
                        <>
                          <div
                            className="cursor-pointer text-[#57AF68] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                            onClick={() => modifyFloorName(floor.idx)}
                          >
                            <parkingIcon.check className="w-[1.3rem] h-[1.3rem]" />
                          </div>
                          <div
                            className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                            onClick={reset}
                          >
                            <parkingIcon.close className="w-[1.5rem] h-[1.5rem]" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            className={`cursor-pointer ${editStatus
                                ? 'text-[#BEC3CC] bg-[#E0E0E0] cursor-not-allowed'
                                : 'text-[#647DB7] hover:bg-[#647DB7] hover:text-white'
                              } flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm`}
                            onClick={
                              !editStatus
                                ? () => startEditing(floor.idx, floor.inside_name)
                                : undefined
                            }
                          >
                            <parkingIcon.edit className="w-[1.3rem] h-[1.3rem]" />
                          </div>
                          <div
                            className={`cursor-pointer ${editStatus
                                ? 'text-[#BEC3CC] bg-[#E0E0E0] cursor-not-allowed'
                                : 'text-[#D76767] hover:bg-[#647DB7] hover:text-white'
                              } flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm`}
                            onClick={
                              !editStatus
                                ? () => {
                                  setConfirmShow(true);
                                  setDeleteTargetFloor(floor);
                                }
                                : undefined
                            }
                          >
                            <parkingIcon.trash className="w-[1.2rem] h-[1.2rem]" />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

      <div className="flex justify-end space-x-2">
        <Button
          className="w-[100px] h-[34px] bg-[#D9DCE3] rounded "
          size="sm"
          onClick={closeModal}
        >
          취소
        </Button>
      </div>

      <Dialog
        isOpen={confirmShow}
        contentClassName="pb-0 px-0"
        onClose={() => setConfirmShow(false)}
      >
        <div className="px-6 pb-6">
          <h5 className="mb-4">{type === 'parking' ? '주차 층 삭제' : '층/구역 삭제'}</h5>

          <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px]"></div>

            <div className='pt-1'>
              <div className="mb-24 mt-20 text-center dark:text-[#FFFFFF]">
                <span className='text-xl font-bold text-black dark:text-[#FFFFFF]'>`{deleteTargetFloor?.inside_name}`</span>
                {type === 'parking' ? ' 층을 삭제하시겠습니까?' : ' 층/구역을 삭제하시겠습니까?'}
              </div>
            </div>

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px]"></div>

            <div className="flex justify-center space-x-12">
              <Button
                className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                size="sm"
                onClick={() => setConfirmShow(false)}
              >
                취소
              </Button>

              <Button
                className="mr-3 w-[100px] h-[34px] bg-[#D76767] rounded"
                size="sm"
                variant="solid"
                onClick={removeFloor}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AddFloor;