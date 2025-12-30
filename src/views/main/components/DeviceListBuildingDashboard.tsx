import { Input } from '@/components/ui';
import { FaSearch } from 'react-icons/fa';
import Devices from './device/Devices';
import { ChangeEvent, useState } from 'react';

type Props = {
  outsideIdx: number;
}

export default function DeviceListBuildingDashboard({ outsideIdx }: Props) {

  const [searchValue, setSearchValue] = useState<string>('');

  const handleChangeInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  };

  return (
    <section className='w-[15.8125rem] h-full bg-[#EBECEF] dark:bg-[#292A2C] p-1.5 rounded-md'>
      <h6 className='text-[1.05rem] pl-3'>장치 목록</h6>
      <div className='w-[15.0625rem] h-0.5 relative bg-[#616A79] my-1' />
      <div className='relative'>
        <Input size='xs' className='mx-3 my-2 w-11/12 pr-10 bg-white h-[1.375rem]' onChange={handleChangeInput} />
        <FaSearch size={17} color='#EDEEF1' className='absolute top-2 right-4 pt-1' />
      </div>
      <Devices filter={'location'} searchValue={searchValue} mode={'building-dashboard'} outsideIdx={outsideIdx} />
    </section>
  );

}