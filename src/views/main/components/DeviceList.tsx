import { Input, Select } from '@/components/ui';
import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { DevicePopupType } from '@/@types/parking';
import DevicesByLocation from './device/section/DevicesByLocation';
import { ObGuardianlitePopup } from '../types/guardianlite';

export type DeviceFilter = 'type' | 'location';

const OPTIONS: { value: DeviceFilter; label: string }[] = [
  { value: 'location', label: '위치' },
  { value: 'type', label: '종류' }
];

type Props = {
  filter: DeviceFilter;
  changeFilter?: Dispatch<SetStateAction<DeviceFilter>>
  mode: 'dashboard' | 'map';
  floorIdx?: number;
  handleShowDevicePopup?: (value: DevicePopupType | ObGuardianlitePopup) => void;
};

export function DeviceList({ filter, changeFilter, mode, floorIdx, handleShowDevicePopup }: Props) {
  const [searchValue, setSearchValue] = useState<string>('');
  const handleChangeInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };
  const isFloorMap = mode === 'map' && floorIdx;

  const HeightSize = () => {
    if (mode === 'dashboard') {
      return 'h-[calc(100%-1rem)]';
    } else if (isFloorMap) {
      return 'h-[calc(100%-100px)]';
    };
    return 'h-1/3'
  };

  return (
    <section className={`${HeightSize()} ${isFloorMap ? 'w-full' : 'w-[20.5rem]'} bg-white dark:bg-[#262626] rounded-sm`}>
      <div className='flex justify-between items-center'>
        <h3 className='text-[1.03rem] font-semibold pl-2 pt-1'>장치 목록</h3>
        {changeFilter && (
          <Select<{ value: DeviceFilter; label: string }>
            size="xxs"
            className='mr-1 mt-1 p-0'
            options={OPTIONS}
            value={OPTIONS.find((o) => o.value === filter) ?? null}
            onChange={(opt) => changeFilter(opt ? opt.value : filter)}
          />
        )}
      </div>
      <div className='w-[11/12] bg-[#616A79] h-[2px] m-1' />
      <div className='relative'>
        <Input size='xs' className='mx-3 my-1 w-[calc(100%-1.5rem)] pr-10 bg-[#EBECEF]' onChange={handleChangeInput} />
        <FaSearch size={20} color='white' className='absolute top-2 right-8 pt-1' />
      </div>
      <DevicesByLocation searchValue={searchValue} mode={mode} floorIdx={floorIdx} handleShowDevicePopup={handleShowDevicePopup} />
    </section>
  );
}