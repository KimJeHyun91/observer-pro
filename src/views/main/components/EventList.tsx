import { Button } from '@/components/ui';
import { useState } from 'react';
import EventListEvents from './section/EventListEvents';
import { useCanvasMapStore } from '@/store/canvasMapStore';
const FilterButtnonStyle = 'w-[6.25rem] h-[1.25rem] border-1 border-solid border-[#9CA3B1] rounded-[1px] text-xs flex justify-center items-center';

type Props = {
  outsideIdx?: number;
}

export default function EventList({ outsideIdx }: Props) {
  const { buildingName } = useCanvasMapStore();
  const [sort, setSort] = useState('latest');
  const [filter, setFilter] = useState('all');

  const HeadingStyle = () => {
    if (outsideIdx) {
      return 'text-sm pl-3 flex items-center pt-1';
    };
    return 'text-[1.03rem] font-bold pl-2 pt-1';
  };
  return (
    <section
      className={
        `${outsideIdx != null ? 'w-[22.3125rem] h-[57.5%] bg-[#EBECEF] rounded-md' : 'w-[20.5rem] bg-[#FFFFFF] rounded-[3px]'} dark:bg-[#272829] ml-2`
      }
    >
      <div>
        <h3 className={HeadingStyle()}>{`${buildingName ? `${buildingName}건물` : ''} 실시간 이벤트`}</h3>
        <div className='w-[10/12] bg-[#616A79] h-[2px] m-1' />
      </div>
      <div className='flex items-center justify-around'>
        <select
          className='custom_select w-[80px] h-[25px] mt-1 border-[#616A79] border-[1px] dark:bg-[#404040]'
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
          }}
        >
          <option value='latest'>최신순</option>
          <option value='severity'>중요도순</option>
        </select>
        <Button
          className={`${FilterButtnonStyle} ${filter === 'all' ? 'bg-[#9CA3B1]' : outsideIdx ? 'bg-white' : 'bg-[#EBECEF]'}`}
          onClick={() => setFilter('all')}
        >
          전체 이벤트
        </Button>
        <Button
          className={`${FilterButtnonStyle} ${filter === 'unAck' ? 'bg-[#9CA3B1]' : outsideIdx ? 'bg-white' : 'bg-[#EBECEF]'}`}
          onClick={() => setFilter('unAck')}
        >
          미확인 이벤트
        </Button>
      </div>
      <EventListEvents sort={sort} filter={filter} outsideIdx={outsideIdx} />
    </section>
  );
}