import { useState, useEffect, useRef, useMemo } from 'react';
import { apiParkingTypeList } from '@/services/ParkingService';
import { ParkingType, unDeviceType } from '@/@types/parking';
import parkingIcon from '@/configs/parking-icon.config';
import Button from '@/components/ui/Button'
import Radio from '@/components/ui/Radio'
import { useParkingUnDeviceList } from '@/utils/hooks/useParkingDevice';

type Props = {
  add: (data: { selectedTypeId: number; targetDevice: unDeviceType }) => void;
  closeModal: () => void;
};

const AddParkingArea = ({ add, closeModal }: Props) => {
  const isParkingType = useRef(false);
  const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [areaName, setAreaName] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const { data, mutate } = useParkingUnDeviceList();
  const deviceList: unDeviceType[] =  useMemo(() => data || [], [data])
  const [filteredDevices, setFilteredDevices] = useState<unDeviceType[]>(deviceList);
  const [isSaving, setIsSaving] = useState(false);

  const inputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setAreaName(query);
    setSelectedDevice(null);

    const filtered = deviceList.filter((device) =>
      device.device_no16.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredDevices(filtered);
  };

  const selectArea = (item: unDeviceType) => {
    if (selectedDevice === item.device_idx) {
        setSelectedDevice(null);
        setAreaName('');
    } else {
        setSelectedDevice(item.device_idx);
        setAreaName(item.device_no16);
    }
};

  const save = async  () => {
    if (selectedTypeId === null || selectedDevice === null) {
      return;
    }
    setIsSaving(true);

    const targetDevice = deviceList.find((device) => device.device_idx === selectedDevice);
  
    if (!targetDevice) {
      setIsSaving(false);
      return;
    }
    
    try {
      await add({ selectedTypeId, targetDevice });
      mutate();
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (deviceList.length > 0) {
        setFilteredDevices(deviceList);
    }
  }, [deviceList]);

  useEffect(() => {
    if (isParkingType.current) return;
    isParkingType.current = true;

    getParkingType();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getParkingType = async () => {
        try {
          const res = await apiParkingTypeList<ParkingType>();

          if (!res || !res.result) {
              return;
          }

          setParkingTypes(res.result);
          setSelectedTypeId(res.result[0]?.id || null);
        } catch (error) {
          console.error('주차관리 설정타입 API 에러: ', error);
        }
  };

  const radioChage = (newValue: number) => {
      setSelectedTypeId(newValue);
  };

  return (
    <div>
      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

      <div className="grid grid-cols-5 items-center gap-4 mb-4 mt-7">
        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">설정 타입</span>
        <div className="col-span-4 flex space-x-12">
          <Radio.Group
            value={selectedTypeId}
            className="flex items-center space-x-9"
            onChange={radioChage}
          >
            {parkingTypes.map((type) => (
              <Radio
                key={type.id}
                value={type.id}
                radioClass="w-4 h-4"
                className="flex items-center gap-2 text-xs dark:text-[#FFFFFF]" 
              >
                {type.parking_type_name}
              </Radio>
            ))}
          </Radio.Group>
        </div>
      </div>

      <div className="grid grid-cols-5 items-center gap-4 mb-1">
        <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">센서</span>
        <div className="col-span-4 relative">
          <input
              type="text"
              placeholder="면 센서를 검색하세요."
              value={areaName}
              className="border p-2 rounded w-full pr-10 dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]"
              onChange={inputChange}
          />
          <parkingIcon.searchIcon className="absolute right-3 top-3 w-[20px] h-[20px] mt-[-2px]" />
        </div>
      </div>

      <div className="grid grid-cols-5 items-center gap-4 mb-8">
        <span className="font-bold col-span-1 text-right text-black"></span>
        <div className="col-span-4 relative">
          <div className="bg-white border rounded w-full mt-1 max-h-40 overflow-y-auto min-h-[200px] dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]">
            {filteredDevices.map((item) => (
                  <div
                      key={item.device_idx}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer flex items-center ${
                        selectedDevice === item.device_idx
                          ? 'bg-green-100 border-l-4 border-green-500 dark:bg-green-600 dark:border-green-800'
                          : ''
                      }`}
                      onClick={() => selectArea(item)}
                  >
                      <input
                          readOnly
                          type="checkbox"
                          checked={selectedDevice === item.device_idx}
                          className="mr-2"
                      />
                      {item.device_no16}
                  </div>
              ))}
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

      <div className="flex justify-end space-x-2">
        <Button
            className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
            size="sm"
            disabled={isSaving}
            onClick={closeModal}
        >
            취소
        </Button>
        
        <Button
            className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
            size="sm"
            variant="solid"
            disabled={isSaving}
            onClick={save}
        >
            저장
        </Button>
      </div>
    </div>
  );
};

export default AddParkingArea;
